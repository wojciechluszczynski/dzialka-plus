// No server-side data fetch — DashboardView fetches client-side for instant skeleton render
import DashboardView from './components/DashboardView'

export default function WorkspaceDashboard({
  params,
}: {
  params: { workspaceId: string }
}) {
  return <DashboardView workspaceId={params.workspaceId} />
}
