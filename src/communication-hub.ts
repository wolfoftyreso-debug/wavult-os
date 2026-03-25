import { Router, Request, Response } from "express";
import { supabase } from "./supabase";

const router = Router();

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------
interface AuthUser {
  id: string;
  org_id: string;
  role: string;
}

function getUser(req: Request, res: Response): AuthUser | null {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return user;
}

async function audit(
  userId: string,
  orgId: string,
  action: string,
  entityType: string,
  entityId?: string,
  meta?: any
) {
  await supabase.from("audit_log").insert({
    user_id: userId,
    org_id: orgId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata: meta,
  });
}

// =============================================================================
// CONNECTED ACCOUNTS — User's personal channel connections
// =============================================================================

// List connected accounts for current user
router.get("/api/communication/accounts", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { data, error } = await supabase
    .from("connected_accounts")
    .select("id, provider, account_email, display_name, status, last_sync_at, scopes, settings, created_at")
    .eq("org_id", user.org_id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Connect a new account
router.post("/api/communication/accounts", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { provider, account_email, display_name, credentials, scopes, settings } = req.body;
  if (!provider || !account_email) {
    return res.status(400).json({ error: "provider and account_email required" });
  }

  const { data, error } = await supabase
    .from("connected_accounts")
    .insert({
      org_id: user.org_id,
      user_id: user.id,
      provider,
      account_email,
      display_name: display_name || account_email,
      credentials: credentials || {},
      scopes: scopes || [],
      settings: settings || {},
      status: "ACTIVE",
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  await audit(user.id, user.org_id, "CREATE", "connected_accounts", data.id);
  res.status(201).json(data);
});

// Disconnect account
router.delete("/api/communication/accounts/:id", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { error } = await supabase
    .from("connected_accounts")
    .update({ status: "REVOKED" })
    .eq("id", req.params.id)
    .eq("org_id", user.org_id)
    .eq("user_id", user.id);

  if (error) return res.status(500).json({ error: error.message });
  await audit(user.id, user.org_id, "REVOKE", "connected_accounts", req.params.id);
  res.json({ success: true });
});

// =============================================================================
// ORG MAILBOXES — Shared departmental inboxes
// =============================================================================

// List all mailboxes for org
router.get("/api/communication/mailboxes", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const query = supabase
    .from("org_mailboxes")
    .select("*")
    .eq("org_id", user.org_id)
    .order("department");

  if (req.query.active === "true") query.eq("is_active", true);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Create mailbox
router.post("/api/communication/mailboxes", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const {
    department, email_address, display_name, provider,
    credentials, bot_enabled, language, country_code,
    timezone, auto_reply, routing_rules, assigned_users
  } = req.body;

  if (!department || !email_address || !display_name) {
    return res.status(400).json({ error: "department, email_address, display_name required" });
  }

  const { data, error } = await supabase
    .from("org_mailboxes")
    .insert({
      org_id: user.org_id,
      department,
      email_address,
      display_name,
      provider: provider || "GMAIL",
      credentials: credentials || {},
      bot_enabled: bot_enabled !== false,
      language: language || "sv",
      country_code: country_code || "SE",
      timezone: timezone || "Europe/Stockholm",
      auto_reply,
      routing_rules: routing_rules || [],
      assigned_users: assigned_users || [],
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  await audit(user.id, user.org_id, "CREATE", "org_mailboxes", data.id);
  res.status(201).json(data);
});

// Update mailbox
router.patch("/api/communication/mailboxes/:id", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const allowed = [
    "display_name", "provider", "credentials", "bot_enabled", "bot_config",
    "language", "country_code", "timezone", "auto_reply", "routing_rules",
    "assigned_users", "is_active"
  ];
  const updates: any = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const { data, error } = await supabase
    .from("org_mailboxes")
    .update(updates)
    .eq("id", req.params.id)
    .eq("org_id", user.org_id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  await audit(user.id, user.org_id, "UPDATE", "org_mailboxes", data.id);
  res.json(data);
});

// =============================================================================
// CONVERSATIONS — Thread-level management
// =============================================================================

// List conversations (inbox view)
router.get("/api/communication/conversations", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  let query = supabase
    .from("comm_conversations")
    .select("*, mailbox:org_mailboxes(id, department, email_address, display_name)")
    .eq("org_id", user.org_id)
    .order("last_message_at", { ascending: false });

  // Filters
  if (req.query.mailbox_id) query = query.eq("mailbox_id", req.query.mailbox_id as string);
  if (req.query.department) query = query.eq("department", req.query.department as string);
  if (req.query.status) query = query.eq("status", req.query.status as string);
  if (req.query.assigned_to) query = query.eq("assigned_to", req.query.assigned_to as string);
  if (req.query.assigned_to === "me") query = query.eq("assigned_to", user.id);
  if (req.query.unread === "true") query = query.gt("unread_count", 0);
  if (req.query.priority) query = query.eq("priority", req.query.priority as string);
  if (req.query.tag) query = query.contains("tags", [req.query.tag as string]);
  if (req.query.channel) query = query.eq("channel", req.query.channel as string);

  // Pagination
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = parseInt(req.query.offset as string) || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data, total: count, limit, offset });
});

// Get single conversation with messages
router.get("/api/communication/conversations/:id", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const [convResult, msgResult] = await Promise.all([
    supabase
      .from("comm_conversations")
      .select("*, mailbox:org_mailboxes(id, department, email_address, display_name)")
      .eq("id", req.params.id)
      .eq("org_id", user.org_id)
      .single(),
    supabase
      .from("comm_messages")
      .select("*, attachments:comm_attachments(*)")
      .eq("conversation_id", req.params.id)
      .eq("org_id", user.org_id)
      .eq("is_deleted", false)
      .order("received_at", { ascending: true }),
  ]);

  if (convResult.error) return res.status(404).json({ error: "Conversation not found" });
  res.json({ conversation: convResult.data, messages: msgResult.data || [] });
});

