import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import ShortlistView from './ShortlistView'

export default async function ShortlistPage({ params }: { params: { workspaceId: string } }) {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth/login')

  const { data: plots } = await supabase
    .from('plots')
    .select('*, plot_scores(*)')
    .eq('workspace_id', params.workspaceId)
    .eq('is_deleted', false)
    .in('status', ['shortlist', 'top3', 'due_diligence'])
    .order('updated_at', { ascending: false })

  return <ShortlistView plots={plots ?? []} workspaceId={params.workspaceId} />
}
