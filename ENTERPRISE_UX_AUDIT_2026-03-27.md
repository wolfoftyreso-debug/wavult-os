# Enterprise UX Audit — Wavult OS
Datum: 2026-03-27
Utfört av: Bernt (AI-assistent)
Direktiv: "Vi går för långt mot Metal Gear Solid. Mer Siemens Finance."

---

## Sammanfattning

Wavult OS har ett välstrukturerat komponentbibliotek och en genomtänkt arkitektur — men den visuella identiteten signalerar fel bransch. Bakgrundsfärgen `#0F1218` (nästan svart), "Incident Center", "Command Chain", `focal-zone`, `operator-color` och glödande keyframe-animationer sänder kollektivt budskapet "taktisk militäroperationscentral" snarare än "finansiell enterprise-plattform". En potentiell CFO eller institutionell kund som öppnar systemet för första gången riskerar att inte ta det seriöst. Det är inte ett fråga om att systemet är dåligt byggt — det är ett fråga om att det är positionerat fel. Tre kärnåtgärder räcker för att ta det 80% av vägen: ljusa upp bakgrunden till enterprise dark (inte pitch-black), rensa ut militärterminologin, och byt emoji mot ikon-bibliotek.

---

## Kritiska problem (åtgärda omedelbart)

| # | Problem | Fil | Konsekvens |
|---|---------|-----|------------|
| 1 | `#0F1218` / `#07080F` som primär bakgrund | `index.css`, `Shell.tsx`, `FinanceHub.tsx` | Uppfattas som gaming/hacker-estetik. Bloomberg-mörkt = `#1a1a2e` + subtila accenter, inte pitch-black |
| 2 | "Incident Center 🚨" i navigationen | `Shell.tsx` linje ~47 | Militärt/operationellt språk. En CFO förväntar sig "Alerts" eller "Issues" |
| 3 | "Command Chain ⬆" i navigationen | `Shell.tsx` linje ~48 | "Command" är militärterminologi. SAP/Workday säger "Organization" eller "Hierarchy" |
| 4 | Emoji som nav-ikoner (🚀🎯💰🧠📡🏗⚡) | `Shell.tsx` NAV_GROUPS | Emoji är informella. Enterprise-system (SAP, Workday, Siemens) använder konsistenta SVG-ikoner |
| 5 | `focal-zone`, `operator-color`, `atmosphere`, `gate-lock`, `mission-item`, `mission-stack`, `hud-indicator` i CSS | `index.css` | Metal Gear Solid-terminologi direkt i design-systemet. Läcker ut i kodbas och skapar fel signalvärde |
| 6 | `glow-amber` / `glow-red` pulsande keyframe-animationer | `tailwind.config.js` | Glödeffekter hör hemma i gaming-UI. Enterprise-system signalerar status med färg och typografi, inte glow |
| 7 | `telemetry` / `telemetry-sm` som font-size-namn | `tailwind.config.js` | "Telemetry" är militär/rymdindustri-terminologi. Heter `label-xs` eller `caption` i enterprise-system |
| 8 | `spacing.focal` / `spacing.peripheral` i Tailwind | `tailwind.config.js` | Militärt/taktiskt ordval. Enterprise-spacing heter `aside`, `content`, eller numeriska värden |
| 9 | IBM Plex Mono som primärt mono-font | `tailwind.config.js` | Bra val faktiskt — men används för extremt mycket (nav-labels `text-[9px] font-mono`) vilket ger "terminal-känsla" |
| 10 | `#07080F` i header (`bg-[#07080F]`) | `Shell.tsx`, `FinanceHub.tsx` | Hårdkodad värde utanför design-systemet. Mörkare än `carbon` i paletten. Inkonsistent |

---

## Rekommenderat design-riktmärke

### 🏆 Bloomberg Terminal (anpassad för webb)

**Motivering:** Bloomberg är den enda globalt erkända enterprise-plattformen som legitimt använder mörkt tema. Kunderna är institutionella investerare, CFO:er, traders — exakt Wavults målgrupp. Bloomberg signalerar:
- Informationstäthet (data first)
- Professionell seriositet
- Funktionalitet över estetik

