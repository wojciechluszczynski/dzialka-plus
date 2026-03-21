// ===========================================
// DecisionEngine — Edge Function: generate_invite
// Owner calls this to create a 7-day invite token
// ===========================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Auth: caller must be authenticated owner
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser()
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get workspace
    const { data: member, error: memberErr } = await supabase
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .limit(1)
      .single()

    if (memberErr || !member) {
      return new Response(JSON.stringify({ error: 'Only owners can generate invites' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Invalidate previous unused invites
    await supabase
      .from('workspace_invites')
      .update({ used_at: new Date().toISOString() })
      .eq('workspace_id', member.workspace_id)
      .is('used_at', null)

    // Generate new invite
    const token = generateToken()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: invite, error: inviteErr } = await supabase
      .from('workspace_invites')
      .insert({
        workspace_id: member.workspace_id,
        invite_token: token,
        invited_by: user.id,
        expires_at: expiresAt,
      })
      .select()
      .single()

    if (inviteErr) throw inviteErr

    const appUrl = Deno.env.get('APP_URL') ?? 'https://dzialkometr.netlify.app'
    const inviteUrl = `${appUrl}/invite/${token}`
    const deeplink = `decisionengine://invite/${token}`

    return new Response(
      JSON.stringify({
        token,
        invite_url: inviteUrl,
        deeplink,
        expires_at: expiresAt,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('generate_invite error:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
