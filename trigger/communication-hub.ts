import { schedules } from "@trigger.dev/sdk/v3";

// =============================================================================
// Communication Hub — Trigger.dev Background Jobs
//
// 1. Mailbox sync (fetch new messages from providers)
// 2. Bot message processor (classify, route, act)
// 3. Invoice verification bot
// 4. Notification dispatcher
// 5. Daily digest sender
// 6. Stale conversation cleanup
// 7. Bot accuracy reporting
// =============================================================================

// ---------------------------------------------------------------------------
// 1. Mailbox Sync — Fetch new messages from all active mailboxes
//    Runs every 2 minutes
// ---------------------------------------------------------------------------
export const commMailboxSync = schedules.task({
  id: "comm-mailbox-sync",
  cron: "*/2 * * * *",
  run: async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get all active mailboxes
    const { data: mailboxes } = await supabase
      .from("org_mailboxes")
      .select("*")
      .eq("is_active", true);

    if (!mailboxes?.length) return { synced: 0 };

    let totalSynced = 0;

    for (const mailbox of mailboxes) {
      try {
        // Provider-specific sync logic
        switch (mailbox.provider) {
          case "GMAIL":
            // Use Gmail API with service account or OAuth
            // Fetch messages since last sync_cursor (historyId)
            // For each new message:
            //   1. Parse headers, body, attachments
            //   2. Find or create conversation (by thread ID)
            //   3. Insert comm_message
            //   4. Upload attachments to Supabase Storage
            //   5. Queue for bot processing
            break;

          case "ICLOUD":
            // Use IMAP with app-specific password
            // Fetch UNSEEN messages since last sync
            break;

          case "SLACK":
            // Use Slack Web API conversations.history
            // Track cursor per channel
            break;

          case "WHATSAPP":
            // WhatsApp Business API webhook (push-based)
            // This job handles missed webhooks
            break;

          case "TELEGRAM":
            // Telegram Bot API getUpdates with offset
            break;

          default:
            // SMTP/IMAP generic
            break;
        }

        // Update sync cursor
        await supabase
          .from("org_mailboxes")
          .update({
            last_sync_at: new Date().toISOString(),
          })
          .eq("id", mailbox.id);

        totalSynced++;
      } catch (err: any) {
        console.error(`Sync failed for mailbox ${mailbox.id}:`, err.message);
      }
    }

    return { synced: totalSynced, total_mailboxes: mailboxes.length };
  },
});

