import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import WorkspaceSidebar from './components/WorkspaceSidebar'

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { workspaceId: string }
}) {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth/login')

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('id', params.workspaceId)
    .single()

  return (
    <div className="flex min-h-screen" style={{ background: '#F8F9FA' }}>
      <WorkspaceSidebar
        workspaceId={params.workspaceId}
        workspaceName={workspace?.name ?? 'Działki'}
      />
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  )
}
