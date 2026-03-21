# Test Scenarios — DecisionEngine

> Wersja: 1.0 | Data: 2026-03-21
> 8 scenariuszy testowych: happy path + edge cases.
> Platform: Mobile (Expo) + Web (Next.js) + Backend (Supabase).

---

## Format scenariusza

Każdy scenariusz zawiera:
- **ID** — unikalny identyfikator (TS-01 … TS-08)
- **Tytuł** — krótki opis
- **Platforma** — mobile / web / backend / full-stack
- **Epic** — FOUNDATION / INGEST / PLOT / SCORE / AI / ENRICH / COLLAB / HARDEN
- **Preconditions** — co musi być spełnione przed testem
- **Steps** — kroki do wykonania
- **Expected result** — oczekiwany wynik
- **Edge cases** — warianty brzegowe
- **Acceptance criteria** — twarde kryteria zaliczenia

---

## TS-01: Happy Path — Dodanie działki z Facebooka (Share-to-App)

**Platforma:** Mobile (iOS)
**Epic:** INGEST
**Priorytet:** P0 — KRYTYCZNY (to jest główny use case)

### Preconditions
- Użytkownik zalogowany jako Wojtek (Rola A)
- Workspace istnieje, Sabina jest member
- Aplikacja zainstalowana na iOS z aktywną share extension
- Połączenie z internetem

### Steps
1. Na telefonie: otwórz aplikację Facebook → wejdź na grupę z ogłoszeniem działki
2. Tap: udostępnij post → „Share to DecisionEngine"
3. Aplikacja otwiera się z pre-filled URL w Quick Add modal
4. Opcjonalnie: dodaj 2 screenshoty z widocznymi informacjami (cena, m², telefon)
5. Opcjonalnie: wpisz raw text z posta jeśli URL nie daje preview
6. Tap: „Zapisz do Inbox"
7. Poczekaj na AI extraction (max 30s) — lub wróć do Inbox
8. Otwórz Draft z Inbox → sprawdź extraction confidence
9. Uzupełnij brakujące pola (jeśli confidence < 0.7 na kluczowych)
10. Tap: „Uruchom analizę"

### Expected Result
- Działka tworzy się w `plots` ze statusem `inbox` → automatycznie `draft`
- `plot_sources` zawiera `source_type = 'facebook_group'` + source_url
- `plot_ai_reports.extraction_json` wypełniony z confidence_overall > 0.5
- Screenshoty uploaded do Supabase Storage; ścieżki w `plot_media`
- Draft screen pokazuje: extracted fields z confidence badges, missing fields z CTA
- Sabina dostaje in-app notification: „Wojtek dodał nową działkę"

### Edge Cases
| Scenario | Expected Behavior |
|---|---|
| Share intent dostarcza tylko URL, bez tytułu | System pokazuje preview z OG jeśli dostępne; bez preview = puste pole tytułu |
| Facebook nie daje podglądu (link prywatny) | Formularz FB intake z pustym preview; AI działa tylko na screenshotach |
| AI timeout po 30s | Automatyczny retry; po 2 próbach → draft bez AI data, banner „Analiza w toku" |
| Duplicate URL (już istnieje w workspace) | Warning modal: „Ta działka już istnieje — [link do działki]" |
| Brak połączenia podczas Save | Zapis do lokalnego outbox (SQLite); sync po reconnect |

### Acceptance Criteria
- [ ] iOS share extension widoczna w arkuszu udostępniania
- [ ] URL przenoszony do Quick Add poprawnie
- [ ] Zapis działki do Inbox < 3s (lokalne + enqueue)
- [ ] Sabina dostaje notification w < 30s (Realtime lub push)
- [ ] Duplicate guard działa i nie duplikuje działki

---

## TS-02: Happy Path — Intake z portalu (Otodom/OLX paste URL)

**Platforma:** Mobile
**Epic:** INGEST
**Priorytet:** P0

### Preconditions
- Zalogowany jako Wojtek
- Połączenie z internetem

### Steps
1. Tap FAB (+) → Quick Add modal
2. Wklej URL z Otodom (np. `https://www.otodom.pl/pl/oferta/...`)
3. System rozpoznaje domenę → pokazuje preview (title, zdjęcie hero)
4. Tap: „Zapisz do Inbox"
5. AI extraction uruchamia się asynchronicznie
6. Otwórz Draft → sprawdź wyciągnięte dane

