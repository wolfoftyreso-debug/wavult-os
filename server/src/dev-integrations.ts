import { Router, Request, Response } from "express";
import crypto from "crypto";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://postgres.${process.env.SUPABASE_PROJECT_REF || "znmxtnxxjpmgtycmsqjv"}:${process.env.SUPABASE_DB_PASSWORD || "Certified2026abc"}@aws-1-eu-west-1.pooler.supabase.com:5432/postgres`,
  max: 5,
  idleTimeoutMillis: 30000,
});

const router = Router();

// ─── Encryption helpers ────────────────────────────────────────────────────────
const ENCRYPTION_KEY = process.env.DEV_SECRETS_KEY || "pixdrift-dev-secrets-key-32-bytes!"; // 32 chars
const ALGORITHM = "aes-256-gcm";

function encrypt(text: string): string {
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, "0"));
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return iv.toString("hex") + ":" + tag.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(encryptedText: string): string {
  try {
    const parts = encryptedText.split(":");
    if (parts.length !== 3) return "[encrypted]";
    const [ivHex, tagHex, dataHex] = parts;
    const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, "0"));
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const data = Buffer.from(dataHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(data).toString("utf8") + decipher.final("utf8");
  } catch {
    return "[encrypted]";
  }
}

function maskCredentials(credentials: Record<string, string>): Record<string, string> {
  const masked: Record<string, string> = {};
  for (const [k, v] of Object.entries(credentials)) {
    if (typeof v === "string" && v.length > 8) {
      masked[k] = v.slice(0, 4) + "****" + v.slice(-4);
    } else {
      masked[k] = "****";
    }
  }
  return masked;
}

