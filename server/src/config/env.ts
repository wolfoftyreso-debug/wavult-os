const REQUIRED_VARS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const OPTIONAL_VARS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "TRIGGER_API_KEY",
];

export function validateEnv() {
  const missing = [];

  for (const key of REQUIRED_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error("==================================");
    console.error("SAKNADE MILJOVARIABLER:");
    missing.forEach(function(v) { console.error("  - " + v); });
    console.error("==================================");
    console.error("Skapa en .env-fil baserad pa .env.example");
    process.exit(1);
  }

  for (const key of OPTIONAL_VARS) {
    if (!process.env[key]) {
      console.warn("Valfri variabel saknas: " + key);
    }
  }
}