// ---------------------------------------------------------------------------
// 2. Bot Message Processor — AI classification, routing, actions
//    Runs every 30 seconds
// ---------------------------------------------------------------------------
export const commBotProcessor = schedules.task({
  id: "comm-bot-processor",
  cron: "* * * * *", // every minute (30s not supported in cron)
  run: async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get queued messages
    const { data: messages } = await supabase
      .from("comm_messages")
      .select("*, conversation:comm_conversations(*)")
      .eq("processing_status", "QUEUED")
      .eq("direction", "INBOUND")
      .order("received_at", { ascending: true })
      .limit(50);

    if (!messages?.length) return { processed: 0 };

    let processed = 0;

    for (const message of messages) {
      try {
        // Mark as processing
        await supabase
          .from("comm_messages")
          .update({ processing_status: "PROCESSING" })
          .eq("id", message.id);

        // Get bot config for this mailbox/department
        const { data: botConfig } = await supabase
          .from("comm_bot_configs")
          .select("*")
          .eq("org_id", message.org_id)
          .eq("mailbox_id", message.mailbox_id)
          .eq("is_active", true)
          .single();

        if (!botConfig) {
          // No bot configured, just mark as classified
          await supabase
            .from("comm_messages")
            .update({ processing_status: "CLASSIFIED" })
            .eq("id", message.id);
          continue;
        }

        // --- AI Classification ---
        const classification = await classifyMessage(message, botConfig);

        // Update message with classification
        await supabase
          .from("comm_messages")
          .update({
            processing_status: "CLASSIFIED",
            bot_classification: classification,
          })
          .eq("id", message.id);

        // Update conversation
        await supabase
          .from("comm_conversations")
          .update({
            bot_category: classification.category,
            bot_confidence: classification.confidence,
            bot_summary: classification.summary,
            priority: classification.priority || "NORMAL",
            tags: classification.tags || [],
            language: classification.language,
          })
          .eq("id", message.conversation_id);

        // --- Route to assignee ---
        if (botConfig.routing_matrix[classification.category]) {
          const assignee = botConfig.routing_matrix[classification.category];
          await supabase
            .from("comm_conversations")
            .update({
              assigned_to: assignee,
              status: "ROUTED",
            })
            .eq("id", message.conversation_id);

          // Log bot action
          await logBotAction(supabase, {
            org_id: message.org_id,
            bot_config_id: botConfig.id,
            message_id: message.id,
            conversation_id: message.conversation_id,
            action_type: "ROUTE",
            action_output: { assigned_to: assignee, category: classification.category },
            confidence: classification.confidence,
          });
        }

        // --- Auto-reply if enabled ---
        if (botConfig.auto_reply_enabled && classification.should_auto_reply) {
          await logBotAction(supabase, {
            org_id: message.org_id,
            bot_config_id: botConfig.id,
            message_id: message.id,
            conversation_id: message.conversation_id,
            action_type: "AUTO_REPLY",
            action_output: { template: classification.auto_reply_template },
            confidence: classification.confidence,
            requires_review: classification.confidence < 0.8,
          });
        }

        // --- Invoice verification (for INVOICES department) ---
        if (botConfig.department === "INVOICES" && classification.category === "invoice") {
          await logBotAction(supabase, {
            org_id: message.org_id,
            bot_config_id: botConfig.id,
            message_id: message.id,
            conversation_id: message.conversation_id,
            action_type: "VERIFY_INVOICE",
            action_input: classification.extracted_data,
            action_output: { status: "pending_verification" },
            requires_review: true,
          });
        }

        // --- Create task if needed ---
        if (botConfig.can_create_tasks && classification.should_create_task) {
          await logBotAction(supabase, {
            org_id: message.org_id,
            bot_config_id: botConfig.id,
            message_id: message.id,
            conversation_id: message.conversation_id,
            action_type: "CREATE_TASK",
            action_output: { task_title: classification.task_title },
            confidence: classification.confidence,
            requires_review: classification.confidence < 0.9,
          });
        }

        // --- Store attachments in correct location ---
        const { data: attachments } = await supabase
          .from("comm_attachments")
          .select("*")
          .eq("message_id", message.id);

        if (attachments?.length) {
          for (const att of attachments) {
            await logBotAction(supabase, {
              org_id: message.org_id,
              bot_config_id: botConfig.id,
              message_id: message.id,
              conversation_id: message.conversation_id,
              action_type: "STORE_ATTACHMENT",
              action_input: { filename: att.filename, content_type: att.content_type },
              action_output: { category: att.file_category, storage_path: att.storage_path },
              confidence: 1.0,
            });
          }
        }

        // Update bot stats
        await supabase
          .from("comm_bot_configs")
          .update({
            total_processed: (botConfig.total_processed || 0) + 1,
          })
          .eq("id", botConfig.id);

        // Final status
        await supabase
          .from("comm_messages")
          .update({ processing_status: "ROUTED" })
          .eq("id", message.id);

        processed++;
      } catch (err: any) {
        console.error(`Bot processing failed for message ${message.id}:`, err.message);
        await supabase
          .from("comm_messages")
          .update({ processing_status: "FAILED" })
          .eq("id", message.id);
      }
    }

    return { processed, total_queued: messages.length };
  },
});

