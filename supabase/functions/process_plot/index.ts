// ===========================================
// DecisionEngine — Edge Function: process_plot
// Triggered after a plot is saved to run AI extraction
// ===========================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.24.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { plot_id } = await req.json() as { plot_id: string }

    if (!plot_id) {
      return new Response(JSON.stringify({ error: 'plot_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
    })

    // 1. Fetch plot + source
    const { data: plot, error: plotErr } = await supabase
      .from('plots')
      .select('*, plot_sources(*)')
      .eq('id', plot_id)
      .single()

    if (plotErr || !plot) {
      return new Response(JSON.stringify({ error: 'Plot not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const source = plot.plot_sources?.[0]
    const rawText = [
      plot.title,
      plot.description,
      source?.raw_text,
      source?.fb_author ? `Sprzedający: ${source.fb_author}` : null,
      source?.fb_group_name ? `Grupa: ${source.fb_group_name}` : null,
    ].filter(Boolean).join('\n\n')

    // 2. EXTRACT_LISTING prompt
    const extractionResult = await runExtraction(anthropic, {
      sourceUrl: plot.source_url ?? '',
      sourceType: plot.source_type ?? 'other',
      rawText,
      todayDate: new Date().toISOString().split('T')[0],
    })

    // 3. FLAG_RISKS prompt
    const risksResult = await runFlagRisks(anthropic, extractionResult)

    // 4. Upsert AI report
    await supabase.from('plot_ai_reports').upsert({
      plot_id,
      workspace_id: plot.workspace_id,
      extraction_json: extractionResult,
      risk_flags_json: risksResult,
      extraction_confidence: (extractionResult as Record<string, number>)?.confidence_overall ?? null,
      model_used: 'claude-sonnet-4-5',
      processed_at: new Date().toISOString(),
    }, { onConflict: 'plot_id' })

    // 5. Update plot with extracted fields (only if null)
    const updates: Record<string, unknown> = {
      ai_processed_at: new Date().toISOString(),
    }
    const ext = extractionResult as Record<string, unknown>
    if (!plot.title && ext.title) updates.title = ext.title
    if (!plot.asking_price_pln && ext.asking_price_pln) updates.asking_price_pln = ext.asking_price_pln
    if (!plot.area_m2 && ext.area_m2) updates.area_m2 = ext.area_m2
    if (!plot.location_text && ext.location_text) updates.location_text = ext.location_text
    if (!plot.parcel_id && ext.parcel_id) updates.parcel_id = ext.parcel_id
    if (ext.utilities) {
      const u = ext.utilities as Record<string, boolean>
      if (plot.has_electricity === null && u.electricity !== null) updates.has_electricity = u.electricity
      if (plot.has_water === null && u.water !== null) updates.has_water = u.water
      if (plot.has_sewage === null && u.sewage !== null) updates.has_sewage = u.sewage
      if (plot.has_gas === null && u.gas !== null) updates.has_gas = u.gas
    }
    if (plot.has_road_access === null && ext.road_access !== null) updates.has_road_access = ext.road_access
    if (!plot.zoning && ext.zoning) updates.zoning = ext.zoning

    if (Object.keys(updates).length > 1) {
      await supabase.from('plots').update(updates).eq('id', plot_id)
    }

    // 6. Auto-advance status from inbox → draft
    if (plot.status === 'inbox') {
      await supabase.from('plots').update({ status: 'draft' }).eq('id', plot_id)
    }

    // 7. Log activity
    await supabase.rpc('log_plot_activity', {
      p_workspace_id: plot.workspace_id,
      p_plot_id: plot_id,
      p_user_id: null,
      p_action: 'ai_processed',
      p_metadata: { model: 'claude-sonnet-4-5', confidence: (extractionResult as Record<string, number>)?.confidence_overall },
    })

    return new Response(
      JSON.stringify({ success: true, plot_id, ai_processed: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('process_plot error:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

// ─── AI helpers ──────────────────────────────────────────────────────────────

async function runExtraction(
  anthropic: Anthropic,
  params: { sourceUrl: string; sourceType: string; rawText: string; todayDate: string }
): Promise<unknown> {
  const system = `You are a strict information extraction engine for land plot listings in Poland.
Return ONLY valid JSON. No prose, no markdown. Language: respond in Polish for human-readable fields.
Today's date: ${params.todayDate}`

  const user = `Extract structured listing data:
- source_url: ${params.sourceUrl}
- source_type: ${params.sourceType}
- raw_text: ${params.rawText || '(empty)'}

Return JSON with: title, asking_price_pln, area_m2, price_per_m2_pln, location_text, parcel_id, address_freeform, description, contact_phone, contact_name, contact_type ("owner"|"agent"|"unknown"), utilities {electricity,water,sewage,gas,fiber}, road_access, zoning, facts[], inferences[], missing_fields[], confidence_overall (0-1), field_confidence {field: {value, confidence, evidence}}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    temperature: 0.1,
    system,
    messages: [{ role: 'user', content: user }],
  })

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')

  // Strip markdown code blocks if any
  const clean = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
  return JSON.parse(clean)
}

async function runFlagRisks(anthropic: Anthropic, extraction: unknown): Promise<unknown> {
  const system = `You identify risk signals for buying a building plot in Poland.
Output JSON only. No prose. All labels and rationale in Polish.`

  const user = `Identify risks for this plot:
${JSON.stringify(extraction)}

Return JSON: { risk_flags: [{type, severity ("low"|"med"|"high"), label, rationale, confidence, evidence, is_inference}], deal_breakers: [{key, label, triggered, rationale}], missing_due_diligence: [{item, priority ("must"|"should"|"nice")}], recommended_next_actions: [{action, reason}], confidence_overall, analysis_notes }`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    temperature: 0.1,
    system,
    messages: [{ role: 'user', content: user }],
  })

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
  const clean = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
  return JSON.parse(clean)
}
