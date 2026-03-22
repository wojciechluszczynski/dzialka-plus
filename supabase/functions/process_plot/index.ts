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

// Polish real-estate portals we can scrape
const PORTAL_DOMAINS = [
  'otodom.pl', 'olx.pl', 'gratka.pl', 'adresowo.pl',
  'domiporta.pl', 'nieruchomosci-online.pl', 'morizon.pl',
  'szybko.pl', 'gumtree.pl', 'trojmiasto.pl',
]

function isPortalUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace('www.', '')
    return PORTAL_DOMAINS.some(d => hostname.endsWith(d))
  } catch {
    return false
  }
}

function isFacebookUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace('www.', '')
    return hostname === 'facebook.com' || hostname === 'fb.com' || hostname === 'm.facebook.com'
  } catch {
    return false
  }
}

// Fetch a portal URL and extract plain text from HTML
async function fetchPortalText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pl-PL,pl;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) return null
    const html = await res.text()

    // Remove scripts, styles, nav, footer, header
    let text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
      .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
      .replace(/<header[\s\S]*?<\/header>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      // Strip remaining tags
      .replace(/<[^>]+>/g, ' ')
      // Decode common HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Collapse whitespace
      .replace(/\s{2,}/g, ' ')
      .trim()

    // Limit to 8000 chars (enough for Claude, avoids token overflow)
    return text.slice(0, 8000)
  } catch (err) {
    console.error('fetchPortalText error:', err)
    return null
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json() as { plot_id: string; image_base64?: string }
    const { plot_id, image_base64 } = body

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

    // 1. Fetch plot + source + notes
    const [plotResult, notesResult] = await Promise.all([
      supabase
        .from('plots')
        .select('*, plot_sources(*)')
        .eq('id', plot_id)
        .single(),
      supabase
        .from('plot_notes')
        .select('content, created_at')
        .eq('plot_id', plot_id)
        .order('created_at', { ascending: false }),
    ])

    const { data: plot, error: plotErr } = plotResult
    if (plotErr || !plot) {
      return new Response(JSON.stringify({ error: 'Plot not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const source = plot.plot_sources?.[0]
    const notes = notesResult.data ?? []

    // 2. Assemble rawText from all available sources
    const parts: string[] = []
    if (plot.title) parts.push(`Tytuł: ${plot.title}`)
    if (plot.description) parts.push(plot.description)
    if (source?.raw_text) parts.push(source.raw_text)
    if (source?.fb_author) parts.push(`Sprzedający: ${source.fb_author}`)
    if (source?.fb_group_name) parts.push(`Grupa: ${source.fb_group_name}`)
    // Include any user-pasted notes (e.g. copy-pasted FB post)
    for (const note of notes) {
      if (note.content && note.content.length > 20) {
        parts.push(`--- Notatka użytkownika ---\n${note.content}`)
      }
    }

    let rawText = parts.filter(Boolean).join('\n\n')

    // 3. If we have very little text and a URL, try to fetch the listing page
    const sourceUrl = plot.source_url ?? ''
    let fetchedFromUrl = false

    if (rawText.length < 200 && sourceUrl) {
      if (isPortalUrl(sourceUrl)) {
        console.log(`Fetching portal URL: ${sourceUrl}`)
        const fetched = await fetchPortalText(sourceUrl)
        if (fetched && fetched.length > 100) {
          rawText = `--- Treść strony (${sourceUrl}) ---\n${fetched}\n\n${rawText}`
          fetchedFromUrl = true
          console.log(`Fetched ${fetched.length} chars from ${sourceUrl}`)
        }
      } else if (isFacebookUrl(sourceUrl)) {
        // Facebook requires login — can't fetch. Tell Claude the URL is FB.
        rawText += `\n\n[Ogłoszenie pochodzi z Facebooka. Treść ogłoszenia musi zostać wklejona ręcznie w sekcji Notatki.]`
      }
    }

    // 4. EXTRACT_LISTING prompt (with optional image for screenshot support)
    const extractionResult = await runExtraction(anthropic, {
      sourceUrl,
      sourceType: plot.source_type ?? 'other',
      rawText,
      todayDate: new Date().toISOString().split('T')[0],
      fetchedFromUrl,
      imageBase64: image_base64 ?? null,
    })

    // 5. FLAG_RISKS prompt
    const risksResult = await runFlagRisks(anthropic, extractionResult)

    // 6. Upsert AI report
    await supabase.from('plot_ai_reports').upsert({
      plot_id,
      workspace_id: plot.workspace_id,
      extraction_json: extractionResult,
      risk_flags_json: risksResult,
      extraction_confidence: (extractionResult as Record<string, number>)?.confidence_overall ?? null,
      model_used: 'claude-sonnet-4-5',
      processed_at: new Date().toISOString(),
    }, { onConflict: 'plot_id' })

    // 7. Update plot with extracted fields (only if currently null/empty)
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
      const u = ext.utilities as Record<string, boolean | null>
      if (plot.has_electricity === null && u.electricity != null) updates.has_electricity = u.electricity
      if (plot.has_water === null && u.water != null) updates.has_water = u.water
      if (plot.has_sewage === null && u.sewage != null) updates.has_sewage = u.sewage
      if (plot.has_gas === null && u.gas != null) updates.has_gas = u.gas
    }
    if (plot.has_road_access === null && ext.road_access != null) updates.has_road_access = ext.road_access
    if (!plot.zoning && ext.zoning) updates.zoning = ext.zoning
    // Also update description if empty and AI extracted a good one
    if (!plot.description && ext.description) updates.description = ext.description

    await supabase.from('plots').update(updates).eq('id', plot_id)

    // 8. Auto-advance status: inbox → draft after AI processing
    if (plot.status === 'inbox') {
      await supabase.from('plots').update({ status: 'draft' }).eq('id', plot_id)
    }

    // 9. Log activity
    await supabase.rpc('log_plot_activity', {
      p_workspace_id: plot.workspace_id,
      p_plot_id: plot_id,
      p_user_id: null,
      p_action: 'ai_processed',
      p_metadata: {
        model: 'claude-sonnet-4-5',
        confidence: (extractionResult as Record<string, number>)?.confidence_overall,
        fetched_from_url: fetchedFromUrl,
        notes_used: notes.length,
      },
    })

    return new Response(
      JSON.stringify({ success: true, plot_id, ai_processed: true, fetched_from_url: fetchedFromUrl }),
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
  params: { sourceUrl: string; sourceType: string; rawText: string; todayDate: string; fetchedFromUrl: boolean; imageBase64: string | null }
): Promise<unknown> {
  const system = `You are a strict information extraction engine for land plot listings in Poland.
Return ONLY valid JSON. No prose, no markdown. Language: respond in Polish for human-readable fields.
Today's date: ${params.todayDate}
${params.fetchedFromUrl ? 'Note: The raw_text was fetched directly from the listing URL — it may contain navigation/footer noise. Extract only the listing-relevant content.' : ''}
${params.imageBase64 ? 'Note: A screenshot image of the listing is also provided. Extract all visible data including price, area, location, and any text in the image.' : ''}`

  const user = `Extract structured listing data:
- source_url: ${params.sourceUrl}
- source_type: ${params.sourceType}
- raw_text: ${params.rawText || '(empty — no listing text available yet)'}

Return JSON with these fields:
{
  "title": string | null,
  "asking_price_pln": number | null,
  "area_m2": number | null,
  "price_per_m2_pln": number | null,
  "location_text": string | null,
  "parcel_id": string | null,
  "address_freeform": string | null,
  "description": string | null,
  "contact_phone": string | null,
  "contact_name": string | null,
  "contact_type": "owner" | "agent" | "unknown",
  "utilities": {
    "electricity": boolean | null,
    "water": boolean | null,
    "sewage": boolean | null,
    "gas": boolean | null,
    "fiber": boolean | null
  },
  "road_access": boolean | null,
  "zoning": string | null,
  "facts": string[],
  "inferences": string[],
  "missing_fields": string[],
  "confidence_overall": number,
  "field_confidence": {
    "[field_name]": { "value": any, "confidence": number, "evidence": string }
  }
}`

  // Build message content — add image if provided
  type ContentBlock = { type: 'text'; text: string } | { type: 'image'; source: { type: 'base64'; media_type: 'image/jpeg'; data: string } }
  const userContent: ContentBlock[] = []
  if (params.imageBase64) {
    userContent.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: params.imageBase64 } })
  }
  userContent.push({ type: 'text', text: user })

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    temperature: 0.1,
    system,
    messages: [{ role: 'user', content: userContent }],
  })

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')

  const clean = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
  return JSON.parse(clean)
}

async function runFlagRisks(anthropic: Anthropic, extraction: unknown): Promise<unknown> {
  const system = `You identify risk signals for buying a building plot in Poland.
Output JSON only. No prose. All labels and rationale in Polish.`

  const user = `Identify risks for this plot:
${JSON.stringify(extraction, null, 2)}

Return JSON:
{
  "risk_flags": [
    {
      "type": string,
      "severity": "low" | "med" | "high",
      "label": string,
      "rationale": string,
      "confidence": number,
      "evidence": string,
      "is_inference": boolean
    }
  ],
  "deal_breakers": [
    {
      "key": string,
      "label": string,
      "triggered": boolean,
      "rationale": string
    }
  ],
  "missing_due_diligence": [
    {
      "item": string,
      "priority": "must" | "should" | "nice"
    }
  ],
  "recommended_next_actions": [
    {
      "action": string,
      "reason": string
    }
  ],
  "confidence_overall": number,
  "analysis_notes": string
}`

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