**Bloomberg-nyckelprinciper att ta efter:**
- Bakgrund: inte svart utan mörkblå-grå (`#1a1a2e` eller `#0d1117`)
- Text: vit med tydlig hierarchy (ej grå-på-grå)
- Accent: en enda orange/gul signal-färg (Bloomberg orange)
- **Inga** dekorativa animationer — bara funktionella (loading, transition)
- Monospace för siffror och koder, sans-serif för allt annat

**Sekundär referens:** SAP Fiori Dark (används internt av Siemens, SAP, många Fortune 500 CFO-team)

---

## Färgpalett — nuläge vs rekommendation

### Bakgrundsfärger

| Roll | Nuläge | Nuläge (vad det signalerar) | Rekommendation | Signalerar |
|------|--------|--------------------------|----------------|------------|
| Primär bakgrund | `#0F1218` | Natt/gaming | `#0D1117` | GitHub dark / Bloomberg |
| Raised surface | `#14181E` | Bunker | `#161B22` | Enterprise dark |
| Overlay | `#1C2029` | Taktisk skärm | `#21262D` | Neutral slate |
| Steel/hover | `#252A34` | OK | `#2D333B` | Subtilt lyft |
| Border | `#2A2F3A` | OK | `#30363D` | GitHub-standard |
| Header | `#07080F` | Nästan svart — för extremt | `#0D1117` | Samma som bakgrund, inga "lager" |

> **Nyckelobservation:** Skillnaden mellan nuläge och rekommendation är liten men betydelsefull. `#0F1218` → `#0D1117` är faktiskt något ljusare och mer blå-grå än kol-svart. Det räcker för att tas mer på allvar.

### Accentfärger

| Roll | Nuläge | Problem | Rekommendation |
|------|--------|---------|----------------|
| Primär accent (amber) | `#C4961A` | Lite för mörk/dov | `#E8A020` (Bloomberg orange-guld) |
| Danger/red | `#D94040` | OK men lite teatralisk | `#CF222E` (GitHub danger — konvention) |
| Success/green | `#4A7A5B` | Bra muted green | `#2EA043` (GitHub success — tydligare) |
| Info/blue | `#4A7A9B` | Bra | `#388BFD` (GitHub blue — klarare) |
| Premium/purple | `#8B5CF6` | OK | Behåll — används sparsamt |

### Text-hierarki (behåll i princip)

| Roll | Nuläge | Rekommendation |
|------|--------|----------------|
| Primary text | `#E8E9EB` | `#E6EDF3` (GitHub white — mer vit) |
| Secondary | `#8B919A` | `#8B949E` (behåll) |
| Tertiary | `#5A6170` | `#6E7681` (lite ljusare) |
| Muted | `#3D4452` | `#484F58` |

---

## Typografi — nuläge vs rekommendation

### Font-stack

| Element | Nuläge | Problem | Rekommendation |
|---------|--------|---------|----------------|
| Sans / body | Inter | ✅ Perfekt enterprise-val | Behåll |
| Mono | IBM Plex Mono | ✅ Bra font — men överanvänd | Behåll för siffror/koder, ta bort från nav-labels |
| Display | Inter | OK | Behåll |

### Användning av monospace

**Kritiskt problem:** `font-mono` används för nav-grupprubrikerna (`OPERATIONS`, `FINANCE` etc.), klockan, status-text, och scope-indikatorn. Det ger ett "terminal-UI"-intryck som inte är enterprise.

**Regel:**
- ✅ Monospace OK: tidsstämplar, version-nummer, API-nycklar, siffror i tabeller, `font-mono tabular-nums`
- ❌ Monospace INTE OK: nav-labels, section headings, status-text, klocka

### Font-size-namn (rename)

| Nuläge | Problem | Ny benämning |
|--------|---------|--------------|
| `telemetry` | Militärterminologi | `label-xs` |
| `telemetry-sm` | Militärterminologi | `label-2xs` |
| `action-lg` | Oklart namn | `heading-xl` |
| `action-md` | Oklart namn | `heading-lg` |

