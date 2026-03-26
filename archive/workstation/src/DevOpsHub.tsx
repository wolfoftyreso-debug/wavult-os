/**
 * DevOpsHub.tsx — pixdrift Dev Infrastructure Hub
 * Apple HIG design — Catalog always visible, localStorage for integrations
 */

import React, { useState, useEffect, useCallback } from "react";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg: "#F2F2F7",
  surface: "#FFFFFF",
  fill: "#F2F2F7",
  border: "#D1D1D6",
  text: "#000000",
  secondary: "#8E8E93",
  tertiary: "#C7C7CC",
  blue: "#007AFF",
  green: "#34C759",
  red: "#FF3B30",
  orange: "#FF9500",
  yellow: "#FFCC00",
  purple: "#AF52DE",
  indigo: "#5856D6",
  teal: "#5AC8FA",
};

const shadow = "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)";
const shadowMd = "0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)";

// ─── Hardcoded service catalog (no API needed) ─────────────────────────────────
const SERVICE_CATALOG = [
  // Source Control
  { id: "github", name: "GitHub", category: "Source Control", icon: "🐙", color: "#24292e", description: "Code hosting, CI/CD, pull requests", fields: ["personal_access_token", "organization"] },
  { id: "gitlab", name: "GitLab", category: "Source Control", icon: "🦊", color: "#FC6D26", description: "DevOps platform, CI/CD pipelines", fields: ["personal_access_token", "project_id"] },
  { id: "bitbucket", name: "Bitbucket", category: "Source Control", icon: "🪣", color: "#0052CC", description: "Git hosting by Atlassian", fields: ["app_password", "workspace"] },

  // Hosting
  { id: "vercel", name: "Vercel", category: "Hosting", icon: "▲", color: "#000000", description: "Frontend deployment & edge functions", fields: ["api_token", "team_id"] },
  { id: "netlify", name: "Netlify", category: "Hosting", icon: "🌐", color: "#00C7B7", description: "Web hosting & serverless", fields: ["personal_access_token"] },
  { id: "railway", name: "Railway", category: "Hosting", icon: "🚂", color: "#0B0D0E", description: "Deploy apps instantly", fields: ["api_token"] },
  { id: "render", name: "Render", category: "Hosting", icon: "⚙️", color: "#46E3B7", description: "Cloud hosting for apps and services", fields: ["api_key"] },
  { id: "fly_io", name: "Fly.io", category: "Hosting", icon: "✈️", color: "#7B36ED", description: "Run apps close to users", fields: ["api_token"] },
  { id: "digitalocean", name: "DigitalOcean", category: "Hosting", icon: "🌊", color: "#0080FF", description: "Cloud infrastructure", fields: ["personal_access_token"] },
  { id: "heroku", name: "Heroku", category: "Hosting", icon: "💜", color: "#430098", description: "PaaS for rapid deployment", fields: ["api_key"] },

  // Cloud
  { id: "aws", name: "AWS", category: "Cloud", icon: "☁️", color: "#FF9900", description: "Amazon Web Services — EC2, S3, Lambda", fields: ["access_key_id", "secret_access_key", "region"] },
  { id: "google_cloud", name: "Google Cloud", category: "Cloud", icon: "🔵", color: "#4285F4", description: "GCP — Compute, Storage, BigQuery", fields: ["service_account_json", "project_id"] },
  { id: "azure", name: "Azure", category: "Cloud", icon: "🔷", color: "#0078D4", description: "Microsoft Azure cloud services", fields: ["subscription_id", "tenant_id", "client_id", "client_secret"] },

  // Database
  { id: "supabase", name: "Supabase", category: "Database", icon: "🟢", color: "#3ECF8E", description: "Postgres with real-time & auth", fields: ["project_url", "anon_key", "service_role_key"] },
  { id: "planetscale", name: "PlanetScale", category: "Database", icon: "🪐", color: "#000000", description: "Serverless MySQL platform", fields: ["service_token", "organization"] },
  { id: "neon", name: "Neon", category: "Database", icon: "💾", color: "#00E599", description: "Serverless Postgres", fields: ["api_key", "project_id"] },
  { id: "mongodb", name: "MongoDB Atlas", category: "Database", icon: "🍃", color: "#13AA52", description: "Cloud database service", fields: ["api_public_key", "api_private_key"] },
  { id: "redis", name: "Redis / Upstash", category: "Database", icon: "⚡", color: "#DC382D", description: "In-memory data store", fields: ["rest_url", "rest_token"] },
  { id: "firebase", name: "Firebase", category: "Database", icon: "🔥", color: "#FFCA28", description: "Google app platform", fields: ["service_account_json", "project_id"] },
  { id: "turso", name: "Turso", category: "Database", icon: "🦎", color: "#4FF8D2", description: "SQLite at the edge", fields: ["database_url", "auth_token"] },

  // Payments
  { id: "stripe", name: "Stripe", category: "Payments", icon: "💳", color: "#635BFF", description: "Payment processing & subscriptions", fields: ["publishable_key", "secret_key", "webhook_secret"] },
  { id: "klarna", name: "Klarna", category: "Payments", icon: "🛒", color: "#FFB3C7", description: "Buy now, pay later", fields: ["api_key", "username"] },
  { id: "revolut", name: "Revolut Business", category: "Payments", icon: "💙", color: "#0075EB", description: "Business banking & virtual cards", fields: ["api_key", "client_id"] },
  { id: "wise", name: "Wise", category: "Payments", icon: "🦉", color: "#9FE870", description: "International transfers", fields: ["api_token", "profile_id"] },
  { id: "adyen", name: "Adyen", category: "Payments", icon: "💰", color: "#0ABF53", description: "Enterprise payment platform", fields: ["api_key", "merchant_account"] },
  { id: "paypal", name: "PayPal", category: "Payments", icon: "🔵", color: "#003087", description: "Online payments", fields: ["client_id", "client_secret"] },

  // Email
  { id: "sendgrid", name: "SendGrid", category: "Email", icon: "📧", color: "#1A82E2", description: "Transactional email delivery", fields: ["api_key"] },
  { id: "resend", name: "Resend", category: "Email", icon: "✉️", color: "#000000", description: "Email for developers", fields: ["api_key"] },
  { id: "mailchimp", name: "Mailchimp", category: "Email", icon: "🐵", color: "#FFE01B", description: "Email marketing platform", fields: ["api_key", "server_prefix"] },
  { id: "brevo", name: "Brevo", category: "Email", icon: "💌", color: "#0B996E", description: "Email & SMS marketing", fields: ["api_key"] },
  { id: "postmark", name: "Postmark", category: "Email", icon: "📮", color: "#FFCD00", description: "Transactional email delivery", fields: ["server_api_token"] },
  { id: "mailgun", name: "Mailgun", category: "Email", icon: "📬", color: "#F06B66", description: "Email API for developers", fields: ["api_key", "domain"] },

  // SMS
  { id: "twilio", name: "Twilio", category: "SMS", icon: "📱", color: "#F22F46", description: "SMS, voice, WhatsApp API", fields: ["account_sid", "auth_token"] },
  { id: "elks_46", name: "46elks", category: "SMS", icon: "📲", color: "#2196F3", description: "Swedish SMS service", fields: ["api_username", "api_password"] },
  { id: "sinch", name: "Sinch", category: "SMS", icon: "📳", color: "#E91E8C", description: "SMS & voice API", fields: ["app_id", "app_secret"] },

  // Monitoring
  { id: "sentry", name: "Sentry", category: "Monitoring", icon: "🚨", color: "#362D59", description: "Error tracking & performance", fields: ["dsn", "auth_token"] },
  { id: "datadog", name: "Datadog", category: "Monitoring", icon: "🐶", color: "#632CA6", description: "Infrastructure monitoring", fields: ["api_key", "app_key"] },
  { id: "grafana", name: "Grafana Cloud", category: "Monitoring", icon: "📈", color: "#F46800", description: "Metrics & dashboards", fields: ["api_key", "instance_url"] },
  { id: "new_relic", name: "New Relic", category: "Monitoring", icon: "🟢", color: "#00AC69", description: "Full-stack observability", fields: ["license_key", "account_id"] },
  { id: "pagerduty", name: "PagerDuty", category: "Monitoring", icon: "🚨", color: "#06AC38", description: "Incident management", fields: ["api_token", "routing_key"] },
  { id: "betterstack", name: "Better Stack", category: "Monitoring", icon: "🔭", color: "#000000", description: "Uptime monitoring & logging", fields: ["source_token"] },

  // Analytics
  { id: "posthog", name: "PostHog", category: "Analytics", icon: "🦔", color: "#F54E00", description: "Product analytics & session recording", fields: ["api_key", "host"] },
  { id: "ga4", name: "Google Analytics", category: "Analytics", icon: "📊", color: "#E37400", description: "Web analytics", fields: ["measurement_id", "api_secret"] },
  { id: "mixpanel", name: "Mixpanel", category: "Analytics", icon: "🔮", color: "#7856FF", description: "Product analytics", fields: ["project_token", "api_secret"] },
  { id: "amplitude", name: "Amplitude", category: "Analytics", icon: "📉", color: "#1A73E8", description: "Product intelligence", fields: ["api_key"] },
  { id: "plausible", name: "Plausible", category: "Analytics", icon: "📏", color: "#5850EC", description: "Privacy-friendly analytics", fields: ["api_key", "site_id"] },

  // Auth
  { id: "auth0", name: "Auth0", category: "Auth", icon: "🔐", color: "#EB5424", description: "Authentication & authorization", fields: ["domain", "client_id", "client_secret"] },
  { id: "clerk", name: "Clerk", category: "Auth", icon: "🔑", color: "#6C47FF", description: "User management for React", fields: ["publishable_key", "secret_key"] },
  { id: "okta", name: "Okta", category: "Auth", icon: "🟡", color: "#007DC1", description: "Enterprise identity platform", fields: ["domain", "client_id", "client_secret"] },

  // AI
  { id: "openai", name: "OpenAI", category: "AI", icon: "🤖", color: "#10a37f", description: "GPT-4, DALL-E, Whisper", fields: ["api_key", "organization_id"] },
  { id: "anthropic", name: "Anthropic / Claude", category: "AI", icon: "🧠", color: "#D4A574", description: "Claude AI models", fields: ["api_key"] },
  { id: "google_gemini", name: "Google Gemini", category: "AI", icon: "✨", color: "#4285F4", description: "Google AI models", fields: ["api_key"] },
  { id: "replicate", name: "Replicate", category: "AI", icon: "🎭", color: "#000000", description: "Run AI models in the cloud", fields: ["api_token"] },
  { id: "hugging_face", name: "Hugging Face", category: "AI", icon: "🤗", color: "#FF9D00", description: "Open source AI models", fields: ["api_token"] },
  { id: "cohere", name: "Cohere", category: "AI", icon: "🌊", color: "#39594D", description: "Enterprise language models", fields: ["api_key"] },
  { id: "mistral", name: "Mistral AI", category: "AI", icon: "💨", color: "#FF7000", description: "Open and efficient AI models", fields: ["api_key"] },

  // Design
  { id: "figma", name: "Figma", category: "Design", icon: "🎨", color: "#F24E1E", description: "Collaborative design tool", fields: ["personal_access_token", "team_id"] },

  // Project Management
  { id: "linear", name: "Linear", category: "PM", icon: "📋", color: "#5E6AD2", description: "Issue tracking for engineering teams", fields: ["api_key"] },
  { id: "jira", name: "Jira / Atlassian", category: "PM", icon: "📌", color: "#0052CC", description: "Project & issue tracking", fields: ["email", "api_token", "domain"] },
  { id: "notion", name: "Notion", category: "PM", icon: "📝", color: "#000000", description: "All-in-one workspace", fields: ["integration_token"] },
  { id: "height", name: "Height", category: "PM", icon: "🏔️", color: "#6E5DE3", description: "Project management tool", fields: ["api_key"] },

  // Communication
  { id: "slack", name: "Slack", category: "Communication", icon: "💬", color: "#4A154B", description: "Team messaging & notifications", fields: ["bot_token", "signing_secret", "webhook_url"] },
  { id: "discord", name: "Discord", category: "Communication", icon: "🎮", color: "#5865F2", description: "Community & team chat", fields: ["bot_token", "webhook_url"] },
  { id: "ms_teams", name: "Microsoft Teams", category: "Communication", icon: "🟣", color: "#6264A7", description: "Enterprise communication", fields: ["webhook_url"] },

  // Storage
  { id: "aws_s3", name: "AWS S3", category: "Storage", icon: "🗄️", color: "#FF9900", description: "Object storage", fields: ["bucket_name", "region", "access_key_id", "secret_access_key"] },
  { id: "cloudflare_r2", name: "Cloudflare R2", category: "Storage", icon: "📦", color: "#F48120", description: "S3-compatible storage, no egress fees", fields: ["account_id", "access_key_id", "secret_access_key"] },
  { id: "backblaze", name: "Backblaze B2", category: "Storage", icon: "💾", color: "#E1251B", description: "Low-cost object storage", fields: ["application_key_id", "application_key"] },

  // CDN & DNS
  { id: "cloudflare", name: "Cloudflare", category: "CDN & DNS", icon: "🌤️", color: "#F48120", description: "DNS, CDN, security, Workers", fields: ["api_token", "account_id"] },
  { id: "bunny_net", name: "Bunny.net", category: "CDN & DNS", icon: "🐰", color: "#F5A623", description: "Fast CDN & storage", fields: ["api_key", "storage_zone"] },

  // CMS
  { id: "contentful", name: "Contentful", category: "CMS", icon: "📄", color: "#FAE042", description: "Headless CMS", fields: ["space_id", "management_token"] },
  { id: "sanity", name: "Sanity", category: "CMS", icon: "🖊️", color: "#F03E2F", description: "Structured content platform", fields: ["project_id", "dataset", "api_token"] },
  { id: "strapi", name: "Strapi", category: "CMS", icon: "🪁", color: "#4945FF", description: "Open-source headless CMS", fields: ["api_url", "api_token"] },

  // CI/CD
  { id: "github_actions", name: "GitHub Actions", category: "CI/CD", icon: "⚙️", color: "#2088FF", description: "Automation for your repositories", fields: ["personal_access_token", "repository"] },
  { id: "circleci", name: "CircleCI", category: "CI/CD", icon: "🔵", color: "#343434", description: "Continuous integration platform", fields: ["api_token"] },

  // Domain
  { id: "namecheap", name: "Namecheap", category: "Domain", icon: "🏷️", color: "#DE3723", description: "Domain registration & DNS", fields: ["api_user", "api_key"] },
  { id: "godaddy", name: "GoDaddy", category: "Domain", icon: "🐮", color: "#1BDBDB", description: "Domain & hosting", fields: ["api_key", "api_secret"] },

  // Custom
  { id: "custom", name: "Custom service", category: "Custom", icon: "🔧", color: "#6366f1", description: "Add any service with custom credentials", fields: ["api_key", "endpoint_url"] },
];

