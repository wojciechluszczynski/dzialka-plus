import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function AppPage() {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/auth/login')

  // Check for existing workspace
  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', session.user.id)
    .limit(1)
    .single()

  if (member) {
    redirect(`/app/workspace/${member.workspace_id}/plots`)
  }

  // Auto-create workspace for shared account — no setup screen
  const { data: ws } = await supabase
    .rpc('create_workspace_for_user', { workspace_name: 'Działki Wojtek & Sabina' })

  const wsData = ws as { id: string } | null
  if (wsData?.id) {
    redirect(`/app/workspace/${wsData.id}/plots`)
  }

  // Fallback — should not happen
  redirect('/auth/login')
}
