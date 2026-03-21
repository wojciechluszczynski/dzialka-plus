import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body = await req.json() as any
  const expo_push_token: string = body.expo_push_token
  const workspace_id: string = body.workspace_id
  const device_name: string | null = body.device_name ?? null

  if (!expo_push_token || !workspace_id) {
    return NextResponse.json({ error: 'expo_push_token and workspace_id required' }, { status: 400 })
  }

  // Upsert token (user+token is unique)
  const { error } = await supabase
    .from('push_tokens')
    .upsert(
      {
        user_id: user.id,
        workspace_id,
        expo_push_token,
        device_name,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,expo_push_token' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
