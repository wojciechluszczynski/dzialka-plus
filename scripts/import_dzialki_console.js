/**
 * DZIAŁKOMETR — Import działek z zestawienia 22.03.2026
 *
 * Wklej ten skrypt do konsoli przeglądarki będąc zalogowanym w aplikacji.
 * Skrypt użyje istniejącej sesji Supabase z window.__supabase lub z cookies.
 *
 * Wymagania: musisz być na stronie aplikacji (np. app.dzialka.plus/app/...)
 */

(async () => {
  // ── 1. Znajdź klienta Supabase z window ──────────────────────────────────
  let sb = null;

  // Next.js czasem eksponuje globalny klient
  if (window.__supabase) sb = window.__supabase;

  // Alternatywnie stwórz klienta używając danych z localStorage
  if (!sb) {
    const keys = Object.keys(localStorage).filter(k => k.includes('supabase'));
    if (keys.length > 0) {
      const projectData = JSON.parse(localStorage[keys[0]] || '{}');
      const url = 'https://sdhwhtsikglsfzewhgqc.supabase.co';
      const anonKey = document.querySelector('script')?.src?.match(/supabase\.co\/([^"]+)/)?.[1] || '';

      // Pobierz URL i klucz z meta tagów next.js lub ze skryptów
      let supabaseUrl, supabaseAnonKey;
      for (const script of document.scripts) {
        if (script.textContent && script.textContent.includes('supabase')) {
          const urlMatch = script.textContent.match(/https:\/\/[a-z0-9]+\.supabase\.co/);
          const keyMatch = script.textContent.match(/eyJ[a-zA-Z0-9_-]{20,}/);
          if (urlMatch) supabaseUrl = urlMatch[0];
          if (keyMatch) supabaseAnonKey = keyMatch[0];
          if (supabaseUrl && supabaseAnonKey) break;
        }
      }

      if (supabaseUrl && supabaseAnonKey) {
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        sb = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: true } });
      }
    }
  }

  if (!sb) {
    // Ostatnia szansa — pobierz z window.next (Next.js internals)
    try {
      const chunks = Object.values(window.__NEXT_DATA__?.props || {});
      console.log('__NEXT_DATA__:', window.__NEXT_DATA__);
    } catch(e) {}
    alert('Nie znaleziono klienta Supabase. Spróbuj ze strony /app/... aplikacji.');
    return;
  }

  // ── 2. Sprawdź sesję ────────────────────────────────────────────────────
  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (!user) {
    alert('Brak zalogowanej sesji. Zaloguj się i spróbuj ponownie.');
    return;
  }
  console.log('✅ Zalogowany jako:', user.email);

  // ── 3. Pobierz workspace ────────────────────────────────────────────────
  const { data: member } = await sb.from('workspace_members')
    .select('workspace_id').eq('user_id', user.id).limit(1).single();

  if (!member) {
    alert('Nie znaleziono workspace dla tego użytkownika.');
    return;
  }
  const workspaceId = member.workspace_id;
  console.log('✅ Workspace:', workspaceId);

  // ── 4. Dane działek ─────────────────────────────────────────────────────
  const dzialki = [
    {
      title: 'Matysówka 923m² – WZ wydane (nr ewid. 625/5)',
      location_text: 'Rzeszów – Matysówka',
      area_m2: 923,
      asking_price_pln: 240000,
      source_url: 'https://www.facebook.com/groups/1982058518982403/permalink/2345685009286417/',
      source_type: 'facebook',
      status: 'shortlist',
      has_electricity: true,
      has_gas: true,
      has_water: null,
      has_sewage: null,
      has_road_access: null,
      zoning: 'WZ wydane',
      parcel_id: '625/5',
      description: 'Rzeszów – Matysówka. Powierzchnia 923 m² (9,23 ar), wymiary 35x27 m. Media: prąd ✅, gaz ✅, woda w sąsiedztwie ⚠️, kanalizacja ❓. Dojazd droga wewnętrzna ~35 m do utwardzenia. Cena 240 000 zł (260 zł/m²). Kontakt: priv/tel FB. Uwagi: Najlepiej opisana oferta, boczna uliczka, w pobliżu szkoła/sklep/przystanek.',
    },
    {
      title: 'Klęczany 830m²',
      location_text: 'Klęczany',
      area_m2: 830,
      asking_price_pln: 117000,
      source_url: 'https://www.facebook.com/groups/1982058518982403/',
      source_type: 'facebook',
      status: 'inbox',
      has_electricity: null,
      has_gas: null,
      has_water: null,
      has_sewage: null,
      has_road_access: null,
      zoning: null,
      parcel_id: null,
      description: 'Klęczany. Powierzchnia 830 m² (8,3 ar). Media nieznane. Kontakt: priv FB – Małgorzata Przywara. Cena 117 000 zł (141 zł/m²). Uwagi: Mało danych – wymaga kontaktu przed wyjazdem.',
    },
    {
      title: 'Pow. Mielecki droga woj. 982 – 1130m² WZ bezterminowo',
      location_text: 'pow. mielecki, droga woj. 982',
      area_m2: 1130,
      asking_price_pln: 78000,
      source_url: 'https://www.facebook.com/groups/1982058518982403/',
      source_type: 'facebook',
      status: 'inbox',
      has_electricity: null,
      has_gas: null,
      has_water: null,
      has_sewage: null,
      has_road_access: true,
      zoning: 'WZ bezterminowo',
      parcel_id: '181102_2.0013.803/6',
      description: 'Pow. mielecki, droga woj. 982. Powierzchnia 1130 m² (11,3 ar), wymiary 23x51 / 23x52 m (2 działki). WZ bezterminowo. Dojazd: droga woj. 982 + udział w drodze. ~50 km od Rzeszowa. Cena 78 000 zł (69 zł/m²). Kontakt: 664 599 351. Uwagi: 2/3 rząd zabudowy, najtańsza cena/ar, za daleko na dziś.',
    },
    {
      title: 'Rakszawa Basakówka – WZ wydane ~10-20ar',
      location_text: 'Rakszawa Basakówka',
      area_m2: null,
      asking_price_pln: null,
      source_url: 'https://www.facebook.com/groups/1982058518982403/',
      source_type: 'facebook',
      status: 'shortlist',
      has_electricity: null,
      has_gas: null,
      has_water: null,
      has_sewage: null,
      has_road_access: null,
      zoning: 'WZ wydane',
      parcel_id: null,
      description: 'Rakszawa Basakówka. Powierzchnia: ok. 10 lub 20 ar. WZ wydane. ~25 min od Rzeszowa (10 min od Łańcuta). Cena nieznana. Kontakt: 794 160 454. Uwagi: Cena nieznana – zadzwonić przed wyjazdem.',
    },
    {
      title: 'Stobierna gm. Trzebownisko – ~15 min od Rzeszowa',
      location_text: 'Stobierna, gm. Trzebownisko',
      area_m2: null,
      asking_price_pln: null,
      source_url: 'https://www.facebook.com/groups/1982058518982403/',
      source_type: 'facebook',
      status: 'shortlist',
      has_electricity: null,
      has_gas: null,
      has_water: null,
      has_sewage: null,
      has_road_access: null,
      zoning: null,
      parcel_id: null,
      description: 'Stobierna, gm. Trzebownisko. ~15 min od Rzeszowa. Kontakt: priv FB – Bartłomiej Martyna. Uwagi: Dynamicznie rozwijająca się gmina przy Rzeszowie.',
    },
    {
      title: 'Sołonka – działka widokowa 1800m² 18ar',
      location_text: 'Straszydle, gm. Lubenia',
      area_m2: 1800,
      asking_price_pln: 180000,
      source_url: 'https://www.otodom.pl/pl/oferta/solonka-18ar-dzialka-widokowa-ID4ruzu',
      source_type: 'otodom',
      status: 'shortlist',
      has_electricity: null,
      has_gas: null,
      has_water: null,
      has_sewage: null,
      has_road_access: false,
      zoning: 'WZ w trakcie wyrabiania',
      parcel_id: null,
      description: 'Straszydle, gm. Lubenia. Powierzchnia 1800 m² (18 ar), wymiary 50x36 m. WZ w trakcie wyrabiania ⚠️. Dojazd nieutwardzony ⚠️. ~20–25 min od Rzeszowa. Cena 180 000 zł (100 zł/m²). Kontakt: Rehouse Nieruchomości, Rzeszów. Uwagi: Widokowa, otwarta okolica. Otodom ID: 65657720.',
    },
    {
      title: 'Bobrowa gm. Żyraków – 3 warianty 12-15ar WZ wydane',
      location_text: 'Bobrowa, gm. Żyraków',
      area_m2: null,
      asking_price_pln: null,
      source_url: 'https://www.facebook.com/groups/385924585662380/permalink/1961037558151067/',
      source_type: 'facebook',
      status: 'inbox',
      has_electricity: null,
      has_gas: null,
      has_water: null,
      has_sewage: null,
      has_road_access: true,
      zoning: 'WZ wydane',
      parcel_id: null,
      description: 'Bobrowa, gm. Żyraków. Powierzchnia: 3 warianty – 12,77 / 12,97 / 15,47 ar, wymiary regularne. WZ wydane. Media w sąsiedztwie (prąd, woda, kanalizacja). Dojazd asfaltowy. ~40 km od Rzeszowa (6 km od Dębicy). Cena nieznana. Kontakt: 535 604 199 – Michał Krupiński. Uwagi: Za daleko na dziś; dobra infrastruktura w sąsiedztwie.',
    },
    {
      title: 'Trzciana – dom surowy otwarty 201m² 6 pokoi',
      location_text: 'Trzciana',
      area_m2: 1324,
      asking_price_pln: 599000,
      source_url: 'https://www.facebook.com/groups/385924585662380/permalink/1960052704916219/',
      source_type: 'facebook',
      status: 'inbox',
      has_electricity: null,
      has_gas: null,
      has_water: null,
      has_sewage: null,
      has_road_access: true,
      zoning: 'pozwolenie na budowę',
      parcel_id: null,
      description: 'Trzciana. Dom surowy otwarty, 201,89 m² pow. użytkowej, 6 pokoi. Działka 1324 m² (13,24 ar). Pozwolenie na budowę. Dojazd utwardzony. ~25–30 min od Rzeszowa. Cena 599 000 zł. Kontakt: 697 877 634 – Małgorzata Pietruszka. Uwagi: Ostatnia linia zabudowy, taras z widokiem, garaż, gabinet.',
    },
    {
      title: 'Krosno Polanka – 2300m² pełne media pozwolenie na budowę',
      location_text: 'Krosno, Polanka',
      area_m2: 2300,
      asking_price_pln: 119000,
      source_url: 'https://www.otodom.pl/pl/oferta/ID67709549',
      source_type: 'otodom',
      status: 'inbox',
      has_electricity: true,
      has_gas: true,
      has_water: true,
      has_sewage: true,
      has_road_access: true,
      zoning: 'Pozwolenie na budowę',
      parcel_id: null,
      description: 'Krosno, Polanka. Powierzchnia 2300 m² (23 ar), wymiary 47x45 m. Pozwolenie na budowę ✅. Pełne media: prąd, gaz, woda, kanalizacja ✅. Dojazd asfaltowy. ~60 km od Rzeszowa. Cena 119 000 zł (52 zł/m²). Kontakt: M4-Biuro Nieruchomości, Krosno. Uwagi: Wyróżnia się – gotowe pozwolenie + pełne media + duża powierzchnia + niska cena. Otodom ID: 67709549.',
    },
    {
      title: 'Odrzykoń ul. Leśna – 3056m² WZ panorama na Krosno',
      location_text: 'Odrzykoń, ul. Leśna, gm. Wojaszówka',
      area_m2: 3056,
      asking_price_pln: 289000,
      source_url: 'https://www.otodom.pl/pl/oferta/ID66760685',
      source_type: 'otodom',
      status: 'inbox',
      has_electricity: null,
      has_gas: null,
      has_water: null,
      has_sewage: null,
      has_road_access: null,
      zoning: 'WZ wydane',
      parcel_id: '2930/2',
      description: 'Odrzykoń, ul. Leśna, gm. Wojaszówka. Powierzchnia 3056 m² (30,56 ar). WZ wydane. ~55 km od Rzeszowa (k. Krosna). Cena 289 000 zł (95 zł/m²). Kontakt: Kwadraciak Biuro Nieruchomości, Krosno. Uwagi: Największa działka w zestawieniu, panorama na Krosno i okolicę, blisko lasu. Otodom ID: 66760685.',
    },
    {
      title: 'Bóbrka gm. Chorkówka – 1400m² 60zł/m²',
      location_text: 'Bóbrka, gm. Chorkówka',
      area_m2: 1400,
      asking_price_pln: 84000,
      source_url: 'https://www.otodom.pl/pl/oferta/ID66105064',
      source_type: 'otodom',
      status: 'inbox',
      has_electricity: null,
      has_gas: null,
      has_water: null,
      has_sewage: null,
      has_road_access: true,
      zoning: 'możliwość WZ',
      parcel_id: null,
      description: 'Bóbrka, gm. Chorkówka. Powierzchnia 1400 m² (14 ar). Możliwość wystąpienia o WZ (brak WZ ⚠️). Dojazd droga gminna. ~55 km od Rzeszowa (k. Krosna). Cena 84 000 zł (60 zł/m²). Kontakt: Usiebie.pl BN, Krosno. Uwagi: 2. linia zabudowy od asfaltu. Otodom ID: 66105064.',
    },
  ];

  // ── 5. Wstaw działki ────────────────────────────────────────────────────
  console.log(`📋 Wstawiam ${dzialki.length} działek do workspace ${workspaceId}...`);
  let inserted = 0, failed = 0;

  for (const d of dzialki) {
    const { data: plot, error } = await sb.from('plots').insert({
      workspace_id: workspaceId,
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
    }).select().single();

    if (error) {
      if (error.code === '23505') {
        console.warn(`⚠️ Duplikat (pomijam): ${d.title}`);
      } else {
        console.error(`❌ Błąd: ${d.title}`, error.message);
        failed++;
      }
      continue;
    }

    console.log(`✅ Dodano: ${d.title} → ${plot.id}`);
    inserted++;

    // Dodaj notatkę z uwagami/kontaktem do każdej działki
    const noteLines = [];
    if (d.description.includes('Kontakt:')) {
      const contactMatch = d.description.match(/Kontakt: ([^\n.]+)/);
      if (contactMatch) noteLines.push(`Kontakt: ${contactMatch[1]}`);
    }

    if (noteLines.length > 0) {
      await sb.from('plot_notes').insert({
        plot_id: plot.id,
        workspace_id: workspaceId,
        user_id: user.id,
        content: noteLines.join('\n'),
        is_voice: false,
      });
    }

    // Triggeruj AI processing (fire & forget)
    const { data: { session } } = await sb.auth.getSession();
    fetch(`${sb.supabaseUrl}/functions/v1/process_plot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': sb.supabaseKey,
      },
      body: JSON.stringify({ plot_id: plot.id }),
    }).then(r => r.json()).then(r => {
      console.log(`🤖 AI dla "${d.title}": verdict=${r.verdict ?? 'pending'}`);
    }).catch(e => console.warn(`⚠️ AI error dla "${d.title}":`, e));

    // Małe opóźnienie żeby nie zarzucić edge function
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n🏁 Gotowe! Wstawiono: ${inserted}, błędy: ${failed}`);
  console.log(`👉 Otwórz inbox: /app/workspace/${workspaceId}/inbox`);
  alert(`✅ Wstawiono ${inserted} działek! AI jest w trakcie analizowania każdej z nich. Odśwież stronę i sprawdź inbox.`);
})();
