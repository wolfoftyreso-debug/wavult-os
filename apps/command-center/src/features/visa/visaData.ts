/**
 * visaData.ts — behåller bara typdefinitioner (re-export från visaTypes)
 *
 * Hårdkodad data har tagits bort. All data hämtas nu live via useVisaData().
 * Se: features/visa/useVisaData.ts
 */

export type {
  VisaApplication,
  VisaStep,
  VisaDocument,
  VisaStatus,
  DocStatus,
} from './visaTypes'