const CATEGORIES = ["All", ...Array.from(new Set(SERVICE_CATALOG.map((s) => s.category)))];

// ─── Legacy icon map (kept for backward compat) ────────────────────────────────
const SERVICE_ICONS: Record<string, string> = Object.fromEntries(
  SERVICE_CATALOG.map((s) => [s.id, s.icon])
);

const CATEGORY_LABELS: Record<string, string> = {
  "Source Control": "Source Control",
  Hosting: "Hosting",
  Cloud: "Cloud",
  Database: "Database",
  "CDN & DNS": "CDN & DNS",
  Payments: "Payments",
  Email: "Email",
  SMS: "SMS",
  Monitoring: "Monitoring",
  Analytics: "Analytics",
  Auth: "Auth",
  AI: "AI",
  Design: "Design",
  PM: "Project Management",
  Communication: "Communication",
  Storage: "Storage",
  CMS: "CMS",
  Domain: "Domain",
  "CI/CD": "CI/CD",
  Custom: "Custom",
};

// ─── Types ─────────────────────────────────────────────────────────────────────
interface CatalogService {
  id: string;
  name: string;
  category: string;
  icon: string;
  color: string;
  description: string;
  fields: string[];
}

interface Integration {
  id: string;
  service: string;
  display_name: string;
  environment: string;
  status: string;
  monthly_cost_usd?: number;
  notes?: string;
  expires_at?: string;
  credentials: Record<string, string>;
}