### Expected Result
- `source_type = 'otodom'`, `source_domain = 'otodom.pl'`
- Preview title i image w draft
- AI wyciągnął: cena (jeśli w URL/preview), m², lokalizacja z confidence
- Missing fields dla danych niedostępnych w OG (np. kontakt, zoning)

### Edge Cases
| Scenario | Expected Behavior |
|---|---|
| URL z OLX | source_type = 'olx' |
| URL z Adresowo | source_type = 'adresowo' |
| URL z Gratka | source_type = 'gratka' |
| Nieznana domena | source_type = 'other'; generic intake |
| URL jest martwy (404) | Warning: „Link nieaktywny — ogłoszenie może być usunięte"; draft tworzony |

### Acceptance Criteria
- [ ] Detekcja domeny działa dla: otodom.pl, olx.pl, adresowo.pl, gratka.pl, facebook.com
- [ ] Preview (OG title + image) pokazuje się w < 5s
- [ ] source_type zapisany poprawnie w `plot_sources`

---

## TS-03: Happy Path — Scoring i werdykt wspólny

**Platforma:** Mobile (oba użytkownicy)
**Epic:** SCORE
**Priorytet:** P0

### Preconditions
- Działka w statusie `to_analyze`
- Wojtek i Sabina oba zalogowani (osobne urządzenia lub sesje)
- Scoring profile z domyślnymi wagami

### Steps
1. Wojtek: otwiera Plot Detail → zakładka „Scoring"
2. Wojtek: ocenia 6 kryteriów (sliders 0–10); dodaje komentarz; zapisuje
3. Sabina: dostaje push/notification → otwiera tę samą działkę → Scoring
4. Sabina: ocenia 6 kryteriów; jej oceny różnią się od Wojtka o ~2 pkt na kilku kryteriach
5. System: przelicza shared_score (średnia ważona − penalizacja rozbieżności)
6. Oboje widzą: wynik Wojtek / Sabina / Shared + werdykt GO/MAYBE/NO
7. Test deal breaker: Sabina aktywuje toggle „Brak drogi dojazdowej"
8. Weryfikacja: werdykt zmienia się na NO, shared_score ≤ 3.0

### Expected Result
- `plot_assessments` zawiera oceny per user
- `plot_scores` zawiera: wojtek_score, sabina_score, shared_score, disagreement, verdict
- Shared score obliczony wg formuły: `(W + S) / 2 - 0.8 × disagreement × 10`
- Po deal breaker: `dealbreaker_triggered = true`, `verdict = 'no'`, `shared_score ≤ 3.0`
- UI wyświetla score bars (Wojtek/Sabina/Shared) + disagreement indicator

### Edge Cases
| Scenario | Expected Behavior |
|---|---|
| Tylko Wojtek ocenił | Shared score = Wojtek score (Sabina pending); UI pokazuje „Czeka na ocenę Sabiny" |
| Oba ocenili z dużą rozbieżnością (> 3 pkt średnio) | Disagreement indicator widoczny; penalizacja aktywna |
| Brak oceny na jednym kryterium | Kryterium pomijane w obliczeniach; warning w UI |

### Acceptance Criteria
- [ ] Formula scoringu zgodna z docs/deep-research-report.md
- [ ] Deal breaker → verdict = 'no' niezależnie od score
- [ ] Score bars aktualizują się w real-time po zapisie przez drugiego usera (Realtime)
- [ ] Disagreement widoczny w UI gdy > 0.2

---

## TS-04: Happy Path — Compare (2–5 działek)

**Platforma:** Mobile + Web
**Epic:** SCORE
**Priorytet:** P0

### Preconditions
- Min. 3 działki w statusie `shortlist` lub wyżej
- Zalogowany Wojtek

### Steps
1. Mobile: Shortlist → long-press lub checkbox na 3 działkach → tap „Porównaj"
2. Compare screen: tabela z kolumnami (Działka A / B / C) i wierszami (pola)
3. Weryfikacja: widoczne różnice score, cena/m², risk badges
4. Tap na działkę w compare → przejście do Plot Detail
5. Web: Table View → zaznacz 3 działki → „Compare" → podobna tabela

