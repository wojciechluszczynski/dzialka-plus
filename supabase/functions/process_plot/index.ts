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

// ─── Enhanced portal scraping ─────────────────────────────────────────────────

interface FetchResult {
  text: string
  images: string[]
  structured: boolean // true if we got __NEXT_DATA__ or JSON-LD
}

/** Extract __NEXT_DATA__ JSON from Otodom/Next.js pages */
function extractNextData(html: string): Record<string, unknown> | null {
  const match = html.match(/<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)
  if (!match) return null
  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}

/** Traverse nested object with dot-path like 'props.pageProps.ad.title' */
// deno-lint-ignore no-explicit-any
function getPath(obj: any, ...paths: string[]): unknown {
  for (const path of paths) {
    let cur = obj
    for (const key of path.split('.')) {
      if (cur == null || typeof cur !== 'object') { cur = undefined; break }
      cur = cur[key]
    }
    if (cur != null) return cur
  }
  return undefined
}

/** Format Otodom __NEXT_DATA__ into structured text for Claude */
// deno-lint-ignore no-explicit-any
function formatOtodomNextData(data: Record<string, unknown>): { text: string; images: string[] } {
  const lines: string[] = []
  const images: string[] = []

  // Otodom stores advert in multiple possible paths depending on version
  // deno-lint-ignore no-explicit-any
  const ad = (
    getPath(data, 'props.pageProps.ad') ??
    getPath(data, 'props.pageProps.advert') ??
    getPath(data, 'props.pageProps.listing')
  ) as Record<string, unknown> | undefined

  if (!ad) {
    // Try to find any ad-like object
    const pageProps = getPath(data, 'props.pageProps') as Record<string, unknown> | undefined
    if (pageProps) {
      lines.push('pageProps keys: ' + Object.keys(pageProps).join(', '))
    }
    return { text: lines.join('\n'), images }
  }

  if (ad.title) lines.push(`Tytuł: ${ad.title}`)

  // Price
  const totalPrice = ad.totalPrice as Record<string, unknown> | undefined
  if (totalPrice?.value) lines.push(`Cena: ${totalPrice.value} ${totalPrice.currency ?? 'PLN'}`)

  const price = ad.price as Record<string, unknown> | undefined
  if (price?.value) lines.push(`Cena: ${price.value} ${price.currency ?? 'PLN'}`)

  // Area
  const area = ad.area as Record<string, unknown> | undefined
  if (area?.value) lines.push(`Powierzchnia: ${area.value} ${area.unit ?? 'm²'}`)

  // Price per m2
  const pricePerUnit = ad.pricePerUnit as Record<string, unknown> | undefined
  if (pricePerUnit?.value) lines.push(`Cena za m²: ${pricePerUnit.value} ${pricePerUnit.unit ?? 'PLN/m²'}`)

  // Location
  const loc = ad.location as Record<string, unknown> | undefined
  if (loc) {
    const addr = (loc.address ?? loc.mapDetails) as Record<string, unknown> | undefined
    if (addr) {
      const city = (addr.city as Record<string, unknown> | undefined)?.name ?? addr.city
      const district = (addr.district as Record<string, unknown> | undefined)?.name ?? addr.district
      const street = (addr.street as Record<string, unknown> | undefined)?.name ?? addr.street
      const parts = [street, district, city].filter(Boolean)
      if (parts.length) lines.push(`Lokalizacja: ${parts.join(', ')}`)
    }
    if (loc.geoPoint) {
      const gp = loc.geoPoint as Record<string, unknown>
      if (gp.lat && gp.lon) lines.push(`Współrzędne: ${gp.lat}, ${gp.lon}`)
    }
  }

  // Characteristics
  const chars = ad.characteristics as Array<Record<string, unknown>> | undefined
  if (Array.isArray(chars)) {
    for (const c of chars) {
      if (c.label && c.value != null) {
        lines.push(`${c.label}: ${c.value}${c.suffix ? ' ' + c.suffix : ''}`)
      }
    }
  }

  // Features / extras
  const features = (ad.features ?? ad.extras) as Array<Record<string, unknown> | string> | undefined
  if (Array.isArray(features)) {
    const featureLabels = features.map((f) => (typeof f === 'string' ? f : (f.label ?? f.name ?? JSON.stringify(f)))).filter(Boolean)
    if (featureLabels.length) lines.push(`Udogodnienia: ${featureLabels.join(', ')}`)
  }

  // Description
  if (ad.description) {
    const desc = String(ad.description).replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim()
    lines.push(`\nOpis:\n${desc.slice(0, 3000)}`)
  }

  // Contact / seller
  const seller = (ad.seller ?? ad.contact) as Record<string, unknown> | undefined
  if (seller) {
    if (seller.name) lines.push(`Sprzedający: ${seller.name}`)
    if (seller.type) lines.push(`Typ sprzedającego: ${seller.type}`)
    const phones = seller.phones as string[] | undefined
    if (Array.isArray(phones) && phones.length) lines.push(`Telefon: ${phones[0]}`)
  }

  // Parcel number
  if (ad.parcels) {
    const parcels = ad.parcels as Array<Record<string, unknown>> | string
    if (Array.isArray(parcels) && parcels.length) {
      lines.push(`Numer działki: ${parcels.map((p: Record<string, unknown>) => p.parcelnumber ?? p.id ?? p).join(', ')}`)
    }
  }

  // Images — Otodom stores them in ad.media or ad.images
  const mediaArr = (ad.media ?? ad.images ?? ad.photos) as Array<Record<string, unknown> | string> | undefined
  if (Array.isArray(mediaArr)) {
    for (const m of mediaArr) {
      const url = typeof m === 'string' ? m
        : (m.large ?? m.url ?? m.src ?? m.medium ?? m.small) as string | undefined
      if (url && typeof url === 'string' && url.startsWith('http') && images.length < 20) {
        images.push(url)
      }
    }
  }

  return { text: lines.join('\n'), images }
}

