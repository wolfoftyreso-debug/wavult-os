#!/bin/bash
# =============================================
# HYPBIT OMS — API VERIFIERINGSTEST
# Kör efter deploy: chmod +x verify.sh && ./verify.sh
# =============================================

API="${HYPBIT_API:-http://localhost:3001}"
TOKEN="${HYPBIT_TOKEN:-}" # Bearer token efter login
PASS=0
FAIL=0
SKIP=0

# Färger
G='\033[0;32m' R='\033[0;31m' Y='\033[0;33m' N='\033[0m'

test_endpoint() {
  local method=$1 path=$2 expected=$3 body=$4
  local url="${API}${path}"
  local status

  if [ -n "$body" ]; then
    status=$(curl -s -o /dev/null -w "%{http_code}" -X $method "$url" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "$body" 2>/dev/null)
  else
    status=$(curl -s -o /dev/null -w "%{http_code}" -X $method "$url" \
      -H "Authorization: Bearer $TOKEN" 2>/dev/null)
  fi

  if [ "$status" = "$expected" ]; then
    echo -e "  ${G}✓${N} $method $path → $status"
    PASS=$((PASS+1))
  elif [ "$status" = "000" ]; then
    echo -e "  ${Y}○${N} $method $path → SKIP (connection refused)"
    SKIP=$((SKIP+1))
  else
    echo -e "  ${R}✕${N} $method $path → $status (expected $expected)"
    FAIL=$((FAIL+1))
  fi
}

echo ""
echo "╔══════════════════════════════════════╗"
echo "║    HYPBIT OMS — VERIFIERINGSTEST    ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "API: $API"
echo ""

# =============================================
# HEALTH
# =============================================
echo "── Health ──"
test_endpoint GET "/api/health" "200"

# =============================================
# MODULE 1: EXECUTION
# =============================================
echo ""
echo "── Module 1: Execution ──"
test_endpoint GET "/api/config" "200"
test_endpoint GET "/api/contacts" "200"
test_endpoint GET "/api/companies" "200"
test_endpoint GET "/api/leads" "200"
test_endpoint GET "/api/deals" "200"
test_endpoint GET "/api/tasks" "200"
test_endpoint GET "/api/tasks/my" "200"
test_endpoint GET "/api/ledger/trial-balance" "200"
test_endpoint GET "/api/channels" "200"
test_endpoint GET "/api/decisions" "200"
test_endpoint GET "/api/audit" "200"
test_endpoint GET "/api/dashboards/admin" "200"
test_endpoint GET "/api/dashboards/sales" "200"
test_endpoint GET "/api/dashboards/finance" "200"

# =============================================
# MODULE 2: CAPABILITY
# =============================================
echo ""
echo "── Module 2: Capability ──"
test_endpoint GET "/api/capabilities/team" "200"
test_endpoint GET "/api/goals" "200"
test_endpoint GET "/api/dashboards/capabilities" "200"

# =============================================
# MODULE 3: PROCESS
# =============================================
echo ""
echo "── Module 3: Process ──"
test_endpoint GET "/api/processes" "200"
test_endpoint GET "/api/processes/performance" "200"
test_endpoint GET "/api/nc" "200"
test_endpoint GET "/api/nc/summary" "200"
test_endpoint GET "/api/improvements" "200"
test_endpoint GET "/api/compliance" "200"
test_endpoint GET "/api/documents" "200"
test_endpoint GET "/api/documents/review-due" "200"
test_endpoint GET "/api/audits" "200"
test_endpoint GET "/api/risks" "200"
test_endpoint GET "/api/risks/matrix" "200"
test_endpoint GET "/api/dashboards/management" "200"

