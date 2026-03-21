import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const maxDuration = 15

interface ExpoPushMessage {
  to: string
  title: string
  body: string
  data?: Record<string, unknown>
  sound?: 'default'
  badge?: number
}

async function sendExpoPush(messages: ExpoPushMessage[]) {
  if (messages.length === 0) return
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
    body: JSON.stringify(messages),
  })
  return res.json()
}

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body = await req.json() as any
  const workspace_id: string = body.workspace_id
  const title: string = body.title
  const message: string = body.body
  const data: Record<string, unknown> = body.data ?? {}
  // If exclude_self=true (default), skip tokens belonging to the sending user
  const exclude_self: boolean = body.exclude_self ?? true

  if (!workspace_id || !title || !message) {
    return NextResponse.json({ error: 'workspace_id, title, body required' }, { status: 400 })
  }

  // Verify sender is workspace member
  const { data: member } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspace_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  // Fetch push tokens for workspace (optionally excluding sender)
  let query = supabase
    .from('push_tokens')
    .select('expo_push_token, user_id')
    .eq('workspace_id', workspace_id)

  if (exclude_self) {
    query = query.neq('user_id', user.id)
  }

  const { data: tokens } = await query
  if (!tokens || tokens.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  // Deduplicate tokens (Array.from avoids downlevelIteration requirement)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uniqueTokens = Array.from(new Set((tokens as any[]).map(t => t.expo_push_token as string)))

  const messages: ExpoPushMessage[] = uniqueTokens.map(token => ({
    to: token,
    title,
    body: message,
    sound: 'default' as const,
    data,
  }))

  const expoResult = await sendExpoPush(messages)

  return NextResponse.json({ ok: true, sent: messages.length, expoResult })
}