---

## Terminologi — byt ut

### Navigation (Shell.tsx)

| Gaming/Militär-term | Enterprise-alternativ | Motivering |
|--------------------|----------------------|------------|
| Incident Center 🚨 | Alerts | Siemens, ServiceNow, Jira |
| Command Chain ⬆ | Organization | SAP, Workday, Personio |
| Corporate Graph 🏗 | Structure | Eller "Group Structure" |
| People Intelligence 🧠 | Talent | SAP SuccessFactors |
| System Intelligence 📡 | System Health | Datadog, New Relic |
| Talent Radar 🎯 | Recruitment | Standard HR-terminologi |
| Strategic Brief 🏛 | Strategy | Workday, SAP |
| LLM Hub 🧠 | AI Tools | eller "Integrations" |

### CSS-klassnamn (index.css)

| Gaming/Militär-klass | Enterprise-alternativ |
|---------------------|----------------------|
| `.focal-zone` | `.content-area` |
| `.focal-zone--neutral` | `.content-area--default` |
| `.focal-zone--attention` | `.content-area--warning` |
| `.focal-zone--action` | `.content-area--critical` |
| `.focal-stripe` | `.status-bar` |
| `.mission-stack` | `.item-list` |
| `.mission-item` | `.list-item` |
| `.mission-item--urgent` | `.list-item--urgent` |
| `.hud-indicator` | `.status-indicator` |
| `.hud-dot` | `.status-dot` |
| `.gate-lock` | `.access-lock` |
| `.operator-accent` | `.entity-accent` |
| `.momentum-bar` | `.progress-bar` |

### CSS-variabler (index.css :root)

| Nuläge | Enterprise-alternativ |
|--------|----------------------|
| `--atmosphere` | `--surface-bg` |
| `--atmosphere-intensity` | `--surface-emphasis` |
| `--focal-accent` | `--accent-color` |
| `--operator-color` | `--entity-color` |
| `--transition-atmosphere` | `--transition-slow` |

### Tailwind-spacing

| Nuläge | Enterprise-alternativ |
|--------|----------------------|
| `spacing.focal` | `spacing.primary-col` |
| `spacing.peripheral` | `spacing.sidebar-col` |

### Tailwind-animationer

| Nuläge | Enterprise-alternativ |
|--------|----------------------|
| `glow-amber` | Ta bort (se sektion nedan) |
| `glow-red` | Ta bort (se sektion nedan) |

---

## Animationer & Effekter

### Ta bort omedelbart

| Animation | Anledning |
|-----------|-----------|
| `glow-amber` keyframe | Glödeffekter = gaming/consumer UI |
| `glow-red` keyframe | Glödeffekter = gaming/consumer UI |
| `event-card--elevated` box-shadow med amber-glow | Skapar "drama" som inte hör hemma i enterprise |
| `event-card--critical` box-shadow med red-glow | Skapar "drama" som inte hör hemma i enterprise |
| `.focal-zone--attention` / `--action` gradient backgrounds | Subtle gradient är OK men namngivningen och konceptet är militärt |

### Behåll (med förbehåll)

| Animation | Motivering |
|-----------|------------|
| `fade-in` | Standard UX — behåll |
| `slide-in` / `slide-out` | Standard UX — behåll |
| `pulse-slow` | OK för status-dots (Bloomberg använder pulsing dots) |
| `pulse` (inbyggt Tailwind) | OK för critical alerts — men sparsamt |
| `resolve` | OK för feedback-animation |

### Ersettat med Enterprise-standard

Istället för glödeffekter: använd **solid border + badge** för att signalera status.

```css
/* Ersätt glow-shadows med detta: */
.alert-card--warning {
  border-left: 3px solid #E8A020;
  background: #E8A02008;
}
.alert-card--critical {
  border-left: 3px solid #CF222E;
  background: #CF222E08;
}
```

---

## Navigation & Informationsarkitektur

### Nuläge — problemanalys

**8 nav-grupper, 30+ items** — detta är mycket. SAP Fiori har 5-7 grupper max. Workday har tydlig 2-nivå-hierarki.

