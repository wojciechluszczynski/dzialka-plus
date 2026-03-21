import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const maxDuration = 30

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function seedRng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

function hashString(str: string): number {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = (h * 33) ^ str.charCodeAt(i)
  }
  return h >>> 0
}

// ---------------------------------------------------------------------------
// Enrichment logic (mock / estimated)
// ---------------------------------------------------------------------------

interface TravelTime {
  target_name: string
  mode: 'driving' | 'transit' | 'cycling' | 'walking'
  duration_min: number
}

interface PoiItem {
  name: string
  category: string
  distance_m: number
  lat: number
  lng: number
}

function estimateRcnStats(
  plotId: string,
  askingPricePln: number | null,
  areaM2: number | null
) {
  const rng = seedRng(hashString(plotId + 'rcn'))
  const radius = 5.0

  // If we have price data, derive comparables from it
  let medianM2: number
  if (askingPricePln && areaM2 && areaM2 > 0) {
    const askingM2 = askingPricePln / areaM2
    // Median is close to asking ± 15%
    const delta = (rng() - 0.5) * 0.3 * askingM2
    medianM2 = Math.round(askingM2 + delta)
  } else {
    // Default Podkarpacie farmland range: 20–200 PLN/m²
    medianM2 = Math.round(40 + rng() * 120)
  }

  const p25 = Math.round(medianM2 * (0.78 + rng() * 0.1))
  const p75 = Math.round(medianM2 * (1.12 + rng() * 0.1))
  const comparablesCount = Math.round(5 + rng() * 20)

  return {
    rcn_median_price_m2: medianM2,
    rcn_p25_price_m2: p25,
    rcn_p75_price_m2: p75,
    rcn_comparables_count: comparablesCount,
    rcn_radius_km: radius,
  }
}

function estimateFloodRisk(locationText: string | null) {
  const loc = (locationText || '').toLowerCase()

  const highRiskTerms = ['rzeka', 'potok', 'dolina', 'wisła', 'san', 'dunajec', 'wisłok', 'strumień', 'niski', 'zalewow']
  const lowRiskTerms = ['wzgórze', 'wzgorze', 'góra', 'gora', 'podgórski', 'podgorski', 'wysoczyzna', 'wzniesieni']

  const hasHigh = highRiskTerms.some(t => loc.includes(t))
  const hasLow = lowRiskTerms.some(t => loc.includes(t))

  if (hasHigh && !hasLow) {
    return { isok_flood_zone: 'zone_Q100', isok_flood_risk_level: 'medium' }
  }
  if (hasLow) {
    return { isok_flood_zone: 'zone_outside', isok_flood_risk_level: 'none' }
  }
  // Default: outside flood zone (most Podkarpacie plots)
  return { isok_flood_zone: 'zone_outside', isok_flood_risk_level: 'none' }
}

function estimatePowerLines(plotId: string, locationText: string | null) {
  const rng = seedRng(hashString(plotId + 'pse'))
  const loc = (locationText || '').toLowerCase()

  // Higher probability near industrial/city areas
  const nearIndustrial = ['przemysł', 'fabryka', 'zakład', 'obwodnica'].some(t => loc.includes(t))
  const prob = nearIndustrial ? 0.35 : 0.12

  if (rng() < prob) {
    const distance = Math.round(80 + rng() * 400)
    return { pse_power_line_nearby: true, pse_power_line_distance_m: distance }
  }
  return { pse_power_line_nearby: false, pse_power_line_distance_m: null }
}

function estimateTravelTimes(plotId: string, locationText: string | null): TravelTime[] {
  const rng = seedRng(hashString(plotId + 'travel'))
  const loc = (locationText || '').toLowerCase()

  // Derive approximate distances based on location hints
  // Podkarpacie region defaults
  let toRzeszow = 45 + Math.round(rng() * 60)   // 45–105 min
  let toKrosno = 40 + Math.round(rng() * 50)    // 40–90 min
  let toSanok = 50 + Math.round(rng() * 60)     // 50–110 min

  // Adjust based on city mentions in location
  if (loc.includes('rzeszów') || loc.includes('rzeszow')) toRzeszow = 5 + Math.round(rng() * 15)
  if (loc.includes('krosno')) toKrosno = 5 + Math.round(rng() * 10)
  if (loc.includes('sanok')) toSanok = 5 + Math.round(rng() * 10)
  if (loc.includes('jasło') || loc.includes('jaslo')) {
    toKrosno = 20 + Math.round(rng() * 15)
    toRzeszow = 55 + Math.round(rng() * 20)
  }
  if (loc.includes('lesko') || loc.includes('ustrzyki')) {
    toSanok = 15 + Math.round(rng() * 20)
    toKrosno = 55 + Math.round(rng() * 30)
  }

  return [
    { target_name: 'Rzeszów (centrum)', mode: 'driving', duration_min: toRzeszow },
    { target_name: 'Krosno (centrum)', mode: 'driving', duration_min: toKrosno },
    { target_name: 'Sanok (centrum)', mode: 'driving', duration_min: toSanok },
  ]
}

