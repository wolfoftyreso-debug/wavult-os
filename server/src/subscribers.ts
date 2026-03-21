import { eventBus, DomainEvent } from "./events";
import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Helper: Look up canonical entity ID from entities table
// ---------------------------------------------------------------------------
async function lookupEntityId(
  sourceTable: string,
  sourceId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("entities")
    .select("id")
    .eq("source_table", sourceTable)
    .eq("source_id", sourceId)
    .maybeSingle();

  if (error) {
    console.error(
      `[subscribers] Failed to look up entity for ${sourceTable}/${sourceId}:`,
      error.message
    );
    return null;
  }

  return data?.id ?? null;
}

// ---------------------------------------------------------------------------
// Helper: Register a new entity in the entities table
// ---------------------------------------------------------------------------
async function registerEntity(
  sourceTable: string,
  sourceId: string,
  orgId: string,
  label?: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("entities")
    .insert({
      source_table: sourceTable,
      source_id: sourceId,
      org_id: orgId,
      label: label ?? null,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error(
      `[subscribers] Failed to register entity ${sourceTable}/${sourceId}:`,
      error.message
    );
    return null;
  }

  return data.id;
}

// ---------------------------------------------------------------------------
// Helper: Ensure entity exists (look up or create)
// ---------------------------------------------------------------------------
async function ensureEntityId(
  sourceTable: string,
  sourceId: string,
  orgId: string,
  label?: string
): Promise<string | null> {
  const existing = await lookupEntityId(sourceTable, sourceId);
  if (existing) return existing;
  return registerEntity(sourceTable, sourceId, orgId, label);
}

// ---------------------------------------------------------------------------
// Helper: Create a relation between two entities
// ---------------------------------------------------------------------------
async function createRelation(
  fromEntityId: string,
  toEntityId: string,
  relationType: string,
  orgId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from("entity_relations").insert({
    from_entity_id: fromEntityId,
    to_entity_id: toEntityId,
    relation_type: relationType,
    org_id: orgId,
    metadata: metadata ?? null,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error(
      `[subscribers] Failed to create relation ${relationType} (${fromEntityId} → ${toEntityId}):`,
      error.message
    );
  }
}

// ---------------------------------------------------------------------------
// Helper: Create a task with entity registration
// ---------------------------------------------------------------------------
async function createTask(params: {
  title: string;
  description?: string;
  assigned_to?: string;
  priority?: number;
  org_id: string;
  created_by?: string;
  due_date?: string;
  status?: string;
}): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title: params.title,
      description: params.description ?? null,
      assigned_to: params.assigned_to ?? null,
      priority: params.priority ?? 3,
      org_id: params.org_id,
      created_by: params.created_by ?? "system",
      due_date: params.due_date ?? null,
      status: params.status ?? "open",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error(
      `[subscribers] Failed to create task "${params.title}":`,
      error.message
    );
    return null;
  }

  return data;
}

// ---------------------------------------------------------------------------
// Helper: Severity to priority mapping
// ---------------------------------------------------------------------------
function severityToPriority(severity: string): number {
  switch (severity) {
    case "CRITICAL":
      return 1;
    case "MAJOR":
      return 2;
    case "MINOR":
      return 3;
    case "OBSERVATION":
      return 4;
    default:
      return 3;
  }
}