// Update conversation (assign, tag, prioritize, link entity)
router.patch("/api/communication/conversations/:id", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const allowed = [
    "assigned_to", "tags", "labels", "priority", "status",
    "linked_entity_type", "linked_entity_id", "snoozed_until"
  ];
  const updates: any = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const { data, error } = await supabase
    .from("comm_conversations")
    .update(updates)
    .eq("id", req.params.id)
    .eq("org_id", user.org_id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  await audit(user.id, user.org_id, "UPDATE", "comm_conversations", data.id, updates);
  res.json(data);
});

// Batch update conversations (mark read, archive, etc.)
router.post("/api/communication/conversations/batch", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { ids, action, value } = req.body;
  if (!ids?.length || !action) {
    return res.status(400).json({ error: "ids and action required" });
  }

  let error;
  switch (action) {
    case "mark_read":
      ({ error } = await supabase
        .from("comm_messages")
        .update({ is_read: true })
        .in("conversation_id", ids)
        .eq("org_id", user.org_id));
      break;
    case "archive":
      ({ error } = await supabase
        .from("comm_conversations")
        .update({ status: "ARCHIVED" })
        .in("id", ids)
        .eq("org_id", user.org_id));
      break;
    case "assign":
      ({ error } = await supabase
        .from("comm_conversations")
        .update({ assigned_to: value })
        .in("id", ids)
        .eq("org_id", user.org_id));
      break;
    case "tag":
      // Append tag — requires fetching current tags first
      for (const id of ids) {
        const { data: conv } = await supabase
          .from("comm_conversations")
          .select("tags")
          .eq("id", id)
          .eq("org_id", user.org_id)
          .single();
        if (conv) {
          const tags = Array.from(new Set([...(conv.tags || []), value]));
          await supabase
            .from("comm_conversations")
            .update({ tags })
            .eq("id", id)
            .eq("org_id", user.org_id);
        }
      }
      break;
    default:
      return res.status(400).json({ error: `Unknown action: ${action}` });
  }

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, affected: ids.length });
});

// =============================================================================
// MESSAGES — Send, reply, forward
// =============================================================================

