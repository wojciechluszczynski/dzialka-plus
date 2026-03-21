import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import {
  callAI,
  buildExtractListingPrompt,
  buildFlagRisksPrompt,
  buildValuationNotePrompt,
  buildGenerateQuestionsPrompt,
} from '@de/ai'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { plot_id, force_refresh = false } = body
  if (!plot_id) return NextResponse.json({ error: 'plot_id required' }, { status: 400 })

  // Verify user has access via workspace membership
  const { data: plot, error: plotErr } = await supabase
    .from('plots')
    .select('*, workspace_members!inner(user_id)')
    .eq('id', plot_id)
    .eq('workspace_members.user_id', user.id)
    .single()

  if (plotErr || !plot) {
    return NextResponse.json({ error: 'Plot not found or access denied' }, { status: 403 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plotData = plot as any

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
      const ageMs = Date.now() - new Date(existing.processed_at).getTime()
      if (ageMs < 24 * 60 * 60 * 1000) {
        return NextResponse.json({ report: existing, cached: true })
      }
    }
  }

  const today = new Date().toISOString().slice(0, 10)

  // Build raw text from plot fields
  const rawText = [
    plotData.title && `Tytuł: ${plotData.title}`,
    plotData.description && `Opis: ${plotData.description}`,
    plotData.asking_price_pln && `Cena: ${plotData.asking_price_pln} zł`,
    plotData.area_m2 && `Powierzchnia: ${plotData.area_m2} m²`,
    plotData.location_text && `Lokalizacja: ${plotData.location_text}`,
    plotData.source_url && `Źródło: ${plotData.source_url}`,
  ].filter(Boolean).join('\n')

  try {
    // Step 1: Extract listing data
    const extractPrompt = buildExtractListingPrompt({
      sourceUrl: plotData.source_url || '',
      sourceType: 'listing',
      rawText,
      imageReferences: [],
      todayDate: today,
    })
    const extraction = await callAI(extractPrompt) as Record<string, unknown>

    // Step 2: Flag risks
    const riskPrompt = buildFlagRisksPrompt({
      extractionJson: JSON.stringify(extraction),
      enrichmentJson: null,
      userPreferences: JSON.stringify({
        min_area_m2: 1000,
        max_commute_km: 10,
        target_cities: ['Rzeszów', 'Krosno'],
        wants_view: true,
        wants_forest_nearby: true,
        wants_privacy: true,
      }),
    })
    const riskFlags = await callAI(riskPrompt) as Record<string, unknown>

    // Step 3: Valuation note
    const valPrompt = buildValuationNotePrompt({
      askingPricePln: plotData.asking_price_pln ?? null,
      areaM2: plotData.area_m2 ?? null,
      locationText: plotData.location_text || '',
      rcnStats: null,
      marketContext: null,
    })
    const valuation = await callAI(valPrompt) as Record<string, unknown>

    // Step 4: Generate questions
    const qPrompt = buildGenerateQuestionsPrompt({
      extractionJson: JSON.stringify(extraction),
      riskFlagsJson: JSON.stringify(riskFlags),
      plotStatus: plotData.status || 'inbox',
      knownIssues: [],
    })
    const questions = await callAI(qPrompt) as Record<string, unknown>

    const confidence = typeof extraction.confidence_overall === 'number'
      ? extraction.confidence_overall
      : 0.5

    // Upsert report
    const { data: report, error: upsertErr } = await supabase
      .from('plot_ai_reports')
      .upsert({
        plot_id,
        workspace_id: plotData.workspace_id,
        extraction_json: extraction,
        risk_flags_json: riskFlags,
        valuation_json: valuation,
        questions_json: questions,
        extraction_confidence: confidence,
        model_used: 'claude-sonnet-4-5',
        processed_at: new Date().toISOString(),
      }, { onConflict: 'plot_id' })
      .select()
      .single()

    if (upsertErr) {
      console.error('upsert error:', upsertErr)
      return NextResponse.json({ error: upsertErr.message }, { status: 500 })
    }

    return NextResponse.json({ report, cached: false })
  } catch (err: unknown) {
    console.error('AI analyze error:', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
