// Registry av saker Bernt kan göra i systemet
// Anropas av Bernt-backend när den bestämmer sig för en action

export const BERNT_CAPABILITIES = {
  // Finance
  'finance.create_invoice': 'Skapa faktura',
  'finance.view_cashflow': 'Visa kassaflöde',

  // Corporate
  'corporate.create_board_meeting': 'Skapa styrelsemöte',
  'corporate.view_compliance': 'Visa compliance-status',

  // CRM
  'crm.create_contact': 'Skapa kontakt',
  'crm.create_deal': 'Skapa affär',
  'crm.update_deal_status': 'Uppdatera affärsstatus',

  // Git
  'git.archive_repo': 'Arkivera repo',
  'git.view_repos': 'Visa repos',

  // Navigation
  navigate: 'Navigera i systemet',

  // Communication
  send_email: 'Skicka e-post',
  send_sms: 'Skicka SMS',
} as const

export type BerntCapabilityKey = keyof typeof BERNT_CAPABILITIES