Specifika problem:
1. **Pinned group utan label (null)** — tre items (Incidents, Command Chain, Corporate Graph) flödar utan kontext. SAP lägger detta i en "Home" eller "Overview" sektion
2. **"INTELLIGENCE" som sektion** — låter som en spionbyrå. Bör vara "Analytics" eller "Insights"
3. **"KUNSKAP" på svenska** — blandar svenska och engelska inkonsekvent. Välj ETT språk för UI. Antingen allt svenska eller allt engelska.
4. **Emoji som ikoner** — alla 8 enterprise-system vi jämfört (SAP, Workday, Siemens, ServiceNow, Bloomberg, Salesforce, NetSuite, Oracle) använder SVG-ikon-bibliotek, inte emoji
5. **Duplikat ikoner** — 🧠 används för "LLM Hub" OCH "People Intelligence"; 📡 för "System Intelligence" OCH "Kommunikation"; 🎯 för "CRM" OCH "Talent Radar"; 🚀 för "Milestones" OCH "Company Launch"

### Rekommenderad nav-struktur

```
[ingen grupp / pinned]
  Dashboard
  Alerts          (f.d. Incident Center)
  
OPERATIONS
  CRM
  Milestones
  Campaigns
  Media & Ads

FINANCE
  Overview
  Transactions
  Payroll
  Procurement

ORGANIZATION
  Group Structure  (f.d. Corporate Graph)
  Hierarchy        (f.d. Command Chain)
  Entities
  Legal
  Team

INSIGHTS
  Analytics        (f.d. Reports)
  People Insights  (f.d. People Intelligence)
  System Health    (f.d. System Intelligence)

SETTINGS
  API Integrations (f.d. API Hub)
  AI Tools         (f.d. LLM Hub)
  Communications
  Settings
  Status
```

### Ikon-bibliotek

**Rekommendation: Lucide Icons** (används av Vercel, Linear, Raycast)
- Redan installerat i många React-projekt
- Konsistenta, professionella linjeikoner
- MIT-licens
- npm: `lucide-react`

Alternativ: **Heroicons** (Tailwind Labs — naturlig match)

```tsx
// Exempel på implementation
import { AlertTriangle, Building2, BarChart2 } from 'lucide-react'

// Ersätt: { to: '/incidents', label: 'Alerts', icon: '🚨' }
// Med:    { to: '/alerts', label: 'Alerts', icon: <AlertTriangle size={16} /> }
```

---

## Komponent-mönster — nuläge

### Styrkor (behåll)
- ✅ Konsekventa `rounded-xl` på kort
- ✅ Bra `border border-surface-border` på alla kort
- ✅ `bg-surface-raised` / `bg-surface-overlay` för hierarki
- ✅ `tabular-nums` på siffror — enterprise-korrekt
- ✅ Error Boundary i FinanceHub — utmärkt mönster
- ✅ `divide-y divide-white/[0.04]` i listor — elegant
- ✅ Tab-navigation i FinanceHub — bra mönster

### Problem att åtgärda
- ❌ Hårdkodade färger (`bg-[#07080F]`, `bg-[#0D0F1A]`, `bg-[#0A0C14]`) utanför design-systemet — sprid i hela koden
- ❌ Hårdkodade inline `style={{ background: color + '15' }}` — detta är CSS-i-JS på ett inkonsekvent sätt
- ❌ `text-[9px]` och `text-[10px]` utan namngivna tokens — läsbarhetsproblem och inkonsistens
- ❌ Blandad font-size: `text-xs`, `text-[10px]`, `text-[11px]`, `text-[9px]` — standardisera
- ❌ `font-mono` på nav-grupprubrikerna ger terminal-känsla
- ❌ Emoji-ikoner i FinanceHub tabs (📊📋↕🧾💧🏛️↔️💳⚡) — samma problem som nav

---

## Implementeringsplan

### Fas 1 — Omedelbart (1 dag)
**Prioritet: Terminologi & Superficiella CSS-ändringar — ingen komponent-rebuild**