### Expected Result
- Tabela 10–12 wierszy: tytuł, cena, m², cena/m², lokalizacja, ryzyko, score W/S/Shared, verdict, dojazd Rzeszów
- Różnice w score podświetlone (wyższy = zielony, niższy = czerwony)
- Export do CSV działający (web)

### Edge Cases
| Scenario | Expected Behavior |
|---|---|
| 6+ działek wybrane | Ostrzeżenie: max 5; wybiera się pierwsze 5 |
| Działka bez score | Kolumna score pusta; row = „Nie oceniona" |

### Acceptance Criteria
- [ ] Compare działa na mobile dla 2–5 działek
- [ ] Compare działa w web panelu
- [ ] Export CSV zawiera wszystkie kluczowe pola

---

## TS-05: Happy Path — Synchronizacja Realtime (Sabina → Wojtek)

**Platforma:** Mobile (2 urządzenia)
**Epic:** COLLAB
**Priorytet:** P0

### Preconditions
- Oba telefony zalogowane (Wojtek + Sabina) do tego samego workspace
- Połączenie z internetem

### Steps
1. Sabina: dodaje nową działkę przez Quick Add
2. Wojtek: powinien zobaczyć nową działkę w Inbox w < 30s (bez refresh)
3. Sabina: zmienia status działki z `inbox` → `to_analyze`
4. Wojtek: status na liście aktualizuje się w real-time
5. Wojtek: sprawdza Activity Log działki — widzi wpis „Sabina zmieniła status"

### Expected Result
- Supabase Realtime: `plot_activity` event wyzwala aktualizację listy u Wojtka
- Push notification (jeśli aplikacja w background): „Sabina dodała działkę: [tytuł]"
- Activity log zawiera: actor_id = Sabina, event_type = 'status_change', payload = { from, to }

### Edge Cases
| Scenario | Expected Behavior |
|---|---|
| Wojtek offline podczas dodania | Działka pojawia się po reconnect (pull sync) |
| Push token nie zarejestrowany | In-app notification (Realtime banner) jako fallback |

### Acceptance Criteria
- [ ] Realtime update < 5s (aplikacja w foreground)
- [ ] Push notification < 30s (aplikacja w background/killed)
- [ ] Activity log poprawnie rejestruje zmianę ze wszystkimi polami

---

## TS-06: Edge Case — Offline Add i Sync po Reconnect

**Platforma:** Mobile
**Epic:** HARDEN
**Priorytet:** P0

### Preconditions
- Zalogowany Wojtek
- Wyłącz połączenie sieciowe (Airplane mode)

### Steps
1. W trybie offline: Tap FAB (+) → Quick Add → wklej URL lub manual data → Zapisz
2. Verify: offline banner widoczny na dole ekranu
3. Verify: działka pojawia się w Inbox z ikoną „Sync pending"
4. Edytuj statusy 2 istniejących działek offline
5. Włącz połączenie sieciowe
6. Verify: outbox sync uruchomiony automatycznie
7. Verify: „Sync pending" → „Synced" toast
8. Verify: działki widoczne na Supabase (sprawdź web panel)

### Expected Result
- Nowa działka zapisana w local SQLite (outbox)
- Zmiany statusów zapisane w outbox z idempotency key
- Po reconnect: automatyczny sync bez user action
- Konflikty (jeśli Sabina zmieniła tę samą działkę offline): last-write-wins + activity trail
- Żaden wpis nie gubi się przy przerwie sieci

### Acceptance Criteria
- [ ] Offline banner pojawia się gdy brak sieci
- [ ] Quick Add działa bez internetu
- [ ] Outbox sync uruchamia się automatycznie po reconnect
- [ ] Idempotency: double-sync nie duplikuje wpisów
- [ ] Conflict: activity log zawiera oba zdarzenia

---

## TS-07: Edge Case — AI Confidence Low / Missing Fields

**Platforma:** Mobile + Backend
**Epic:** AI
**Priorytet:** P1

### Preconditions
- Działka dodana z screenshotem słabej jakości (nieczytelna cena, brak telefonu)
- AI extraction ukończona

### Steps
1. Otwórz Draft działki po extraction
2. Verify: pola z niskim confidence (< 0.5) oznaczone ostrzeżeniem
3. Verify: sekcja „Missing fields" z CTA „Uzupełnij"
4. Verify: score nie jest policzony (czeka na uzupełnienie)
5. Ręcznie uzupełnij: cena, m², kontakt
6. Tap: „Uruchom analizę ponownie" → re-extraction z nowym inputem
7. Verify: confidence rośnie dla uzupełnionych pól

