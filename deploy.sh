#!/bin/bash
# =============================================
# HYPBIT OMS — DEPLOY SCRIPT
# Kör: chmod +x deploy.sh && ./deploy.sh
# Kräver: Node 20+, npm, git
# =============================================

set -e

echo ""
echo "╔══════════════════════════════════════╗"
echo "║       HYPBIT OMS — DEPLOY           ║"
echo "║  37 tabeller · 67 endpoints         ║"
echo "║  14 jobb · 9 vyer                   ║"
echo "╚══════════════════════════════════════╝"
echo ""

# =============================================
# 1. SKAPA PROJEKTSTRUKTUR
# =============================================
echo "▸ Skapar projektstruktur..."

mkdir -p hypbit/{src,sql,trigger,docs}
cd hypbit

# =============================================
# 2. PACKAGE.JSON
# =============================================
cat > package.json << 'EOF'
{
  "name": "hypbit",
  "version": "1.0.0",
  "description": "Hypbit OMS — Operating Management System",
  "main": "src/index.ts",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "NODE_ENV=production tsx src/index.ts",
    "build": "tsc",
    "trigger:dev": "npx trigger.dev@latest dev"
  },
  "dependencies": {
    "express": "^4.21.0",
    "@supabase/supabase-js": "^2.45.0",
    "stripe": "^17.0.0",
    "cors": "^2.8.5",
    "@trigger.dev/sdk": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/express": "^4.17.21",
    "@types/node": "^22.0.0",
    "@types/cors": "^2.8.17",
    "tsx": "^4.19.0"
  },
  "engines": { "node": ">=20.0.0" }
}
EOF

# =============================================
# 3. TSCONFIG
# =============================================
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "esModuleInterop": true,
    "strict": false,
    "outDir": "dist",
    "rootDir": "src",
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
EOF

# =============================================
# 4. .ENV
# =============================================
cat > .env << 'EOF'
# Supabase
SUPABASE_URL=https://DITT-PROJEKT.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Trigger.dev
TRIGGER_API_KEY=tr_...

# App
PORT=3001
NODE_ENV=production
EOF

# =============================================
# 5. .GITIGNORE
# =============================================
cat > .gitignore << 'EOF'
node_modules/
dist/
.env
*.log
EOF

# =============================================
# 6. INSTALL
# =============================================
echo "▸ Installerar dependencies..."
npm install --silent 2>/dev/null || npm install

# =============================================
# KLART
# =============================================
echo ""
echo "╔══════════════════════════════════════╗"
echo "║  ✓ Projektstruktur skapad           ║"
echo "║  ✓ Dependencies installerade        ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "NÄSTA STEG:"
echo ""
echo "  1. Kopiera SQL-filer till sql/"
echo "  2. Kopiera .ts-filer till src/"
echo "  3. Fyll i .env med dina nycklar"
echo "  4. Kör SQL i Supabase (i ordning 1-5)"
echo "  5. npm run dev"
echo ""
echo "SQL-ordning:"
echo "  1. hypbit_v1_schema.sql"
echo "  2. hypbit_oms_capability_schema.sql"
echo "  3. hypbit_oms_process_schema.sql"
echo "  4. hypbit_v1_seed.sql"
echo "  5. hypbit_oms_seed.sql"
echo ""
echo "Filstruktur:"
echo "  hypbit/"
echo "  ├── src/"
echo "  │   ├── index.ts          (hypbit_main.ts)"
echo "  │   ├── capability.ts     (hypbit_oms_capability_engine.ts)"
echo "  │   └── process.ts        (hypbit_oms_process_api.ts)"
echo "  ├── trigger/"
echo "  │   ├── execution.ts      (hypbit_v1_notifications.ts)"
echo "  │   └── oms.ts            (hypbit_oms_notifications.ts)"
echo "  ├── sql/"
echo "  │   ├── 01_schema.sql"
echo "  │   ├── 02_capability.sql"
echo "  │   ├── 03_process.sql"
echo "  │   ├── 04_seed.sql"
echo "  │   └── 05_oms_seed.sql"
echo "  ├── package.json"
echo "  ├── tsconfig.json"
echo "  ├── .env"
echo "  └── .gitignore"
echo ""