/** Extract og:image, JSON-LD images, and maybe a few listing images */
function extractImagesFromHtml(html: string): string[] {
  const images: string[] = []

  // og:image
  const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
  if (ogMatch) images.push(ogMatch[1])

  // JSON-LD images
  const jsonldMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  for (const m of jsonldMatches) {
    try {
      const obj = JSON.parse(m[1])
      const extractLdImages = (o: unknown) => {
        if (!o || typeof o !== 'object') return
        const arr = Array.isArray(o) ? o : [o]
        for (const item of arr) {
          if (typeof item !== 'object' || item === null) continue
          const rec = item as Record<string, unknown>
          if (rec.image) {
            const img = rec.image
            if (typeof img === 'string' && img.startsWith('http')) images.push(img)
            else if (Array.isArray(img)) img.forEach(i => { if (typeof i === 'string' && i.startsWith('http') && images.length < 20) images.push(i) })
          }
          for (const val of Object.values(rec)) extractLdImages(val)
        }
      }
      extractLdImages(obj)
    } catch { /* ignore */ }
  }

  // Dedupe
  return [...new Set(images)].slice(0, 20)
}

/** Fetch a portal page, returning cleaned text + image URLs */
async function fetchPortalContent(url: string): Promise<FetchResult | null> {
  const FETCH_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'pl-PL,pl;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Upgrade-Insecure-Requests': '1',
  }

  try {
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
    })

    console.log(`fetchPortalContent: ${url} → status ${res.status}`)
    if (!res.ok) {
      console.warn(`fetchPortalContent: HTTP ${res.status} for ${url}`)
      // Try alternate approach for Otodom: fetch without some headers
      if (res.status === 403 || res.status === 429) {
        return null
      }
    }

    const html = await res.text()
    console.log(`fetchPortalContent: got ${html.length} chars HTML`)

    // Detect Cloudflare challenge page
    if (html.includes('cf-browser-verification') || html.includes('cloudflare') && html.length < 10000) {
      console.warn('fetchPortalContent: Cloudflare challenge detected')
      return null
    }

    // ── 1. Try __NEXT_DATA__ (Otodom, some portals) ──────────────────────────
    const nextData = extractNextData(html)
    if (nextData) {
      console.log('fetchPortalContent: found __NEXT_DATA__')
      const { text, images: nextImages } = formatOtodomNextData(nextData)
      const htmlImages = extractImagesFromHtml(html)
      const allImages = [...new Set([...nextImages, ...htmlImages])].slice(0, 20)
      if (text.length > 50) {
        return { text: `[Dane ze struktury strony (Next.js)]\n${text}`, images: allImages, structured: true }
      }
    }

    // ── 2. Try JSON-LD structured data ───────────────────────────────────────
    const ldImages = extractImagesFromHtml(html)

    // ── 3. Fallback: strip HTML to plain text ────────────────────────────────
    const stripped = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
      .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
      .replace(/<header[\s\S]*?<\/header>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 8000)

    return { text: stripped, images: ldImages, structured: false }
  } catch (err) {
    console.error('fetchPortalContent error:', err)
    return null
  }
}

// ─── Score computation from risk flags ───────────────────────────────────────

interface RiskFlag {
  type: string
  severity: 'low' | 'med' | 'high'
  label: string
  confidence: number
  is_inference: boolean
}

interface DealBreaker {
  key: string
  triggered: boolean
}

interface RiskFlagsResult {
  risk_flags?: RiskFlag[]
  deal_breakers?: DealBreaker[]
  confidence_overall?: number
}

