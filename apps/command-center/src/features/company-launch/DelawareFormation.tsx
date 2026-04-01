import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RegisteredAgentInfo {
  name: string
  address: string
  county: string
  city: string
  state: string
  zip: string
}

interface FormationData {
  companyName: string
  registeredAgentKey: 'harvard' | 'northwest' | 'stripe'
  authorizedShares: number
  parValue: string
  founderName: string
  founderAddress: string
  incorporationDate: string
  fiscalYearEnd: string
  businessActivity: string
}

// ─── Registered Agents ───────────────────────────────────────────────────────

const REGISTERED_AGENTS: Record<string, RegisteredAgentInfo> = {
  harvard: {
    name: 'Harvard Business Services, Inc.',
    address: '16192 Coastal Highway',
    county: 'Sussex',
    city: 'Lewes',
    state: 'DE',
    zip: '19958',
  },
  northwest: {
    name: 'Northwest Registered Agent, LLC',
    address: '8 The Green, Suite A',
    county: 'Kent',
    city: 'Dover',
    state: 'DE',
    zip: '19901',
  },
  stripe: {
    name: 'Legalinc Corporate Services Inc.',
    address: '651 N Broad St, Suite 201',
    county: 'New Castle',
    city: 'Middletown',
    state: 'DE',
    zip: '19709',
  },
}

// ─── Document Generators ─────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function generateCertificateOfIncorporation(data: FormationData): string {
  const agent = REGISTERED_AGENTS[data.registeredAgentKey]
  return `CERTIFICATE OF INCORPORATION
OF ${data.companyName.toUpperCase()}

A DELAWARE CORPORATION

The undersigned, a natural person, for the purpose of organizing a corporation for conducting the business and promoting the purposes hereinafter stated, under the provisions and subject to the requirements of the laws of the State of Delaware (particularly Chapter 1, Title 8 of the Delaware Code and the acts amendatory thereof and supplemental thereto, and known, identified, and referred to as the "General Corporation Law of the State of Delaware"), hereby certifies that:

FIRST: The name of the corporation (hereinafter called the "Corporation") is:
${data.companyName}

SECOND: The address of the registered office of the Corporation in the State of Delaware is:
${agent.address}, ${agent.city}, ${agent.state} ${agent.zip}
County of ${agent.county}.

THIRD: The name of the registered agent of the Corporation at such address upon whom process against the Corporation may be served is:
${agent.name}

FOURTH: The total number of shares of all classes of capital stock which the Corporation is authorized to issue is ${Number(data.authorizedShares).toLocaleString()} shares of Common Stock with a par value of $${data.parValue} per share.

FIFTH: The name and mailing address of the incorporator are as follows:
${data.founderName}
${data.founderAddress}

SIXTH: The Board of Directors of the Corporation is expressly authorized to make, alter, or repeal the Bylaws of the Corporation.

SEVENTH: Elections of directors need not be by written ballot unless the Bylaws of the Corporation shall so provide.

EIGHTH: To the fullest extent permitted by the General Corporation Law of the State of Delaware, as the same exists or as may hereafter be amended, a director or officer of the Corporation shall not be personally liable to the Corporation or its stockholders for monetary damages for breach of fiduciary duty as a director or officer. If the General Corporation Law of the State of Delaware is amended to authorize corporate action further eliminating or limiting the personal liability of directors or officers, then the liability of a director or officer of the Corporation shall be eliminated or limited to the fullest extent permitted by the General Corporation Law of the State of Delaware, as so amended.

IN WITNESS WHEREOF, I have hereunto set my hand this ${fmtDate(data.incorporationDate)}.

${data.founderName}, Sole Incorporator`
}

