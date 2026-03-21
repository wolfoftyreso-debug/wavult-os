#!/bin/bash
# ============================================================
# fix-dns-landing.sh
# Uppdatera Cloudflare DNS: pixdrift.com → Landing CloudFront
# Kör detta OM pixdrift.com fortfarande pekar på fel CF
# ============================================================

set -euo pipefail

ZONE_ID="7fa7c28b0748ded5b4d48f06eae6faec"
LANDING_CF="d32vz1dqlzn29d.cloudfront.net"
CF_TOKEN="${CLOUDFLARE_API_TOKEN:-}"

if [ -z "$CF_TOKEN" ]; then
  echo "❌ CLOUDFLARE_API_TOKEN saknas"
  echo "   export CLOUDFLARE_API_TOKEN=your-token-here"
  exit 1
fi

echo "=== Cloudflare DNS fix — pixdrift.com → Landing ==="

# Hämta befintliga records
echo "Söker befintliga DNS-records för pixdrift.com..."
RECORDS=$(curl -s -X GET \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=pixdrift.com&type=CNAME" \
  -H "Authorization: Bearer ${CF_TOKEN}" \
  -H "Content-Type: application/json")

echo "Befintliga records: $RECORDS"

# Ta bort befintliga CNAME för pixdrift.com apex
RECORD_IDS=$(echo "$RECORDS" | python3 -c "import sys,json; [print(r['id']) for r in json.load(sys.stdin).get('result',[])]")

for RECORD_ID in $RECORD_IDS; do
  echo "Tar bort record $RECORD_ID..."
  curl -s -X DELETE \
    "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${RECORD_ID}" \
    -H "Authorization: Bearer ${CF_TOKEN}" \
    -H "Content-Type: application/json" | python3 -c "import sys,json; d=json.load(sys.stdin); print('Deleted:', d.get('success'))"
done

# Skapa nytt record: pixdrift.com → Landing CF
echo "Skapar nytt record: pixdrift.com → $LANDING_CF..."
RESULT=$(curl -s -X POST \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
  -H "Authorization: Bearer ${CF_TOKEN}" \
  -H "Content-Type: application/json" \
  --data "{
    \"type\": \"CNAME\",
    \"name\": \"pixdrift.com\",
    \"content\": \"${LANDING_CF}\",
    \"proxied\": false,
    \"ttl\": 60
  }")

echo "$RESULT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
if d.get('success'):
    print('✅ pixdrift.com → ${LANDING_CF} satt!')
    print('ID:', d['result']['id'])
else:
    print('❌ Misslyckades:', d.get('errors'))
"

# Kolla också www.pixdrift.com
echo ""
echo "Söker www.pixdrift.com..."
WWW_RECORDS=$(curl -s -X GET \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=www.pixdrift.com&type=CNAME" \
  -H "Authorization: Bearer ${CF_TOKEN}" \
  -H "Content-Type: application/json")

WWW_IDS=$(echo "$WWW_RECORDS" | python3 -c "import sys,json; [print(r['id']) for r in json.load(sys.stdin).get('result',[])]")
for RID in $WWW_IDS; do
  curl -s -X DELETE \
    "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${RID}" \
    -H "Authorization: Bearer ${CF_TOKEN}" \
    -H "Content-Type: application/json" > /dev/null
done

curl -s -X POST \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
  -H "Authorization: Bearer ${CF_TOKEN}" \
  -H "Content-Type: application/json" \
  --data "{
    \"type\": \"CNAME\",
    \"name\": \"www.pixdrift.com\",
    \"content\": \"${LANDING_CF}\",
    \"proxied\": false,
    \"ttl\": 60
  }" | python3 -c "
import sys, json
d = json.load(sys.stdin)
if d.get('success'):
    print('✅ www.pixdrift.com → ${LANDING_CF} satt!')
else:
    print('❌ www misslyckades:', d.get('errors'))
"

echo ""
echo "=== KLAR ==="
echo "DNS propagerar inom ~60 sekunder (Cloudflare TTL=60)"
echo "Verifiera: curl -sv https://pixdrift.com 2>&1 | grep -i 'cloudfront\|HTTP'"
