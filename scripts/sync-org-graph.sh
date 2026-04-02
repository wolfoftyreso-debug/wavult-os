#!/bin/bash
# sync-org-graph.sh — Ladda upp statisk org-graph data till Supabase
# Kör en gång efter migration. Data blir sedan live-redigerbart i Wavult OS.
source ~/.openclaw/secrets/credentials.env
API="${WAVULT_API_CORE_ENDPOINT:-https://api.wavult.com}"
KEY="${WAVULT_API_CORE_KEY:-}"

# Läs data.ts och extrahera ENTITIES/RELATIONSHIPS/ROLE_MAPPINGS
# (körs via Node.js för att hantera TS-types)
cd /mnt/c/Users/erik/Desktop/Wavult
node -e "
const { ENTITIES, RELATIONSHIPS, ROLE_MAPPINGS } = require('./apps/command-center/src/features/org-graph/data.ts')
const body = JSON.stringify({ entities: ENTITIES, relationships: RELATIONSHIPS, roles: ROLE_MAPPINGS })
const https = require('https')
const url = new URL('$API/api/org-graph/sync')
const req = https.request({ hostname: url.hostname, path: url.pathname, method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-api-key': '$KEY', 'Content-Length': Buffer.byteLength(body) }
}, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>console.log('Sync result:', d)) })
req.write(body); req.end()
" 2>/dev/null || echo "Run after: npm run build in wavult-core"