function generateBylaws(data: FormationData): string {
  return `BYLAWS OF ${data.companyName.toUpperCase()}
A DELAWARE CORPORATION

ARTICLE I — OFFICES

Section 1.1 Registered Office. The registered office of the Corporation in the State of Delaware shall be as set forth in the Certificate of Incorporation.

Section 1.2 Other Offices. The Corporation may also have offices at such other places, both within and without the State of Delaware, as the Board of Directors may from time to time determine.

ARTICLE II — STOCKHOLDERS

Section 2.1 Annual Meeting. An annual meeting of the stockholders shall be held for the election of directors and for the transaction of such other business as may properly come before the meeting.

Section 2.2 Special Meetings. Special meetings of the stockholders may be called only by the Board of Directors, the Chairperson of the Board of Directors, the Chief Executive Officer, or the holders of shares representing at least ten percent (10%) of the outstanding voting power.

Section 2.3 Quorum. A majority of the total votes eligible to be cast by holders of voting stock, present in person or represented by proxy, shall constitute a quorum for the transaction of business at any meeting of stockholders.

Section 2.4 Voting. Each stockholder shall be entitled to one vote for each share of stock held by such stockholder.

ARTICLE III — BOARD OF DIRECTORS

Section 3.1 Number. The Board of Directors shall consist of one (1) or more directors, the number thereof to be determined from time to time by the Board of Directors.

Section 3.2 Election. Directors shall be elected at the annual meeting of the stockholders and each director elected shall hold office for a term of one year.

Section 3.3 Quorum and Action. A majority of the directors shall constitute a quorum for the transaction of business.

Section 3.4 Action Without Meeting. Any action required or permitted to be taken at any meeting of the Board of Directors may be taken without a meeting if all members of the Board consent thereto in writing.

ARTICLE IV — OFFICERS

Section 4.1 Officers. The officers of the Corporation shall be elected by the Board of Directors and shall include a Chief Executive Officer, a President, a Secretary, and a Chief Financial Officer or Treasurer.

Section 4.2 Term. Each officer shall hold office until a successor is duly elected and qualified or until such officer's earlier resignation or removal.

ARTICLE V — STOCK

Section 5.1 Certificates. The Board of Directors may decide whether certificates representing shares of stock shall be issued.

Section 5.2 Transfers. Transfers of shares of stock shall be made only upon the books of the Corporation.

ARTICLE VI — INDEMNIFICATION

Section 6.1 The Corporation shall indemnify its directors and officers to the fullest extent authorized or permitted by the General Corporation Law of the State of Delaware.

ARTICLE VII — FISCAL YEAR

Section 7.1 The fiscal year of the Corporation shall end on December 31 of each year, unless otherwise fixed by resolution of the Board of Directors.

ARTICLE VIII — AMENDMENTS

Section 8.1 These Bylaws may be altered, amended, or repealed, or new Bylaws may be adopted, by the stockholders or by the Board of Directors.

Adopted as of ${fmtDate(data.incorporationDate)}.`
}

function generateIncorporatorConsent(data: FormationData): string {
  return `ACTION BY WRITTEN CONSENT OF SOLE INCORPORATOR
OF ${data.companyName.toUpperCase()}

The undersigned, being the sole incorporator of ${data.companyName}, a Delaware corporation (the "Corporation"), hereby takes the following actions and adopts the following resolutions by written consent, effective as of ${fmtDate(data.incorporationDate)}:

ADOPTION OF BYLAWS

RESOLVED, that the Bylaws in the form attached hereto as Exhibit A are hereby adopted as the Bylaws of the Corporation.

ELECTION OF DIRECTORS

RESOLVED, that the following person is hereby elected as the initial director of the Corporation, to serve until the next annual meeting of stockholders and until such director's successor is duly elected and qualified:

    ${data.founderName}

AUTHORIZATION

RESOLVED FURTHER, that the officers of the Corporation are hereby authorized and directed to take all actions necessary and appropriate to carry out the purposes of the foregoing resolutions.

IN WITNESS WHEREOF, the undersigned has executed this Action by Written Consent as of the date first written above.

${data.founderName}, Sole Incorporator
Address: ${data.founderAddress}`
}

function generateInitialBoardAction(data: FormationData): string {
  return `ACTION BY WRITTEN CONSENT OF THE BOARD OF DIRECTORS
OF ${data.companyName.toUpperCase()}
IN LIEU OF ORGANIZATIONAL MEETING

The undersigned, constituting the entire Board of Directors of ${data.companyName}, a Delaware corporation (the "Corporation"), pursuant to Section 141(f) of the General Corporation Law of the State of Delaware, hereby adopts the following resolutions by written consent as of ${fmtDate(data.incorporationDate)}:

ELECTION OF OFFICERS

RESOLVED, that the following person is hereby elected to the office(s) set forth opposite their name, each to serve at the pleasure of the Board of Directors:

    ${data.founderName} — Chief Executive Officer, President, Secretary, and Treasurer

PRINCIPAL PLACE OF BUSINESS

RESOLVED, that the principal place of business of the Corporation shall be at such address as the Chief Executive Officer may determine from time to time.

BANK ACCOUNTS

RESOLVED, that the officers of the Corporation are hereby authorized to open one or more bank accounts on behalf of the Corporation at such financial institutions as the officers deem appropriate.

FISCAL YEAR

RESOLVED, that the fiscal year of the Corporation shall end on December 31 of each calendar year.

STOCK ISSUANCE

RESOLVED, that the Corporation is authorized to issue up to ${Number(data.authorizedShares).toLocaleString()} shares of Common Stock, par value $${data.parValue} per share.

IN WITNESS WHEREOF, the undersigned has executed this Written Consent as of the date first written above.

${data.founderName}, Director`
}

