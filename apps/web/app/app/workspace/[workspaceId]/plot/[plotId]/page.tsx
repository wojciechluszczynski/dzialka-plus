import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import PlotDetailView from './PlotDetailView'

export default async function PlotDetailPage({
  params,
}: {
  params: { workspaceId: string; plotId: string }
}) {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth/login')

  const { data: plot } = await supabase
    .from('plots')
    .select('*, plot_scores(*), plot_ai_reports(*), plot_notes(*)')
    .eq('id', params.plotId)
    .eq('workspace_id', params.workspaceId)
    .single()

  if (!plot) notFound()

  return (
    <PlotDetailView
      plot={plot}
      workspaceId={params.workspaceId}
    />
  )
}