// ---------------------------------------------------------------------------
// 1. nc.raised → auto-create Task + Relation
// ---------------------------------------------------------------------------
function subscribeNcRaised(): void {
  eventBus.on("nc.raised", async (event: DomainEvent) => {
    try {
      const ncId = event.source_id;
      const orgId = event.org_id;

      // Look up the NC to get process_id, title, severity
      const { data: nc, error: ncErr } = await supabase
        .from("non_conformances")
        .select("id, title, severity, process_id")
        .eq("id", ncId)
        .single();

      if (ncErr || !nc) {
        console.error("[subscribers] nc.raised: NC not found:", ncId);
        return;
      }

      // Find process owner
      let assignedTo: string | undefined;
      if (nc.process_id) {
        const { data: process } = await supabase
          .from("processes")
          .select("owner_id")
          .eq("id", nc.process_id)
          .single();

        if (process?.owner_id) {
          assignedTo = process.owner_id;
        }
      }

      // Create task
      const priority = severityToPriority(nc.severity);
      const task = await createTask({
        title: `Hantera avvikelse: ${nc.title}`,
        description: `Automatiskt skapad uppgift för avvikelse ${nc.id} (${nc.severity})`,
        assigned_to: assignedTo,
        priority,
        org_id: orgId,
        created_by: event.actor_id,
      });

      if (!task) return;

      // Emit task.created event
      await eventBus.emit({
        org_id: orgId,
        event_type: "task.created",
        entity_type: "tasks",
        source_id: task.id,
        actor_id: event.actor_id,
        payload: {
          title: `Hantera avvikelse: ${nc.title}`,
          created_by_subscriber: "nc.raised",
        },
      });

      // Create entity registrations and relation: NC → RESULTED_IN → Task
      const ncEntityId = await ensureEntityId(
        "non_conformances",
        ncId,
        orgId,
        nc.title
      );
      const taskEntityId = await ensureEntityId(
        "tasks",
        task.id,
        orgId,
        `Hantera avvikelse: ${nc.title}`
      );

      if (ncEntityId && taskEntityId) {
        await createRelation(ncEntityId, taskEntityId, "RESULTED_IN", orgId);
      }

      console.log(
        `[subscribers] nc.raised: Created task ${task.id} for NC ${ncId}`
      );
    } catch (err) {
      console.error("[subscribers] nc.raised handler error:", err);
    }
  });
}

// ---------------------------------------------------------------------------
// 2. deal.won → auto-create Transaction + Task + Relations
// ---------------------------------------------------------------------------
function subscribeDealWon(): void {
  eventBus.on("deal.won", async (event: DomainEvent) => {
    try {
      const dealId = event.source_id;
      const orgId = event.org_id;

      // Get the deal
      const { data: deal, error: dealErr } = await supabase
        .from("deals")
        .select("id, name, value, currency, contact_id, created_by")
        .eq("id", dealId)
        .single();

      if (dealErr || !deal) {
        console.error("[subscribers] deal.won: Deal not found:", dealId);
        return;
      }

      const dealValue = Number(deal.value ?? 0);
      const dealCurrency = deal.currency || "SEK";

      // Determine revenue account: 3040 for SEK, 3050 for non-SEK
      const revenueAccount = dealCurrency === "SEK" ? "3040" : "3050";

      // Handle multi-currency: convert to EUR if not already EUR
      let eurAmount = dealValue;
      if (dealCurrency !== "EUR" && dealValue > 0) {
        const { data: rateRow } = await supabase
          .from("exchange_rates")
          .select("rate")
          .eq("from_currency", dealCurrency)
          .eq("to_currency", "EUR")
          .order("effective_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (rateRow) {
          eurAmount = Math.round(dealValue * rateRow.rate * 100) / 100;
        }
      }

      // Create ledger transaction: DR 1510 Kundfordringar / CR revenue account
      const { data: entry, error: entryErr } = await supabase
        .from("ledger_entries")
        .insert({
          org_id: orgId,
          description: `Vunnen affär: ${deal.name ?? dealId}`,
          reference: `deal:${dealId}`,
          created_by: event.actor_id ?? "system",
        })
        .select("id")
        .single();

      if (entryErr || !entry) {
        console.error(
          "[subscribers] deal.won: Failed to create ledger entry:",
          entryErr?.message
        );
      } else {
        // Insert the ledger lines
        const { error: linesErr } = await supabase
          .from("ledger_lines")
          .insert([
            {
              entry_id: entry.id,
              account_id: "1510",
              debit: dealValue,
              credit: 0,
              org_id: orgId,
            },
            {
              entry_id: entry.id,
              account_id: revenueAccount,
              debit: 0,
              credit: dealValue,
              org_id: orgId,
            },
          ]);

        if (linesErr) {
          console.error(
            "[subscribers] deal.won: Failed to create ledger lines:",
            linesErr.message
          );
        }

        // Create Relation: Deal → GENERATED → Transaction
        const dealEntityId = await ensureEntityId(
          "deals",
          dealId,
          orgId,
          deal.name
        );
        const txnEntityId = await ensureEntityId(
          "ledger_entries",
          entry.id,
          orgId,
          `Vunnen affär: ${deal.name ?? dealId}`
        );

        if (dealEntityId && txnEntityId) {
          await createRelation(
            dealEntityId,
            txnEntityId,
            "GENERATED",
            orgId,
            { eur_amount: eurAmount, original_currency: dealCurrency }
          );
        }
      }

      // Create onboarding task
      let contactName = deal.name ?? "";
      if (deal.contact_id) {
        const { data: contact } = await supabase
          .from("contacts")
          .select("name")
          .eq("id", deal.contact_id)
          .maybeSingle();

        if (contact?.name) {
          contactName = contact.name;
        }
      }

      const taskTitle = `Onboarding: ${contactName || deal.name || dealId}`;
      const task = await createTask({
        title: taskTitle,
        description: `Onboarding-uppgift för vunnen affär ${deal.name ?? dealId}`,
        assigned_to: deal.created_by ?? event.actor_id,
        priority: 2,
        org_id: orgId,
        created_by: event.actor_id,
      });

      if (task) {
        // Emit task.created
        await eventBus.emit({
          org_id: orgId,
          event_type: "task.created",
          entity_type: "tasks",
          source_id: task.id,
          actor_id: event.actor_id,
          payload: {
            title: taskTitle,
            created_by_subscriber: "deal.won",
          },
        });

        // Create Relation: Deal → GENERATED → Task
        const dealEntityId = await ensureEntityId(
          "deals",
          dealId,
          orgId,
          deal.name
        );
        const taskEntityId = await ensureEntityId(
          "tasks",
          task.id,
          orgId,
          taskTitle
        );

        if (dealEntityId && taskEntityId) {
          await createRelation(dealEntityId, taskEntityId, "GENERATED", orgId);
        }
      }

      console.log(
        `[subscribers] deal.won: Processed deal ${dealId} — ledger entry + onboarding task`
      );
    } catch (err) {
      console.error("[subscribers] deal.won handler error:", err);
    }
  });
}

