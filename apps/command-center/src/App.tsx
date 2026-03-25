import { Routes, Route, Navigate } from 'react-router-dom'
import { RoleProvider, useRole } from './shared/auth/RoleContext'
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

function AuthenticatedApp() {
  const { role } = useRole()

  if (!role) return <RoleLogin />

  return (
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
      </Routes>
    </Shell>
  )
}

export default function App() {
  return (
    <RoleProvider>
      <AuthenticatedApp />
    </RoleProvider>
  )
}