function generateRestrictedStockAgreement(data: FormationData): string {
  return `RESTRICTED STOCK PURCHASE AGREEMENT

This Restricted Stock Purchase Agreement (this "Agreement") is entered into as of ${fmtDate(data.incorporationDate)}, by and between ${data.companyName}, a Delaware corporation (the "Company"), and ${data.founderName} ("Purchaser").

1. PURCHASE AND SALE OF SHARES.

   1.1 Subject to the terms and conditions of this Agreement, Purchaser hereby purchases from the Company, and the Company hereby sells to Purchaser, [NUMBER] shares of the Company's Common Stock (the "Shares") at a purchase price of $${data.parValue} per share (the "Purchase Price").

   1.2 Total Purchase Price: $[TOTAL AMOUNT]

2. VESTING SCHEDULE.

   2.1 Vesting. The Shares shall vest as follows: 25% of the Shares shall vest on the one-year anniversary of the Vesting Commencement Date, and the remaining 75% shall vest in equal monthly installments over the following 36 months, subject to Purchaser's continued service with the Company.

   2.2 Vesting Commencement Date: ${fmtDate(data.incorporationDate)}

3. REPURCHASE OPTION.

   3.1 The Company shall have the right (but not obligation) to repurchase any Unvested Shares at the original Purchase Price upon Purchaser's termination of service.

4. SECTION 83(b) ELECTION.

   4.1 Purchaser understands that Section 83(b) of the Internal Revenue Code of 1986, as amended, permits Purchaser to elect to be taxed at the time of purchase rather than upon vesting.

   4.2 Purchaser must file a Section 83(b) election within 30 days of the date of this Agreement.

5. MISCELLANEOUS.

   5.1 This Agreement shall be governed by the laws of the State of Delaware.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

${data.companyName.toUpperCase()}

By: _______________________
Name: ${data.founderName}
Title: Chief Executive Officer

PURCHASER:

_______________________
${data.founderName}`
}

function generate83bElection(data: FormationData): string {
  const deadline = new Date(data.incorporationDate)
  deadline.setDate(deadline.getDate() + 30)
  return `ELECTION UNDER SECTION 83(b) OF THE INTERNAL REVENUE CODE

IMPORTANT: This election must be filed with the IRS within 30 days of the transfer date.
Filing Deadline: ${fmtDate(deadline.toISOString().slice(0, 10))}

The undersigned taxpayer hereby elects, pursuant to Section 83(b) of the Internal Revenue Code of 1986, as amended, to include in gross income as compensation for services the excess (if any) of the fair market value of the property described below over the amount paid for such property.

1.  Taxpayer's Name: ${data.founderName}
2.  Taxpayer's Address: ${data.founderAddress}
3.  Taxpayer's Social Security Number (SSN): [INSERT SSN]
4.  Description of Property: [NUMBER] shares of Common Stock, par value $${data.parValue} per share, of ${data.companyName}, a Delaware corporation.
5.  Date of Transfer: ${fmtDate(data.incorporationDate)}
6.  Taxable Year to Which Election Relates: ${new Date(data.incorporationDate).getFullYear()}
7.  Nature of Restrictions: The shares are subject to a right of repurchase by the Company that lapses over a 4-year vesting schedule.
8.  Fair Market Value at Time of Transfer: $${data.parValue} per share (total: $[TOTAL FMV])
9.  Amount Paid for Property: $${data.parValue} per share (total: $[TOTAL PAID])
10. Amount to Include in Gross Income: $0 (fair market value equals amount paid)

The undersigned taxpayer will file this election with the Internal Revenue Service office with which taxpayer files his or her annual income tax return. A copy of this election will also be furnished to the Company. The undersigned will include a copy of this election with his or her income tax return for the taxable year.

Signed: _______________________
${data.founderName}
Date: ${fmtDate(data.incorporationDate)}

FILING INSTRUCTIONS:
1. Sign and date this election
2. Mail to the IRS Service Center where you file your income tax return
3. Send via certified mail with return receipt
4. Keep a copy for your records
5. Provide a copy to ${data.companyName}`
}

function generateIndemnificationAgreement(data: FormationData): string {
  return `INDEMNIFICATION AGREEMENT

This Indemnification Agreement (this "Agreement") is entered into as of ${fmtDate(data.incorporationDate)}, by and between ${data.companyName}, a Delaware corporation (the "Company"), and ${data.founderName} ("Indemnitee").

WHEREAS, Indemnitee is serving as a director and/or officer of the Company; and

WHEREAS, the Company desires to provide Indemnitee with specific contractual assurance of indemnification against the risks of claims and actions arising from Indemnitee's service to the Company;

NOW, THEREFORE, the parties agree as follows:

1. INDEMNIFICATION. The Company shall indemnify Indemnitee to the fullest extent permitted by the General Corporation Law of the State of Delaware against all Expenses, judgments, fines, penalties, and amounts paid in settlement of any Proceeding.

2. EXPENSES. "Expenses" includes all attorneys' fees, retainers, court costs, transcript costs, fees of experts, witness fees, travel expenses, duplicating costs, printing costs, and all other disbursements.

3. PROCEDURE. Indemnitee shall give the Company prompt written notice of any Proceeding for which indemnification may be sought.

4. ADVANCEMENT OF EXPENSES. The Company shall advance Expenses incurred by Indemnitee in connection with any Proceeding within 30 days of a written request by Indemnitee.

5. INSURANCE. The Company shall maintain directors' and officers' liability insurance from reputable insurance companies when and if financially practicable.

6. NON-EXCLUSIVITY. The rights provided in this Agreement are not exclusive of any other rights to which Indemnitee may be entitled.

7. GOVERNING LAW. This Agreement shall be governed by the laws of the State of Delaware.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

${data.companyName.toUpperCase()}

By: _______________________
Name: ${data.founderName}
Title: Chief Executive Officer

INDEMNITEE:

_______________________
${data.founderName}`
}

