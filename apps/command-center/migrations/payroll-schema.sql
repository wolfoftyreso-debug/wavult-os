-- ─── Payroll Module Tables ───────────────────────────────────────────────────

-- ─── employees table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  start_date DATE NOT NULL,
  gross_salary NUMERIC NOT NULL,
  employment_rate NUMERIC NOT NULL DEFAULT 1.0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'leave')),
  tax_table INTEGER NOT NULL DEFAULT 33,
  color TEXT NOT NULL,
  location TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── payroll_runs table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payroll_runs (
  id TEXT PRIMARY KEY,
  period TEXT NOT NULL,
  run_date DATE NOT NULL,
  total_gross NUMERIC NOT NULL,
  total_employer_tax NUMERIC NOT NULL,
  total_net NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('completed', 'pending', 'draft')),
  approved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── payroll_entries table (individual employee entries per run) ──────────────
CREATE TABLE IF NOT EXISTS public.payroll_entries (
  id TEXT PRIMARY KEY,
  payroll_run_id TEXT NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  gross_salary NUMERIC NOT NULL,
  tax_deduction NUMERIC NOT NULL,
  net_salary NUMERIC NOT NULL,
  employer_tax NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── RLS Policies ─────────────────────────────────────────────────────────────
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role can do all on employees" ON public.employees
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do all on payroll_runs" ON public.payroll_runs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do all on payroll_entries" ON public.payroll_entries
  FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to read
CREATE POLICY "Authenticated can read employees" ON public.employees
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can read payroll_runs" ON public.payroll_runs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can read payroll_entries" ON public.payroll_entries
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow anon users to read (adjust as needed for your security requirements)
CREATE POLICY "Anon can read employees" ON public.employees
  FOR SELECT USING (true);

CREATE POLICY "Anon can read payroll_runs" ON public.payroll_runs
  FOR SELECT USING (true);

CREATE POLICY "Anon can read payroll_entries" ON public.payroll_entries
  FOR SELECT USING (true);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_period ON public.payroll_runs(period);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_status ON public.payroll_runs(status);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_run_id ON public.payroll_entries(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_employee_id ON public.payroll_entries(employee_id);

-- ─── Updated at trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_runs_updated_at BEFORE UPDATE ON public.payroll_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
