// ─── Wavult OS v2 — Application Root ───────────────────────────────────────────
// Provider hierarchy: Role → EntityScope → Operator → Events → Shell

import { Routes, Route, Navigate } from 'react-router-dom'
import { RoleProvider, useRole } from './shared/auth/RoleContext'
import { EntityScopeProvider } from './shared/scope/EntityScopeContext'
import { OperatorProvider } from './core/operator/OperatorContext'
import { EventProvider } from './core/events/EventContext'
import { RoleLogin } from './shared/auth/RoleLogin'
import { Shell } from './shared/layout/Shell'
import { RoleDashboard } from './features/dashboard/RoleDashboard'
import { TransactionFeed } from './features/transactions/TransactionFeed'
import { ProjectsView } from './features/projects/ProjectsView'
import { PeopleView } from './features/people/PeopleView'
import { TasksView } from './features/tasks/TasksView'
import { OrgGraph } from './features/org-graph/OrgGraph'
import { ContextView } from './features/org-graph/ContextView'
import { CommandHierarchyView } from './features/org-graph/CommandHierarchyView'
import { EntityView } from './features/entity/EntityView'
import { IncidentCenter } from './features/incidents/IncidentCenter'
import { MarketMap } from './features/market-sites'
import { CampaignOS } from './features/campaign-os'
import { LegalHub } from './features/legal/LegalHub'
import { SubmissionsView } from './features/submissions/SubmissionsView'
import { CompanyLaunchView } from './features/company-launch/CompanyLaunchView'

function AuthenticatedApp() {
  const { role } = useRole()

  if (!role) return <RoleLogin />

  return (
    <OperatorProvider>
      <EventProvider>
        <Shell>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<RoleDashboard />} />
            <Route path="/projects" element={<ProjectsView />} />
            <Route path="/tasks" element={<TasksView />} />
            <Route path="/people" element={<PeopleView />} />
            <Route path="/transactions" element={<TransactionFeed />} />
            <Route path="/org" element={<OrgGraph />} />
            <Route path="/org/context" element={<ContextView />} />
            <Route path="/org/command" element={<CommandHierarchyView />} />
            <Route path="/incidents" element={<IncidentCenter />} />
            <Route path="/entities" element={<EntityView />} />
            <Route path="/entities/:entityId" element={<EntityView />} />
            <Route path="/markets" element={<MarketMap />} />
            <Route path="/campaigns" element={<CampaignOS />} />
            <Route path="/submissions" element={<SubmissionsView />} />
            <Route path="/legal" element={<LegalHub />} />
            <Route path="/company-launch" element={<CompanyLaunchView />} />
          </Routes>
        </Shell>
      </EventProvider>
    </OperatorProvider>
  )
}

export default function App() {
  return (
    <RoleProvider>
      <EntityScopeProvider>
        <AuthenticatedApp />
      </EntityScopeProvider>
    </RoleProvider>
  )
}