// ---------------------------------------------------------------------------
// 3. Invoice Verification Bot — Matches invoices against POs and budgets
//    Runs every 5 minutes
// ---------------------------------------------------------------------------
export const commInvoiceVerifier = schedules.task({
  id: "comm-invoice-verifier",
  cron: "*/5 * * * *",
  run: async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get pending invoice verifications
    const { data: pendingActions } = await supabase
      .from("comm_bot_actions")
      .select("*, message:comm_messages(*), conversation:comm_conversations(*)")
      .eq("action_type", "VERIFY_INVOICE")
      .eq("requires_review", true)
      .is("reviewed_at", null)
      .order("created_at", { ascending: true })
      .limit(20);

    if (!pendingActions?.length) return { verified: 0 };

    let verified = 0;

    for (const action of pendingActions) {
      try {
        const invoiceData = action.action_input;
        if (!invoiceData) continue;

        const verification: any = {
          supplier_matched: false,
          po_matched: false,
          budget_ok: false,
          duplicate_check: false,
          amount_ok: false,
          issues: [],
        };

        // 1. Check supplier exists in approved supplier list
        if (invoiceData.supplier_name || invoiceData.supplier_org_number) {
          const { data: supplier } = await supabase
            .from("suppliers")
            .select("id, name, status")
            .eq("org_id", action.org_id)
            .or(`name.ilike.%${invoiceData.supplier_name}%,org_number.eq.${invoiceData.supplier_org_number || ''}`)
            .single();

          verification.supplier_matched = !!supplier;
          if (supplier?.status !== "APPROVED") {
            verification.issues.push(`Supplier ${invoiceData.supplier_name} is not approved (status: ${supplier?.status})`);
          }
        }

        // 2. Match against purchase order
        if (invoiceData.po_number) {
          // Look in existing invoices/transactions for PO reference
          const { data: existing } = await supabase
            .from("invoices")
            .select("id, amount, status")
            .eq("org_id", action.org_id)
            .ilike("reference", `%${invoiceData.po_number}%`);

          verification.po_matched = (existing?.length || 0) > 0;
          if (!verification.po_matched) {
            verification.issues.push(`PO ${invoiceData.po_number} not found in system`);
          }
        }

        // 3. Check for duplicates
        if (invoiceData.invoice_number) {
          const { data: dupes } = await supabase
            .from("invoices")
            .select("id, reference")
            .eq("org_id", action.org_id)
            .ilike("reference", `%${invoiceData.invoice_number}%`);

          verification.duplicate_check = (dupes?.length || 0) === 0;
          if (!verification.duplicate_check) {
            verification.issues.push(`Possible duplicate: invoice ${invoiceData.invoice_number} already exists`);
          }
        }

        // 4. Budget check
        verification.budget_ok = true; // Placeholder — integrate with finance module

        // 5. Amount sanity check
        if (invoiceData.amount) {
          verification.amount_ok = invoiceData.amount > 0 && invoiceData.amount < 10000000;
        }

        // Update the action with verification results
        const allOk = verification.supplier_matched &&
                      verification.duplicate_check &&
                      verification.budget_ok &&
                      verification.amount_ok &&
                      verification.issues.length === 0;

        await supabase
          .from("comm_bot_actions")
          .update({
            action_output: { ...action.action_output, verification },
            requires_review: !allOk, // auto-approve if everything checks out
            review_outcome: allOk ? "approved" : null,
            reviewed_at: allOk ? new Date().toISOString() : null,
          })
          .eq("id", action.id);

        verified++;
      } catch (err: any) {
        console.error(`Invoice verification failed for action ${action.id}:`, err.message);
      }
    }

    return { verified };
  },
});

// ---------------------------------------------------------------------------
// 4. Notification Dispatcher — Send queued notifications
//    Runs every minute
// ---------------------------------------------------------------------------
export const commNotificationDispatcher = schedules.task({
  id: "comm-notification-dispatcher",
  cron: "* * * * *",
  run: async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const now = new Date().toISOString();

    // Get pending notifications that are due
    const { data: notifications } = await supabase
      .from("notification_queue")
      .select("*, preferences:notification_preferences!inner(*)")
      .eq("status", "PENDING")
      .lte("scheduled_at", now)
      .order("priority", { ascending: false })
      .order("scheduled_at", { ascending: true })
      .limit(100);

    if (!notifications?.length) return { sent: 0 };

    let sent = 0;
    let failed = 0;

    for (const notif of notifications) {
      try {
        // Check quiet hours
        const prefs = notif.preferences;
        if (prefs?.quiet_hours_enabled) {
          // Skip if in quiet hours — re-schedule
          // (simplified — would need timezone-aware check)
        }

        // Send via appropriate channel
        switch (notif.channel) {
          case "GMAIL":
          case "ICLOUD":
          case "SMTP_GENERIC":
            // Send email via provider API or SMTP
            break;
          case "SLACK":
            // Send Slack message via Web API
            break;
          case "WHATSAPP":
            // Send via WhatsApp Business API
            break;
          case "TELEGRAM":
            // Send via Telegram Bot API
            break;
          case "SMS":
            // Send via Twilio/similar
            break;
          default:
            break;
        }

        await supabase
          .from("notification_queue")
          .update({
            status: "SENT",
            sent_at: new Date().toISOString(),
            attempts: notif.attempts + 1,
          })
          .eq("id", notif.id);

        sent++;
      } catch (err: any) {
        const newAttempts = notif.attempts + 1;
        await supabase
          .from("notification_queue")
          .update({
            status: newAttempts >= notif.max_attempts ? "FAILED" : "PENDING",
            attempts: newAttempts,
            last_error: err.message,
            // Exponential backoff
            scheduled_at: new Date(
              Date.now() + Math.pow(2, newAttempts) * 1000
            ).toISOString(),
          })
          .eq("id", notif.id);

        failed++;
      }
    }

    return { sent, failed, total: notifications.length };
  },
});