// Send new message / reply
router.post("/api/communication/messages", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const {
    conversation_id, mailbox_id, channel, to_addresses,
    subject, body_text, body_html, in_reply_to,
    is_draft
  } = req.body;

  if (!channel || !body_text) {
    return res.status(400).json({ error: "channel and body_text required" });
  }

  // Create or get conversation
  let convId = conversation_id;
  if (!convId) {
    const { data: conv, error: convErr } = await supabase
      .from("comm_conversations")
      .insert({
        org_id: user.org_id,
        mailbox_id,
        subject: subject || "(No subject)",
        channel,
        department: null,
        status: "AWAITING_ACTION",
      })
      .select()
      .single();
    if (convErr) return res.status(500).json({ error: convErr.message });
    convId = conv.id;
  }

  // Insert message
  const { data: msg, error: msgErr } = await supabase
    .from("comm_messages")
    .insert({
      org_id: user.org_id,
      conversation_id: convId,
      mailbox_id,
      direction: "OUTBOUND",
      from_user_id: user.id,
      from_name: user.id, // will be resolved by frontend
      to_addresses: to_addresses || [],
      subject,
      body_text,
      body_html,
      channel,
      in_reply_to,
      is_draft: is_draft || false,
      is_read: true,
      processing_status: is_draft ? "QUEUED" : "ACTIONED",
      sent_at: is_draft ? null : new Date().toISOString(),
    })
    .select()
    .single();

  if (msgErr) return res.status(500).json({ error: msgErr.message });

  // TODO: Actually send via provider (Gmail API, Slack API, etc.)
  // This would be handled by a background job that picks up OUTBOUND messages

  await audit(user.id, user.org_id, "SEND", "comm_messages", msg.id, {
    channel,
    conversation_id: convId,
    is_draft,
  });

  res.status(201).json({ message: msg, conversation_id: convId });
});

