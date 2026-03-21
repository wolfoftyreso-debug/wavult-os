# ONBOARDING_FLOW.md
> pixdrift OS — Out-of-Box Experience (OOBE)
> Version: 1.0 | 2026-03-21

Onboarding-flödet inspirerat av Windows OOBE och Apple Setup Assistant.
Känslan: du installerar något som faktiskt spelar roll.

---

## Wireframes

---

### Steg 1 / 6 — Välkommen

```
┌────────────────────────────────────────────────────────────┐
│                                               [1 / 6]      │
│                                                            │
│                      pixdrift                             │
│                                                            │
│              Välkommen till pixdrift.                      │
│                                                            │
│         Du håller på att installera operativsystemet       │
│                  för din verksamhet.                       │
│                                                            │
│                    Det tar 3 minuter.                      │
│                                                            │
│                                                            │
│                                    [ Kom igång →  ]        │
└────────────────────────────────────────────────────────────┘
```

**Designnotes:**
- Mörk bakgrund, centrerat innehåll
- pixdrift-logotyp i topp-vänster (liten)
- Progress-indikator [1/6] i topp-höger
- H1: "Välkommen till pixdrift." — stor, vit, tight tracking
- Subtext: grå, lättviktig
- CTA-knapp: indigo, rektangulär, höger-aligned

---

### Steg 2 / 6 — Organisation

```
┌────────────────────────────────────────────────────────────┐
│  pixdrift                                     [2 / 6]      │
│                                                            │
│  Vad heter ert företag?                                    │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Acme AB                                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  Bransch:                                                  │
│  ○  SaaS / Tech                                            │
│  ○  Professionella tjänster                                │
│  ○  Handel / E-handel                                      │
│  ○  Tillverkning / Industri                                │
│  ○  VVS / Installation / Hantverk                         │
│  ○  Annat                                                  │
│                                                            │
│               [ ← Tillbaka ]    [ Fortsätt → ]            │
└────────────────────────────────────────────────────────────┘
```

**Designnotes:**
- Input-fält: auto-focused, placeholder "Ditt bolagsnamn"
- Radiobuttons med tydlig hover-state (indigo ring)
- Validering: bolagsnamn minst 2 tecken, bransch måste väljas
- Error state: röd border på input + feltext under

**Error state:**
```
  ┌──────────────────────────────────────────────────────┐
  │                                              ← röd border │
  └──────────────────────────────────────────────────────┘
  ⚠ Ange ett bolagsnamn för att fortsätta.
```

---

### Steg 3 / 6 — Teamstorlek

```
┌────────────────────────────────────────────────────────────┐
│  pixdrift                                     [3 / 6]      │
│                                                            │
│  Hur stort är teamet?                                      │
│                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  1 – 10  │  │ 11 – 50  │  │ 51 – 200 │  │  200 +   │  │
│  │  Litet   │  │  Medel   │  │  Stort   │  │Enterprise│  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                                                            │
│  Hjälper oss konfigurera pixdrift optimalt för ert team.  │
│                                                            │
│               [ ← Tillbaka ]    [ Fortsätt → ]            │
└────────────────────────────────────────────────────────────┘
```

**Designnotes:**
- Fyra stora klickbara kort (inte radiobuttons)
- Valt alternativ: indigo border + svag indigo bakgrund
- Label under storlekssiffran ("Litet", "Enterprise" etc.)
- Fortsätt-knapp inaktiv tills ett val gjorts

**Aktiv state (vald):**
```
  ┌────────────────┐
  │   11 – 50      │  ← indigo border, #6366f1
  │   Medel        │  ← indigo-dim bakgrund
  └────────────────┘
```

---

### Steg 4 / 6 — Moduler

