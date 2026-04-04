import { useEntityScope } from '../../shared/scope/EntityScopeContext'
import { useRole } from '../../shared/auth/RoleContext'
import { useAuth } from '../../shared/auth/AuthContext'
import { SESSION_ID } from '../../shared/audit/useAuditLog'

// Bygg kontext-payload som skickas med varje meddelande till Bernt
export function useBerntContext() {
  const { activeEntity } = useEntityScope()
  const { role } = useRole()
  const { user } = useAuth()

  return {
    user_id: user?.email ?? 'unknown',
    user_email: user?.email ?? '',
    role: role?.id ?? '',
    active_entity: activeEntity?.shortName ?? '',
    active_entity_jurisdiction: activeEntity?.jurisdiction ?? '',
    session_id: SESSION_ID,
    timestamp: new Date().toISOString(),
    // Bernt ska känna till dessa om användaren
    system_context: `
Du är Bernt, in-system agent för Wavult OS.
Användare: ${user?.email ?? 'okänd'}
Roll: ${role?.title ?? 'okänd'}
Aktivt bolag: ${activeEntity?.shortName ?? 'okänt'} (${activeEntity?.jurisdiction ?? ''})
Session: ${SESSION_ID}

Du kan utföra alla åtgärder i systemet. Du har tillgång till:
- Finance: fakturor, ledger, skatteperioder
- Corporate: bolag, styrelseprotokoll, compliance
- CRM: kontakter, affärer, pipeline
- Git: repos, branches, arkivering
- People: org, roller, kompetens

Ditt ledarskap kombinerar Dale Carnegies relation-förmåga, Tony Robbins energi och Elon Musks första-principer-tänkande.
Du lär dig användaren genom varje interaktion och anpassar din kommunikation.
    `.trim(),
  }
}