// ---------------------------------------------------------------------------
// 5. Daily Digest — Compile and send daily email digests
//    Runs at 07:00 every day
// ---------------------------------------------------------------------------
export const commDailyDigest = schedules.task({
  id: "comm-daily-digest",
  cron: "0 7 * * *",
  run: async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get users who want daily digest
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("*, user:users(id, name, email)")
      .eq("digest_enabled", true)
      .eq("digest_frequency", "daily");

    if (!prefs?.length) return { digests_sent: 0 };

    let sent = 0;

    for (const pref of prefs) {
      try {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        // Get unread conversations
        const { data: unread } = await supabase
          .from("comm_conversations")
          .select("id, subject, department, priority, unread_count, last_message_at")
          .eq("org_id", pref.org_id)
          .or(`assigned_to.eq.${pref.user_id},assigned_to.is.null`)
          .gt("unread_count", 0)
          .gte("last_message_at", since)
          .order("priority", { ascending: false })
          .limit(20);

        // Get bot actions requiring review
        const { data: reviewActions } = await supabase
          .from("comm_bot_actions")
          .select("id, action_type, confidence, created_at")
          .eq("org_id", pref.org_id)
          .eq("requires_review", true)
          .is("reviewed_at", null)
          .limit(10);

        // Queue digest notification
        await supabase.from("notification_queue").insert({
          org_id: pref.org_id,
          user_id: pref.user_id,
          channel: "GMAIL",
          recipient: (pref as any).user?.email,
          subject: `Daglig sammanfattning — ${unread?.length || 0} olästa, ${reviewActions?.length || 0} väntar granskning`,
          body: JSON.stringify({ unread, review_actions: reviewActions }),
          priority: "LOW",
          source_type: "digest",
        });

        sent++;
      } catch (err: any) {
        console.error(`Digest failed for user ${pref.user_id}:`, err.message);
      }
    }

    return { digests_sent: sent };
  },
});

// ---------------------------------------------------------------------------
// 6. Stale Conversation Cleanup — Auto-archive old conversations
//    Runs daily at 02:00
// ---------------------------------------------------------------------------
export const commStaleCleanup = schedules.task({
  id: "comm-stale-cleanup",
  cron: "0 2 * * *",
  run: async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Archive conversations with no activity in 30 days
    const { data, error } = await supabase
      .from("comm_conversations")
      .update({ status: "ARCHIVED" })
      .lt("last_message_at", thirtyDaysAgo)
      .in("status", ["AWAITING_ACTION", "ROUTED", "CLASSIFIED"])
      .eq("unread_count", 0)
      .select("id");

    return { archived: data?.length || 0, error: error?.message };
  },
});

// ---------------------------------------------------------------------------
// 7. Bot Accuracy Report — Weekly accuracy metrics
//    Runs every Monday at 06:00
// ---------------------------------------------------------------------------
export const commBotAccuracyReport = schedules.task({
  id: "comm-bot-accuracy-report",
  cron: "0 6 * * 1",
  run: async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get all bot configs
    const { data: bots } = await supabase
      .from("comm_bot_configs")
      .select("id, org_id, department, name");

    if (!bots?.length) return { bots_updated: 0 };

    for (const bot of bots) {
      // Get reviewed actions from past week
      const { data: actions } = await supabase
        .from("comm_bot_actions")
        .select("review_outcome, confidence")
        .eq("bot_config_id", bot.id)
        .not("reviewed_at", "is", null)
        .gte("created_at", weekAgo);

      if (!actions?.length) continue;

      const approved = actions.filter((a) => a.review_outcome === "approved").length;
      const accuracy = approved / actions.length;

      await supabase
        .from("comm_bot_configs")
        .update({ accuracy_score: Math.round(accuracy * 100) / 100 })
        .eq("id", bot.id);
    }

    return { bots_updated: bots.length };
  },
});

