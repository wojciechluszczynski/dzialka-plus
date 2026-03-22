'use client'

// ╔══════════════════════════════════════════════════════════════╗
// ║  Import jednorazowy – Zestawienie działek 22.03.2026         ║
// ║  Dostęp: /app/import-dzialki (tylko dla zalogowanych)        ║
// ╚══════════════════════════════════════════════════════════════╝

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

const DZIALKI = [
  {
    title: 'Matysówka 923m² – WZ wydane (nr ewid. 625/5)',
    location_text: 'Rzeszów – Matysówka',
    area_m2: 923,
    asking_price_pln: 240000,
    source_url: 'https://www.facebook.com/groups/1982058518982403/permalink/2345685009286417/',
    source_type: 'facebook_group' as const,
    status: 'shortlist' as const,
    has_electricity: true,
    has_gas: true,
    has_water: null,
    has_sewage: null,
    has_road_access: null,
    zoning: 'WZ wydane',
    parcel_id: '625/5',
    description: 'Rzeszów – Matysówka. Powierzchnia 923 m² (9,23 ar), wymiary 35x27 m. Media: prąd ✅, gaz ✅, woda w sąsiedztwie ⚠️, kanalizacja ❓. Dojazd droga wewnętrzna ~35 m do utwardzenia. Cena 240 000 zł (260 zł/m²). Kontakt: priv/tel FB. Najlepiej opisana oferta, boczna uliczka, w pobliżu szkoła/sklep/przystanek.',
    note: 'Kontakt: priv/tel FB. Najlepiej opisana oferta.',
    priority: true,
  },
  {
    title: 'Klęczany 830m²',
    location_text: 'Klęczany',
    area_m2: 830,
    asking_price_pln: 117000,
    source_url: null,
    source_type: 'facebook_group' as const,
    status: 'inbox' as const,
    has_electricity: null,
    has_gas: null,
    has_water: null,
    has_sewage: null,
    has_road_access: null,
    zoning: null,
    parcel_id: null,
    description: 'Klęczany. Powierzchnia 830 m² (8,3 ar). Media nieznane. Cena 117 000 zł (141 zł/m²). Mało danych – wymaga kontaktu przed wyjazdem.',
    note: 'Kontakt: priv FB – Małgorzata Przywara. Mało danych – wymaga kontaktu przed wyjazdem.',
    priority: false,
  },
  {
    title: 'Pow. Mielecki droga woj. 982 – 1130m² WZ bezterminowo',
    location_text: 'pow. mielecki, droga woj. 982',
    area_m2: 1130,
    asking_price_pln: 78000,
    source_url: null,
    source_type: 'facebook_group' as const,
    status: 'inbox' as const,
    has_electricity: null,
    has_gas: null,
    has_water: null,
    has_sewage: null,
    has_road_access: true,
    zoning: 'WZ bezterminowo',
    parcel_id: '181102_2.0013.803/6',
    description: 'Pow. mielecki, droga woj. 982. 1130 m² (11,3 ar), wymiary 23x51 / 23x52 m (2 działki). WZ bezterminowo. Dojazd: droga woj. 982 + udział. ~50 km od Rzeszowa. 78 000 zł (69 zł/m²). 2/3 rząd zabudowy, najtańsza cena/ar, za daleko na dziś.',
    note: 'Kontakt: 664 599 351. Za daleko na dziś – 2/3 rząd zabudowy.',
    priority: false,
  },
  {
    title: 'Rakszawa Basakówka – WZ wydane ~10-20ar',
    location_text: 'Rakszawa Basakówka',
    area_m2: null,
    asking_price_pln: null,
    source_url: null,
    source_type: 'facebook_group' as const,
    status: 'shortlist' as const,
    has_electricity: null,
    has_gas: null,
    has_water: null,
    has_sewage: null,
    has_road_access: null,
    zoning: 'WZ wydane',
    parcel_id: null,
    description: 'Rakszawa Basakówka. ~10 lub 20 ar. WZ wydane. ~25 min od Rzeszowa (10 min od Łańcuta). Cena nieznana – zadzwonić przed wyjazdem.',
    note: 'Kontakt: 794 160 454. Cena nieznana – zadzwonić przed wyjazdem.',
    priority: true,
  },
  {
    title: 'Stobierna gm. Trzebownisko – ~15 min od Rzeszowa',
    location_text: 'Stobierna, gm. Trzebownisko',
    area_m2: null,
    asking_price_pln: null,
    source_url: null,
    source_type: 'facebook_group' as const,
    status: 'shortlist' as const,
    has_electricity: null,
    has_gas: null,
    has_water: null,
    has_sewage: null,
    has_road_access: null,
    zoning: null,
    parcel_id: null,
    description: 'Stobierna, gm. Trzebownisko. ~15 min od Rzeszowa. Dynamicznie rozwijająca się gmina przy Rzeszowie.',
    note: 'Kontakt: priv FB – Bartłomiej Martyna. Dynamicznie rozwijająca się gmina.',
    priority: true,
  },
  {
    title: 'Sołonka – działka widokowa 1800m² 18ar',
    location_text: 'Straszydle, gm. Lubenia',
    area_m2: 1800,
    asking_price_pln: 180000,
    source_url: 'https://www.otodom.pl/pl/oferta/solonka-18ar-dzialka-widokowa-ID4ruzu',
    source_type: 'otodom' as const,
    status: 'shortlist' as const,
    has_electricity: null,
    has_gas: null,
    has_water: null,
    has_sewage: null,
    has_road_access: false,
    zoning: 'WZ w trakcie wyrabiania',
    parcel_id: null,
    description: 'Straszydle, gm. Lubenia. 1800 m² (18 ar), 50x36 m. WZ w trakcie wyrabiania ⚠️. Dojazd nieutwardzony ⚠️. ~20–25 min od Rzeszowa. 180 000 zł (100 zł/m²). Kontakt: Rehouse Nieruchomości. Widokowa, otwarta okolica.',
    note: 'Kontakt: Rehouse Nieruchomości, Rzeszów – tel. przez Otodom. WZ niegotowe ⚠️, dojazd nieutwardzony ⚠️.',
    priority: true,
  },
  {
    title: 'Bobrowa gm. Żyraków – 3 warianty 12-15ar WZ wydane',
    location_text: 'Bobrowa, gm. Żyraków',
    area_m2: null,
    asking_price_pln: null,
    source_url: 'https://www.facebook.com/groups/385924585662380/permalink/1961037558151067/',
    source_type: 'facebook_group' as const,
    status: 'inbox' as const,
    has_electricity: null,
    has_gas: null,
    has_water: null,
    has_sewage: null,
    has_road_access: true,
    zoning: 'WZ wydane',
    parcel_id: null,
    description: 'Bobrowa, gm. Żyraków. 3 warianty: 12,77 / 12,97 / 15,47 ar, regularne. WZ wydane. Media w sąsiedztwie (prąd, woda, kanalizacja). Dojazd asfaltowy. ~40 km od Rzeszowa (6 km od Dębicy). Cena nieznana. Za daleko na dziś; dobra infrastruktura.',
    note: 'Kontakt: 535 604 199 – Michał Krupiński. Za daleko na dziś. 3 warianty do wyboru.',
    priority: false,
  },
  {
    title: 'Trzciana – dom surowy otwarty 201m² 6 pokoi',
    location_text: 'Trzciana',
    area_m2: 1324,
    asking_price_pln: 599000,
    source_url: 'https://www.facebook.com/groups/385924585662380/permalink/1960052704916219/',
    source_type: 'facebook_group' as const,
    status: 'inbox' as const,
    has_electricity: null,
    has_gas: null,
    has_water: null,
    has_sewage: null,
    has_road_access: true,
    zoning: 'pozwolenie na budowę',
    parcel_id: null,
    description: 'Trzciana. Dom surowy otwarty, 201,89 m² pow. użytkowej, 6 pokoi. Działka 1324 m² (13,24 ar). Pozwolenie na budowę. Dojazd utwardzony. ~25–30 min od Rzeszowa. 599 000 zł. Ostatnia linia zabudowy, taras z widokiem, garaż, gabinet.',
    note: 'Kontakt: 697 877 634 – Małgorzata Pietruszka. Stan surowy otwarty, taras z widokiem.',
    priority: false,
  },
  {
    title: 'Krosno Polanka – 2300m² pełne media pozwolenie na budowę',
    location_text: 'Krosno, Polanka',
    area_m2: 2300,
    asking_price_pln: 119000,
    source_url: 'https://www.otodom.pl/pl/oferta/ID67709549',
    source_type: 'otodom' as const,
    status: 'inbox' as const,
    has_electricity: true,
    has_gas: true,
    has_water: true,
    has_sewage: true,
    has_road_access: true,
    zoning: 'Pozwolenie na budowę',
    parcel_id: null,
    description: 'Krosno, Polanka. 2300 m² (23 ar), 47x45 m. Pozwolenie na budowę ✅. Pełne media ✅. Dojazd asfaltowy. ~60 km od Rzeszowa. 119 000 zł (52 zł/m²). Wyróżnia się: gotowe pozwolenie + pełne media + duża powierzchnia + niska cena.',
    note: 'Kontakt: M4-Biuro Nieruchomości, Krosno – tel. przez Otodom. Osobny wyjazd do Krosna.',
    priority: false,
  },
  {
    title: 'Odrzykoń ul. Leśna – 3056m² WZ panorama na Krosno',
    location_text: 'Odrzykoń, ul. Leśna, gm. Wojaszówka',
    area_m2: 3056,
    asking_price_pln: 289000,
    source_url: 'https://www.otodom.pl/pl/oferta/ID66760685',
    source_type: 'otodom' as const,
    status: 'inbox' as const,
    has_electricity: null,
    has_gas: null,
    has_water: null,
    has_sewage: null,
    has_road_access: null,
    zoning: 'WZ wydane',
    parcel_id: '2930/2',
    description: 'Odrzykoń, ul. Leśna, gm. Wojaszówka. 3056 m² (30,56 ar). WZ wydane. ~55 km od Rzeszowa (k. Krosna). 289 000 zł (95 zł/m²). Największa działka w zestawieniu, panorama na Krosno i okolicę, blisko lasu.',
    note: 'Kontakt: Kwadraciak Biuro Nieruchomości, Krosno – tel. przez Otodom.',
    priority: false,
  },
  {
    title: 'Bóbrka gm. Chorkówka – 1400m² 60zł/m²',
    location_text: 'Bóbrka, gm. Chorkówka',
    area_m2: 1400,
    asking_price_pln: 84000,
    source_url: 'https://www.otodom.pl/pl/oferta/ID66105064',
    source_type: 'otodom' as const,
    status: 'inbox' as const,
    has_electricity: null,
    has_gas: null,
    has_water: null,
    has_sewage: null,
    has_road_access: true,
    zoning: 'możliwość WZ',
    parcel_id: null,
    description: 'Bóbrka, gm. Chorkówka. 1400 m² (14 ar). Możliwość WZ (brak WZ ⚠️). Dojazd droga gminna. ~55 km od Rzeszowa. 84 000 zł (60 zł/m²). 2. linia zabudowy od asfaltu.',
    note: 'Kontakt: Usiebie.pl BN, Krosno – tel. przez Otodom. Brak WZ – ryzyko ⚠️.',
    priority: false,
  },
]

