// ---------------------------------------------------------------------------
// Calibration Import Background Jobs
// ISO 7.1.5 — Monitoring and measuring resources
// DCC (Digital Calibration Certificate) + Provider API polling
// ---------------------------------------------------------------------------

import { schedules } from "@trigger.dev/sdk/v3";
import { supabase } from "../src/supabase";
import { parseDCCXml, validateDCCSignature } from "../src/integrations/calibration/dcc";

// ---------------------------------------------------------------------------
// Every 6 hours: Poll all active calibration provider connectors
// ---------------------------------------------------------------------------
export const calibrationProviderPoll = schedules.task({
  id: "calibration-provider-poll",
  cron: "0 */6 * * *",
  run: async () => {
    const { data: providers } = await supabase
      .from("calibration_providers")
      .select("*")
      .eq("is_active", true)
      .eq("api_available", true);

    let queued = 0;
    for (const provider of providers ?? []) {
      // Only poll if enough time has elapsed since last sync
      if (provider.last_sync_at) {
        const lastSync = new Date(provider.last_sync_at);
        const hoursSince = (Date.now() - lastSync.getTime()) / 3600000;
        if (hoursSince < (provider.sync_interval_hours ?? 6)) continue;
      }

      // Queue a fetch job
      const { error } = await supabase.from("certificate_import_queue").insert({
        provider_id: provider.id,
        format: "JSON",
        status: "QUEUED",
        source: "API_FETCH",
        raw_content: JSON.stringify({
          provider_code: provider.provider_code,
          api_base_url: provider.api_base_url,
          since: provider.last_sync_at,
        }),
      });

      if (!error) {
        queued++;
        await supabase.from("calibration_providers")
          .update({ last_sync_at: new Date().toISOString() })
          .eq("id", provider.id);
      }
    }

    console.log(`[calibration] Provider poll: ${queued} fetch jobs queued from ${providers?.length ?? 0} providers`);
    return { providers_checked: providers?.length ?? 0, queued };
  },
});