function estimatePoi(plotId: string): PoiItem[] {
  const rng = seedRng(hashString(plotId + 'poi'))

  // Mock POI: realistic Polish rural/suburban categories
  const categories: Array<{ name: string; category: string }> = [
    { name: 'Sklep spożywczy', category: 'shop' },
    { name: 'Szkoła podstawowa', category: 'school' },
    { name: 'Apteka', category: 'pharmacy' },
    { name: 'Stacja benzynowa Orlen', category: 'fuel' },
    { name: 'Przychodnia zdrowia', category: 'health' },
    { name: 'Kościół parafialny', category: 'place_of_worship' },
    { name: 'Urząd gminy', category: 'government' },
  ]

  // Base coords (Podkarpacie center area — Rzeszów approx)
  const baseLat = 49.8 + (rng() - 0.5) * 1.0
  const baseLng = 22.0 + (rng() - 0.5) * 2.0

  return categories.map(c => {
    const dist = Math.round(200 + rng() * 2800)
    const angle = rng() * 2 * Math.PI
    const latOffset = (Math.sin(angle) * dist) / 111000
    const lngOffset = (Math.cos(angle) * dist) / (111000 * Math.cos(baseLat * Math.PI / 180))
    return {
      name: c.name,
      category: c.category,
      distance_m: dist,
      lat: parseFloat((baseLat + latOffset).toFixed(5)),
      lng: parseFloat((baseLng + lngOffset).toFixed(5)),
    }
  }).sort((a, b) => a.distance_m - b.distance_m)
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

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

  if (!plot_id) {
    return NextResponse.json({ error: 'plot_id required' }, { status: 400 })
  }

  // Fetch plot
  const { data: plotRow, error: plotErr } = await supabase
    .from('plots')
    .select('id, title, asking_price_pln, area_m2, location_text, workspace_id')
    .eq('id', plot_id)
    .single()

  if (plotErr || !plotRow) {
    return NextResponse.json({ error: 'Plot not found' }, { status: 404 })
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

  // Check for cached enrichment (< 7 days) unless force refresh
  if (!force_refresh) {
    const { data: existing } = await supabase
      .from('plot_enrichments')
      .select('*')
      .eq('plot_id', plot_id)
      .order('enriched_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ageMs = Date.now() - new Date((existing as any).enriched_at).getTime()
      if (ageMs < 7 * 24 * 60 * 60 * 1000) {
        return NextResponse.json({ enrichment: existing, cached: true })
      }
    }
  }

  // Generate enrichment data
  const rcn = estimateRcnStats(plot_id, plot.asking_price_pln, plot.area_m2)
  const flood = estimateFloodRisk(plot.location_text)
  const power = estimatePowerLines(plot_id, plot.location_text)
  const travelTimes = estimateTravelTimes(plot_id, plot.location_text)
  const poi = estimatePoi(plot_id)

  const payload = {
    plot_id,
    workspace_id: plot.workspace_id,
    ...rcn,
    ...flood,
    ...power,
    travel_times: travelTimes,
    poi_data: poi,
    enriched_at: new Date().toISOString(),
  }

  // Check if record exists to decide update vs insert
  const { data: existing } = await supabase
    .from('plot_enrichments')
    .select('id')
    .eq('plot_id', plot_id)
    .maybeSingle()

  let enrichment
  if (existing) {
    // Update existing record
    const { data, error } = await supabase
      .from('plot_enrichments')
      .update(payload)
      .eq('id', (existing as Record<string, unknown>).id as string)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    enrichment = data
  } else {
    // Insert new record
    const { data, error } = await supabase
      .from('plot_enrichments')
      .insert(payload)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    enrichment = data
  }

  return NextResponse.json({ enrichment, cached: false })
}
