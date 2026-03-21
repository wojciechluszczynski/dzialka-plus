import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const MODEL = 'claude-sonnet-4-5'
const MAX_TOKENS = 4096

async function callClaude(system: string, user: string): Promise<unknown> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  let lastErr: Error | null = null
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: 0.1,
        system,
        messages: [{ role: 'user', content: user }],
      })
      const text = res.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')
      return JSON.parse(text)
    } catch (err) {
      lastErr = err as Error
      if (err instanceof SyntaxError) continue
      throw err
    }
  }
  throw new Error(`AI call failed: ${lastErr?.message}`)
}

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body = await req.json() as any
  const plot_id: string = body.plot_id
  const force_refresh: boolean = body.force_refresh ?? false
  if (!plot_id) return NextResponse.json({ error: 'plot_id required' }, { status: 400 })

  // Verify access via workspace membership
  const { data: plotRow, error: plotErr } = await supabase
    .from('plots')
    .select('id, title, description, asking_price_pln, area_m2, location_text, source_url, status, workspace_id')
    .eq('id', plot_id)
    .single()

  if (plotErr || !plotRow) {
    return NextResponse.json({ error: 'Plot not found' }, { status: 403 })
  }

  // Check workspace membership
  const { data: member } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', (plotRow as Record<string, unknown>).workspace_id as string)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plot = plotRow as any

  // Check for cached report (< 24h) unless force refresh
  if (!force_refresh) {
    const { data: existing } = await supabase
      .from('plot_ai_reports')
      .select('*')
      .eq('plot_id', plot_id)
      .order('processed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ageMs = Date.now() - new Date((existing as any).processed_at).getTime()
      if (ageMs < 24 * 60 * 60 * 1000) {
        return NextResponse.json({ report: existing, cached: true })
      }
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const rawText = [
    plot.title && `Tytu\u0142: ${plot.title}`,
    plot.description && `Opis: ${plot.description}`,
    plot.asking_price_pln && `Cena: ${plot.asking_price_pln} z\u0142`,
    plot.area_m2 && `Powierzchnia: ${plot.area_m2} m\u00b2`,
    plot.location_text && `Lokalizacja: ${plot.location_text}`,
    plot.source_url && `\u0179r\u00f3d\u0142o: ${plot.source_url}`,
  ].filter(Boolean).join('\n')

  try {
    // Step 1: Extract listing data
    const extraction = await callClaude(
      `You are a strict information extraction engine for land plot listings in Poland. Return ONLY valid JSON. Today: ${today}`,
      `Extract structured listing data. source_url: ${plot.source_url || ''}, raw_text: ${rawText}

Return JSON: { title, asking_price_pln, area_m2, price_per_m2_pln, location_text, parcel_id, address_freeform, description, contact_phone, contact_name, contact_type ("owner"|"agent"|"unknown"|null), utilities: {electricity,water,sewage,gas,fiber}, road_access, zoning, facts, inferences, missing_fields, confidence_overall, field_confidence }`
    ) as Record<string, unknown>

    // Step 2: Flag risks
    const riskFlags = await callClaude(
      'You identify risk signals for building plots in Poland. Respond in Polish. Output JSON only.',
      `Analyze risks for: ${JSON.stringify(extraction)}

Return JSON: { risk_flags (each: {type,severity:"low"|"med"|"high",label,rationale,confidence,evidence,is_inference}), deal_breakers (each: {key,label,triggered,rationale}), missing_due_diligence (each: {item,priority:"must"|"should"|"nice"}), recommended_next_actions (each: {action,reason}), confidence_overall, analysis_notes }`
    ) as Record<string, unknown>

    // Step 3: Valuation note
    const valuation = await callClaude(
      'You are a conservative real estate valuation assistant for building plots in Poland. Respond in Polish. Output JSON only.',
      `Valuation for: asking_price=${plot.asking_price_pln}, area=${plot.area_m2}m2, location=${plot.location_text}

Return JSON: { price_per_m2_asking, price_position ("cheap"|"fair"|"expensive"|"unknown"), price_position_label, percentile_estimate, explanation, confidence, data_quality ("good"|"limited"|"none"), rcn_summary, what_data_would_change_this, caveats }`
    ) as Record<string, unknown>

    // Step 4: Generate questions
    const questions = await callClaude(
      'Generate a structured question list in Polish for buying a building plot. Output JSON only.',
      `Generate questions based on: ${JSON.stringify({ extraction, risk_flags: riskFlags })}

Return JSON: { must_ask_before_contact (8-12: {question,context,risk_key}), negotiation_questions (4-6: {question,goal}), on_site_checklist (8-12: {item,category,how_to_verify}), red_flags_to_watch (3-5 strings), total_count }`
    ) as Record<string, unknown>

    const confidence = typeof extraction.confidence_overall === 'number'
      ? extraction.confidence_overall : 0.5

    const { data: report, error: upsertErr } = await supabase
      .from('plot_ai_reports')
      .upsert({
        plot_id,
        workspace_id: plot.workspace_id,
        extraction_json: extraction,
        risk_flags_json: riskFlags,
        valuation_json: valuation,
        questions_json: questions,
        extraction_confidence: confidence,
        model_used: MODEL,
        processed_at: new Date().toISOString(),
      }, { onConflict: 'plot_id' })
      .select()
      .single()

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 })
    }

    return NextResponse.json({ report, cached: false })
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
