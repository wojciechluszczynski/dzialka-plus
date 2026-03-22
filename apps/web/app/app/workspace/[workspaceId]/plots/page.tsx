// No server-side data fetch — PlotsTableView fetches client-side
import PlotsTableView from '../components/PlotsTableView'

export default function PlotsPage({
  params,
}: {
  params: { workspaceId: string }
}) {
  return <PlotsTableView workspaceId={params.workspaceId} />
}