type ImportStatus = 'idle' | 'running' | 'done' | 'error'

export default function ImportDzialki() {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [logs, setLogs] = useState<string[]>([])
  const [inserted, setInserted] = useState(0)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)

  function log(msg: string) {
    setLogs(prev => [...prev, msg])
  }

  async function runImport() {
    setStatus('running')
    setLogs([])
    setInserted(0)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { log('❌ Brak sesji – zaloguj się'); setStatus('error'); return }
      log(`✅ Zalogowany: ${user.email}`)

      const { data: member } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1).single()

      if (!member) { log('❌ Brak workspace'); setStatus('error'); return }
      const wsId = member.workspace_id
      setWorkspaceId(wsId)
      log(`✅ Workspace: ${wsId}`)

      const { data: { session } } = await supabase.auth.getSession()

      let ok = 0
      for (const d of DZIALKI) {
        const { data: plot, error } = await supabase.from('plots').insert({
          workspace_id: wsId,
          created_by: user.id,
          title: d.title,
          location_text: d.location_text,
          area_m2: d.area_m2,
          asking_price_pln: d.asking_price_pln,
          source_url: d.source_url,
          source_type: d.source_type,
          status: d.status,
          has_electricity: d.has_electricity,
          has_gas: d.has_gas,
          has_water: d.has_water,
          has_sewage: d.has_sewage,
          has_road_access: d.has_road_access,
          zoning: d.zoning,
          parcel_id: d.parcel_id,
          description: d.description,
          is_deleted: false,
        }).select().single()

        if (error) {
          if (error.code === '23505') {
            log(`⚠️ Duplikat (pomijam): ${d.title}`)
          } else {
            log(`❌ Błąd: ${d.title} — ${error.message}`)
          }
          continue
        }

        log(`✅ Dodano: ${d.title}`)
        ok++
        setInserted(ok)

        // Notatka
        if (d.note) {
          await supabase.from('plot_notes').insert({
            plot_id: plot.id,
            workspace_id: wsId,
            user_id: user.id,
            content: d.note,
            is_voice: false,
          })
        }

        // Triggeruj AI (fire & forget)
        supabase.functions.invoke('process_plot', {
          body: { plot_id: plot.id },
          headers: { Authorization: 'Bearer ' + (session?.access_token ?? '') },
        }).then(() => log(`🤖 AI gotowe: ${d.title}`))
          .catch(() => log(`⚠️ AI nie odpowiedział dla: ${d.title}`))

        // Opóźnienie żeby nie przeciążyć edge function
        await new Promise(r => setTimeout(r, 600))
      }

      log(`\n🏁 Gotowe! Wstawiono ${ok} z ${DZIALKI.length} działek.`)
      log(`🤖 AI analizuje w tle – odśwież inbox za minutę.`)
      setStatus('done')
    } catch (e) {
      log(`❌ Nieoczekiwany błąd: ${(e as Error).message}`)
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F8F9FA' }}>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 w-full max-w-2xl">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: '#FFF7ED' }}>🏡</div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Import działek</h1>
            <p className="text-sm text-gray-500">Zestawienie 22.03.2026 — 11 działek</p>
          </div>
        </div>

        {/* Stats preview */}
        {status === 'idle' && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="rounded-xl border border-gray-200 p-3 text-center">
              <div className="text-2xl font-bold text-gray-900">11</div>
              <div className="text-xs text-gray-400">działek</div>
            </div>
            <div className="rounded-xl border border-green-200 p-3 text-center" style={{ background: '#F0FDF4' }}>
              <div className="text-2xl font-bold" style={{ color: '#16A34A' }}>5</div>
              <div className="text-xs text-gray-400">na dziś 🟢</div>
            </div>
            <div className="rounded-xl border border-blue-200 p-3 text-center" style={{ background: '#EFF6FF' }}>
              <div className="text-2xl font-bold" style={{ color: '#2563EB' }}>6</div>
              <div className="text-xs text-gray-400">później 🔵</div>
            </div>
          </div>
        )}

        {/* Działki preview */}
        {status === 'idle' && (
          <div className="mb-6 space-y-1.5 max-h-60 overflow-y-auto">
            {DZIALKI.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-sm py-1.5 px-3 rounded-lg hover:bg-gray-50">
                <span className="text-xs text-gray-400 w-5 text-right">{i + 1}.</span>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${d.priority ? 'bg-green-500' : 'bg-blue-400'}`} />
                <span className="font-medium text-gray-800 truncate">{d.title}</span>
                <span className="text-gray-400 text-xs flex-shrink-0 ml-auto">
                  {d.asking_price_pln ? `${(d.asking_price_pln / 1000).toFixed(0)}k zł` : '? zł'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <div className="mb-6 bg-gray-950 rounded-xl p-4 font-mono text-xs text-green-400 max-h-64 overflow-y-auto">
            {logs.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        )}

        {/* Progress bar */}
        {status === 'running' && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>Importowanie...</span>
              <span>{inserted} / {DZIALKI.length}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: `${(inserted / DZIALKI.length) * 100}%`, background: '#F97316' }} />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {status === 'idle' && (
            <button onClick={runImport}
              className="flex-1 py-3 rounded-xl text-white font-semibold text-sm"
              style={{ background: '#F97316' }}>
              🚀 Importuj 11 działek + uruchom AI
            </button>
          )}
          {status === 'running' && (
            <button disabled
              className="flex-1 py-3 rounded-xl text-white font-semibold text-sm opacity-70"
              style={{ background: '#F97316' }}>
              ⏳ Importowanie... ({inserted}/{DZIALKI.length})
            </button>
          )}
          {(status === 'done' || status === 'error') && workspaceId && (
            <button
              onClick={() => router.push(`/app/workspace/${workspaceId}/inbox`)}
              className="flex-1 py-3 rounded-xl text-white font-semibold text-sm"
              style={{ background: '#16A34A' }}>
              ✅ Przejdź do Inboxu →
            </button>
          )}
          {status !== 'idle' && status !== 'running' && (
            <button onClick={() => { setStatus('idle'); setLogs([]); setInserted(0) }}
              className="px-5 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium">
              Resetuj
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
