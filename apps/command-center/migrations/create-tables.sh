#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

SUPABASE_URL="https://znmxtnxxjpmgtycmsqjv.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpubXh0bnh4anBtZ3R5Y21zcWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzg4MDY2NSwiZXhwIjoyMDg5NDU2NjY1fQ.4R1tNeukZRBbAhxvo0rHPf9KZKEOjiILTeDIN9hYBjc"

echo "Creating Payroll tables in Supabase..."
echo ""
echo "⚠️  This script requires manual execution in Supabase SQL Editor."
echo "Please copy the SQL from migrations/payroll-schema.sql and run it in:"
echo "  https://supabase.com/dashboard/project/znmxtnxxjpmgtycmsqjv/sql/new"
echo ""
echo -e "${GREEN}After running the SQL, the following tables will be created:${NC}"
echo "  - employees"
echo "  - payroll_runs"
echo "  - payroll_entries"
echo ""
echo "Press Enter to continue after you've run the migration..."
read

echo "Verifying tables..."

# Check employees table
if curl -s "$SUPABASE_URL/rest/v1/employees?select=id&limit=0" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" | grep -q '\['; then
  echo -e "${GREEN}✓ employees table exists${NC}"
else
  echo -e "${RED}✗ employees table NOT found${NC}"
  exit 1
fi

# Check payroll_runs table
if curl -s "$SUPABASE_URL/rest/v1/payroll_runs?select=id&limit=0" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" | grep -q '\['; then
  echo -e "${GREEN}✓ payroll_runs table exists${NC}"
else
  echo -e "${RED}✗ payroll_runs table NOT found${NC}"
  exit 1
fi

# Check payroll_entries table
if curl -s "$SUPABASE_URL/rest/v1/payroll_entries?select=id&limit=0" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" | grep -q '\['; then
  echo -e "${GREEN}✓ payroll_entries table exists${NC}"
else
  echo -e "${RED}✗ payroll_entries table NOT found${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ All tables created successfully!${NC}"