// ─── Service catalog ────────────────────────────────────────────────────────────
export const SERVICE_CATALOG: Record<string, {
  name: string;
  logo: string;
  color: string;
  fields: string[];
  docs: string;
  cost_url?: string;
  verify_endpoint?: string;
  category?: string;
}> = {
  github: {
    name: "GitHub",
    logo: "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
    color: "#24292e",
    fields: ["personal_access_token", "organization", "webhook_secret"],
    docs: "https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token",
    cost_url: "https://github.com/settings/billing",
    verify_endpoint: "https://api.github.com/user",
    category: "source_control"
  },
  supabase: {
    name: "Supabase",
    logo: "https://supabase.com/brand-assets/supabase-logo-wordmark--dark.png",
    color: "#3ECF8E",
    fields: ["project_url", "anon_key", "service_role_key", "database_password"],
    docs: "https://supabase.com/docs/guides/api",
    verify_endpoint: "/rest/v1/",
    category: "database"
  },
  aws: {
    name: "AWS",
    logo: "https://a0.awsstatic.com/libra-css/images/logos/aws_logo_smile_1200x630.png",
    color: "#FF9900",
    fields: ["access_key_id", "secret_access_key", "region", "account_id"],
    docs: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html",
    cost_url: "https://console.aws.amazon.com/billing",
    category: "cloud"
  },
  vercel: {
    name: "Vercel",
    logo: "https://assets.vercel.com/image/upload/v1538361091/repositories/vercel/logo.png",
    color: "#000000",
    fields: ["api_token", "team_id"],
    docs: "https://vercel.com/account/tokens",
    verify_endpoint: "https://api.vercel.com/v2/user",
    cost_url: "https://vercel.com/account/billing",
    category: "hosting"
  },
  cloudflare: {
    name: "Cloudflare",
    logo: "https://www.cloudflare.com/img/cf-facebook-card.png",
    color: "#F48120",
    fields: ["api_token", "account_id", "zone_id"],
    docs: "https://developers.cloudflare.com/fundamentals/api/get-started/create-token/",
    verify_endpoint: "https://api.cloudflare.com/client/v4/user/tokens/verify",
    category: "cdn"
  },
  stripe: {
    name: "Stripe",
    logo: "https://stripe.com/img/v3/home/twitter.png",
    color: "#635BFF",
    fields: ["publishable_key", "secret_key", "webhook_secret"],
    docs: "https://stripe.com/docs/keys",
    verify_endpoint: "https://api.stripe.com/v1/account",
    cost_url: "https://dashboard.stripe.com/billing",
    category: "payments"
  },
  openai: {
    name: "OpenAI",
    logo: "https://openai.com/favicon.ico",
    color: "#10a37f",
    fields: ["api_key", "organization_id"],
    docs: "https://platform.openai.com/api-keys",
    verify_endpoint: "https://api.openai.com/v1/models",
    cost_url: "https://platform.openai.com/account/billing",
    category: "ai"
  },
  anthropic: {
    name: "Anthropic / Claude",
    logo: "https://anthropic.com/favicon.ico",
    color: "#D4A574",
    fields: ["api_key"],
    docs: "https://console.anthropic.com/account/keys",
    cost_url: "https://console.anthropic.com/billing",
    category: "ai"
  },
  google_cloud: {
    name: "Google Cloud",
    logo: "https://www.gstatic.com/devrel-devsite/prod/v45f61267e9154e1b6c6a5571db9bfa6f71ff53eda8b3aaf55f06ee6f93e4d64c/cloud/images/favicons/onecloud/super_cloud.png",
    color: "#4285F4",
    fields: ["service_account_json", "project_id"],
    docs: "https://cloud.google.com/iam/docs/service-accounts",
    cost_url: "https://console.cloud.google.com/billing",
    category: "cloud"
  },
  azure: {
    name: "Microsoft Azure",
    logo: "https://azure.microsoft.com/svghandler/azure/?width=300",
    color: "#0078D4",
    fields: ["client_id", "client_secret", "tenant_id", "subscription_id"],
    docs: "https://docs.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal",
    cost_url: "https://portal.azure.com/#blade/Microsoft_Azure_Billing",
    category: "cloud"
  },
  digitalocean: {
    name: "DigitalOcean",
    logo: "https://www.digitalocean.com/favicon.ico",
    color: "#0080FF",
    fields: ["api_token", "spaces_access_key", "spaces_secret_key"],
    docs: "https://docs.digitalocean.com/reference/api/create-personal-access-token/",
    verify_endpoint: "https://api.digitalocean.com/v2/account",
    category: "hosting"
  },
  netlify: {
    name: "Netlify",
    logo: "https://www.netlify.com/v3/img/components/logomark.png",
    color: "#00C7B7",
    fields: ["api_token", "site_id"],
    docs: "https://docs.netlify.com/api/get-started/#authentication",
    verify_endpoint: "https://api.netlify.com/api/v1/user",
    category: "hosting"
  },
  sendgrid: {
    name: "SendGrid",
    logo: "https://sendgrid.com/favicon.ico",
    color: "#1A82E2",
    fields: ["api_key"],
    docs: "https://docs.sendgrid.com/ui/account-and-settings/api-keys",
    verify_endpoint: "https://api.sendgrid.com/v3/user/profile",
    category: "email"
  },
  twilio: {
    name: "Twilio",
    logo: "https://www.twilio.com/favicon.ico",
    color: "#F22F46",
    fields: ["account_sid", "auth_token", "api_key", "api_secret"],
    docs: "https://www.twilio.com/docs/iam/credentials/api-key",
    cost_url: "https://www.twilio.com/console/billing",
    category: "sms"
  },
  slack: {
    name: "Slack",
    logo: "https://a.slack-edge.com/80588/marketing/img/meta/slack_hash_256.png",
    color: "#4A154B",
    fields: ["bot_token", "signing_secret", "app_token", "webhook_url"],
    docs: "https://api.slack.com/authentication/token-types",
    category: "communication"
  },
  discord: {
    name: "Discord",
    logo: "https://discord.com/assets/favicon.ico",
    color: "#5865F2",
    fields: ["bot_token", "application_id", "webhook_url"],
    docs: "https://discord.com/developers/docs/topics/oauth2",
    category: "communication"
  },
  notion: {
    name: "Notion",
    logo: "https://www.notion.so/images/favicon.ico",
    color: "#000000",
    fields: ["api_key", "database_id"],
    docs: "https://developers.notion.com/docs/getting-started",
    verify_endpoint: "https://api.notion.com/v1/users/me",
    category: "pm"
  },
  linear: {
    name: "Linear",
    logo: "https://linear.app/favicon.ico",
    color: "#5E6AD2",
    fields: ["api_key", "webhook_secret"],
    docs: "https://linear.app/docs/oauth-api",
    verify_endpoint: "https://api.linear.app/graphql",
    category: "pm"
  },
  jira: {
    name: "Jira / Atlassian",
    logo: "https://wac-cdn.atlassian.com/assets/img/favicons/atlassian/favicon.png",
    color: "#0052CC",
    fields: ["email", "api_token", "domain"],
    docs: "https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/",
    category: "pm"
  },
  confluence: {
    name: "Confluence",
    logo: "https://wac-cdn.atlassian.com/assets/img/favicons/atlassian/favicon.png",
    color: "#172B4D",
    fields: ["email", "api_token", "domain"],
    docs: "https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/",
    category: "pm"
  },
  figma: {
    name: "Figma",
    logo: "https://www.figma.com/favicon.ico",
    color: "#F24E1E",
    fields: ["access_token", "team_id"],
    docs: "https://www.figma.com/developers/api#authentication",
    verify_endpoint: "https://api.figma.com/v1/me",
    category: "design"
  },
  datadog: {
    name: "Datadog",
    logo: "https://www.datadoghq.com/favicon.ico",
    color: "#632CA6",
    fields: ["api_key", "app_key", "site"],
    docs: "https://docs.datadoghq.com/account_management/api-app-keys/",
    cost_url: "https://app.datadoghq.com/billing/plan",
    category: "monitoring"
  },
  sentry: {
    name: "Sentry",
    logo: "https://sentry.io/favicon.ico",
    color: "#362D59",
    fields: ["auth_token", "dsn", "org_slug"],
    docs: "https://docs.sentry.io/api/auth/",
    verify_endpoint: "https://sentry.io/api/0/",
    category: "monitoring"
  },
  pagerduty: {
    name: "PagerDuty",
    logo: "https://www.pagerduty.com/favicon.ico",
    color: "#06AC38",
    fields: ["api_key", "integration_key"],
    docs: "https://developer.pagerduty.com/api-reference/authentication",
    category: "monitoring"
  },
  revolut: {
    name: "Revolut Business",
    logo: "https://www.revolut.com/favicon.ico",
    color: "#0075EB",
    fields: ["api_key", "client_id", "client_secret"],
    docs: "https://developer.revolut.com/docs/business/business-api",
    cost_url: "https://business.revolut.com/billing",
    category: "payments"
  },
  wise: {
    name: "Wise",
    logo: "https://wise.com/favicon.ico",
    color: "#00B9FF",
    fields: ["api_token", "profile_id"],
    docs: "https://docs.wise.com/api-docs/features/authentication-access/personal-tokens",
    verify_endpoint: "https://api.wise.com/v1/profiles",
    category: "payments"
  },
  // ── Source Control ──
  gitlab: {
    name: "GitLab",
    logo: "https://gitlab.com/favicon.ico",
    color: "#FC6D26",
    fields: ["personal_access_token", "group_id"],
    docs: "https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html",
    verify_endpoint: "https://gitlab.com/api/v4/user",
    category: "source_control",
  },
  bitbucket: {
    name: "Bitbucket",
    logo: "https://bitbucket.org/favicon.ico",
    color: "#0052CC",
    fields: ["app_password", "username", "workspace"],
    docs: "https://support.atlassian.com/bitbucket-cloud/docs/app-passwords/",
    category: "source_control",
  },

  // ── Hosting ──
  railway: {
    name: "Railway",
    logo: "https://railway.app/favicon.ico",
    color: "#0B0D0E",
    fields: ["api_token", "project_id"],
    docs: "https://docs.railway.app/reference/public-api",
    verify_endpoint: "https://backboard.railway.app/graphql/v2",
    category: "hosting",
  },
  render: {
    name: "Render",
    logo: "https://render.com/favicon.ico",
    color: "#46E3B7",
    fields: ["api_key"],
    docs: "https://api-docs.render.com/reference/authentication",
    verify_endpoint: "https://api.render.com/v1/owner/me",
    category: "hosting",
  },
  flyio: {
    name: "Fly.io",
    logo: "https://fly.io/favicon.ico",
    color: "#7B3FF7",
    fields: ["api_token", "org_slug"],
    docs: "https://fly.io/docs/machines/api/authentication/",
    category: "hosting",
  },
  heroku: {
    name: "Heroku",
    logo: "https://www.heroku.com/favicon.ico",
    color: "#430098",
    fields: ["api_key", "app_name"],
    docs: "https://devcenter.heroku.com/articles/platform-api-quickstart#authentication",
    cost_url: "https://dashboard.heroku.com/account/billing",
    category: "hosting",
  },

  // ── Database ──
  planetscale: {
    name: "PlanetScale",
    logo: "https://planetscale.com/favicon.ico",
    color: "#000000",
    fields: ["service_token_id", "service_token", "database_url"],
    docs: "https://planetscale.com/docs/concepts/service-tokens",
    category: "database",
  },
  neon: {
    name: "Neon",
    logo: "https://neon.tech/favicon.ico",
    color: "#00E599",
    fields: ["api_key", "project_id", "database_url"],
    docs: "https://neon.tech/docs/manage/api-keys",
    verify_endpoint: "https://console.neon.tech/api/v2/projects",
    category: "database",
  },
  mongodb_atlas: {
    name: "MongoDB Atlas",
    logo: "https://www.mongodb.com/favicon.ico",
    color: "#00ED64",
    fields: ["public_key", "private_key", "org_id", "connection_string"],
    docs: "https://www.mongodb.com/docs/atlas/configure-api-access/",
    cost_url: "https://cloud.mongodb.com/v2#/billing",
    category: "database",
  },
  redis_upstash: {
    name: "Redis / Upstash",
    logo: "https://upstash.com/favicon.ico",
    color: "#00C44F",
    fields: ["rest_url", "rest_token", "redis_url"],
    docs: "https://docs.upstash.com/redis/howto/connectedapps",
    category: "database",
  },
  firebase: {
    name: "Firebase",
    logo: "https://firebase.google.com/favicon.ico",
    color: "#FFCA28",
    fields: ["project_id", "service_account_json", "database_url", "storage_bucket"],
    docs: "https://firebase.google.com/docs/admin/setup",
    cost_url: "https://console.firebase.google.com/project/_/usage",
    category: "database",
  },

  // ── CDN & DNS ──
  bunnynet: {
    name: "Bunny.net",
    logo: "https://bunny.net/favicon.ico",
    color: "#F77002",
    fields: ["api_key", "storage_zone_name", "pull_zone_id"],
    docs: "https://docs.bunny.net/reference/bunnynet-api-overview",
    cost_url: "https://dash.bunny.net/billing",
    category: "cdn",
  },
  fastly: {
    name: "Fastly",
    logo: "https://www.fastly.com/favicon.ico",
    color: "#FF282D",
    fields: ["api_key", "service_id"],
    docs: "https://developer.fastly.com/reference/api/auth/",
    cost_url: "https://manage.fastly.com/billing",
    category: "cdn",
  },

  // ── Payments ──
  klarna: {
    name: "Klarna",
    logo: "https://www.klarna.com/favicon.ico",
    color: "#FFB3C7",
    fields: ["username", "password", "api_key"],
    docs: "https://docs.klarna.com/klarna-payments/api/#section/Authentication",
    cost_url: "https://portal.klarna.com",
    category: "payments",
  },
  adyen: {
    name: "Adyen",
    logo: "https://www.adyen.com/favicon.ico",
    color: "#0ABF53",
    fields: ["api_key", "client_key", "merchant_account"],
    docs: "https://docs.adyen.com/development-resources/api-credentials",
    category: "payments",
  },
  paypal: {
    name: "PayPal",
    logo: "https://www.paypal.com/favicon.ico",
    color: "#003087",
    fields: ["client_id", "client_secret", "webhook_id"],
    docs: "https://developer.paypal.com/api/rest/#link-getclientcredentials",
    cost_url: "https://www.paypal.com/billing",
    category: "payments",
  },

  // ── Email ──
  resend: {
    name: "Resend",
    logo: "https://resend.com/favicon.ico",
    color: "#000000",
    fields: ["api_key"],
    docs: "https://resend.com/docs/introduction",
    verify_endpoint: "https://api.resend.com/domains",
    category: "email",
  },
  mailchimp: {
    name: "Mailchimp",
    logo: "https://mailchimp.com/favicon.ico",
    color: "#FFE01B",
    fields: ["api_key", "server_prefix", "audience_id"],
    docs: "https://mailchimp.com/developer/marketing/docs/fundamentals/#authentication",
    cost_url: "https://admin.mailchimp.com/account/billing-history/",
    category: "email",
  },
  brevo: {
    name: "Brevo (Sendinblue)",
    logo: "https://www.brevo.com/favicon.ico",
    color: "#0B996E",
    fields: ["api_key"],
    docs: "https://developers.brevo.com/docs/getting-started",
    verify_endpoint: "https://api.brevo.com/v3/account",
    category: "email",
  },
  postmark: {
    name: "Postmark",
    logo: "https://postmarkapp.com/favicon.ico",
    color: "#FFDE00",
    fields: ["server_api_token", "account_api_token", "message_stream"],
    docs: "https://postmarkapp.com/developer/api/overview",
    verify_endpoint: "https://api.postmarkapp.com/server",
    category: "email",
  },

  // ── SMS ──
  "46elks": {
    name: "46elks",
    logo: "https://46elks.com/favicon.ico",
    color: "#2B7FF2",
    fields: ["api_username", "api_password"],
    docs: "https://46elks.com/docs#authentication",
    category: "sms",
  },
  sinch: {
    name: "Sinch",
    logo: "https://www.sinch.com/favicon.ico",
    color: "#E81B60",
    fields: ["app_key", "app_secret", "service_plan_id", "api_token"],
    docs: "https://developers.sinch.com/docs/sms/getting-started/",
    category: "sms",
  },

  // ── Monitoring ──
  new_relic: {
    name: "New Relic",
    logo: "https://newrelic.com/favicon.ico",
    color: "#1CE783",
    fields: ["license_key", "api_key", "account_id"],
    docs: "https://docs.newrelic.com/docs/apis/intro-apis/new-relic-api-keys/",
    cost_url: "https://one.newrelic.com/admin-portal/billing-and-usage/home",
    category: "monitoring",
  },
  grafana: {
    name: "Grafana",
    logo: "https://grafana.com/favicon.ico",
    color: "#F46800",
    fields: ["api_key", "org_id", "stack_id", "stack_url"],
    docs: "https://grafana.com/docs/grafana/latest/administration/api-keys/",
    category: "monitoring",
  },
  logrocket: {
    name: "LogRocket",
    logo: "https://logrocket.com/favicon.ico",
    color: "#764ABC",
    fields: ["app_id", "api_key"],
    docs: "https://docs.logrocket.com/reference/recording-your-first-session",
    category: "monitoring",
  },
  posthog: {
    name: "PostHog",
    logo: "https://posthog.com/favicon.ico",
    color: "#F54E00",
    fields: ["project_api_key", "personal_api_key", "host"],
    docs: "https://posthog.com/docs/api",
    verify_endpoint: "https://app.posthog.com/api/users/@me/",
    category: "monitoring",
  },

  // ── Analytics ──
  google_analytics: {
    name: "Google Analytics",
    logo: "https://analytics.google.com/favicon.ico",
    color: "#E37400",
    fields: ["measurement_id", "api_secret", "property_id", "service_account_json"],
    docs: "https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart-client-libraries",
    category: "analytics",
  },
  mixpanel: {
    name: "Mixpanel",
    logo: "https://mixpanel.com/favicon.ico",
    color: "#7856FF",
    fields: ["project_token", "api_secret", "service_account_username", "service_account_secret"],
    docs: "https://developer.mixpanel.com/reference/authentication",
    cost_url: "https://mixpanel.com/billing",
    category: "analytics",
  },
  amplitude: {
    name: "Amplitude",
    logo: "https://amplitude.com/favicon.ico",
    color: "#002CC4",
    fields: ["api_key", "secret_key", "deployment_key"],
    docs: "https://www.docs.developers.amplitude.com/analytics/apis/authentication/",
    cost_url: "https://app.amplitude.com/settings/billing",
    category: "analytics",
  },
  hotjar: {
    name: "Hotjar",
    logo: "https://www.hotjar.com/favicon.ico",
    color: "#FD3A5C",
    fields: ["site_id", "api_key"],
    docs: "https://help.hotjar.com/hc/en-us/articles/360033640653",
    cost_url: "https://insights.hotjar.com/account/billing",
    category: "analytics",
  },

  // ── Auth ──
  auth0: {
    name: "Auth0",
    logo: "https://auth0.com/favicon.ico",
    color: "#EB5424",
    fields: ["domain", "client_id", "client_secret", "management_api_token"],
    docs: "https://auth0.com/docs/get-started/authentication-and-authorization-flow",
    cost_url: "https://manage.auth0.com/dashboard/billing",
    category: "auth",
  },
  clerk: {
    name: "Clerk",
    logo: "https://clerk.com/favicon.ico",
    color: "#6C47FF",
    fields: ["publishable_key", "secret_key", "webhook_secret"],
    docs: "https://clerk.com/docs/reference/backend-api",
    verify_endpoint: "https://api.clerk.dev/v1/clients",
    category: "auth",
  },
  okta: {
    name: "Okta",
    logo: "https://www.okta.com/favicon.ico",
    color: "#007DC1",
    fields: ["domain", "api_token", "client_id", "client_secret"],
    docs: "https://developer.okta.com/docs/reference/core-okta-api/",
    cost_url: "https://www.okta.com/pricing/",
    category: "auth",
  },

  // ── AI ──
  google_gemini: {
    name: "Google Gemini",
    logo: "https://ai.google.dev/favicon.ico",
    color: "#4285F4",
    fields: ["api_key", "project_id"],
    docs: "https://ai.google.dev/gemini-api/docs/api-key",
    cost_url: "https://console.cloud.google.com/billing",
    category: "ai",
  },
  cohere: {
    name: "Cohere",
    logo: "https://cohere.com/favicon.ico",
    color: "#39594D",
    fields: ["api_key"],
    docs: "https://docs.cohere.com/reference/versioning",
    verify_endpoint: "https://api.cohere.ai/v1/check-api-key",
    cost_url: "https://dashboard.cohere.com/billing",
    category: "ai",
  },
  replicate: {
    name: "Replicate",
    logo: "https://replicate.com/favicon.ico",
    color: "#000000",
    fields: ["api_token"],
    docs: "https://replicate.com/docs/reference/http",
    verify_endpoint: "https://api.replicate.com/v1/account",
    cost_url: "https://replicate.com/billing",
    category: "ai",
  },
  hugging_face: {
    name: "Hugging Face",
    logo: "https://huggingface.co/favicon.ico",
    color: "#FF9D00",
    fields: ["api_token", "organization"],
    docs: "https://huggingface.co/docs/api-inference/index",
    verify_endpoint: "https://huggingface.co/api/whoami-v2",
    category: "ai",
  },

  // ── Communication ──
  microsoft_teams: {
    name: "Microsoft Teams",
    logo: "https://www.microsoft.com/favicon.ico",
    color: "#6264A7",
    fields: ["webhook_url", "tenant_id", "client_id", "client_secret"],
    docs: "https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook",
    category: "communication",
  },

  // ── Storage ──
  aws_s3: {
    name: "AWS S3",
    logo: "https://a0.awsstatic.com/libra-css/images/logos/aws_logo_smile_1200x630.png",
    color: "#FF9900",
    fields: ["access_key_id", "secret_access_key", "bucket_name", "region"],
    docs: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/",
    cost_url: "https://console.aws.amazon.com/billing",
    category: "storage",
  },
  cloudflare_r2: {
    name: "Cloudflare R2",
    logo: "https://www.cloudflare.com/img/cf-facebook-card.png",
    color: "#F48120",
    fields: ["account_id", "access_key_id", "secret_access_key", "bucket_name", "endpoint"],
    docs: "https://developers.cloudflare.com/r2/api/s3/",
    category: "storage",
  },
  backblaze_b2: {
    name: "Backblaze B2",
    logo: "https://www.backblaze.com/favicon.ico",
    color: "#D42020",
    fields: ["application_key_id", "application_key", "bucket_id", "bucket_name"],
    docs: "https://www.backblaze.com/b2/docs/application_keys.html",
    cost_url: "https://secure.backblaze.com/billing.htm",
    category: "storage",
  },

  // ── CMS ──
  contentful: {
    name: "Contentful",
    logo: "https://www.contentful.com/favicon.ico",
    color: "#2478CC",
    fields: ["space_id", "delivery_api_key", "management_api_key", "environment"],
    docs: "https://www.contentful.com/developers/docs/references/authentication/",
    cost_url: "https://app.contentful.com/settings/billing",
    category: "cms",
  },
  sanity: {
    name: "Sanity",
    logo: "https://www.sanity.io/favicon.ico",
    color: "#F36458",
    fields: ["project_id", "dataset", "api_token"],
    docs: "https://www.sanity.io/docs/http-auth",
    cost_url: "https://www.sanity.io/manage/billing",
    category: "cms",
  },

  // ── Domain ──
  namecheap: {
    name: "Namecheap",
    logo: "https://www.namecheap.com/favicon.ico",
    color: "#DE3723",
    fields: ["api_user", "api_key", "username", "client_ip"],
    docs: "https://www.namecheap.com/support/api/intro/",
    category: "domain",
  },
  godaddy: {
    name: "GoDaddy",
    logo: "https://www.godaddy.com/favicon.ico",
    color: "#1BDBDB",
    fields: ["api_key", "api_secret"],
    docs: "https://developer.godaddy.com/doc",
    category: "domain",
  },

  // ── CI/CD ──
  github_actions: {
    name: "GitHub Actions",
    logo: "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
    color: "#2088FF",
    fields: ["personal_access_token", "organization", "repository"],
    docs: "https://docs.github.com/en/rest/actions",
    category: "cicd",
  },
  circleci: {
    name: "CircleCI",
    logo: "https://circleci.com/favicon.ico",
    color: "#343434",
    fields: ["api_token", "org_id"],
    docs: "https://circleci.com/docs/api/v2/",
    verify_endpoint: "https://circleci.com/api/v2/me",
    cost_url: "https://app.circleci.com/settings/plan/billing",
    category: "cicd",
  },

  custom: {
    name: "Custom Service",
    logo: "",
    color: "#8E8E93",
    fields: ["name", "api_key", "api_secret", "endpoint_url", "webhook_secret"],
    docs: "",
    category: "custom",
  },
};