function generateSS4Data(data: FormationData): string {
  return `IRS FORM SS-4 — APPLICATION FOR EMPLOYER IDENTIFICATION NUMBER (EIN)
Pre-filled Data for ${data.companyName}

LINE 1  — Legal name of entity: ${data.companyName}
LINE 2  — Trade name (DBA): (leave blank if same as legal name)
LINE 3  — Executor/Trustee/Care of: ${data.founderName}
LINE 4a — Mailing street address: ${data.founderAddress.split(',')[0] || data.founderAddress}
LINE 4b — City, state, ZIP: ${data.founderAddress.split(',').slice(1).join(',').trim() || ''}
LINE 5a — Street address (if different): (same as above)
LINE 7a — Responsible party name: ${data.founderName}
LINE 7b — Responsible party SSN/ITIN: [INSERT SSN OR ITIN]
LINE 8a — Is this an LLC? NO
LINE 9a — Type of entity: Corporation
LINE 9b — State of incorporation: DE (Delaware)
LINE 10 — Reason for applying: Started new business
LINE 11 — Date business started or acquired: ${fmtDate(data.incorporationDate)}
LINE 12 — Closing month of accounting year: December
LINE 13 — Highest number of employees in next 12 months: 1
LINE 14 — Does the principal business activity involve farming? NO
LINE 15 — First date wages or annuities were paid: (leave blank if no employees yet)
LINE 16 — Check one box that best describes the principal activity:
          ☑ Other (specify): Technology / ${data.businessActivity}
LINE 17 — Describe the principal line of merchandise sold, specific construction work done, products produced, or services provided:
          Software development and technology services

FILING INSTRUCTIONS:
• File online at: https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online
• Or fax Form SS-4 to: (855) 641-6935 (domestic) or (304) 707-9471 (international)
• Or mail to: Internal Revenue Service, Attn: EIN Operation, Cincinnati, OH 45999
• International applicants: call (267) 941-1099 (not toll-free)
• Processing time: Online = immediate, Fax = 4 business days, Mail = 4-6 weeks

IMPORTANT NOTES:
• The responsible party must have a valid SSN, ITIN, or EIN
• As a foreign individual, ${data.founderName} will need an ITIN (Form W-7) first, or use an attorney/CPA with US SSN as the responsible party
• EIN is free — do not pay third-party services to obtain it`
}

// ─── HTML Package Generator ───────────────────────────────────────────────────