interface Secret {
  id: string;
  secret_name: string;
  secret_type: string;
  environment: string;
  expires_at?: string;
  last_rotated_at?: string;
  is_active: boolean;
  notes?: string;
  tags?: string[];
}

// ─── API (only used for Secrets Vault) ────────────────────────────────────────
const API_BASE =
  typeof window !== "undefined"
    ? localStorage.getItem("pixdrift_api_url") || "https://api.hypbit.com"
    : "https://api.hypbit.com";

const ORG_ID =
  typeof window !== "undefined"
    ? localStorage.getItem("pixdrift_org_id") || ""
    : "";

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "x-org-id": ORG_ID,
      ...(opts?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// ─── LocalStorage helpers ──────────────────────────────────────────────────────
const LS_KEY = "pixdrift_dev_integrations";

function loadIntegrationsFromLS(): Integration[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveIntegrationsToLS(integrations: Integration[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(integrations));
}

function generateId() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Shared UI ─────────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 12px",
  borderRadius: 8,
  border: `1px solid ${C.border}`,
  background: C.bg,
  fontSize: 14,
  color: C.text,
  outline: "none",
  fontFamily: "inherit",
};

const Pill = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    style={{
      padding: "6px 14px",
      borderRadius: 20,
      border: active ? "none" : `1px solid ${C.border}`,
      background: active ? C.blue : C.surface,
      color: active ? "#fff" : C.text,
      fontSize: 13,
      fontWeight: active ? 600 : 400,
      cursor: "pointer",
      whiteSpace: "nowrap",
      transition: "all 0.15s",
    }}
  >
    {label}
  </button>
);