// Mark message(s) as read
router.post("/api/communication/messages/read", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { message_ids, conversation_id } = req.body;

  let query = supabase
    .from("comm_messages")
    .update({ is_read: true })
    .eq("org_id", user.org_id);

  if (message_ids?.length) {
    query = query.in("id", message_ids);
  } else if (conversation_id) {
    query = query.eq("conversation_id", conversation_id);
  } else {
    return res.status(400).json({ error: "message_ids or conversation_id required" });
  }

  const { error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Star/unstar message
router.patch("/api/communication/messages/:id/star", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { data, error } = await supabase
    .from("comm_messages")
    .update({ is_starred: req.body.starred !== false })
    .eq("id", req.params.id)
    .eq("org_id", user.org_id)
    .select("id, is_starred")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Delete (soft) message
router.delete("/api/communication/messages/:id", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { error } = await supabase
    .from("comm_messages")
    .update({ is_deleted: true })
    .eq("id", req.params.id)
    .eq("org_id", user.org_id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// =============================================================================
// SEARCH — Full-text search across messages
// =============================================================================

router.get("/api/communication/search", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const q = req.query.q as string;
  if (!q || q.length < 2) {
    return res.status(400).json({ error: "Search query must be at least 2 characters" });
  }

  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

  const { data, error } = await supabase
    .from("comm_messages")
    .select("id, conversation_id, subject, snippet, from_name, from_address, channel, received_at, is_read")
    .eq("org_id", user.org_id)
    .eq("is_deleted", false)
    .or(`subject.ilike.%${q}%,body_text.ilike.%${q}%,from_address.ilike.%${q}%,from_name.ilike.%${q}%`)
    .order("received_at", { ascending: false })
    .limit(limit);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// =============================================================================
// BOT CONFIGS — AI bot management per department
// =============================================================================

// List bot configs
router.get("/api/communication/bots", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { data, error } = await supabase
    .from("comm_bot_configs")
    .select("*, mailbox:org_mailboxes(id, email_address, department, display_name)")
    .eq("org_id", user.org_id)
    .order("department");

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Create bot config
router.post("/api/communication/bots", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const {
    mailbox_id, department, name, description,
    classification_prompt, classification_rules,
    routing_matrix, escalation_rules,
    auto_reply_enabled, auto_reply_templates,
    invoice_verification, file_storage_rules,
    can_create_tasks, can_create_tickets, can_create_nc,
    can_forward, can_auto_reply, can_translate,
    primary_language, supported_languages
  } = req.body;

  if (!department || !name) {
    return res.status(400).json({ error: "department and name required" });
  }

  const { data, error } = await supabase
    .from("comm_bot_configs")
    .insert({
      org_id: user.org_id,
      mailbox_id,
      department,
      name,
      description,
      classification_prompt,
      classification_rules: classification_rules || [],
      routing_matrix: routing_matrix || {},
      escalation_rules: escalation_rules || [],
      auto_reply_enabled: auto_reply_enabled || false,
      auto_reply_templates: auto_reply_templates || {},
      invoice_verification: invoice_verification || {},
      file_storage_rules: file_storage_rules || {},
      can_create_tasks: can_create_tasks !== false,
      can_create_tickets: can_create_tickets !== false,
      can_create_nc: can_create_nc || false,
      can_forward: can_forward !== false,
      can_auto_reply: can_auto_reply || false,
      can_translate: can_translate !== false,
      primary_language: primary_language || "sv",
      supported_languages: supported_languages || ["sv", "en"],
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  await audit(user.id, user.org_id, "CREATE", "comm_bot_configs", data.id);
  res.status(201).json(data);
});

// Update bot config
router.patch("/api/communication/bots/:id", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const allowed = [
    "name", "description", "is_active",
    "classification_prompt", "classification_rules",
    "routing_matrix", "escalation_rules",
    "auto_reply_enabled", "auto_reply_templates", "auto_reply_delay_seconds",
    "invoice_verification", "file_storage_rules",
    "can_create_tasks", "can_create_tickets", "can_create_nc",
    "can_forward", "can_auto_reply", "can_translate",
    "primary_language", "supported_languages"
  ];
  const updates: any = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const { data, error } = await supabase
    .from("comm_bot_configs")
    .update(updates)
    .eq("id", req.params.id)
    .eq("org_id", user.org_id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  await audit(user.id, user.org_id, "UPDATE", "comm_bot_configs", data.id, updates);
  res.json(data);
});

// Get bot action log
router.get("/api/communication/bots/:id/actions", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = parseInt(req.query.offset as string) || 0;

  let query = supabase
    .from("comm_bot_actions")
    .select("*")
    .eq("bot_config_id", req.params.id)
    .eq("org_id", user.org_id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (req.query.action_type) query = query.eq("action_type", req.query.action_type as string);
  if (req.query.requires_review === "true") query = query.eq("requires_review", true);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Review a bot action (approve/correct/reject)
router.post("/api/communication/bots/actions/:id/review", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { outcome } = req.body;
  if (!["approved", "corrected", "rejected"].includes(outcome)) {
    return res.status(400).json({ error: "outcome must be approved, corrected, or rejected" });
  }

  const { data, error } = await supabase
    .from("comm_bot_actions")
    .update({
      reviewed_by: user.id,
      review_outcome: outcome,
      reviewed_at: new Date().toISOString(),
      requires_review: false,
    })
    .eq("id", req.params.id)
    .eq("org_id", user.org_id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// =============================================================================
// CONTACT CHANNELS — External contacts' communication channels
// =============================================================================

router.get("/api/communication/contact-channels/:contactId", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { data, error } = await supabase
    .from("contact_channels")
    .select("*")
    .eq("contact_id", req.params.contactId)
    .eq("org_id", user.org_id)
    .order("is_primary", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post("/api/communication/contact-channels", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { contact_id, company_id, channel, address, display_name, is_primary, preferred_language } = req.body;
  if (!channel || !address) {
    return res.status(400).json({ error: "channel and address required" });
  }

  const { data, error } = await supabase
    .from("contact_channels")
    .insert({
      org_id: user.org_id,
      contact_id,
      company_id,
      channel,
      address,
      display_name,
      is_primary: is_primary || false,
      preferred_language,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// =============================================================================
// TEMPLATES — Message templates per department/language
// =============================================================================

router.get("/api/communication/templates", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  let query = supabase
    .from("comm_templates")
    .select("*")
    .eq("org_id", user.org_id)
    .eq("is_active", true)
    .order("department")
    .order("name");

  if (req.query.department) query = query.eq("department", req.query.department as string);
  if (req.query.language) query = query.eq("language", req.query.language as string);
  if (req.query.channel) query = query.eq("channel", req.query.channel as string);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post("/api/communication/templates", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { department, channel, code, name, language, subject, body_text, body_html, variables } = req.body;
  if (!code || !name || !body_text) {
    return res.status(400).json({ error: "code, name, body_text required" });
  }

  const { data, error } = await supabase
    .from("comm_templates")
    .insert({
      org_id: user.org_id,
      department,
      channel,
      code,
      name,
      language: language || "sv",
      subject,
      body_text,
      body_html,
      variables: variables || [],
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// =============================================================================
// NOTIFICATION PREFERENCES
// =============================================================================

router.get("/api/communication/notifications/preferences", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("org_id", user.org_id)
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") return res.status(500).json({ error: error.message });
  res.json(data || { email_enabled: true, slack_enabled: true });
});

router.put("/api/communication/notifications/preferences", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { data, error } = await supabase
    .from("notification_preferences")
    .upsert({
      org_id: user.org_id,
      user_id: user.id,
      ...req.body,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// =============================================================================
// INBOX RULES — User/org rules for automatic message handling
// =============================================================================

router.get("/api/communication/rules", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { data, error } = await supabase
    .from("inbox_rules")
    .select("*")
    .eq("org_id", user.org_id)
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .order("priority");

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post("/api/communication/rules", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { name, mailbox_id, priority, conditions, actions, is_org_wide } = req.body;
  if (!name || !conditions?.length || !actions?.length) {
    return res.status(400).json({ error: "name, conditions, actions required" });
  }

  const { data, error } = await supabase
    .from("inbox_rules")
    .insert({
      org_id: user.org_id,
      user_id: is_org_wide ? null : user.id,
      mailbox_id,
      name,
      priority: priority || 100,
      conditions,
      actions,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// =============================================================================
// DASHBOARD — Communication hub stats
// =============================================================================

router.get("/api/communication/dashboard", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const [
    unreadResult,
    mailboxResult,
    botResult,
    recentResult,
  ] = await Promise.all([
    // Total unread
    supabase
      .from("comm_conversations")
      .select("id", { count: "exact", head: true })
      .eq("org_id", user.org_id)
      .gt("unread_count", 0),
    // Per-mailbox stats
    supabase
      .from("org_mailboxes")
      .select("id, department, display_name, email_address, is_active, last_sync_at")
      .eq("org_id", user.org_id)
      .eq("is_active", true),
    // Bot performance
    supabase
      .from("comm_bot_configs")
      .select("id, department, name, total_processed, accuracy_score, is_active")
      .eq("org_id", user.org_id),
    // Recent conversations
    supabase
      .from("comm_conversations")
      .select("id, subject, channel, department, priority, status, unread_count, last_message_at")
      .eq("org_id", user.org_id)
      .gt("unread_count", 0)
      .order("last_message_at", { ascending: false })
      .limit(10),
  ]);

  res.json({
    total_unread: unreadResult.count || 0,
    mailboxes: mailboxResult.data || [],
    bots: botResult.data || [],
    recent_unread: recentResult.data || [],
  });
});

// =============================================================================
// ATTACHMENTS
// =============================================================================

// List attachments for a conversation
router.get("/api/communication/conversations/:id/attachments", async (req: Request, res: Response) => {
  const user = getUser(req, res);
  if (!user) return;

  const { data, error } = await supabase
    .from("comm_attachments")
    .select("*, message:comm_messages(id, subject, from_name, received_at)")
    .eq("conversation_id", req.params.id)
    .eq("org_id", user.org_id)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
