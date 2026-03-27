// ─── Legal Document Templates ─────────────────────────────────────────────
// Används av "Skapa dokument"-modalen för att föreslå inställningar per dokumenttyp.

import { type LegalDocType, type SigningLevel, DOC_TYPE_SIGNING_LEVEL, DOC_TYPE_LABELS } from './data'

export interface DocumentTemplate {
  type: LegalDocType
  label: string
  description: string
  /** Vilka parter som behövs — visas som ledtext i formuläret */
  partyALabel: string
  partyBLabel: string
  /** Föreslagen signeringsnivå (kan åsidosättas av användaren) */
  defaultSigningLevel: SigningLevel
  /** Standardlöptid i månader, eller null om ej tillämpligt */
  defaultDurationMonths: number | null
  /** Kortfattade instruktioner om vad dokumentet bör innehålla */
  checklist: string[]
}

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    type: 'ip_license',
    label: DOC_TYPE_LABELS.ip_license,
    description:
      'Reglerar rätten att använda immateriella rättigheter (patent, varumärken, källkod) från IP-holdingbolaget till operativt bolag. Inkluderar royalty-sats, exklusivitet och territorium.',
    partyALabel: 'IP-innehavare (Licensor)',
    partyBLabel: 'Licenstagare (Bolag)',
    defaultSigningLevel: DOC_TYPE_SIGNING_LEVEL.ip_license,
    defaultDurationMonths: 12,
    checklist: [
      'Definiera vilket IP som licensieras (patent, kod, varumärke)',
      'Ange royalty-sats (% av nettointäkt)',
      'Specificera territorium och exklusivitet',
      'Inkludera sublicensieringsförbud',
      'Reglera äganderätt vid vidareutveckling',
    ],
  },
  {
    type: 'management_agreement',
    label: DOC_TYPE_LABELS.management_agreement,
    description:
      'Definierar vilka managementtjänster holdingbolaget tillhandahåller dotterbolaget — t.ex. strategisk ledning, juridik, ekonomi. Reglerar ersättning och ansvarsfördelning.',
    partyALabel: 'Holdingbolag (Tjänsteleverantör)',
    partyBLabel: 'Dotterbolag (Mottagare)',
    defaultSigningLevel: DOC_TYPE_SIGNING_LEVEL.management_agreement,
    defaultDurationMonths: 12,
    checklist: [
      'Lista vilka tjänster som ingår (ledning, juridik, ekonomi)',
      'Ange månadsarvode och valuta',
      'Definiera KPI:er och leveranser',
      'Inkludera uppsägningstid (minst 3 månader)',
      'Reglera ansvarsförsäkring',
    ],
  },
  {
    type: 'service_agreement',
    label: DOC_TYPE_LABELS.service_agreement,
    description:
      'Reglerar leverans av tekniska tjänster, API-åtkomst, hosting eller support mellan koncernbolag eller externa parter. Inkluderar SLA-nivåer och prisjustering.',
    partyALabel: 'Tjänsteleverantör',
    partyBLabel: 'Kund / Mottagarbolag',
    defaultSigningLevel: DOC_TYPE_SIGNING_LEVEL.service_agreement,
    defaultDurationMonths: 12,
    checklist: [
      'Specificera tjänster (API, hosting, support)',
      'Ange SLA-nivåer (uptime, svarstider)',
      'Definiera prisjusteringsklausul (t.ex. KPI-indexering)',
      'Inkludera dataskyddsklausul',
      'Reglera ansvarsbegränsning och force majeure',
    ],
  },
  {
    type: 'shareholder_agreement',
    label: DOC_TYPE_LABELS.shareholder_agreement,
    description:
      'Styr förhållandet mellan aktieägare i bolaget. Inkluderar beslutsregler, drag-along/tag-along-rättigheter, pre-emption, och styrelsesammansättning.',
    partyALabel: 'Aktieägare A (Grundare)',
    partyBLabel: 'Aktieägare B (Investerare / Medskapare)',
    defaultSigningLevel: DOC_TYPE_SIGNING_LEVEL.shareholder_agreement,
    defaultDurationMonths: null,
    checklist: [
      'Ange ägarandelar per aktieägare',
      'Definiera drag-along och tag-along-rättigheter',
      'Inkludera pre-emption rights (förköpsrätt)',
      'Specificera beslutsregler (enkel/kvalificerad majoritet)',
      'Reglera lock-up period och vesting för grundare',
      'Inkludera anti-dilution-skydd',
    ],
  },
  {
    type: 'intercompany_loan',
    label: DOC_TYPE_LABELS.intercompany_loan,
    description:
      'Reglerar lån mellan bolag inom koncernen. Säkerställer armlängdsprincipen för skatteändamål och specificerar ränta, amorteringsplan och eventuella säkerheter.',
    partyALabel: 'Långivare (Bolag)',
    partyBLabel: 'Låntagare (Bolag)',
    defaultSigningLevel: DOC_TYPE_SIGNING_LEVEL.intercompany_loan,
    defaultDurationMonths: 24,
    checklist: [
      'Ange lånebelopp och valuta',
      'Specificera ränta (armlängdsprincipen)',
      'Definiera amorteringsplan',
      'Inkludera events of default',
      'Reglera skattemässig behandling',
    ],
  },
  {
    type: 'employment_contract',
    label: DOC_TYPE_LABELS.employment_contract,
    description:
      'Anställningsavtal för fast anställd personal. Inkluderar lön, arbetsuppgifter, konkurrensklausul, IP-överlåtelse och sekretessåtaganden.',
    partyALabel: 'Arbetsgivare (Bolag)',
    partyBLabel: 'Anställd (Person)',
    defaultSigningLevel: DOC_TYPE_SIGNING_LEVEL.employment_contract,
    defaultDurationMonths: null,
    checklist: [
      'Ange befattning, avdelning och rapporteringsväg',
      'Specificera lön, rörlig ersättning och förmåner',
      'Inkludera konkurrensklausul (max 12 månader)',
      'IP-överlåtelse — allt arbetsrelaterat IP tillfaller bolaget',
      'Sekretessåtagande under och efter anställning',
      'Reglera uppsägningstid enligt LAS',
    ],
  },
  {
    type: 'nda',
    label: DOC_TYPE_LABELS.nda,
    description:
      'Ömsesidigt sekretessavtal som skyddar konfidentiell information vid förhandlingar, due diligence eller samarbeten. Standardlöptid 24 månader.',
    partyALabel: 'Part A',
    partyBLabel: 'Part B',
    defaultSigningLevel: DOC_TYPE_SIGNING_LEVEL.nda,
    defaultDurationMonths: 24,
    checklist: [
      'Definiera "konfidentiell information" brett',
      'Ange löptid för sekretessåtagandet',
      'Inkludera undantag (offentlig info, lagstadgat krav)',
      'Reglera vad som händer vid avtalsbrott',
      'Specificera tillämplig lag och jurisdiktion',
    ],
  },
  {
    type: 'data_processing_agreement',
    label: DOC_TYPE_LABELS.data_processing_agreement,
    description:
      'Personuppgiftsbiträdesavtal enligt GDPR Art. 28. Reglerar hur personuppgiftsbiträdet behandlar data på uppdrag av den personuppgiftsansvarige.',
    partyALabel: 'Personuppgiftsansvarig',
    partyBLabel: 'Personuppgiftsbiträde',
    defaultSigningLevel: DOC_TYPE_SIGNING_LEVEL.data_processing_agreement,
    defaultDurationMonths: null,
    checklist: [
      'Specificera vilka personuppgifter som behandlas',
      'Definiera ändamål och behandlingens natur',
      'Inkludera tekniska och organisatoriska säkerhetsåtgärder',
      'Reglera underbiträden och deras godkännande',
      'Inkludera standardavtalsklausuler (SCCs) vid tredjelandsöverföringar',
      'Definiera rutiner för personuppgiftsincidenter',
    ],
  },
  {
    type: 'board_resolution',
    label: DOC_TYPE_LABELS.board_resolution,
    description:
      'Formellt styrelsebeslut dokumenterat som protokoll. Används vid bolagsbildning, namnbyten, kapitalanskaffning, bemyndiganden och andra bolagsrättsliga åtgärder.',
    partyALabel: 'Bolag (Styrelse)',
    partyBLabel: 'Bolag (Styrelse)',
    defaultSigningLevel: DOC_TYPE_SIGNING_LEVEL.board_resolution,
    defaultDurationMonths: null,
    checklist: [
      'Ange datum, plats och deltagare',
      'Dokumentera beslutet klart och entydigt',
      'Inkludera eventuella bilagor (avtal, beräkningar)',
      'Alla styrelseledamöter skriver under',
      'Arkiveras i bolagets protokollpärm',
    ],
  },
  {
    type: 'founder_agreement',
    label: DOC_TYPE_LABELS.founder_agreement,
    description:
      'Grundaravtal som reglerar grundarnas inbördes förhållande, ägarandelar, rollfördelning, vesting-schema och vad som händer om en grundare lämnar bolaget.',
    partyALabel: 'Grundare A',
    partyBLabel: 'Grundare B / Bolag',
    defaultSigningLevel: DOC_TYPE_SIGNING_LEVEL.founder_agreement,
    defaultDurationMonths: null,
    checklist: [
      'Ange varje grundares ägarandel',
      'Definiera rollfördelning och beslutanderätt',
      'Specificera vesting-schema (typiskt 4 år, 1-årig cliff)',
      'Reglera "bad leaver" och "good leaver"-scenarier',
      'Inkludera non-compete och IP-överlåtelse',
      'Definiera dispute resolution-mekanism',
    ],
  },
  {
    type: 'option_agreement',
    label: DOC_TYPE_LABELS.option_agreement,
    description:
      'Optionsavtal (ESOP) som ger anställda och nyckelpersoner rätt att köpa aktier till förutbestämt pris. Inkluderar optionspool, vesting och utlösandevillkor.',
    partyALabel: 'Bolag (Optionsutgivare)',
    partyBLabel: 'Optionsinnehavare (Person)',
    defaultSigningLevel: DOC_TYPE_SIGNING_LEVEL.option_agreement,
    defaultDurationMonths: 48,
    checklist: [
      'Definiera total optionspool (% av fullt utspädd kapitalbas)',
      'Ange lösenpris (strike price)',
      'Specificera vesting-schema och cliff',
      'Reglera vad som händer vid exit (M&A, IPO)',
      'Inkludera "good leaver" / "bad leaver"-definitioner',
      'Klargör skattemässig behandling (QESO i Sverige)',
    ],
  },
  {
    type: 'consulting_agreement',
    label: DOC_TYPE_LABELS.consulting_agreement,
    description:
      'Konsultavtal för externa uppdragstagare (revisorer, advokater, specialister). Reglerar uppdrag, ersättning, leveranser och immateriella rättigheter.',
    partyALabel: 'Uppdragsgivare (Bolag)',
    partyBLabel: 'Konsult / Byrå',
    defaultSigningLevel: DOC_TYPE_SIGNING_LEVEL.consulting_agreement,
    defaultDurationMonths: 12,
    checklist: [
      'Specificera uppdragets omfattning (SOW)',
      'Ange arvode (fast, löpande, milstolpebaserat)',
      'Inkludera sekretessåtagande',
      'Reglera IP-äganderätt till leverabler',
      'Definiera uppsägningstid',
      'Inkludera ansvarsbegränsning',
    ],
  },
  {
    type: 'vendor_contract',
    label: DOC_TYPE_LABELS.vendor_contract,
    description:
      'Leverantörsavtal för inköp av varor eller tjänster från externa leverantörer. Inkluderar pris, leveransvillkor, garantier och reklamationsrätt.',
    partyALabel: 'Köpare (Bolag)',
    partyBLabel: 'Leverantör',
    defaultSigningLevel: DOC_TYPE_SIGNING_LEVEL.vendor_contract,
    defaultDurationMonths: 12,
    checklist: [
      'Specificera varor/tjänster och volym',
      'Ange pris, betalningsvillkor och valuta',
      'Definiera leveransvillkor (Incoterms om tillämpligt)',
      'Inkludera garantier och reklamationsrätt',
      'Reglera force majeure',
      'Inkludera dataskyddsklausul om personuppgifter hanteras',
    ],
  },
  {
    type: 'gdpr_policy',
    label: DOC_TYPE_LABELS.gdpr_policy,
    description:
      'Integritetspolicy (Privacy Policy) riktad till slutanvändare. Beskriver vilka personuppgifter som samlas in, varför, hur länge de sparas och användarens rättigheter.',
    partyALabel: 'Personuppgiftsansvarig (Bolag)',
    partyBLabel: 'Slutanvändare',
    defaultSigningLevel: DOC_TYPE_SIGNING_LEVEL.gdpr_policy,
    defaultDurationMonths: null,
    checklist: [
      'Lista alla kategorier av personuppgifter som samlas in',
      'Ange rättslig grund för varje behandling (samtycke, avtal, etc.)',
      'Specificera lagringstid per kategori',
      'Inkludera användarens rättigheter (tillgång, radering, portabilitet)',
      'Ange kontaktuppgifter till DPO eller ansvarig',
      'Inkludera cookiepolicy',
    ],
  },
  {
    type: 'terms_of_service',
    label: DOC_TYPE_LABELS.terms_of_service,
    description:
      'Användarvillkor för plattform eller tjänst. Reglerar acceptabelt användande, ansvarsbegränsningar, betalningsvillkor och tvistelösning.',
    partyALabel: 'Tjänsteleverantör (Bolag)',
    partyBLabel: 'Användare',
    defaultSigningLevel: DOC_TYPE_SIGNING_LEVEL.terms_of_service,
    defaultDurationMonths: null,
    checklist: [
      'Definiera tjänstens syfte och tillgänglighet',
      'Reglera acceptabelt användande (AUP)',
      'Specificera betalningsvillkor och återbetalningspolicy',
      'Inkludera ansvarsbegränsning',
      'Definiera rutiner för kontostängning',
      'Ange tillämplig lag och jurisdiktion',
    ],
  },
  {
    type: 'investment_agreement',
    label: DOC_TYPE_LABELS.investment_agreement,
    description:
      'Investeringsavtal (term sheet → SAFT/SAFE/aktieteckning) som reglerar villkor för extern investering i bolaget. Inkluderar värdering, antal aktier och investerarens rättigheter.',
    partyALabel: 'Bolag',
    partyBLabel: 'Investerare',
    defaultSigningLevel: DOC_TYPE_SIGNING_LEVEL.investment_agreement,
    defaultDurationMonths: null,
    checklist: [
      'Ange pre-money-värdering och investeringsbelopp',
      'Specificera antal nya aktier och ägarandel post-money',
      'Inkludera anti-dilution-skydd (weighted average eller full ratchet)',
      'Definiera informationsrättigheter och styrelserepresentation',
      'Reglera likvidationspreferens',
      'Inkludera drag-along och tag-along-rättigheter',
    ],
  },
]

/** Hämta mall för given dokumenttyp */
export function getTemplate(type: LegalDocType): DocumentTemplate | undefined {
  return DOCUMENT_TEMPLATES.find(t => t.type === type)
}