```
┌────────────────────────────────────────────────────────────┐
│  pixdrift                                     [4 / 6]      │
│                                                            │
│  Vilka delar av verksamheten vill du köra på pixdrift?    │
│                                                            │
│  ☑  Execution    Deals, tasks, kontakter, kommunikation    │
│  ☑  Capability   Kompetens, mål, medarbetarutveckling      │
│  ☑  Process      Processer, avvikelser, compliance         │
│  ☑  Currency     Multi-valuta, FX, ekonomirapporter        │
│  ☑  Reports      SIE4, bokslut, kassaflöde                 │
│                                                            │
│  Alla moduler är aktiverade som standard.                  │
│  Du kan ändra detta när som helst i Admin.                 │
│                                                            │
│               [ ← Tillbaka ]    [ Fortsätt → ]            │
└────────────────────────────────────────────────────────────┘
```

**Designnotes:**
- Alla moduler förmarkerade (OS-känsla: du installerar allt)
- Varje rad: checkbox → modul-namn (bold) → beskrivning (grå)
- Minst en modul måste vara vald (validering)
- Subtil disclaimer: "Du kan ändra detta när som helst i Admin."

**Demarkerad modul (om man avmarkerar):**
```
  ☐  Currency   Multi-valuta, FX, ekonomirapporter
                ↑ hela raden dimmas till 40% opacity
```

---

### Steg 5 / 6 — Bjud in team

```
┌────────────────────────────────────────────────────────────┐
│  pixdrift                                     [5 / 6]      │
│                                                            │
│  Bjud in ditt team                                         │
│                                                            │
│  ┌────────────────────────────────────────┐  [+ Lägg till] │
│  │  namn@foretag.se                       │               │
│  └────────────────────────────────────────┘               │
│                                                            │
│  anna@acme.se                               [✕]           │
│  marcus@acme.se                             [✕]           │
│                                                            │
│  Roll för inbjudna:                                        │
│  ○ Admin   ○ Säljare   ○ Operationer   ○ Ekonomi           │
│                                                            │
│  [ Hoppa över för nu ]  [ ← Tillbaka ]  [ Skicka → ]      │
└────────────────────────────────────────────────────────────┘
```

**Designnotes:**
- Enter eller klick på "+ Lägg till" validerar email-format och lägger till
- Tillagda emails visas som pills/rader med [✕]
- Roll-val gäller alla inbjudna i detta steg (kan ändras individuellt i Admin)
- "Hoppa över för nu" → grå länk längst till vänster
- Email-validering: kontrollera format, visa fel direkt

**Email-validering error:**
```
  ┌────────────────────────────────────────┐
  │  inte-en-email                         │  ← röd border
  └────────────────────────────────────────┘
  ⚠ Ange en giltig e-postadress.
```

---

### Steg 6 / 6 — Klart

```
┌────────────────────────────────────────────────────────────┐
│  pixdrift                                     [6 / 6]      │
│                                                            │
│                        ✓                                   │
│                                                            │
│             pixdrift är installerat.                       │
│                                                            │
│          Välkommen till kontrollen, Anna.                  │
│                                                            │
│  Ditt system är redo:                                      │
│  ✓  Acme AB konfigurerat                                   │
│  ✓  5 moduler aktiverade                                   │
│  ✓  3 inbjudningar skickade                                │
│                                                            │
│                                    [ Öppna pixdrift → ]   │
└────────────────────────────────────────────────────────────┘
```

**Designnotes:**
- Det stora ✓ animeras in med scale(0) → scale(1) + grön färg
- Check-listan itereras med 100ms delay per rad (cascade-effekt)
- CTA-knapp: primär, indigo, rektangulär — den enda aktionen
- Inga back-knappar — "Installationen är klar"

---

## Designprinciper

### Visuell identitet (konsekvent med Apple Setup Assistant)

- **Bakgrund:** #0a0a0f (djupsvart — inte vitt, inte grått)
- **Text primär:** #f8fafc
- **Text sekundär:** #6b7280
- **Accent:** #6366f1 (pixdrift indigo)
- **Success:** #10b981 (emerald)
- **Error:** #f43f5e (rose)
- **Typografi:** Inter, 800 för H1, 400/500 för brödtext
- **Kortradier:** 10px (inputs), 16px (kort), 24px (containers)

### Layout-principer

- **Centered, single-column** — aldrig tvinga användaren skanna
- **One primary action per screen** — "Fortsätt →" är alltid den enda tydliga vägen
- **Progress alltid synlig** — [X/6] top-right, hela vägen
- **Mjuk gräns** — max 4 val per skärm, aldrig överväldigande