// ---------------------------------------------------------------------------
// Every 15 minutes: Process certificate import queue
// QUEUED → PROCESSING → parse → match → verify/fail
// ---------------------------------------------------------------------------
export const calibrationQueueProcessor = schedules.task({
  id: "calibration-queue-processor",
  cron: "*/15 * * * *",
  run: async () => {
    const { data: items } = await supabase
      .from("certificate_import_queue")
      .select("*")
      .eq("status", "QUEUED")
      .order("queued_at")
      .limit(20);

    let processed = 0;
    let matched = 0;
    let failed = 0;

    for (const item of items ?? []) {
      // Mark as PROCESSING
      await supabase.from("certificate_import_queue")
        .update({ status: "PROCESSING", processing_started_at: new Date().toISOString() })
        .eq("id", item.id);

      try {
        let parseResult: any = null;

        // Parse based on format
        if (item.format === "DCC_XML" && item.raw_content) {
          const dccResult = await parseDCCXml(item.raw_content);
          parseResult = {
            certificate_number: dccResult.certificate.certificateNumber,
            calibration_date: dccResult.certificate.calibrationDate,
            instrument_serial: dccResult.certificate.instrumentSerial,
            instrument_manufacturer: dccResult.certificate.instrumentManufacturer,
            instrument_model: dccResult.certificate.instrumentModel,
            overall_result: dccResult.certificate.overallResult,
            results: dccResult.certificate.results,
            reference_standards: dccResult.certificate.referenceStandards,
            environmental_conditions: dccResult.certificate.environmentalConditions,
            dcc_signature_present: dccResult.signaturePresent,
            dcc_schema_valid: dccResult.schemaValid,
            parse_errors: dccResult.parseErrors,
          };

          // Validate signature if present
          if (dccResult.signaturePresent) {
            const sigValid = await validateDCCSignature(item.raw_content);
            parseResult.dcc_signature_valid = sigValid;
          }
        } else if (item.format === "JSON" && item.raw_content) {
          try {
            parseResult = JSON.parse(item.raw_content);
          } catch {
            throw new Error("Invalid JSON content");
          }
        } else if (item.format === "PDF") {
          // PDF parsing requires AI extraction — mark for manual review
          parseResult = { requires_ai_extraction: true, format: "PDF" };
        } else if (item.format === "CSV" && item.raw_content) {
          // Basic CSV parsing
          const lines = item.raw_content.split("\n").filter((l: string) => l.trim());
          if (lines.length < 2) throw new Error("CSV has no data rows");
          const headers = lines[0].split(",").map((h: string) => h.trim().toLowerCase());
          const row = lines[1].split(",").map((v: string) => v.trim());
          parseResult = {};
          headers.forEach((h: string, i: number) => { parseResult[h] = row[i]; });
        }

        if (!parseResult) throw new Error(`Unsupported format: ${item.format}`);

        // Update queue with parse result
        await supabase.from("certificate_import_queue")
          .update({ parse_result: parseResult, status: "PARSED" })
          .eq("id", item.id);

        // Try to create calibration_certificate
        const certNumber = parseResult.certificate_number || parseResult.cert_number || parseResult.certificateNumber;
        const calDate = parseResult.calibration_date || parseResult.calibrationDate;
        const serial = parseResult.instrument_serial || parseResult.instrumentSerial || parseResult.serial;

        if (certNumber && calDate) {
          const certPayload: Record<string, any> = {
            org_id: item.org_id,
            provider_id: item.provider_id,
            certificate_number: certNumber,
            calibration_date: calDate,
            next_calibration_date: parseResult.next_calibration_date || parseResult.nextCalibrationDate,
            instrument_serial: serial,
            instrument_description: parseResult.instrument_description || parseResult.instrumentDescription,
            instrument_manufacturer: parseResult.instrument_manufacturer || parseResult.instrumentManufacturer,
            instrument_model: parseResult.instrument_model || parseResult.instrumentModel,
            overall_result: parseResult.overall_result || parseResult.overallResult || "PASS",
            results: parseResult.results ?? [],
            reference_standards: parseResult.reference_standards ?? [],
            environmental_conditions: parseResult.environmental_conditions ?? {},
            raw_format: item.format,
            raw_content: item.raw_content,
            dcc_signature_valid: parseResult.dcc_signature_valid,
            import_queue_id: item.id,
          };

          // Try auto-match to asset by serial number
          if (serial) {
            const { data: matchedAsset } = await supabase
              .from("assets")
              .select("id")
              .eq("serial_number", serial)
              .eq("requires_calibration", true)
              .maybeSingle();

            if (matchedAsset) {
              certPayload.asset_id = matchedAsset.id;
              certPayload.match_method = "SERIAL_NUMBER";
              certPayload.matched_at = new Date().toISOString();
            }
          }

          const { data: cert, error: certErr } = await supabase
            .from("calibration_certificates")
            .insert(certPayload)
            .select()
            .single();

          if (certErr) {
            // Might be duplicate
            if (certErr.message?.includes("unique") || certErr.message?.includes("duplicate")) {
              await supabase.from("certificate_import_queue")
                .update({ status: "FAILED", error_message: "Duplicate certificate number", processing_completed_at: new Date().toISOString() })
                .eq("id", item.id);
              failed++;
              continue;
            }
            throw certErr;
          }

          // Update queue with certificate reference
          const newStatus = cert.asset_id ? "MATCHED" : "PARSED";
          await supabase.from("certificate_import_queue")
            .update({
              certificate_id: cert.id,
              status: newStatus,
              processing_completed_at: new Date().toISOString(),
            })
            .eq("id", item.id);

          // If matched, auto-create calibration_record
          if (cert.asset_id) {
            matched++;
            const result = cert.overall_result === "FAIL" ? "FAIL"
              : cert.overall_result === "ADJUSTED_PASS" ? "CONDITIONAL_PASS" : "PASS";

            const nextDue = cert.next_calibration_date
              ?? new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);

            await supabase.from("calibration_records").insert({
              asset_id: cert.asset_id,
              org_id: item.org_id,
              calibration_date: cert.calibration_date,
              next_due_date: nextDue,
              performed_by: cert.instrument_manufacturer ?? "External Provider",
              calibration_lab: cert.provider_id ? "External" : "Unknown",
              certificate_number: cert.certificate_number,
              result,
              measurement_after: { results: cert.results },
              notes: `Auto-imported from certificate ${cert.certificate_number}`,
            });

            // Update asset calibration dates
            await supabase.from("assets").update({
              last_calibrated_at: new Date(cert.calibration_date).toISOString(),
              next_calibration_due: nextDue,
              status: result === "FAIL" ? "INACTIVE" : "ACTIVE",
              updated_at: new Date().toISOString(),
            }).eq("id", cert.asset_id);

            await supabase.from("certificate_import_queue")
              .update({ status: "VERIFIED" })
              .eq("id", item.id);

            // If FAIL: auto-create NC
            if (result === "FAIL") {
              await supabase.from("non_conformances").insert({
                org_id: item.org_id,
                title: `Kalibreringsfel (importerat): ${cert.instrument_description ?? cert.instrument_serial}`,
                description: `Importerat certifikat ${cert.certificate_number} visar FAIL. Retroaktiv analys krävs.`,
                severity: "MAJOR",
                source: "ASSET_CALIBRATION",
                status: "OPEN",
              });
            }

            // If DCC signature invalid: alert
            if (parseResult.dcc_signature_present && parseResult.dcc_signature_valid === false) {
              await supabase.from("tasks").insert({
                org_id: item.org_id,
                title: `DCC signatur ogiltig: ${cert.certificate_number}`,
                description: `Digital Calibration Certificate ${cert.certificate_number} har en ogiltig signatur. Verifiera med leverantören.`,
                status: "TODO",
                priority: "HIGH",
                type: "COMPLIANCE",
              });
            }
          }
        } else {
          // Could not extract enough data — mark for manual review
          await supabase.from("certificate_import_queue")
            .update({
              status: "MANUAL_REVIEW",
              error_message: "Could not extract certificate_number and calibration_date",
              processing_completed_at: new Date().toISOString(),
            })
            .eq("id", item.id);
        }

        processed++;
      } catch (err: any) {
        await supabase.from("certificate_import_queue")
          .update({
            status: "FAILED",
            error_message: err.message,
            retry_count: (item.retry_count ?? 0) + 1,
            processing_completed_at: new Date().toISOString(),
          })
          .eq("id", item.id);
        failed++;
      }
    }

    console.log(`[calibration] Queue processed: ${processed} items, ${matched} matched, ${failed} failed`);
    return { processed, matched, failed };
  },
});