// ─── Verify connection for known services ──────────────────────────────────────
async function verifyIntegration(service: string, credentials: Record<string, string>): Promise<{ ok: boolean; error?: string }> {
  try {
    const catalog = SERVICE_CATALOG[service];
    if (!catalog?.verify_endpoint) return { ok: true }; // Can't verify, assume OK

    if (service === "github") {
      const res = await fetch(catalog.verify_endpoint, {
        headers: { Authorization: `Bearer ${credentials.personal_access_token}`, "User-Agent": "pixdrift" },
      });
      return res.ok ? { ok: true } : { ok: false, error: `HTTP ${res.status}` };
    }
    if (service === "openai") {
      const res = await fetch(catalog.verify_endpoint, {
        headers: { Authorization: `Bearer ${credentials.api_key}` },
      });
      return res.ok ? { ok: true } : { ok: false, error: `HTTP ${res.status}` };
    }
    if (service === "vercel") {
      const res = await fetch(catalog.verify_endpoint, {
        headers: { Authorization: `Bearer ${credentials.api_token}` },
      });
      return res.ok ? { ok: true } : { ok: false, error: `HTTP ${res.status}` };
    }
    if (service === "stripe") {
      const res = await fetch(catalog.verify_endpoint, {
        headers: { Authorization: `Basic ${Buffer.from(credentials.secret_key + ":").toString("base64")}` },
      });
      return res.ok ? { ok: true } : { ok: false, error: `HTTP ${res.status}` };
    }
    if (service === "figma") {
      const res = await fetch(catalog.verify_endpoint, {
        headers: { "X-Figma-Token": credentials.access_token },
      });
      return res.ok ? { ok: true } : { ok: false, error: `HTTP ${res.status}` };
    }
    if (service === "notion") {
      const res = await fetch(catalog.verify_endpoint, {
        headers: { Authorization: `Bearer ${credentials.api_key}`, "Notion-Version": "2022-06-28" },
      });
      return res.ok ? { ok: true } : { ok: false, error: `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ─── Routes ────────────────────────────────────────────────────────────────────

// GET /api/dev-catalog — public service catalog
router.get("/dev-catalog", (_req: Request, res: Response) => {
  const catalog = Object.entries(SERVICE_CATALOG).map(([id, s]: [string, any]) => ({
    id,
    name: s.name,
    logo: s.logo,
    color: s.color,
    fields: s.fields,
    docs: s.docs,
    cost_url: s.cost_url,
    category: s.category || "other",
  }));
  res.json({ services: catalog, total: catalog.length });
});

// GET /api/dev-integrations — list all for org
router.get("/dev-integrations", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id || (req.headers["x-org-id"] as string);
    if (!orgId) return res.status(400).json({ error: "org_id required" });

    const result = await pool.query(
      `SELECT i.*, s.monthly_cost_usd as sub_cost, s.plan_name, s.next_billing_date
       FROM dev_integrations i
       LEFT JOIN dev_subscriptions s ON s.integration_id = i.id
       WHERE i.org_id = $1 ORDER BY i.created_at DESC`,
      [orgId]
    );

    const rows = result.rows.map((r: any) => {
      let creds = {};
      if (r.credentials && typeof r.credentials === "object") {
        // Decrypt then mask
        const decrypted: Record<string, string> = {};
        for (const [k, v] of Object.entries(r.credentials as Record<string, string>)) {
          decrypted[k] = decrypt(v);
        }
        creds = maskCredentials(decrypted);
      }
      return { ...r, credentials: creds };
    });

    res.json({ integrations: rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/dev-integrations — add integration
router.post("/dev-integrations", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id || (req.headers["x-org-id"] as string);
    const userId = (req as any).user?.id;
    if (!orgId) return res.status(400).json({ error: "org_id required" });

    const { service, display_name, credentials = {}, environment = "production", monthly_cost_usd, metadata = {}, notes, expires_at, renewal_date } = req.body;

    if (!service || !display_name) {
      return res.status(400).json({ error: "service and display_name required" });
    }
    if (!SERVICE_CATALOG[service]) {
      return res.status(400).json({ error: `Unknown service: ${service}` });
    }

    // Encrypt credentials
    const encryptedCreds: Record<string, string> = {};
    for (const [k, v] of Object.entries(credentials as Record<string, string>)) {
      encryptedCreds[k] = encrypt(v);
    }

    // Verify connection
    const verification = await verifyIntegration(service, credentials);

    const result = await pool.query(
      `INSERT INTO dev_integrations
        (org_id, service, display_name, environment, credentials, metadata, monthly_cost_usd, notes, expires_at, renewal_date, added_by, status, last_verified_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        orgId, service, display_name, environment,
        JSON.stringify(encryptedCreds), JSON.stringify(metadata),
        monthly_cost_usd || null, notes || null,
        expires_at || null, renewal_date || null,
        userId || null,
        verification.ok ? "active" : "error",
        verification.ok ? new Date() : null,
      ]
    );

    const integration = result.rows[0];

    // Create subscription record if cost provided
    if (monthly_cost_usd) {
      await pool.query(
        `INSERT INTO dev_subscriptions (org_id, integration_id, monthly_cost_usd, next_billing_date)
         VALUES ($1, $2, $3, $4)`,
        [orgId, integration.id, monthly_cost_usd, renewal_date || null]
      );
    }

    res.json({ integration: { ...integration, credentials: maskCredentials(credentials) }, verified: verification });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/dev-integrations/cost-summary
router.get("/dev-integrations/cost-summary", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id || (req.headers["x-org-id"] as string);
    if (!orgId) return res.status(400).json({ error: "org_id required" });

    const result = await pool.query(
      `SELECT 
         i.service,
         i.display_name,
         COALESCE(i.monthly_cost_usd, s.monthly_cost_usd, 0) as monthly_usd,
         i.status,
         i.last_verified_at,
         i.last_used_at
       FROM dev_integrations i
       LEFT JOIN dev_subscriptions s ON s.integration_id = i.id
       WHERE i.org_id = $1
       ORDER BY monthly_usd DESC`,
      [orgId]
    );

    const total = result.rows.reduce((sum: number, r: any) => sum + parseFloat(r.monthly_usd || 0), 0);
    const unused = result.rows.filter((r: any) => {
      if (!r.last_used_at) return false;
      const daysSinceUse = (Date.now() - new Date(r.last_used_at).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceUse > 30 && parseFloat(r.monthly_usd || 0) > 0;
    });

    res.json({
      total_monthly_usd: total.toFixed(2),
      total_annual_usd: (total * 12).toFixed(2),
      breakdown: result.rows,
      unused_services: unused,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/dev-integrations/expiring — tokens expiring soon
router.get("/dev-integrations/expiring", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id || (req.headers["x-org-id"] as string);
    if (!orgId) return res.status(400).json({ error: "org_id required" });

    const days = parseInt(req.query.days as string) || 30;

    const result = await pool.query(
      `SELECT id, service, display_name, expires_at, renewal_date, status
       FROM dev_integrations
       WHERE org_id = $1
         AND (
           (expires_at IS NOT NULL AND expires_at < NOW() + INTERVAL '${days} days')
           OR (renewal_date IS NOT NULL AND renewal_date < NOW() + INTERVAL '${days} days')
         )
       ORDER BY COALESCE(expires_at, renewal_date) ASC`,
      [orgId]
    );

    // Also check secrets
    const secretsResult = await pool.query(
      `SELECT id, secret_name, secret_type, expires_at, last_rotated_at, rotation_reminder_days
       FROM dev_secrets
       WHERE org_id = $1
         AND (
           (expires_at IS NOT NULL AND expires_at < NOW() + INTERVAL '${days} days')
           OR (last_rotated_at IS NOT NULL AND last_rotated_at < NOW() - (rotation_reminder_days || ' days')::INTERVAL)
         )`,
      [orgId]
    );

    res.json({ expiring_integrations: result.rows, expiring_secrets: secretsResult.rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/dev-integrations/dotenv — generate .env file
router.get("/dev-integrations/dotenv", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id || (req.headers["x-org-id"] as string);
    const userId = (req as any).user?.id;
    if (!orgId) return res.status(400).json({ error: "org_id required" });

    const integrationsParam = req.query.integrations as string;
    const services = integrationsParam ? integrationsParam.split(",") : [];

    let query = `SELECT * FROM dev_integrations WHERE org_id = $1`;
    const params: any[] = [orgId];
    if (services.length > 0) {
      query += ` AND service = ANY($2)`;
      params.push(services);
    }

    const result = await pool.query(query, params);

    // Audit log
    await pool.query(
      `INSERT INTO audit_log (org_id, user_id, action, resource_type, details)
       VALUES ($1, $2, 'dotenv_export', 'dev_integrations', $3)
       ON CONFLICT DO NOTHING`,
      [orgId, userId, JSON.stringify({ services: services.length > 0 ? services : "all" })]
    ).catch(() => {}); // Don't fail if audit_log doesn't exist

    let envContent = `# pixdrift Developer Infrastructure — .env export\n# Generated: ${new Date().toISOString()}\n# ⚠️  Keep this file SECRET — never commit to git!\n\n`;

    for (const row of result.rows) {
      const catalog = SERVICE_CATALOG[row.service];
      envContent += `# ── ${catalog?.name || row.display_name} (${row.environment}) ──\n`;
      if (row.credentials && typeof row.credentials === "object") {
        for (const [k, v] of Object.entries(row.credentials as Record<string, string>)) {
          const decrypted = decrypt(v);
          const envKey = `${row.service.toUpperCase()}_${k.toUpperCase()}`;
          envContent += `${envKey}=${decrypted}\n`;
        }
      }
      envContent += "\n";
    }

    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Content-Disposition", `attachment; filename=".env.pixdrift"`);
    res.send(envContent);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/dev-integrations/:id
router.get("/dev-integrations/:id", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id || (req.headers["x-org-id"] as string);
    const result = await pool.query(
      `SELECT * FROM dev_integrations WHERE id = $1 AND org_id = $2`,
      [req.params.id, orgId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Not found" });
    const r = result.rows[0];
    const decrypted: Record<string, string> = {};
    for (const [k, v] of Object.entries(r.credentials as Record<string, string>)) {
      decrypted[k] = decrypt(v);
    }
    res.json({ integration: { ...r, credentials: maskCredentials(decrypted) } });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/dev-integrations/:id
router.patch("/dev-integrations/:id", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id || (req.headers["x-org-id"] as string);
    const { display_name, credentials, environment, monthly_cost_usd, notes, expires_at, renewal_date, status } = req.body;

    const updates: string[] = ["updated_at = NOW()"];
    const params: any[] = [];
    let p = 1;

    if (display_name) { updates.push(`display_name = $${p++}`); params.push(display_name); }
    if (environment) { updates.push(`environment = $${p++}`); params.push(environment); }
    if (monthly_cost_usd !== undefined) { updates.push(`monthly_cost_usd = $${p++}`); params.push(monthly_cost_usd); }
    if (notes !== undefined) { updates.push(`notes = $${p++}`); params.push(notes); }
    if (expires_at !== undefined) { updates.push(`expires_at = $${p++}`); params.push(expires_at); }
    if (renewal_date !== undefined) { updates.push(`renewal_date = $${p++}`); params.push(renewal_date); }
    if (status) { updates.push(`status = $${p++}`); params.push(status); }

    if (credentials) {
      const encryptedCreds: Record<string, string> = {};
      for (const [k, v] of Object.entries(credentials as Record<string, string>)) {
        encryptedCreds[k] = encrypt(v);
      }
      updates.push(`credentials = $${p++}`);
      params.push(JSON.stringify(encryptedCreds));
    }

    params.push(req.params.id, orgId);
    const result = await pool.query(
      `UPDATE dev_integrations SET ${updates.join(", ")} WHERE id = $${p++} AND org_id = $${p} RETURNING *`,
      params
    );

    if (!result.rows[0]) return res.status(404).json({ error: "Not found" });
    res.json({ integration: result.rows[0] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/dev-integrations/:id
router.delete("/dev-integrations/:id", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id || (req.headers["x-org-id"] as string);
    // Delete subscriptions and secrets first
    await pool.query(`DELETE FROM dev_subscriptions WHERE integration_id = $1`, [req.params.id]);
    await pool.query(`DELETE FROM dev_secrets WHERE integration_id = $1`, [req.params.id]);
    await pool.query(`DELETE FROM dev_integrations WHERE id = $1 AND org_id = $2`, [req.params.id, orgId]);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/dev-integrations/:id/verify
router.post("/dev-integrations/:id/verify", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id || (req.headers["x-org-id"] as string);
    const result = await pool.query(
      `SELECT * FROM dev_integrations WHERE id = $1 AND org_id = $2`,
      [req.params.id, orgId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Not found" });

    const row = result.rows[0];
    // Decrypt credentials for verification
    const decrypted: Record<string, string> = {};
    for (const [k, v] of Object.entries(row.credentials as Record<string, string>)) {
      decrypted[k] = decrypt(v);
    }

    const verification = await verifyIntegration(row.service, decrypted);

    await pool.query(
      `UPDATE dev_integrations SET status = $1, last_verified_at = NOW() WHERE id = $2`,
      [verification.ok ? "active" : "error", req.params.id]
    );

    res.json({ verified: verification.ok, error: verification.error });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/dev-integrations/:id/rotate
router.post("/dev-integrations/:id/rotate", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id || (req.headers["x-org-id"] as string);
    const { credentials } = req.body;
    if (!credentials) return res.status(400).json({ error: "New credentials required" });

    const encryptedCreds: Record<string, string> = {};
    for (const [k, v] of Object.entries(credentials as Record<string, string>)) {
      encryptedCreds[k] = encrypt(v);
    }

    const result = await pool.query(
      `UPDATE dev_integrations SET credentials = $1, updated_at = NOW() WHERE id = $2 AND org_id = $3 RETURNING *`,
      [JSON.stringify(encryptedCreds), req.params.id, orgId]
    );

    if (!result.rows[0]) return res.status(404).json({ error: "Not found" });

    // Verify new credentials
    const verification = await verifyIntegration(result.rows[0].service, credentials);
    await pool.query(
      `UPDATE dev_integrations SET status = $1, last_verified_at = NOW() WHERE id = $2`,
      [verification.ok ? "active" : "error", req.params.id]
    );

    res.json({ ok: true, verified: verification });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Secrets Management ────────────────────────────────────────────────────────

// GET /api/dev-secrets — list (no values)
router.get("/dev-secrets", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id || (req.headers["x-org-id"] as string);
    if (!orgId) return res.status(400).json({ error: "org_id required" });

    const result = await pool.query(
      `SELECT id, org_id, integration_id, project_id, secret_name, secret_type,
              last_rotated_at, rotation_reminder_days, expires_at, environment,
              access_level, created_by, created_at
       FROM dev_secrets WHERE org_id = $1 ORDER BY created_at DESC`,
      [orgId]
    );

    // Flag rotation needed
    const secrets = result.rows.map((r: any) => ({
      ...r,
      rotation_needed: r.last_rotated_at
        ? (Date.now() - new Date(r.last_rotated_at).getTime()) / (1000 * 60 * 60 * 24) > r.rotation_reminder_days
        : false,
    }));

    res.json({ secrets });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/dev-secrets
router.post("/dev-secrets", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id || (req.headers["x-org-id"] as string);
    const userId = (req as any).user?.id;
    if (!orgId) return res.status(400).json({ error: "org_id required" });

    const { integration_id, project_id, secret_name, secret_type = "api_key", value, rotation_reminder_days = 90, expires_at, environment = "production", access_level = "team" } = req.body;

    if (!secret_name || !value) return res.status(400).json({ error: "secret_name and value required" });

    const encrypted = encrypt(value);

    const result = await pool.query(
      `INSERT INTO dev_secrets
        (org_id, integration_id, project_id, secret_name, secret_type, encrypted_value, rotation_reminder_days, expires_at, environment, access_level, created_by, last_rotated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
       RETURNING id, secret_name, secret_type, environment, access_level, created_at`,
      [orgId, integration_id || null, project_id || null, secret_name, secret_type, encrypted, rotation_reminder_days, expires_at || null, environment, access_level, userId || null]
    );

    res.json({ secret: result.rows[0] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/dev-secrets/:id/reveal — audit-logged
router.get("/dev-secrets/:id/reveal", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id || (req.headers["x-org-id"] as string);
    const userId = (req as any).user?.id;

    const result = await pool.query(
      `SELECT * FROM dev_secrets WHERE id = $1 AND org_id = $2`,
      [req.params.id, orgId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Not found" });

    // Audit log
    await pool.query(
      `INSERT INTO audit_log (org_id, user_id, action, resource_type, resource_id, details)
       VALUES ($1, $2, 'secret_revealed', 'dev_secrets', $3, $4)
       ON CONFLICT DO NOTHING`,
      [orgId, userId, req.params.id, JSON.stringify({ secret_name: result.rows[0].secret_name })]
    ).catch(() => {});

    const decrypted = decrypt(result.rows[0].encrypted_value);
    res.json({ value: decrypted, secret_name: result.rows[0].secret_name });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/dev-secrets/:id/rotate
router.post("/dev-secrets/:id/rotate", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id || (req.headers["x-org-id"] as string);
    const { value } = req.body;
    if (!value) return res.status(400).json({ error: "New value required" });

    const encrypted = encrypt(value);
    const result = await pool.query(
      `UPDATE dev_secrets SET encrypted_value = $1, last_rotated_at = NOW() WHERE id = $2 AND org_id = $3 RETURNING id, secret_name, last_rotated_at`,
      [encrypted, req.params.id, orgId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true, secret: result.rows[0] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
