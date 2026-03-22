import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import CompareView from './CompareView'

export default async function ComparePage({
  params,
  searchParams,
}: {
  params: { workspaceId: string }
  searchParams: { ids?: string }
}) {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth/login')

  const ids = searchParams.ids?.split(',').filter(Boolean) ?? []

  // If specific IDs provided, fetch those; otherwise fetch shortlist/top3
  let query = supabase
    .from('plots')
    .select('*, plot_scores(*)')
    .eq('workspace_id', params.workspaceId)
    .eq('is_deleted', false)

  if (ids.length > 0) {
    query = query.in('id', ids.slice(0, 5))
  } else {
    query = query.in('status', ['shortlist', 'top3', 'due_diligence']).order('updated_at', { ascending: false }).limit(5)
  }

  const { data: plots } = await query

  return <CompareView plots={plots ?? []} workspaceId={params.workspaceId} />
}
