import express from 'express'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuid } from 'uuid'

const app = express()
app.use(express.json({ limit: '1mb' }))

const PORT = parseInt(process.env.PORT || '3008')
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
)

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompanyRegistrationRequest {
  jurisdiction: 'texas-llc' | 'delaware-c-corp' | 'sweden-ab' | 'lithuania-uab' | 'uae-fzco'
  companyName: string
  companyPurpose: string
  organizer: {
    name: string
    email: string
    phone: string
  }
  useRegisteredAgent: boolean
  jobId?: string
}

type RegistrationStatus = 'QUEUED' | 'OPENING_BROWSER' | 'FILLING_FORM' | 'REVIEWING' | 'SUBMITTING' | 'COMPLETED' | 'FAILED'

// ─── Status updates ───────────────────────────────────────────────────────────

async function updateStatus(jobId: string, status: RegistrationStatus, note: string) {
  await supabase.from('bos_events').insert({
    type: 'COMPANY_REGISTRATION_STATUS',
    payload: { jobId, status, note, timestamp: new Date().toISOString() }
  })
  console.log(`[CompanyAuto] ${status}: ${note}`)
}

// ─── Northwest Registered Agent automation ────────────────────────────────────

async function registerTexasLLC(data: CompanyRegistrationRequest): Promise<void> {
  const jobId = data.jobId || uuid()

  await updateStatus(jobId, 'OPENING_BROWSER', 'Opening Northwest Registered Agent...')

  const browser = await chromium.launch({
    headless: process.env.HEADLESS !== 'false',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const page = await browser.newPage()

  try {
    // Navigate to Northwest LLC formation
    await page.goto('https://www.northwestregisteredagent.com/llc/texas')
    await updateStatus(jobId, 'FILLING_FORM', 'Navigated to Northwest — filling form...')

    // Wait for form
    await page.waitForLoadState('networkidle')

    // Fill company name
    const nameField = page.locator('input[name*="company"], input[placeholder*="company"], input[id*="company"]').first()
    if (await nameField.count() > 0) {
      await nameField.fill(data.companyName)
      await updateStatus(jobId, 'FILLING_FORM', `Company name filled: ${data.companyName}`)
    }

    // Select registered agent option (use Northwest's address)
    if (data.useRegisteredAgent) {
      const agentOption = page.locator('input[type="radio"][value*="northwest"], input[type="radio"][value*="agent"]').first()
      if (await agentOption.count() > 0) {
        await agentOption.click()
      }
    }

    // Fill organizer info
    const firstNameField = page.locator('input[name*="first"], input[id*="first"]').first()
    if (await firstNameField.count() > 0) {
      const [firstName, ...lastParts] = data.organizer.name.split(' ')
      await firstNameField.fill(firstName)
      const lastNameField = page.locator('input[name*="last"], input[id*="last"]').first()
      if (await lastNameField.count() > 0) {
        await lastNameField.fill(lastParts.join(' '))
      }
    }

    // Fill phone
    const phoneField = page.locator('input[name*="phone"], input[type="tel"]').first()
    if (await phoneField.count() > 0) {
      await phoneField.fill(data.organizer.phone)
    }

    // Fill email
    const emailField = page.locator('input[name*="email"], input[type="email"]').first()
    if (await emailField.count() > 0) {
      await emailField.fill(data.organizer.email)
    }

    await updateStatus(jobId, 'REVIEWING', 'Form filled — taking screenshot for review...')

    // Take screenshot for audit
    const screenshot = await page.screenshot({ fullPage: true })

    // Store screenshot event (in real implementation, upload to S3)
    await supabase.from('bos_events').insert({
      type: 'COMPANY_REGISTRATION_SCREENSHOT',
      payload: {
        jobId,
        url: data.organizer.email,
        screenshotSize: screenshot.length,
        timestamp: new Date().toISOString(),
        note: 'Form filled, awaiting confirmation before submit'
      }
    })

    // In production: submit form
    // For now: stop before submit, require human confirmation
    await updateStatus(jobId, 'REVIEWING',
      'PAUSED: Form filled automatically. Human confirmation required before final submission. Check screenshot in audit log.')

    // Don't auto-submit — wait for human approval
    // Future: if (autoSubmitApproved) { await submitForm(page) }

  } catch (err) {
    await updateStatus(jobId, 'FAILED', `Error: ${err instanceof Error ? err.message : String(err)}`)
    throw err
  } finally {
    await browser.close()
  }
}

// ─── Stripe Atlas (Delaware C Corp) ──────────────────────────────────────────

async function registerDelawareCorpViaAtlas(data: CompanyRegistrationRequest): Promise<void> {
  const jobId = data.jobId || uuid()
  await updateStatus(jobId, 'OPENING_BROWSER', 'Note: Stripe Atlas requires OAuth login. Redirecting...')

  // Stripe Atlas has an API for creation after OAuth
  // For now: open the Atlas URL with pre-filled params
  await updateStatus(jobId, 'QUEUED',
    `Open: https://atlas.stripe.com/create?name=${encodeURIComponent(data.companyName)}&type=ccorp\n` +
    `Company: ${data.companyName}\nPurpose: ${data.companyPurpose}`)
}

// ─── API Endpoints ────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'company-automation', version: '1.0.0' })
})

// POST /v1/company/create — trigger registration
app.post('/v1/company/create', async (req, res) => {
  const data: CompanyRegistrationRequest = req.body
  const jobId = uuid()

  // Log to BOS
  await supabase.from('bos_jobs').insert({
    id: jobId,
    type: 'COMPANY_REGISTRATION',
    payload: { ...data, jobId },
    state: 'PENDING',
    priority: 90,
    next_run_at: new Date().toISOString(),
    max_retries: 1,
  })

  await supabase.from('bos_events').insert({
    type: 'COMPANY_REGISTRATION_STARTED',
    payload: { jobId, jurisdiction: data.jurisdiction, companyName: data.companyName }
  })

  // Async execution
  setImmediate(async () => {
    try {
      switch (data.jurisdiction) {
        case 'texas-llc':
          await registerTexasLLC({ ...data, jobId })
          break
        case 'delaware-c-corp':
          await registerDelawareCorpViaAtlas({ ...data, jobId })
          break
        default:
          await updateStatus(jobId, 'QUEUED',
            `${data.jurisdiction} requires manual process. Instructions generated in Knowledge Hub.`)
      }
    } catch (err) {
      console.error('[CompanyAuto] Registration failed:', err)
    }
  })

  res.json({
    jobId,
    status: 'QUEUED',
    message: 'Registration started. Monitor progress in Wavult OS → BOS Events.',
    estimatedTime: data.jurisdiction === 'texas-llc' ? '2-5 minutes for form fill, then human review' : 'See instructions'
  })
})

// GET /v1/company/status/:jobId — check status
app.get('/v1/company/status/:jobId', async (req, res) => {
  const { data } = await supabase
    .from('bos_events')
    .select('*')
    .eq('type', 'COMPANY_REGISTRATION_STATUS')
    .contains('payload', { jobId: req.params.jobId })
    .order('occurred_at', { ascending: false })
    .limit(1)

  res.json(data?.[0] || { status: 'NOT_FOUND' })
})

app.listen(PORT, async () => {
  console.log(`[Company Automation] Listening on port ${PORT}`)

  // Install Playwright browsers on startup
  try {
    const { execSync } = await import('child_process')
    execSync('npx playwright install chromium --with-deps', { stdio: 'pipe' })
    console.log('[Company Automation] Playwright browsers installed')
  } catch {
    console.log('[Company Automation] Playwright browsers already installed or install skipped')
  }
})