function computeScore(risks: RiskFlagsResult, extractionConfidence: number): {
  score_shared: number
  dealbreaker_triggered: boolean
  verdict: 'go' | 'maybe' | 'no'
} {
  const flags = risks.risk_flags ?? []
  const dealBreakers = risks.deal_breakers ?? []

  const dealbreakerTriggered = dealBreakers.some(d => d.triggered)

  // Base score: start at 7.5, reduce for each risk flag weighted by severity
  let score = 7.5
  for (const flag of flags) {
    const weight = flag.confidence ?? 0.7
    if (flag.severity === 'high') score -= 1.8 * weight
    else if (flag.severity === 'med') score -= 0.8 * weight
    else score -= 0.25 * weight
  }

  // Dealbreaker penalty
  if (dealbreakerTriggered) score -= 2.5

  // Factor in extraction confidence (if very low data, reduce score slightly)
  if (extractionConfidence < 0.3) score -= 0.5

  // Clamp to [1, 10]
  score = Math.max(1, Math.min(10, score))
  score = Math.round(score * 10) / 10

  // Verdict thresholds
  let verdict: 'go' | 'maybe' | 'no'
  if (dealbreakerTriggered || score < 4.5) {
    verdict = 'no'
  } else if (score >= 7.0) {
    verdict = 'go'
  } else {
    verdict = 'maybe'
  }

  return { score_shared: score, dealbreaker_triggered: dealbreakerTriggered, verdict }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

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
    for (const note of notes) {
      if (note.content && note.content.length > 20) {
        parts.push(`--- Notatka użytkownika ---\n${note.content}`)
      }
    }

    let rawText = parts.filter(Boolean).join('\n\n')

    // 3. If we have very little text and a URL, try to fetch the listing page
    const sourceUrl = plot.source_url ?? ''
    let fetchedFromUrl = false
    let fetchedImages: string[] = []

    if (sourceUrl && (rawText.length < 200 || isPortalUrl(sourceUrl))) {
      if (isPortalUrl(sourceUrl)) {
        console.log(`Fetching portal URL: ${sourceUrl}`)
        const fetched = await fetchPortalContent(sourceUrl)
        if (fetched) {
          if (fetched.text.length > 100) {
            rawText = `--- Treść strony (${sourceUrl}) ---\n${fetched.text}\n\n${rawText}`
            fetchedFromUrl = true
            console.log(`Fetched ${fetched.text.length} chars from ${sourceUrl}`)
          }
          if (fetched.images.length > 0) {
            fetchedImages = fetched.images
            console.log(`Extracted ${fetchedImages.length} images from ${sourceUrl}`)
          }
        } else {
          console.warn(`Failed to fetch ${sourceUrl} — proceeding with available text`)
          rawText += `\n\n[URL ogłoszenia: ${sourceUrl}. Strona niedostępna — wklej treść ogłoszenia ręcznie w notatce.]`
        }
      } else if (isFacebookUrl(sourceUrl)) {
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

    // 6. Upsert AI report — include extracted listing images
    await supabase.from('plot_ai_reports').upsert({
      plot_id,
      workspace_id: plot.workspace_id,
      extraction_json: {
        ...(extractionResult as Record<string, unknown>),
        listing_images: fetchedImages,
      },
      risk_flags_json: risksResult,
      extraction_confidence: (extractionResult as Record<string, number>)?.confidence_overall ?? null,
      model_used: 'claude-sonnet-4-5',
      processed_at: new Date().toISOString(),
    }, { onConflict: 'plot_id' })

    // 7. Compute and upsert plot_scores — this is what populates the verdict badge on cards
    const extractionConf = (extractionResult as Record<string, number>)?.confidence_overall ?? 0.5
    const scoreData = computeScore(risksResult as RiskFlagsResult, extractionConf)

    await supabase.from('plot_scores').upsert({
      plot_id,
      workspace_id: plot.workspace_id,
      score_owner: scoreData.score_shared,
      score_editor: scoreData.score_shared,
      score_shared: scoreData.score_shared,
      disagreement: 0,
      dealbreaker_triggered: scoreData.dealbreaker_triggered,
      verdict: scoreData.verdict,
      computed_at: new Date().toISOString(),
    }, { onConflict: 'plot_id' })

    // 8. Update plot with extracted fields (only if currently null/empty)
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
    if (!plot.description && ext.description) updates.description = ext.description

    await supabase.from('plots').update(updates).eq('id', plot_id)

    // 9. Auto-advance status: inbox → draft after AI processing
    if (plot.status === 'inbox') {
      await supabase.from('plots').update({ status: 'draft' }).eq('id', plot_id)
    }

    // 10. Log activity (non-critical — don't crash if RPC missing)
    try {
      await supabase.rpc('log_plot_activity', {
        p_workspace_id: plot.workspace_id,
        p_plot_id: plot_id,
        p_user_id: null,
        p_action: 'ai_processed',
        p_metadata: {
          model: 'claude-sonnet-4-5',
          confidence: extractionConf,
          fetched_from_url: fetchedFromUrl,
          notes_used: notes.length,
          verdict: scoreData.verdict,
          score: scoreData.score_shared,
          images_found: fetchedImages.length,
        },
      })
    } catch (logErr) {
      console.warn('log_plot_activity failed (non-fatal):', logErr)
    }

    return new Response(
      JSON.stringify({
        success: true,
        plot_id,
        ai_processed: true,
        fetched_from_url: fetchedFromUrl,
        verdict: scoreData.verdict,
        score: scoreData.score_shared,
        images_found: fetchedImages.length,
      }),
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
${params.fetchedFromUrl ? 'Note: The raw_text was fetched directly from the listing URL — it may contain structured data or stripped HTML. Extract only the listing-relevant content.' : ''}
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