---

## Animationsspecifikationer

| Händelse | Animation | Easing | Tid |
|----------|-----------|--------|-----|
| Screen enter (forward) | Slide in från höger + fade | ease-out | 300ms |
| Screen exit (forward) | Slide ut till vänster + fade | ease-in | 200ms |
| Screen enter (back) | Slide in från vänster + fade | ease-out | 300ms |
| Screen exit (back) | Slide ut till höger + fade | ease-in | 200ms |
| Checkbox toggle | Scale 0.9 → 1.0 + color transition | ease-out | 150ms |
| Card selection | Border-color + background transition | ease-out | 150ms |
| Success checkmark | Scale 0 → 1.1 → 1.0 | spring | 400ms |
| List items (steg 6) | Fade in + translateY(8px → 0) | ease-out | 200ms each, 100ms stagger |
| Error state | Shake (3px left/right × 3) | linear | 300ms |

**CSS-referens:**
```css
/* Screen transition */
.step-enter { animation: slideInRight 300ms ease-out; }
.step-exit  { animation: slideOutLeft 200ms ease-in; }

@keyframes slideInRight {
  from { transform: translateX(32px); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}

/* Success checkmark */
@keyframes checkmark {
  0%   { transform: scale(0); }
  70%  { transform: scale(1.1); }
  100% { transform: scale(1); }
}
```

---

## Error States & Validering

| Fält | Regel | Felmeddelande |
|------|-------|---------------|
| Bolagsnamn | Min 2 tecken | "Ange ett bolagsnamn för att fortsätta." |
| Bransch | Måste väljas | "Välj din bransch för att gå vidare." |
| Teamstorlek | Måste väljas | (Knapp inaktiv — ingen explicit feltext) |
| Moduler | Min 1 vald | "Välj minst en modul för att aktivera pixdrift." |
| Email | Giltigt format | "Ange en giltig e-postadress." |
| Email (dubblett) | Ej redan tillagd | "Den här adressen är redan tillagd." |

**Allmänna regler:**
- Felmeddelanden visas under fältet, aldrig som popup
- Validering sker on-blur (inte on-type) — förutom email vid "+ Lägg till"
- Error-state försvinner omedelbart när användaren börjar korrigera

---

## Mobil-anpassning

### Breakpoints
- Desktop: 900px+ → centrerad container, max-width 560px
- Tablet: 600–899px → full bredd, 40px horisontell padding
- Mobil: <600px → full bredd, 20px horisontell padding

### Mobil-specifika justeringar

**Steg 3 (Teamstorlek):**
```
Mobil: Två kort per rad istället för fyra
┌──────────┐  ┌──────────┐
│  1 – 10  │  │ 11 – 50  │
│  Litet   │  │  Medel   │
└──────────┘  └──────────┘
┌──────────┐  ┌──────────┐
│ 51 – 200 │  │  200 +   │
│  Stort   │  │Enterprise│
└──────────┘  └──────────┘
```

**Steg 5 (Bjud in):**
- "+ Lägg till" under emailfältet på mobil (inte bredvid)
- Scroll vid 3+ tillagda emails

**Steg 6 (Klart):**
- ✓-ikonen 48px på mobil (vs 64px desktop)
- CTA-knapp: full bredd på mobil

### Touch-anpassning
- Tappable areas: minst 44×44px
- Scroll-lock under animationer (förhindra ghost-scrolls)
- Keyboard-aware: skärmen scrollar till aktivt input-fält

---

## Teknisk implementation — rekommendationer

- **State management:** React state eller Zustand (behåll alla steg i minnet — aldrig API-anrop mellan steg förrän steg 6)
- **Animation library:** Framer Motion (AnimatePresence för screen transitions)
- **Form validation:** React Hook Form + Zod
- **Persist:** LocalStorage backup — om användaren laddar om, återstartar från senaste steg
- **Analytics:** Track varje "Fortsätt →" klick som steg-completion event (PostHog)
- **Completion event:** `onboarding_completed` med payload: `{ org_name, industry, team_size, modules: [], invited_count }`