// ---------------------------------------------------------------------------
// 3. capability.gap_detected → auto-create Improvement + Relation
// ---------------------------------------------------------------------------
function subscribeCapabilityGapDetected(): void {
  eventBus.on("capability.gap_detected", async (event: DomainEvent) => {
    try {
      const orgId = event.org_id;
      const payload = event.payload as {
        user_id?: string;
        capability_id?: string;
        current_level?: string;
        target_level?: string;
        gap?: number;
      };

      const {
        user_id: userId,
        capability_id: capabilityId,
        current_level: currentLevel,
        target_level: targetLevel,
        gap,
      } = payload;

      if (!capabilityId) {
        console.error(
          "[subscribers] capability.gap_detected: Missing capability_id in payload"
        );
        return;
      }

      // Look up capability name
      let capabilityName = capabilityId;
      const { data: capability } = await supabase
        .from("capabilities")
        .select("name")
        .eq("id", capabilityId)
        .maybeSingle();

      if (capability?.name) {
        capabilityName = capability.name;
      }

      const improvementTitle = `Stäng gap: ${capabilityName} (${currentLevel ?? "?"}→${targetLevel ?? "?"})`;

      // Create improvement
      const { data: improvement, error: impErr } = await supabase
        .from("improvements")
        .insert({
          title: improvementTitle,
          description: `Automatiskt skapat förbättringsförslag för kompetens-gap. Användare: ${userId ?? "okänd"}, gap: ${gap ?? "?"} nivåer.`,
          owner_id: userId ?? null,
          status: "IDEA",
          pdca_phase: "PLAN",
          category: "capability",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (impErr || !improvement) {
        console.error(
          "[subscribers] capability.gap_detected: Failed to create improvement:",
          impErr?.message
        );
        return;
      }

      // Create Relation: UserCapability → CAUSED_BY → Improvement
      // Use capability_assessments as the source entity for the gap
      const userCapSourceId = `${userId}:${capabilityId}`;
      const ucEntityId = await ensureEntityId(
        "capability_assessments",
        userCapSourceId,
        orgId,
        `${capabilityName} (${currentLevel})`
      );
      const impEntityId = await ensureEntityId(
        "improvements",
        improvement.id,
        orgId,
        improvementTitle
      );

      if (ucEntityId && impEntityId) {
        await createRelation(ucEntityId, impEntityId, "CAUSED_BY", orgId);
      }

      console.log(
        `[subscribers] capability.gap_detected: Created improvement ${improvement.id} for gap ${capabilityName}`
      );
    } catch (err) {
      console.error(
        "[subscribers] capability.gap_detected handler error:",
        err
      );
    }
  });
}

// ---------------------------------------------------------------------------
// 4. task.completed → update Capability signals
// ---------------------------------------------------------------------------
function subscribeTaskCompleted(): void {
  eventBus.on("task.completed", async (event: DomainEvent) => {
    try {
      const taskId = event.source_id;
      const orgId = event.org_id;

      // Get the completed task
      const { data: task, error: taskErr } = await supabase
        .from("tasks")
        .select("id, assigned_to, title")
        .eq("id", taskId)
        .single();

      if (taskErr || !task) {
        console.error("[subscribers] task.completed: Task not found:", taskId);
        return;
      }

      const userId = task.assigned_to;
      if (!userId) return;

      // Increment task_completion_count signal on user's capability profile
      // We store this as a lightweight signal in a user_signals table or
      // update the user's metadata. Using a simple upsert approach.
      const { data: existingSignal } = await supabase
        .from("user_signals")
        .select("id, value")
        .eq("user_id", userId)
        .eq("signal_type", "task_completion_count")
        .maybeSingle();

      if (existingSignal) {
        await supabase
          .from("user_signals")
          .update({
            value: (Number(existingSignal.value) || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingSignal.id);
      } else {
        await supabase.from("user_signals").insert({
          user_id: userId,
          org_id: orgId,
          signal_type: "task_completion_count",
          value: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      // Check if task was linked to a development_action
      const { data: linkedAction } = await supabase
        .from("development_actions")
        .select("id, plan_id, status")
        .eq("task_id", taskId)
        .maybeSingle();

      if (linkedAction && linkedAction.status !== "COMPLETED") {
        // Mark the action as COMPLETED
        await supabase
          .from("development_actions")
          .update({
            status: "COMPLETED",
            completed_at: new Date().toISOString(),
          })
          .eq("id", linkedAction.id);

        // Check if all actions in the development plan are done
        const { data: allActions } = await supabase
          .from("development_actions")
          .select("id, status")
          .eq("plan_id", linkedAction.plan_id);

        if (allActions && allActions.length > 0) {
          const allDone = allActions.every(
            (a: any) => a.status === "COMPLETED" || a.status === "CANCELLED"
          );

          if (allDone) {
            await supabase
              .from("development_plans")
              .update({
                status: "COMPLETED",
                updated_at: new Date().toISOString(),
              })
              .eq("id", linkedAction.plan_id);

            console.log(
              `[subscribers] task.completed: Development plan ${linkedAction.plan_id} fully completed`
            );
          }
        }
      }

      console.log(
        `[subscribers] task.completed: Updated signals for user ${userId}, task ${taskId}`
      );
    } catch (err) {
      console.error("[subscribers] task.completed handler error:", err);
    }
  });
}

// ---------------------------------------------------------------------------
// 5. improvement.approved → auto-create Tasks + Relations
// ---------------------------------------------------------------------------
function subscribeImprovementApproved(): void {
  eventBus.on("improvement.approved", async (event: DomainEvent) => {
    try {
      const improvementId = event.source_id;
      const orgId = event.org_id;

      // Get improvement details
      const { data: improvement, error: impErr } = await supabase
        .from("improvements")
        .select("id, title, owner_id, description, metadata")
        .eq("id", improvementId)
        .single();

      if (impErr || !improvement) {
        console.error(
          "[subscribers] improvement.approved: Improvement not found:",
          improvementId
        );
        return;
      }

      const improvementEntityId = await ensureEntityId(
        "improvements",
        improvementId,
        orgId,
        improvement.title
      );

      // Check if improvement has do_actions in metadata
      const metadata = (improvement.metadata ?? {}) as Record<string, unknown>;
      const doActions = metadata.do_actions as
        | Array<{ title: string; assigned_to?: string }>
        | undefined;

      if (doActions && Array.isArray(doActions) && doActions.length > 0) {
        // Create tasks from do_actions
        for (const action of doActions) {
          const task = await createTask({
            title: action.title,
            description: `Implementeringsuppgift för förbättring: ${improvement.title}`,
            assigned_to: action.assigned_to ?? improvement.owner_id,
            priority: 2,
            org_id: orgId,
            created_by: event.actor_id,
          });

          if (!task) continue;

          // Emit task.created
          await eventBus.emit({
            org_id: orgId,
            event_type: "task.created",
            entity_type: "tasks",
            source_id: task.id,
            actor_id: event.actor_id,
            payload: {
              title: action.title,
              created_by_subscriber: "improvement.approved",
            },
          });

          // Create Relation: Improvement → GENERATED → Task
          const taskEntityId = await ensureEntityId(
            "tasks",
            task.id,
            orgId,
            action.title
          );

          if (improvementEntityId && taskEntityId) {
            await createRelation(
              improvementEntityId,
              taskEntityId,
              "GENERATED",
              orgId
            );
          }

          console.log(
            `[subscribers] improvement.approved: Created task ${task.id} from do_action`
          );
        }
      } else {
        // Default: create 1 implementation task
        const taskTitle = `Implementera: ${improvement.title}`;
        const task = await createTask({
          title: taskTitle,
          description: `Implementeringsuppgift för godkänd förbättring: ${improvement.title}`,
          assigned_to: improvement.owner_id,
          priority: 2,
          org_id: orgId,
          created_by: event.actor_id,
        });

        if (task) {
          await eventBus.emit({
            org_id: orgId,
            event_type: "task.created",
            entity_type: "tasks",
            source_id: task.id,
            actor_id: event.actor_id,
            payload: {
              title: taskTitle,
              created_by_subscriber: "improvement.approved",
            },
          });

          const taskEntityId = await ensureEntityId(
            "tasks",
            task.id,
            orgId,
            taskTitle
          );

          if (improvementEntityId && taskEntityId) {
            await createRelation(
              improvementEntityId,
              taskEntityId,
              "GENERATED",
              orgId
            );
          }

          console.log(
            `[subscribers] improvement.approved: Created default task ${task.id} for improvement ${improvementId}`
          );
        }
      }
    } catch (err) {
      console.error(
        "[subscribers] improvement.approved handler error:",
        err
      );
    }
  });
}

// ---------------------------------------------------------------------------
// 6. document.review_due → auto-create Task
// ---------------------------------------------------------------------------
function subscribeDocumentReviewDue(): void {
  eventBus.on("document.review_due", async (event: DomainEvent) => {
    try {
      const documentId = event.source_id;
      const orgId = event.org_id;

      // Get document details
      const { data: doc, error: docErr } = await supabase
        .from("documents")
        .select("id, title, owner_id")
        .eq("id", documentId)
        .single();

      if (docErr || !doc) {
        console.error(
          "[subscribers] document.review_due: Document not found:",
          documentId
        );
        return;
      }

      const taskTitle = `Granska dokument: ${doc.title}`;
      const task = await createTask({
        title: taskTitle,
        description: `Dokumentet "${doc.title}" behöver granskas.`,
        assigned_to: doc.owner_id,
        priority: 2,
        org_id: orgId,
        created_by: event.actor_id,
      });

      if (!task) return;

      // Emit task.created
      await eventBus.emit({
        org_id: orgId,
        event_type: "task.created",
        entity_type: "tasks",
        source_id: task.id,
        actor_id: event.actor_id,
        payload: {
          title: taskTitle,
          created_by_subscriber: "document.review_due",
        },
      });

      // Create Relation: Document → GENERATED → Task
      const docEntityId = await ensureEntityId(
        "documents",
        documentId,
        orgId,
        doc.title
      );
      const taskEntityId = await ensureEntityId(
        "tasks",
        task.id,
        orgId,
        taskTitle
      );

      if (docEntityId && taskEntityId) {
        await createRelation(docEntityId, taskEntityId, "GENERATED", orgId);
      }

      console.log(
        `[subscribers] document.review_due: Created review task ${task.id} for document ${documentId}`
      );
    } catch (err) {
      console.error(
        "[subscribers] document.review_due handler error:",
        err
      );
    }
  });
}

// ---------------------------------------------------------------------------
// registerSubscribers – call once at app startup
// ---------------------------------------------------------------------------
export function registerSubscribers(): void {
  subscribeNcRaised();
  subscribeDealWon();
  subscribeCapabilityGapDetected();
  subscribeTaskCompleted();
  subscribeImprovementApproved();
  subscribeDocumentReviewDue();

  console.log("[subscribers] All cross-module event subscribers registered");
}