// =============================================================================
// Helper functions
// =============================================================================

async function classifyMessage(message: any, botConfig: any): Promise<any> {
  // This would call Claude API for intelligent classification
  // For now, return a structured placeholder
  const subject = (message.subject || "").toLowerCase();
  const body = (message.body_text || "").toLowerCase();
  const combined = `${subject} ${body}`;

  // Rule-based fallback classification
  let category = "general";
  let confidence = 0.5;
  let priority = "NORMAL";

  // Invoice detection
  if (combined.match(/faktura|invoice|betalning|payment|förfallo/)) {
    category = "invoice";
    confidence = 0.85;
    priority = "HIGH";
  }
  // Support request
  else if (combined.match(/hjälp|help|problem|error|fel|support/)) {
    category = "support";
    confidence = 0.8;
    priority = "NORMAL";
  }
  // Legal
  else if (combined.match(/avtal|contract|juridisk|legal|gdpr|villkor/)) {
    category = "legal";
    confidence = 0.8;
    priority = "HIGH";
  }
  // HR/Personnel
  else if (combined.match(/semester|vacation|sjuk|sick|anställ|employ|lön|salary/)) {
    category = "hr";
    confidence = 0.8;
    priority = "NORMAL";
  }
  // Urgent
  else if (combined.match(/brådskande|urgent|akut|omedelbar|immediately/)) {
    priority = "URGENT";
    confidence = 0.9;
  }
  // Quality/NC
  else if (combined.match(/avvikelse|reklamation|kvalitet|quality|defect/)) {
    category = "quality";
    confidence = 0.8;
    priority = "HIGH";
  }

  // Language detection (simple)
  const language = combined.match(/[åäö]/) ? "sv" : "en";

  return {
    category,
    confidence,
    priority,
    language,
    summary: (message.body_text || "").substring(0, 200),
    tags: [category],
    should_auto_reply: botConfig.auto_reply_enabled && confidence > 0.8,
    should_create_task: confidence > 0.85 && ["support", "quality"].includes(category),
    task_title: `${category}: ${message.subject || "Nytt ärende"}`,
    extracted_data: extractInvoiceData(combined),
  };
}

function extractInvoiceData(text: string): any {
  // Simple regex-based extraction (would be replaced by AI)
  const amount = text.match(/(\d[\d\s]*[,.]?\d{0,2})\s*(kr|sek|eur|usd)/i);
  const invoiceNum = text.match(/faktura\s*(?:nr|nummer|#)?\s*[:\s]?\s*(\w+)/i);
  const poNum = text.match(/(?:order|beställning|po)\s*(?:nr|nummer|#)?\s*[:\s]?\s*(\w+)/i);
  const dueDate = text.match(/förfallo\s*(?:dag|datum)?\s*[:\s]?\s*(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/i);

  return {
    amount: amount ? parseFloat(amount[1].replace(/\s/g, "").replace(",", ".")) : null,
    currency: amount ? amount[2].toUpperCase() : null,
    invoice_number: invoiceNum ? invoiceNum[1] : null,
    po_number: poNum ? poNum[1] : null,
    due_date: dueDate ? dueDate[1] : null,
  };
}

async function logBotAction(
  supabase: any,
  action: {
    org_id: string;
    bot_config_id: string;
    message_id?: string;
    conversation_id?: string;
    action_type: string;
    action_input?: any;
    action_output?: any;
    confidence?: number;
    requires_review?: boolean;
    created_entity_type?: string;
    created_entity_id?: string;
  }
) {
  await supabase.from("comm_bot_actions").insert({
    org_id: action.org_id,
    bot_config_id: action.bot_config_id,
    message_id: action.message_id,
    conversation_id: action.conversation_id,
    action_type: action.action_type,
    action_input: action.action_input || {},
    action_output: action.action_output || {},
    confidence: action.confidence,
    requires_review: action.requires_review || false,
    created_entity_type: action.created_entity_type,
    created_entity_id: action.created_entity_id,
  });
}