1. Byt alla nav-labels i `Shell.tsx`:
   - "Incident Center" → "Alerts"
   - "Command Chain" → "Organization Hierarchy"  
   - "Corporate Graph" → "Group Structure"
   - "People Intelligence" → "People Insights"
   - "System Intelligence" → "System Health"
   - "Talent Radar" → "Recruitment"
   - "Strategic Brief" → "Strategy"

2. Ta bort emoji från `NAV_GROUPS` i `Shell.tsx` (ersätt med `null` tillfälligt tills Lucide-ikoner installeras)

3. Byt `--atmosphere`, `--focal-accent`, `--operator-color` i `index.css` CSS-variabelnamn

4. Ta bort `glow-amber` och `glow-red` keyframes och animations i `tailwind.config.js`

5. Byt `telemetry` / `telemetry-sm` → `label-xs` / `label-2xs` i `tailwind.config.js`

6. Ta bort `spacing.focal` / `spacing.peripheral` eller byt till `spacing.primary-col` / `spacing.aside-col`

7. Fixa `bg-[#07080F]` hårdkodad bakgrund i `Shell.tsx` header — byt till `bg-surface-raised` eller `bg-surface-base`

### Fas 2 — Kort sikt (1 vecka)
**Prioritet: Visuellt tema och ikon-system**

1. Installera Lucide React: `npm install lucide-react`

2. Uppdatera `NAV_GROUPS` i `Shell.tsx` med Lucide-ikoner

3. Justera bakgrundsfärger i `tailwind.config.js`:
   - `carbon: '#0F1218'` → `carbon: '#0D1117'`
   - `charcoal: '#14181E'` → `charcoal: '#161B22'`
   - `slate: '#1C2029'` → `slate: '#21262D'`

4. Byt `signal.amber: '#C4961A'` → `'#E8A020'` (tydligare, Bloomberg-stil)

5. Ta bort `font-mono` från nav-grupprubrikerna i `SidebarNav`

6. Döp om CSS-klasser i `index.css` (`.focal-zone` → `.content-area` etc.)

7. Byt emoji i FinanceHub tabs mot text-labels eller Lucide-ikoner

8. Standardisera font-sizes — välj en av `text-xs` (12px) eller `text-[11px]` och håll dig till den

### Fas 3 — Medellång sikt (1 månad)
**Prioritet: Arkitektur och design-system-mognad**

1. Rensa alla hårdkodade färger (`bg-[#0D0F1A]`, `bg-[#07080F]` etc.) ur komponenterna, ersätt med Tailwind-tokens

2. Skapa ett formellt design-token-dokument (eller Storybook)

3. Etablera en enda nav-IA (se rekommenderad struktur ovan)

4. Välj ett primärt UI-språk (svenska eller engelska) — konsekvent i HELA navigationen

5. Lägg till `aria-label` på alla ikon-knappar (hamburger, notifications, exit)

6. Skriv om CSS-komponentklasserna med enterprise-terminologi fullt ut

7. Utvärdera om Wavult OS ska positionera sig med **ljust tema** (Siemens/SAP) eller **enterprise-mörkt** (Bloomberg). Rekommendation: enterprise-mörkt med tydligare blå-grå (inte kol-svart) — det sticker ut och är mer distinkt

---

## Konkreta kod-ändringar (Fas 1)

### 1. tailwind.config.js — ta bort glow + byt terminologi

```js
// REMOVE dessa animations:
// 'glow-amber': 'glowAmber 2s ease-in-out infinite',
// 'glow-red': 'glowRed 1.5s ease-in-out infinite',

// REMOVE dessa keyframes:
// glowAmber: { ... }
// glowRed: { ... }

// BYT font-size-namn:
fontSize: {
  'heading-xl': ['2rem', { lineHeight: '1.1', fontWeight: '600' }],   // f.d. action-lg
  'heading-lg': ['1.5rem', { lineHeight: '1.2', fontWeight: '600' }], // f.d. action-md
  'label-xs':   ['0.625rem', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.05em' }],    // f.d. telemetry
  'label-2xs':  ['0.5625rem', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.05em' }],   // f.d. telemetry-sm
},

// BYT spacing-namn:
spacing: {
  'primary-col': '60%',   // f.d. focal
  'aside-col': '40%',     // f.d. peripheral
},
```

