import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import DashboardView from './components/DashboardView'

export default async function WorkspaceDashboard({
  params,
}: {
  params: { workspaceId: string }
}) {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth/login')

  // Fetch recent plots + scores (last 20 for dashboard)
  const { data: plots } = await supabase
    .from('plots')
    .select('id, title, location_text, asking_price_pln, area_m2, status, source_type, created_at, ai_processed_at, lat, lng, plot_scores(verdict, score_shared, dealbreaker_triggered)')
    .eq('workspace_id', params.workspaceId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <DashboardView
      plots={plots ?? []}
      workspaceId={params.workspaceId}
    />
  )
}