function generateHTMLPackage(data: FormationData): string {
  const docs = [
    { title: '1. Certificate of Incorporation', content: generateCertificateOfIncorporation(data) },
    { title: '2. Bylaws', content: generateBylaws(data) },
    { title: '3. Action by Written Consent of Sole Incorporator', content: generateIncorporatorConsent(data) },
    { title: '4. Initial Board Action', content: generateInitialBoardAction(data) },
    { title: '5. Restricted Stock Purchase Agreement', content: generateRestrictedStockAgreement(data) },
    { title: '6. Section 83(b) Election Letter', content: generate83bElection(data) },
    { title: '7. Indemnification Agreement', content: generateIndemnificationAgreement(data) },
    { title: '8. IRS Form SS-4 Data (EIN Application)', content: generateSS4Data(data) },
  ]

  const sections = docs.map(doc => `
    <div class="doc-section">
      <h2>${doc.title}</h2>
      <pre>${doc.content}</pre>
    </div>
    <div class="page-break"></div>
  `).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${data.companyName} — Delaware Incorporation Package</title>
  <style>
    body { font-family: 'Times New Roman', Times, serif; max-width: 800px; margin: 40px auto; padding: 0 40px; color: #111; }
    h1 { font-size: 20px; text-align: center; margin-bottom: 8px; }
    .subtitle { text-align: center; font-size: 13px; color: #555; margin-bottom: 40px; }
    h2 { font-size: 15px; font-weight: bold; margin-top: 48px; margin-bottom: 16px; border-bottom: 1px solid #ccc; padding-bottom: 6px; }
    pre { white-space: pre-wrap; font-family: inherit; font-size: 12px; line-height: 1.7; margin: 0; }
    .doc-section { page-break-inside: avoid; }
    .page-break { page-break-after: always; height: 1px; }
    .toc { background: #f9f9f9; border: 1px solid #ddd; padding: 24px; margin-bottom: 40px; border-radius: 4px; }
    .toc h2 { margin-top: 0; border: none; }
    .toc ol { margin: 0; padding-left: 20px; }
    .toc li { font-size: 13px; margin-bottom: 4px; }
    .disclaimer { font-size: 11px; color: #888; border-top: 1px solid #eee; margin-top: 60px; padding-top: 16px; }
    @media print { .page-break { page-break-after: always; } }
  </style>
</head>
<body>
  <h1>${data.companyName}</h1>
  <div class="subtitle">Delaware C-Corporation — Incorporation Package<br>Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>

  <div class="toc">
    <h2>Table of Contents</h2>
    <ol>
      <li>Certificate of Incorporation</li>
      <li>Bylaws</li>
      <li>Action by Written Consent of Sole Incorporator</li>
      <li>Initial Board Action</li>
      <li>Restricted Stock Purchase Agreement</li>
      <li>Section 83(b) Election Letter</li>
      <li>Indemnification Agreement</li>
      <li>IRS Form SS-4 Data (EIN Application)</li>
    </ol>
  </div>

  ${sections}

  <div class="disclaimer">
    <strong>DISCLAIMER:</strong> This document package is generated for informational purposes only and does not constitute legal advice.
    These are template documents only and must be reviewed by a qualified attorney before use.
    Filing requirements, fees, and regulations may change. Consult with a Delaware-licensed attorney for your specific situation.
    Generated by Wavult OS — ${new Date().toISOString()}
  </div>
</body>
</html>`
}

// ─── Filing Option Card ───────────────────────────────────────────────────────

interface FilingOption {
  key: string
  icon: string
  name: string
  price: string
  timeline: string
  description: string
  url: string
  available: boolean
  recommended?: boolean
}

const FILING_OPTIONS: FilingOption[] = [
  {
    key: 'harvard',
    icon: '📋',
    name: 'Harvard Business Services',
    price: '$89 + $50 registered agent',
    timeline: '1–2 business days',
    description: 'One of the oldest and most trusted Delaware incorporators. Manual API integration available. No Stripe required.',
    url: 'https://www.delawareinc.com',
    available: true,
    recommended: true,
  },
  {
    key: 'northwest',
    icon: '⚡',
    name: 'Northwest Registered Agent',
    price: '$125 total',
    timeline: 'Same-day option available',
    description: 'Privacy-first registered agent and incorporation service. Fastest turnaround, no junk mail policy.',
    url: 'https://www.northwestregisteredagent.com',
    available: true,
  },
  {
    key: 'stripe',
    icon: '🏛️',
    name: 'Stripe Atlas',
    price: '$500 total',
    timeline: '2–3 business days',
    description: 'Full-service incorporation via Stripe. Includes Stripe account, equity documents, and intro to legal services.',
    url: 'https://stripe.com/atlas',
    available: true,
  },
]

function FilingOptionCard({ option }: { option: FilingOption }) {
  return (
    <div
      className={`relative rounded-xl border p-5 space-y-3 transition-all hover:border-white/20 ${
        option.recommended
          ? 'border-blue-500/50 bg-blue-950/20'
          : 'border-white/8 bg-muted/30'
      }`}
    >
      {option.recommended && (
        <div className="absolute -top-2.5 left-4">
          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-blue-600 text-white">
            ✓ RECOMMENDED — No Stripe
          </span>
        </div>
      )}
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none flex-shrink-0">{option.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-text-primary">{option.name}</h3>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-gray-400">
            <span className="font-medium text-green-400">{option.price}</span>
            <span>·</span>
            <span>⏱ {option.timeline}</span>
          </div>
          <p className="text-xs text-gray-400 mt-2 leading-relaxed">{option.description}</p>
        </div>
      </div>
      <a
        href={option.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full text-center py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
        style={{
          background: option.recommended ? '#1d4ed8' : '#374151',
          color: '#fff',
        }}
      >
        File via {option.name.split(' ')[0]} →
      </a>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10)

const DEFAULT_FORM: FormationData = {
  companyName: 'Wavult Ventures Inc.',
  registeredAgentKey: 'harvard',
  authorizedShares: 10_000_000,
  parValue: '0.0001',
  founderName: 'Erik Svensson',
  founderAddress: 'Åvägen 9, Tyresö, Sweden',
  incorporationDate: TODAY,
  fiscalYearEnd: 'December',
  businessActivity: 'Software',
}

type Step = 'form' | 'review' | 'docs'

export function DelawareFormation() {
  const [form, setForm] = useState<FormationData>(DEFAULT_FORM)
  const [step, setStep] = useState<Step>('form')
  const [previewDoc, setPreviewDoc] = useState<string | null>(null)
  const [activeDocIdx, setActiveDocIdx] = useState(0)

  function setField<K extends keyof FormationData>(key: K, value: FormationData[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function downloadHTMLPackage() {
    const html = generateHTMLPackage(form)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${form.companyName.replace(/\s+/g, '-')}-Delaware-Incorporation-Package.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function downloadSingleDoc(title: string, content: string) {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>
    <style>body{font-family:'Times New Roman',serif;max-width:700px;margin:40px auto;padding:0 40px;font-size:13px;line-height:1.7;}
    h1{font-size:16px;margin-bottom:24px;}pre{white-space:pre-wrap;font-family:inherit;}</style></head>
    <body><h1>${title}</h1><pre>${content}</pre></body></html>`
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/[^a-zA-Z0-9]/g, '-')}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const docList = [
    { title: 'Certificate of Incorporation', content: generateCertificateOfIncorporation(form) },
    { title: 'Bylaws', content: generateBylaws(form) },
    { title: 'Action by Written Consent of Sole Incorporator', content: generateIncorporatorConsent(form) },
    { title: 'Initial Board Action', content: generateInitialBoardAction(form) },
    { title: 'Restricted Stock Purchase Agreement', content: generateRestrictedStockAgreement(form) },
    { title: 'Section 83(b) Election Letter', content: generate83bElection(form) },
    { title: 'Indemnification Agreement', content: generateIndemnificationAgreement(form) },
    { title: 'IRS Form SS-4 Data (EIN)', content: generateSS4Data(form) },
  ]

  const ss4Data = generateSS4Data(form)
  const agent = REGISTERED_AGENTS[form.registeredAgentKey]

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Step progress bar ── */}
      <div className="flex items-center gap-0 px-6 py-3 border-b border-white/8 flex-shrink-0 bg-muted/20">
        {(['form', 'review', 'docs'] as Step[]).map((s, i) => {
          const labels = ['1. Company Details', '2. Filing Options', '3. Documents']
          const active = step === s
          const past = ['form', 'review', 'docs'].indexOf(step) > i
          return (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded transition-colors ${
                active
                  ? 'text-blue-400 bg-blue-950/40 border border-blue-500/50'
                  : past
                  ? 'text-green-400 hover:text-green-300'
                  : 'text-gray-500 hover:text-gray-400'
              }`}
            >
              {past && !active ? '✓' : `${i + 1}.`} {labels[i].split('. ')[1]}
            </button>
          )
        })}
        <div className="ml-auto text-[10px] font-mono text-gray-500">🇺🇸 Delaware C-Corp</div>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* ══ STEP 1: Company Details Form ══ */}
        {step === 'form' && (
          <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
            <div>
              <h2 className="text-base font-bold text-text-primary">Delaware C-Corp Formation</h2>
              <p className="text-xs text-gray-400 mt-1">
                Enter your company details below. Documents will be generated locally — no data sent to any server.
              </p>
            </div>

            {/* Company Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Company Name *</label>
              <input
                type="text"
                value={form.companyName}
                onChange={e => setField('companyName', e.target.value)}
                placeholder="e.g. Wavult Ventures Inc."
                className="w-full px-3 py-2 text-sm rounded-lg border border-white/12 bg-muted/40 text-text-primary placeholder-gray-600 focus:outline-none focus:border-blue-500/60"
              />
              <p className="text-[10px] text-gray-500">Must end with Inc., Corp., Corporation, Incorporated, or Ltd.</p>
            </div>

            {/* Registered Agent */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Registered Agent</label>
              <div className="space-y-2">
                {(['harvard', 'northwest', 'stripe'] as const).map(key => {
                  const labels = {
                    harvard: 'Harvard Business Services — $50/yr · Lewes, DE',
                    northwest: 'Northwest Registered Agent — $125/yr · Dover, DE',
                    stripe: 'Legalinc (via Stripe Atlas) — included with Atlas · Middletown, DE',
                  }
                  return (
                    <label key={key} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="radio"
                        name="agent"
                        checked={form.registeredAgentKey === key}
                        onChange={() => setField('registeredAgentKey', key)}
                        className="accent-blue-500"
                      />
                      <span className={`text-xs ${form.registeredAgentKey === key ? 'text-text-primary' : 'text-gray-400'}`}>
                        {labels[key]}
                      </span>
                    </label>
                  )
                })}
              </div>
              <div className="mt-2 p-3 rounded-lg border border-white/8 bg-muted/20 text-xs text-gray-400 space-y-0.5">
                <div><span className="text-gray-500">Name:</span> {agent.name}</div>
                <div><span className="text-gray-500">Address:</span> {agent.address}, {agent.city}, {agent.state} {agent.zip}</div>
                <div><span className="text-gray-500">County:</span> {agent.county}</div>
              </div>
            </div>

            {/* Stock */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Authorized Shares</label>
                <input
                  type="number"
                  value={form.authorizedShares}
                  onChange={e => setField('authorizedShares', parseInt(e.target.value) || 10_000_000)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-white/12 bg-muted/40 text-text-primary focus:outline-none focus:border-blue-500/60"
                />
                <p className="text-[10px] text-gray-500">Standard: 10,000,000 shares</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Par Value per Share</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="text"
                    value={form.parValue}
                    onChange={e => setField('parValue', e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-sm rounded-lg border border-white/12 bg-muted/40 text-text-primary focus:outline-none focus:border-blue-500/60"
                  />
                </div>
                <p className="text-[10px] text-gray-500">Standard: $0.0001</p>
              </div>
            </div>

            {/* Founder */}
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Incorporator / Founder Name</label>
                <input
                  type="text"
                  value={form.founderName}
                  onChange={e => setField('founderName', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-white/12 bg-muted/40 text-text-primary focus:outline-none focus:border-blue-500/60"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Incorporator Address</label>
                <input
                  type="text"
                  value={form.founderAddress}
                  onChange={e => setField('founderAddress', e.target.value)}
                  placeholder="Street, City, Country"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-white/12 bg-muted/40 text-text-primary focus:outline-none focus:border-blue-500/60"
                />
              </div>
            </div>

            {/* Incorporation Date & Business */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Incorporation Date</label>
                <input
                  type="date"
                  value={form.incorporationDate}
                  onChange={e => setField('incorporationDate', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-white/12 bg-muted/40 text-text-primary focus:outline-none focus:border-blue-500/60"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Business Activity (SS-4)</label>
                <input
                  type="text"
                  value={form.businessActivity}
                  onChange={e => setField('businessActivity', e.target.value)}
                  placeholder="e.g. Software, SaaS, AI"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-white/12 bg-muted/40 text-text-primary focus:outline-none focus:border-blue-500/60"
                />
              </div>
            </div>

            <button
              onClick={() => setStep('review')}
              disabled={!form.companyName.trim()}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: '#2563eb', color: '#fff' }}
            >
              Continue to Filing Options →
            </button>
          </div>
        )}

        {/* ══ STEP 2: Filing Options ══ */}
        {step === 'review' && (
          <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
            <div>
              <h2 className="text-base font-bold text-text-primary">Choose Filing Method</h2>
              <p className="text-xs text-gray-400 mt-1">
                Select how to file your Delaware Certificate of Incorporation. Documents are generated locally regardless of which option you choose.
              </p>
            </div>

            {/* Summary */}
            <div className="rounded-xl border border-white/8 bg-muted/20 p-4 space-y-2">
              <div className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-3">Formation Summary</div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                <div className="text-gray-400">Company Name</div>
                <div className="text-text-primary font-medium">{form.companyName}</div>
                <div className="text-gray-400">Registered Agent</div>
                <div className="text-text-primary">{agent.name}</div>
                <div className="text-gray-400">Authorized Shares</div>
                <div className="text-text-primary">{Number(form.authorizedShares).toLocaleString()}</div>
                <div className="text-gray-400">Par Value</div>
                <div className="text-text-primary">${form.parValue}/share</div>
                <div className="text-gray-400">Incorporator</div>
                <div className="text-text-primary">{form.founderName}</div>
                <div className="text-gray-400">Incorporation Date</div>
                <div className="text-text-primary">{fmtDate(form.incorporationDate)}</div>
              </div>
            </div>

            {/* Filing cards */}
            <div className="grid grid-cols-1 gap-4">
              {FILING_OPTIONS.map(opt => (
                <FilingOptionCard key={opt.key} option={opt} />
              ))}
            </div>

            {/* API status note */}
            <div className="rounded-lg border border-amber-900/30 bg-amber-950/10 p-4">
              <p className="text-xs font-semibold text-amber-400 mb-1">🔌 API Integration Status</p>
              <p className="text-xs text-gray-400 leading-relaxed">
                <strong className="text-gray-300">Harvard Business Services</strong> — No public REST API documented. Filing can be done via their web portal or by contacting info@delawareinc.com for bulk/API arrangements.
              </p>
              <p className="text-xs text-gray-400 leading-relaxed mt-1">
                <strong className="text-gray-300">Northwest Registered Agent</strong> — Partner API available for volume filers. Contact via northwestregisteredagent.com.
              </p>
              <p className="text-xs text-gray-400 leading-relaxed mt-1">
                <strong className="text-gray-300">Recommended flow:</strong> Generate documents below → File manually via Harvard or Northwest → Return here to upload confirmation.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('form')}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-white/12 text-gray-300 hover:border-white/25 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep('docs')}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ background: '#16a34a', color: '#fff' }}
              >
                Generate Documents →
              </button>
            </div>
          </div>
        )}

        {/* ══ STEP 3: Documents ══ */}
        {step === 'docs' && (
          <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-base font-bold text-text-primary">📦 Incorporation Package</h2>
                <p className="text-xs text-gray-400 mt-1">
                  {form.companyName} · {docList.length} documents · Generated locally
                </p>
              </div>
              <button
                onClick={downloadHTMLPackage}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80"
                style={{ background: '#2563eb', color: '#fff' }}
              >
                ⬇ Download All Documents
              </button>
            </div>

            {/* Document list + preview */}
            <div className="flex gap-4 h-[520px]">
              {/* Left: doc list */}
              <div className="w-64 flex-shrink-0 space-y-1 overflow-y-auto">
                {docList.map((doc, i) => (
                  <button
                    key={i}
                    onClick={() => { setActiveDocIdx(i); setPreviewDoc(doc.content) }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors ${
                      activeDocIdx === i && previewDoc !== null
                        ? 'bg-blue-950/40 border border-blue-500/40 text-blue-300'
                        : 'border border-white/6 bg-muted/20 text-gray-300 hover:bg-muted/40 hover:text-text-primary'
                    }`}
                  >
                    <div className="font-medium leading-snug">{doc.title}</div>
                  </button>
                ))}
              </div>

              {/* Right: preview or empty state */}
              <div className="flex-1 rounded-xl border border-white/8 overflow-hidden flex flex-col">
                {previewDoc !== null ? (
                  <>
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 bg-muted/30 flex-shrink-0">
                      <span className="text-xs font-semibold text-gray-300">{docList[activeDocIdx].title}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => downloadSingleDoc(docList[activeDocIdx].title, docList[activeDocIdx].content)}
                          className="px-2.5 py-1 text-[10px] font-mono rounded border border-white/12 text-gray-300 hover:border-white/25 transition-colors"
                        >
                          ⬇ Download
                        </button>
                        <button
                          onClick={() => { navigator.clipboard.writeText(previewDoc) }}
                          className="px-2.5 py-1 text-[10px] font-mono rounded border border-white/12 text-gray-300 hover:border-white/25 transition-colors"
                        >
                          📋 Copy
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                      <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                        {previewDoc}
                      </pre>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500">
                    <div className="text-center space-y-2">
                      <div className="text-3xl">📄</div>
                      <p className="text-xs">Select a document to preview</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SS-4 Quick Reference */}
            <div className="rounded-xl border border-green-900/30 bg-green-950/10 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-base">🪪</span>
                <h3 className="text-sm font-semibold text-green-400">IRS EIN Application (SS-4) — Quick Reference</h3>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                <div className="text-gray-400">Legal Name</div>
                <div className="text-text-primary font-mono">{form.companyName}</div>
                <div className="text-gray-400">Entity Type</div>
                <div className="text-text-primary font-mono">Corporation</div>
                <div className="text-gray-400">State of Incorporation</div>
                <div className="text-text-primary font-mono">DE (Delaware)</div>
                <div className="text-gray-400">Date Incorporated</div>
                <div className="text-text-primary font-mono">{fmtDate(form.incorporationDate)}</div>
                <div className="text-gray-400">Fiscal Year End</div>
                <div className="text-text-primary font-mono">December</div>
                <div className="text-gray-400">Business Activity</div>
                <div className="text-text-primary font-mono">Technology / {form.businessActivity}</div>
                <div className="text-gray-400">Responsible Party</div>
                <div className="text-text-primary font-mono">{form.founderName}</div>
              </div>
              <a
                href="https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 mt-1"
                style={{ background: '#166534', color: '#86efac' }}
              >
                Apply for EIN at IRS.gov →
              </a>
              <p className="text-[10px] text-gray-500 mt-1">
                ⚠️ As a foreign national, you may need an ITIN (Form W-7) before applying, or work with a US-based attorney who can serve as responsible party.
              </p>
            </div>

            {/* Next steps */}
            <div className="rounded-xl border border-white/8 bg-muted/20 p-5 space-y-3">
              <h3 className="text-xs font-mono uppercase tracking-wider text-gray-400">Post-Formation Checklist</h3>
              <div className="space-y-2">
                {[
                  { icon: '1️⃣', text: 'File Certificate of Incorporation with Delaware SoS via Harvard Business Services or Northwest' },
                  { icon: '2️⃣', text: 'Receive stamped Certificate of Incorporation (2–5 days)' },
                  { icon: '3️⃣', text: 'File 83(b) election with IRS within 30 days of share issuance' },
                  { icon: '4️⃣', text: 'Apply for EIN at IRS.gov (or via phone if international)' },
                  { icon: '5️⃣', text: 'Open US bank account (Mercury, Relay, or Brex) using EIN + Certificate' },
                  { icon: '6️⃣', text: 'File BOI (Beneficial Ownership Information) report via FinCEN within 30 days' },
                  { icon: '7️⃣', text: 'Set up payroll, Carta equity management, and accounting (QuickBooks/Bench)' },
                ].map(item => (
                  <div key={item.icon} className="flex items-start gap-3 text-xs text-gray-300">
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('review')}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-white/12 text-gray-300 hover:border-white/25 transition-colors"
              >
                ← Back to Filing Options
              </button>
              <button
                onClick={() => { setStep('form'); setPreviewDoc(null) }}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-white/12 text-gray-300 hover:border-white/25 transition-colors"
              >
                Start Over
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
