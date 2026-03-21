import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import PlotsTableView from '../components/PlotsTableView'

export default async function PlotsPage({
  params,
}: {
  params: { workspaceId: string }
}) {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth/login')

  const { data: plots } = await supabase
    .from('plots')
    .select('*, plot_scores(*)')
    .eq('workspace_id', params.workspaceId)
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false })
    .limit(100)

  return <PlotsTableView plots={plots ?? []} workspaceId={params.workspaceId} />
}