### Expected Result
- Pola oznaczone: `AI-generated` (zielony), `manual` (niebieski), `missing` (czerwony/szary)
- Confidence meter widoczny per sekcja
- Missing fields blocker: score nie jest widoczny dopóki brak ceny + m² + lokalizacji
- Re-extraction merge'uje nowe confidence z poprzednimi wynikami

### Edge Cases
| Scenario | Expected Behavior |
|---|---|
| AI zwróci invalid JSON | Automatic retry × 2; po 3 próbach → error state + manual only |
| confidence_overall = 0.0 | Alert: „AI nie mogła przetworzyć ogłoszenia — uzupełnij ręcznie" |

### Acceptance Criteria
- [ ] Każde pole AI-generated ma widoczny confidence indicator (badge/ikona)
- [ ] Missing fields lista jest klikalna i prowadzi do edycji
- [ ] Score nie kalkuluje się z brakującymi polami krytycznymi
- [ ] Błąd AI nie blokuje użytkownika — może działać ręcznie

---

## TS-08: Edge Case — RLS Security (workspace isolation)

**Platforma:** Backend (Supabase RLS)
**Epic:** FOUNDATION
**Priorytet:** P0 — SECURITY CRITICAL

### Preconditions
- Workspace A: Wojtek + Sabina
- Workspace B: Osobna para użytkowników z własnymi działkami
- Obaj zalogowani przez Supabase Auth

### Steps
1. Zaloguj się jako Wojtek (Workspace A)
2. Verify: `GET /plots` → tylko działki z Workspace A
3. Próba bezpośredniego dostępu do działki z Workspace B przez UUID (znany z zewnątrz)
4. Próba UPDATE działki z Workspace B przez API (Supabase client z tokenem Wojtka)
5. Zaloguj się jako użytkownik z Workspace B
6. Verify: nie widzi żadnych danych z Workspace A

### Expected Result
- `SELECT` z tokenu Workspace A na tabeli `plots` → tylko rekordy gdzie `workspace_id` należy do Workspace A
- Bezpośredni dostęp przez UUID do działki z Workspace B → zwraca 0 wierszy (RLS blokuje)
- `UPDATE`/`DELETE` na rekordzie z innego workspace → 0 affected rows (nie błąd 403, ale pusta odpowiedź)
- W activity logu brak wpisów o „nieautoryzowanych" próbach (RLS nie loguje, po prostu blokuje)

### Edge Cases
| Scenario | Expected Behavior |
|---|---|
| Użytkownik nie jest w żadnym workspace | Żadne działki nie są widoczne; endpoint zwraca [] |
| Invite token użyty → user dołącza do workspace | Widzi działki workspace po dołączeniu, nie wcześniej |

### Acceptance Criteria
- [ ] RLS test negatywny: user z Workspace A nie widzi danych Workspace B
- [ ] RLS test pozytywny: user z Workspace A widzi swoje dane
- [ ] Polityki RLS działają dla: plots, plot_sources, plot_contacts, contact_logs, plot_media, plot_ai_reports, plot_enrichments, plot_activity
- [ ] Brak możliwości „odgadnięcia" UUID działki z innego workspace

---

## Matryca priorytetów testów

| ID | Tytuł | Epic | Priorytet | Sprint |
|---|---|---|---|---|
| TS-01 | Facebook share-to-app | INGEST | P0 | S1 |
| TS-02 | Portal intake (Otodom/OLX) | INGEST | P0 | S1 |
| TS-03 | Scoring + shared verdict | SCORE | P0 | S3 |
| TS-04 | Compare (2–5 działek) | SCORE | P0 | S3 |
| TS-05 | Realtime sync (Sabina→Wojtek) | COLLAB | P0 | S6 |
| TS-06 | Offline add + sync | HARDEN | P0 | S8 |
| TS-07 | AI confidence low / missing | AI | P1 | S4 |
| TS-08 | RLS security isolation | FOUNDATION | P0 | S0 |

---

*Test Scenarios v1.0 — DecisionEngine*
*Data: 2026-03-21*
