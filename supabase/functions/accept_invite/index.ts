// ===========================================
// DecisionEngine — Edge Function: accept_invite
// Called by invited user to join workspace
// ===========================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { invite_token } = await req.json() as { invite_token: string }
    if (!invite_token) {
      return new Response(JSON.stringify({ error: 'invite_token required' }), {
        status: 400,
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
      return new Response(JSON.stringify({ error: 'Invalid auth token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Find valid invite
    const { data: invite, error: inviteErr } = await supabase
      .from('workspace_invites')
      .select('*')
      .eq('invite_token', invite_token)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (inviteErr || !invite) {
      return new Response(JSON.stringify({ error: 'Zaproszenie jest nieprawidłowe lub wygasło' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', invite.workspace_id)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      return new Response(JSON.stringify({ error: 'Jesteś już członkiem tego workspace' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Add as editor
    const { error: memberErr } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: invite.workspace_id,
        user_id: user.id,
        role: 'editor',
      })

    if (memberErr) throw memberErr

    // Mark invite as used
    await supabase
      .from('workspace_invites')
      .update({ used_at: new Date().toISOString(), used_by: user.id })
      .eq('id', invite.id)

    // Log activity
    await supabase.rpc('log_plot_activity', {
      p_workspace_id: invite.workspace_id,
      p_plot_id: null,
      p_user_id: user.id,
      p_action: 'member_joined',
      p_metadata: { role: 'editor', invited_by: invite.invited_by },
    })

    // Return workspace info
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, name')
      .eq('id', invite.workspace_id)
      .single()

    return new Response(
      JSON.stringify({ success: true, workspace }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('accept_invite error:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
