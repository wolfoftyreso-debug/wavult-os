// ─── Wavult OS v2 — Application Root ───────────────────────────────────────────
// Provider hierarchy: Role → EntityScope → Operator → Events → Shell

import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { RoleProvider, useRole } from './shared/auth/RoleContext'
import { EntityScopeProvider } from './shared/scope/EntityScopeContext'
import { OperatorProvider } from './core/operator/OperatorContext'
import { EventProvider } from './core/events/EventContext'
import { RoleLogin } from './shared/auth/RoleLogin'
import { ShellWithGuidance as Shell } from './shared/layout/Shell'
import { RoleDashboard } from './features/dashboard/RoleDashboard'

// ─── Lazy-loaded feature routes ────────────────────────────────────────────────
const TransactionFeed        = lazy(() => import('./features/transactions/TransactionFeed').then(m => ({ default: m.TransactionFeed })))
const ProjectsView           = lazy(() => import('./features/projects/ProjectsView').then(m => ({ default: m.ProjectsView })))
const PeopleView             = lazy(() => import('./features/people/PeopleView').then(m => ({ default: m.PeopleView })))
const TasksView              = lazy(() => import('./features/tasks/TasksView').then(m => ({ default: m.TasksView })))
const OrgGraph               = lazy(() => import('./features/org-graph/OrgGraph').then(m => ({ default: m.OrgGraph })))
const ContextView            = lazy(() => import('./features/org-graph/ContextView').then(m => ({ default: m.ContextView })))
const CommandHierarchyView   = lazy(() => import('./features/org-graph/CommandHierarchyView').then(m => ({ default: m.CommandHierarchyView })))
const EntityView             = lazy(() => import('./features/entity/EntityView').then(m => ({ default: m.EntityView })))
const IncidentCenter         = lazy(() => import('./features/incidents/IncidentCenter').then(m => ({ default: m.IncidentCenter })))
const MarketMap              = lazy(() => import('./features/market-sites').then(m => ({ default: m.MarketMap })))
const CampaignOS             = lazy(() => import('./features/campaign-os').then(m => ({ default: m.CampaignOS })))
const LegalHub               = lazy(() => import('./features/legal/LegalHub').then(m => ({ default: m.LegalHub })))
const SubmissionsView        = lazy(() => import('./features/submissions/SubmissionsView').then(m => ({ default: m.SubmissionsView })))
const CompanyLaunchView      = lazy(() => import('./features/company-launch/CompanyLaunchView').then(m => ({ default: m.CompanyLaunchView })))
const PayrollHub             = lazy(() => import('./features/payroll').then(m => ({ default: m.PayrollHub })))
const CRMHub                 = lazy(() => import('./features/crm').then(m => ({ default: m.CRMHub })))
const FinanceHub             = lazy(() => import('./features/finance').then(m => ({ default: m.FinanceHub })))
const CorporateHub           = lazy(() => import('./features/corporate').then(m => ({ default: m.CorporateHub })))
const MilestonesHub          = lazy(() => import('./features/milestones').then(m => ({ default: m.MilestonesHub })))
const SettingsHub            = lazy(() => import('./features/settings/SettingsHub').then(m => ({ default: m.SettingsHub })))
const ProcurementHub         = lazy(() => import('./features/procurement/ProcurementHub').then(m => ({ default: m.ProcurementHub })))
const CommHub                = lazy(() => import('./features/communications/CommHub').then(m => ({ default: m.CommHub })))
const ReportsHub             = lazy(() => import('./features/reports/ReportsHub').then(m => ({ default: m.ReportsHub })))
const MediaHub               = lazy(() => import('./features/media/MediaHub').then(m => ({ default: m.MediaHub })))
const SystemStatusView       = lazy(() => import('./features/system-status/SystemStatusView').then(m => ({ default: m.SystemStatusView })))
const KnowledgeHub           = lazy(() => import('./features/knowledge').then(m => ({ default: m.KnowledgeHub })))
const PeopleIntelligenceHub  = lazy(() => import('./features/people-intelligence/PeopleIntelligenceHub').then(m => ({ default: m.PeopleIntelligenceHub })))
const SystemIntelligenceHub  = lazy(() => import('./features/system-intelligence/SystemIntelligenceHub').then(m => ({ default: m.SystemIntelligenceHub })))
const TalentRadar            = lazy(() => import('./features/talent-radar').then(m => ({ default: m.TalentRadar })))
const StrategicBrief         = lazy(() => import('./features/dashboard/StrategicBrief').then(m => ({ default: m.StrategicBrief })))
const APIHub                 = lazy(() => import('./features/api-hub/APIHub').then(m => ({ default: m.APIHub })))
const LLMHub                 = lazy(() => import('./features/llm-hub/LLMHub').then(m => ({ default: m.LLMHub })))
const WHOOPTeamDashboard     = lazy(() => import('./features/whoop/WHOOPTeamDashboard').then(m => ({ default: m.WHOOPTeamDashboard })))
const InsuranceHub           = lazy(() => import('./features/insurance/InsuranceHub').then(m => ({ default: m.InsuranceHub })))
const TeamMap                = lazy(() => import('./features/team-map/TeamMap').then(m => ({ default: m.TeamMap })))

// ─── Page loader fallback ───────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex h-full min-h-[200px] w-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-600 border-t-zinc-300" />
    </div>
  )
}

function AuthenticatedApp() {
  const { role } = useRole()

  if (!role) return <RoleLogin />

  return (
    <OperatorProvider>
      <EventProvider>
        <Shell>
          <Suspense fallback={<PageLoader />}>
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
              <Route path="/finance" element={<FinanceHub />} />
              <Route path="/crm" element={<CRMHub />} />
              <Route path="/payroll" element={<PayrollHub />} />
              <Route path="/procurement" element={<ProcurementHub />} />
              <Route path="/milestones" element={<MilestonesHub />} />
              <Route path="/settings" element={<SettingsHub />} />
              <Route path="/corporate" element={<CorporateHub />} />
              <Route path="/reports" element={<ReportsHub />} />
              <Route path="/communications" element={<CommHub />} />
              <Route path="/media" element={<MediaHub />} />
              <Route path="/system-status" element={<SystemStatusView />} />
              <Route path="/knowledge" element={<KnowledgeHub />} />
              <Route path="/people-intelligence" element={<PeopleIntelligenceHub />} />
              <Route path="/system-intelligence" element={<SystemIntelligenceHub />} />
              <Route path="/talent-radar" element={<TalentRadar />} />
              <Route path="/strategic-brief" element={<StrategicBrief />} />
              <Route path="/api-hub" element={<APIHub />} />
              <Route path="/llm-hub" element={<LLMHub />} />
              <Route path="/whoop" element={<WHOOPTeamDashboard />} />
              <Route path="/insurance" element={<InsuranceHub />} />
              <Route path="/team-map" element={<TeamMap />} />
            </Routes>
          </Suspense>
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