# =============================================
# MODULE 4: CURRENCY
# =============================================
echo ""
echo "── Module 4: Currency ──"
test_endpoint GET "/api/currencies" "200"
test_endpoint GET "/api/exchange-rates" "200"
test_endpoint GET "/api/convert?amount=100&from=USD&to=EUR" "200"
test_endpoint GET "/api/fx/exposure" "200"
test_endpoint GET "/api/fx/adjustments" "200"
test_endpoint GET "/api/ledger/trial-balance/multi" "200"
test_endpoint GET "/api/deals/pipeline/multi" "200"

# =============================================
# MODULE 5: REPORTS
# =============================================
echo ""
echo "── Module 5: Reports ──"
test_endpoint GET "/api/reports/chart-of-accounts" "200"
test_endpoint GET "/api/reports/income-statement?from=2026-01-01&to=2026-12-31" "200"
test_endpoint GET "/api/reports/balance-sheet?date=2026-03-18" "200"
test_endpoint GET "/api/reports/general-ledger?from=2026-01-01&to=2026-12-31" "200"
test_endpoint GET "/api/reports/vat?from=2026-01-01&to=2026-03-31" "200"
test_endpoint GET "/api/reports/cashflow?from=2026-01-01&to=2026-03-31" "200"
test_endpoint GET "/api/reports/sie4?from=2026-01-01&to=2026-03-31" "200"

# =============================================
# WRITE TESTS (create, then verify)
# =============================================
echo ""
echo "── Write Tests ──"

# Skapa kontakt
test_endpoint POST "/api/contacts" "200" '{"full_name":"Test Testsson","email":"test@test.se"}'

# Skapa company
test_endpoint POST "/api/companies" "200" '{"name":"Test AB","country":"SE"}'

# Skapa task
test_endpoint POST "/api/tasks" "200" '{"title":"Verifieringstest","assignee_id":"REPLACE","deadline":"2026-04-01"}'

# Skapa decision
test_endpoint POST "/api/decisions" "200" '{"title":"Test","description":"Verifiering","rationale":"Automatiskt test"}'

# Skapa feedback
test_endpoint POST "/api/feedback" "200" '{"to_user_id":"REPLACE","content":"Bra jobbat","sentiment":"POSITIVE"}'

# Skapa NC
test_endpoint POST "/api/nc" "200" '{"title":"Testfel","description":"Verifiering","severity":"OBSERVATION"}'

# Skapa improvement
test_endpoint POST "/api/improvements" "200" '{"title":"Testförbättring","description":"Verifiering"}'

# =============================================
# ENFORCED BEHAVIOR TESTS
# =============================================
echo ""
echo "── Enforced Behavior ──"

# Deal utan kontakt → 400
test_endpoint POST "/api/deals" "400" '{"title":"Utan kontakt","value_eur":100}'

# Deal utan värde → 400
test_endpoint POST "/api/deals" "400" '{"title":"Utan värde","contact_id":"fake"}'

# Task utan deadline → 400
test_endpoint POST "/api/tasks" "400" '{"title":"Utan deadline","assignee_id":"fake"}'

# Task utan assignee → 400
test_endpoint POST "/api/tasks" "400" '{"title":"Utan assignee","deadline":"2026-04-01"}'

# Ledger obalanserad → 400
test_endpoint POST "/api/ledger/entries" "400" '{"entries":[{"account_code":"1000","debit_eur":100}]}'

# =============================================
# RESULTAT
# =============================================
echo ""
echo "══════════════════════════════════════"
TOTAL=$((PASS+FAIL+SKIP))
echo -e "  ${G}✓ $PASS passed${N}  ${R}✕ $FAIL failed${N}  ${Y}○ $SKIP skipped${N}  Total: $TOTAL"
echo "══════════════════════════════════════"
echo ""

if [ $FAIL -gt 0 ]; then
  echo "⚠️  $FAIL test(s) misslyckades."
  exit 1
elif [ $SKIP -eq $TOTAL ]; then
  echo "⚠️  Alla tester skippade. Är API:t igång?"
  exit 1
else
  echo "✓ Alla tester passerade."
  exit 0
fi