const StatusDot = ({
  status,
  expiresAt,
}: {
  status: string;
  expiresAt?: string;
}) => {
  let color = C.green;
  if (status === "error" || status === "inactive") color = C.red;
  else if (status === "pending") color = C.orange;
  else if (expiresAt) {
    const daysLeft =
      (new Date(expiresAt).getTime() - Date.now()) / 86400000;
    if (daysLeft < 30) color = C.yellow;
  }
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
      }}
    />
  );
};

const Badge = ({ label, color }: { label: string; color: string }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 8px",
      borderRadius: 10,
      background: color + "20",
      color,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: 0.2,
    }}
  >
    {label}
  </span>
);

function fieldLabel(f: string): string {
  return f.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── ServiceCard ───────────────────────────────────────────────────────────────
const ServiceCard = ({
  service,
  isAdded,
  onAdd,
  onConfigure,
}: {
  service: CatalogService;
  isAdded: boolean;
  onAdd: (s: CatalogService) => void;
  onConfigure: (s: CatalogService) => void;
}) => (
  <div
    style={{
      background: C.surface,
      border: `0.5px solid ${isAdded ? C.green + "60" : C.border}`,
      borderRadius: 12,
      padding: "16px",
      display: "flex",
      flexDirection: "column",
      gap: 8,
      boxShadow: isAdded ? `0 0 0 1px ${C.green}20` : shadow,
      transition: "border-color 0.15s",
    }}
  >
    {/* Icon + Name */}
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: service.color + "15",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          flexShrink: 0,
        }}
      >
        {service.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: C.text,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {service.name}
        </div>
        <div style={{ fontSize: 11, color: C.secondary }}>{service.category}</div>
      </div>
      {isAdded && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: C.green,
            background: C.green + "15",
            padding: "2px 8px",
            borderRadius: 4,
            flexShrink: 0,
          }}
        >
          Connected
        </div>
      )}
    </div>

    <div style={{ fontSize: 12, color: C.secondary, lineHeight: 1.5 }}>
      {service.description}
    </div>

    <button
      onClick={() => (isAdded ? onConfigure(service) : onAdd(service))}
      style={{
        marginTop: 4,
        height: 30,
        background: isAdded ? C.fill : C.blue,
        color: isAdded ? C.text : "#fff",
        border: isAdded ? `1px solid ${C.border}` : "none",
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "background 0.15s",
      }}
    >
      {isAdded ? "Configure" : "+ Add"}
    </button>
  </div>
);

