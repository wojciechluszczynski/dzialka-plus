// No SSR data fetch — PlotDetailView fetches client-side for instant render
import PlotDetailView from './PlotDetailView'

export default function PlotDetailPage({
  params,
}: {
  params: { workspaceId: string; plotId: string }
}) {
  return (
    <PlotDetailView
      plotId={params.plotId}
      workspaceId={params.workspaceId}
    />
  )
}