// ---------------------------------------------------------------------------
// Daily 07:00: Report to QUALITY_MANAGER
// Imported certificates, failed, unmatched
// ---------------------------------------------------------------------------
export const calibrationDailyReport = schedules.task({
  id: "calibration-daily-report",
  cron: "0 7 * * *",
  run: async () => {
    const yesterday = new Date(Date.now() - 24 * 3600000).toISOString();

    const [
      { count: imported },
      { count: failedCount },
      { count: unmatchedCount },
      { count: manualReview },
    ] = await Promise.all([
      supabase.from("certificate_import_queue").select("id", { count: "exact", head: true })
        .gte("processing_completed_at", yesterday).in("status", ["VERIFIED", "MATCHED", "PARSED"]),
      supabase.from("certificate_import_queue").select("id", { count: "exact", head: true })
        .gte("processing_completed_at", yesterday).eq("status", "FAILED"),
      supabase.from("calibration_certificates").select("id", { count: "exact", head: true })
        .is("asset_id", null),
      supabase.from("certificate_import_queue").select("id", { count: "exact", head: true })
        .eq("status", "MANUAL_REVIEW"),
    ]);

    const report = {
      date: new Date().toISOString().slice(0, 10),
      imported_last_24h: imported ?? 0,
      failed_last_24h: failedCount ?? 0,
      total_unmatched: unmatchedCount ?? 0,
      pending_manual_review: manualReview ?? 0,
    };

    await supabase.from("audit_logs").insert({
      entity_type: "calibration_import",
      action: "daily_report",
      metadata: report,
    });

    // Create task if there are unmatched or failed
    if ((unmatchedCount ?? 0) > 0 || (manualReview ?? 0) > 0) {
      const orgs = await supabase.from("organizations").select("id");
      for (const org of orgs?.data ?? []) {
        const { count: existing } = await supabase.from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("org_id", org.id)
          .eq("type", "CALIBRATION_REVIEW")
          .in("status", ["TODO", "IN_PROGRESS"]);

        if ((existing ?? 0) === 0) {
          await supabase.from("tasks").insert({
            org_id: org.id,
            title: `Kalibreringsimport: ${unmatchedCount ?? 0} omatchade, ${manualReview ?? 0} väntar på granskning`,
            description: `Daglig rapport: ${report.imported_last_24h} importerade, ${report.failed_last_24h} misslyckade. Manuell matchning krävs.`,
            status: "TODO",
            priority: (unmatchedCount ?? 0) > 5 ? "HIGH" : "MEDIUM",
            type: "CALIBRATION_REVIEW",
          });
        }
      }
    }

    console.log(`[calibration] Daily report: ${JSON.stringify(report)}`);
    return report;
  },
});

// ---------------------------------------------------------------------------
// Every 30 minutes: Check for DCC signature validation queue
// ---------------------------------------------------------------------------
export const dccSignatureValidation = schedules.task({
  id: "dcc-signature-validation",
  cron: "*/30 * * * *",
  run: async () => {
    // Find certificates with DCC format that haven't been signature-checked
    const { data: unchecked } = await supabase
      .from("calibration_certificates")
      .select("id, raw_content")
      .eq("raw_format", "DCC_XML")
      .is("dcc_signature_valid", null)
      .not("raw_content", "is", null)
      .limit(10);

    let checked = 0;
    for (const cert of unchecked ?? []) {
      if (!cert.raw_content) continue;

      const isValid = await validateDCCSignature(cert.raw_content);
      await supabase.from("calibration_certificates").update({
        dcc_signature_valid: isValid,
        dcc_signature_checked_at: new Date().toISOString(),
      }).eq("id", cert.id);

      if (!isValid) {
        // Alert — signature invalid
        const { data: fullCert } = await supabase.from("calibration_certificates")
          .select("certificate_number, org_id").eq("id", cert.id).single();
        if (fullCert) {
          await supabase.from("tasks").insert({
            org_id: fullCert.org_id,
            title: `DCC signatur ogiltig: ${fullCert.certificate_number}`,
            description: `X.509-signaturen på DCC-certifikatet kunde inte verifieras. Kontakta kalibreringsaktören.`,
            status: "TODO",
            priority: "HIGH",
            type: "COMPLIANCE",
          });
        }
      }
      checked++;
    }

    console.log(`[calibration] DCC signature check: ${checked} certificates validated`);
    return { checked };
  },
});