### 2. index.css — byt CSS-variabler

```css
:root {
  --surface-bg: #161B22;             /* f.d. --atmosphere */
  --surface-emphasis: 0;             /* f.d. --atmosphere-intensity */
  --accent-color: transparent;       /* f.d. --focal-accent */
  --entity-color: #E8A020;           /* f.d. --operator-color */
  --transition-slow: 1.2s ease-in-out;  /* f.d. --transition-atmosphere */
  --transition-fast: 0.15s ease-out;
  --transition-normal: 0.25s ease-out;
}
```

### 3. Shell.tsx — byt nav-labels

```tsx
const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      { to: '/alerts',    label: 'Alerts',              icon: null },  // f.d. 'Incident Center' 🚨
      { to: '/org/hierarchy', label: 'Org Hierarchy',   icon: null },  // f.d. 'Command Chain' ⬆
      { to: '/org',       label: 'Group Structure',     icon: null },  // f.d. 'Corporate Graph' 🏗
    ],
  },
  {
    label: 'OPERATIONS',
    items: [
      { to: '/dashboard', label: 'Dashboard',           icon: null },
      { to: '/crm',       label: 'CRM',                 icon: null },
      { to: '/milestones',label: 'Milestones',          icon: null },
      { to: '/campaigns', label: 'Campaigns',           icon: null },  // f.d. 'Kampanjer'
      { to: '/media',     label: 'Media & Ads',         icon: null },
      { to: '/submissions',label: 'Submissions',        icon: null },
    ],
  },
  // [Finance, Organisation — liknande rensning]
  {
    label: 'INSIGHTS',    // f.d. 'INTELLIGENCE'
    items: [
      { to: '/people-intelligence', label: 'People Insights',  icon: null },
      { to: '/system-intelligence', label: 'System Health',    icon: null },
      { to: '/talent-radar',        label: 'Recruitment',      icon: null },
      { to: '/strategic-brief',     label: 'Strategy',        icon: null },
    ],
  },
]
```

### 4. Shell.tsx — fixa hårdkodad header-bakgrund

```tsx
// Rad ~220: Byt
// <header className="h-12 ... bg-[#07080F]">
// Till:
<header className="h-12 ... bg-surface-base border-b border-surface-border">
```

### 5. index.css — ta bort glow-shadows från event-cards

```css
/* Ta bort dessa box-shadows: */
.event-card--elevated {
  @apply border-signal-amber/30;
  /* REMOVE: box-shadow: 0 0 20px rgba(196, 150, 26, 0.05); */
}

.event-card--critical {
  @apply border-signal-red/30;
  /* REMOVE: box-shadow: 0 0 20px rgba(217, 64, 64, 0.08); */
}

/* Ersätt med: */
.alert-card--warning {
  border-left: 3px solid var(--signal-amber);
  background: rgba(232, 160, 32, 0.04);
}
.alert-card--critical {
  border-left: 3px solid var(--signal-red);
  background: rgba(207, 34, 46, 0.04);
}
```

---

## Slutord

Wavult OS är ett imponerande system för sin storlek och scope — men det befinner sig i ett identitetsgap mellan "cool startup-dashboard" och "enterprise SaaS". Direktiv från CEO att gå mot "Siemens Finance" snarare än "Metal Gear Solid" är helt rätt. De konkreta ändringarna ovan är relativt enkla att genomföra (mest terminologi + CSS-tokens) men har stor visuell och strategisk effekt. Prioritet 1: terminologin. En CFO eller institutionell partner ska kunna öppna systemet och omedelbart känna sig hemma — inte imponerad av dramatik utan trygg i professionalitet.

**Estimat Fas 1:** 4-6 timmars arbete
**Estimat Fas 2:** 2-3 dagars arbete  
**Estimat Fas 3:** 2-3 veckors arbete (parallellt med feature-dev)
