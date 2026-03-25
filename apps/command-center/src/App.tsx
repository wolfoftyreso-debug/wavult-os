import { Routes, Route, Navigate } from 'react-router-dom'
import { RoleProvider, useRole } from './shared/auth/RoleContext'
import { RoleLogin } from './shared/auth/RoleLogin'
import { Shell } from './shared/layout/Shell'
import { CommandDashboard } from './features/dashboard/CommandDashboard'
import { TransactionFeed } from './features/transactions/TransactionFeed'
import { ProjectsView } from './features/projects/ProjectsView'
import { PeopleView } from './features/people/PeopleView'
import { TasksView } from './features/tasks/TasksView'

function AuthenticatedApp() {
  const { role } = useRole()

  if (!role) return <RoleLogin />

  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<CommandDashboard />} />
        <Route path="/projects" element={<ProjectsView />} />
        <Route path="/tasks" element={<TasksView />} />
        <Route path="/people" element={<PeopleView />} />
        <Route path="/transactions" element={<TransactionFeed />} />
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