// ─── Tab: Catalog / Integrations ───────────────────────────────────────────────
function CatalogTab({
  integrations,
  onAdd,
  onConfigure,
}: {
  integrations: Integration[];
  onAdd: (s: CatalogService) => void;
  onConfigure: (s: CatalogService) => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const addedIds = new Set(integrations.map((i) => i.service));

  const filtered = SERVICE_CATALOG.filter((s) => {
    const matchesCategory =
      selectedCategory === "All" || s.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div>
      {/* Search */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <span
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: C.secondary,
            fontSize: 15,
          }}
        >
          🔍
        </span>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search services…"
          style={{ ...inputStyle, paddingLeft: 36 }}
        />
      </div>

      {/* Category pills */}
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 4,
          marginBottom: 20,
          scrollbarWidth: "none",
        }}
      >
        {CATEGORIES.map((cat) => (
          <Pill
            key={cat}
            label={cat === "All" ? "All" : (CATEGORY_LABELS[cat] || cat)}
            active={selectedCategory === cat}
            onClick={() => setSelectedCategory(cat)}
          />
        ))}
      </div>

      {/* Service grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: C.secondary }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 14 }}>No services found for "{searchQuery}"</div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {filtered.map((svc) => (
            <ServiceCard
              key={svc.id}
              service={svc}
              isAdded={addedIds.has(svc.id)}
              onAdd={onAdd}
              onConfigure={onConfigure}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Secrets Vault ────────────────────────────────────────────────────────
function SecretsVaultTab({ orgId }: { orgId: string }) {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/dev-secrets?org_id=${orgId}`)
      .then((d) => setSecrets(d.secrets || []))
      .catch(() => setSecrets([]))
      .finally(() => setLoading(false));
  }, [orgId]);

  const revealSecret = async (id: string) => {
    if (revealed[id]) {
      setRevealed((r) => {
        const n = { ...r };
        delete n[id];
        return n;
      });
      return;
    }
    try {
      const d = await apiFetch(`/api/dev-secrets/${id}/reveal?org_id=${orgId}`);
      setRevealed((r) => ({ ...r, [id]: d.value }));
    } catch {
      alert("Kunde inte hämta secret");
    }
  };

  const copySecret = async (id: string) => {
    const val = revealed[id];
    if (!val) {
      await revealSecret(id);
      return;
    }
    await navigator.clipboard.writeText(val);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const typeColor: Record<string, string> = {
    api_key: C.blue,
    token: C.purple,
    password: C.red,
    certificate: C.orange,
    ssh_key: C.green,
    webhook_secret: C.indigo,
    oauth_token: C.teal,
    database_url: C.yellow,
  };

  if (loading)
    return (
      <div style={{ textAlign: "center", padding: 60, color: C.secondary }}>
        Laddar...
      </div>
    );

  if (secrets.length === 0)
    return (
      <div style={{ textAlign: "center", padding: 60, color: C.secondary }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>
          Vault är tom
        </div>
        <div style={{ fontSize: 14 }}>
          Lägg till secrets via dina integrationer
        </div>
      </div>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {secrets.map((s) => {
        const daysToExpiry = s.expires_at
          ? (new Date(s.expires_at).getTime() - Date.now()) / 86400000
          : null;
        const expiringSoon = daysToExpiry !== null && daysToExpiry < 30;

        return (
          <div
            key={s.id}
            style={{
              background: C.surface,
              borderRadius: 10,
              padding: "12px 16px",
              border: `0.5px solid ${expiringSoon ? C.yellow : C.border}`,
              boxShadow: shadow,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: 13,
                    fontFamily: "monospace",
                  }}
                >
                  {s.secret_name}
                </span>
                <Badge
                  label={s.secret_type}
                  color={typeColor[s.secret_type] || C.secondary}
                />
                <Badge
                  label={s.environment}
                  color={
                    s.environment === "production" ? C.red : C.blue
                  }
                />
                {expiringSoon && (
                  <Badge
                    label={`⚠️ Löper ut om ${Math.round(daysToExpiry!)}d`}
                    color={C.yellow}
                  />
                )}
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 12,
                  color: revealed[s.id] ? C.text : C.tertiary,
                  background: "#F2F2F7",
                  borderRadius: 6,
                  padding: "4px 8px",
                  marginTop: 4,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {revealed[s.id] || "••••••••••••••••••••"}
              </div>
            </div>

            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button
                onClick={() => revealSecret(s.id)}
                title={revealed[s.id] ? "Dölj" : "Visa"}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  background: C.surface,
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                {revealed[s.id] ? "🙈" : "👁"}
              </button>
              <button
                onClick={() => copySecret(s.id)}
                title="Kopiera"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: `1px solid ${
                    copied === s.id ? C.green : C.border
                  }`,
                  background:
                    copied === s.id ? C.green + "15" : C.surface,
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                {copied === s.id ? "✅" : "📋"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Tab: Costs ────────────────────────────────────────────────────────────────
function CostsTab({ integrations }: { integrations: Integration[] }) {
  const total = integrations.reduce(
    (sum, i) => sum + (i.monthly_cost_usd || 0),
    0
  );

  const byCategory: Record<string, number> = {};
  const byService: { name: string; cost: number; icon: string; category: string }[] = [];

  integrations.forEach((int) => {
    if (!int.monthly_cost_usd) return;
    const svc = SERVICE_CATALOG.find((c) => c.id === int.service);
    const cat = svc?.category || "Custom";
    byCategory[cat] = (byCategory[cat] || 0) + int.monthly_cost_usd;
    byService.push({
      name: int.display_name,
      cost: int.monthly_cost_usd,
      icon: svc?.icon || "🔧",
      category: cat,
    });
  });

  byService.sort((a, b) => b.cost - a.cost);
  const sortedCats = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const maxCost = sortedCats[0]?.[1] || 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div
        style={{
          background: "linear-gradient(135deg, #007AFF 0%, #5856D6 100%)",
          borderRadius: 16,
          padding: "24px 28px",
          color: "#fff",
        }}
      >
        <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>
          Total månadskostnad
        </div>
        <div
          style={{ fontSize: 42, fontWeight: 700, letterSpacing: -1 }}
        >
          ${total.toFixed(2)}
          <span style={{ fontSize: 16, fontWeight: 400, opacity: 0.8 }}>
            /mo
          </span>
        </div>
        <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
          {integrations.filter((i) => i.monthly_cost_usd).length} betalda
          tjänster ·{" "}
          {integrations.filter((i) => !i.monthly_cost_usd).length}{" "}
          gratistjänster
        </div>
      </div>

      {sortedCats.length > 0 && (
        <div
          style={{
            background: C.surface,
            borderRadius: 12,
            padding: "16px 20px",
            boxShadow: shadow,
          }}
        >
          <div
            style={{
              fontWeight: 600,
              fontSize: 15,
              marginBottom: 16,
            }}
          >
            Kostnad per kategori
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sortedCats.map(([cat, cost]) => (
              <div key={cat}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <span style={{ fontSize: 13 }}>
                    {CATEGORY_LABELS[cat] || cat}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    ${cost.toFixed(2)}
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    background: C.bg,
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(cost / maxCost) * 100}%`,
                      background:
                        "linear-gradient(90deg, #007AFF, #5856D6)",
                      borderRadius: 3,
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {byService.length > 0 && (
        <div
          style={{
            background: C.surface,
            borderRadius: 12,
            padding: "16px 20px",
            boxShadow: shadow,
          }}
        >
          <div
            style={{
              fontWeight: 600,
              fontSize: 15,
              marginBottom: 16,
            }}
          >
            Per tjänst
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {byService.map((s, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "8px 0",
                  borderBottom:
                    i < byService.length - 1
                      ? `0.5px solid ${C.border}`
                      : "none",
                }}
              >
                <span style={{ fontSize: 20 }}>{s.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: 11, color: C.secondary }}>
                    {CATEGORY_LABELS[s.category] || s.category}
                  </div>
                </div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  ${s.cost.toFixed(2)}/mo
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {total === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: 40,
            color: C.secondary,
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>💸</div>
          <div style={{ fontSize: 14 }}>
            Lägg till kostnad på dina integrationer
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Add / Configure modal ─────────────────────────────────────────────────────
function AddServiceModal({
  service,
  existingIntegration,
  onSave,
  onDelete,
  onClose,
}: {
  service: CatalogService;
  existingIntegration?: Integration;
  onSave: (integration: Integration) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}) {
  const [displayName, setDisplayName] = useState(
    existingIntegration?.display_name || service.name
  );
  const [environment, setEnvironment] = useState(
    existingIntegration?.environment || "production"
  );
  const [monthlyCost, setMonthlyCost] = useState(
    existingIntegration?.monthly_cost_usd?.toString() || ""
  );
  const [notes, setNotes] = useState(existingIntegration?.notes || "");
  const [formData, setFormData] = useState<Record<string, string>>(
    existingIntegration?.credentials || {}
  );

  const isEditing = !!existingIntegration;

  const handleSave = () => {
    const integration: Integration = {
      id: existingIntegration?.id || generateId(),
      service: service.id,
      display_name: displayName || service.name,
      environment,
      status: "active",
      monthly_cost_usd: monthlyCost ? parseFloat(monthlyCost) : undefined,
      notes,
      credentials: formData,
    };
    onSave(integration);
  };

  const handleDelete = () => {
    if (!existingIntegration || !onDelete) return;
    if (!confirm(`Ta bort ${existingIntegration.display_name}?`)) return;
    onDelete(existingIntegration.id);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.surface,
          borderRadius: 20,
          padding: 24,
          width: "100%",
          maxWidth: 520,
          maxHeight: "85vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: service.color + "15",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
            }}
          >
            {service.icon}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>
              {isEditing ? "Configure" : "Add"} {service.name}
            </div>
            <div style={{ fontSize: 13, color: C.secondary }}>
              {service.description}
            </div>
          </div>
        </div>

        <div
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          <div>
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: C.secondary,
                display: "block",
                marginBottom: 6,
              }}
            >
              DISPLAY NAME
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              style={inputStyle}
              placeholder={service.name}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <div>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.secondary,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                ENVIRONMENT
              </label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
              </select>
            </div>
            <div>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.secondary,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                COST (USD/MO)
              </label>
              <input
                type="number"
                value={monthlyCost}
                onChange={(e) => setMonthlyCost(e.target.value)}
                style={inputStyle}
                placeholder="0"
              />
            </div>
          </div>

          {/* Credentials */}
          <div
            style={{
              borderTop: `0.5px solid ${C.border}`,
              paddingTop: 16,
              marginTop: 4,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: C.secondary,
                marginBottom: 12,
              }}
            >
              CREDENTIALS
            </div>
            {service.fields.map((field) => (
              <div key={field} style={{ marginBottom: 10 }}>
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  {fieldLabel(field)}
                </label>
                <input
                  type={
                    field.includes("secret") ||
                    field.includes("password") ||
                    field.includes("token") ||
                    field.includes("key")
                      ? "password"
                      : "text"
                  }
                  value={formData[field] || ""}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, [field]: e.target.value }))
                  }
                  style={inputStyle}
                  placeholder={
                    isEditing
                      ? "Leave blank to keep existing"
                      : fieldLabel(field)
                  }
                />
              </div>
            ))}
          </div>

          <div>
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: C.secondary,
                display: "block",
                marginBottom: 6,
              }}
            >
              NOTES (OPTIONAL)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ ...inputStyle, height: 72, resize: "vertical", lineHeight: 1.5 }}
              placeholder="Who owns this account? Which feature uses it?"
            />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {isEditing && onDelete && (
              <button
                onClick={handleDelete}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: `1px solid ${C.red}`,
                  background: "transparent",
                  color: C.red,
                  fontSize: 14,
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Remove
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: 10,
                border: `1px solid ${C.border}`,
                background: C.surface,
                fontSize: 14,
                cursor: "pointer",
                fontWeight: 500,
                color: C.text,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!displayName}
              style={{
                flex: 2,
                padding: "10px 0",
                borderRadius: 10,
                border: "none",
                background: displayName ? C.blue : C.tertiary,
                color: "#fff",
                fontSize: 14,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {isEditing ? "Save changes" : "Add service"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main DevOpsHub ────────────────────────────────────────────────────────────
export default function DevOpsHub() {
  const [tab, setTab] = useState<"catalog" | "secrets" | "costs">("catalog");
  const [integrations, setIntegrations] = useState<Integration[]>(() =>
    loadIntegrationsFromLS()
  );
  const [modalService, setModalService] = useState<CatalogService | null>(null);
  const [editingIntegration, setEditingIntegration] = useState<Integration | undefined>(undefined);

  // Persist integrations to localStorage whenever they change
  useEffect(() => {
    saveIntegrationsToLS(integrations);
  }, [integrations]);

  const handleAdd = (service: CatalogService) => {
    const existing = integrations.find((i) => i.service === service.id);
    setEditingIntegration(existing);
    setModalService(service);
  };

  const handleConfigure = (service: CatalogService) => {
    const existing = integrations.find((i) => i.service === service.id);
    setEditingIntegration(existing);
    setModalService(service);
  };

  const handleSave = (integration: Integration) => {
    setIntegrations((prev) => {
      const idx = prev.findIndex((i) => i.id === integration.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = integration;
        return updated;
      }
      return [...prev, integration];
    });
    setModalService(null);
    setEditingIntegration(undefined);
  };

  const handleDelete = (id: string) => {
    setIntegrations((prev) => prev.filter((i) => i.id !== id));
    setModalService(null);
    setEditingIntegration(undefined);
  };

  const tabs = [
    { id: "catalog" as const, label: "🔌 Services" },
    { id: "secrets" as const, label: "🔐 Secrets" },
    { id: "costs" as const, label: "💸 Costs" },
  ];

  return (
    <div
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Helvetica Neue, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            margin: 0,
            letterSpacing: -0.5,
          }}
        >
          Dev Infrastructure
        </h1>
        <p style={{ fontSize: 14, color: C.secondary, margin: "6px 0 0" }}>
          {SERVICE_CATALOG.length} services in catalog ·{" "}
          {integrations.length} connected
        </p>
      </div>

      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: 2,
          background: C.border + "40",
          borderRadius: 10,
          padding: 3,
          marginBottom: 24,
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: "1 0 auto",
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: tab === t.id ? C.surface : "transparent",
              color: tab === t.id ? C.text : C.secondary,
              fontSize: 13,
              fontWeight: tab === t.id ? 600 : 400,
              cursor: "pointer",
              boxShadow: tab === t.id ? shadow : "none",
              transition: "all 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "catalog" && (
        <CatalogTab
          integrations={integrations}
          onAdd={handleAdd}
          onConfigure={handleConfigure}
        />
      )}
      {tab === "secrets" && <SecretsVaultTab orgId={ORG_ID} />}
      {tab === "costs" && <CostsTab integrations={integrations} />}

      {/* Add / Configure modal */}
      {modalService && (
        <AddServiceModal
          service={modalService}
          existingIntegration={editingIntegration}
          onSave={handleSave}
          onDelete={editingIntegration ? handleDelete : undefined}
          onClose={() => {
            setModalService(null);
            setEditingIntegration(undefined);
          }}
        />
      )}
    </div>
  );
}
