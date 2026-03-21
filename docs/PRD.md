# PRD — Decision Engine do działek budowlanych

> Wersja: 1.0 | Data: 2026-03-21
> Status: Zatwierdzony do Sprint 0
> Właściciel: Wojtek (Product Owner)

---

## 1. Cel produktu i kontekst

### Job-to-be-done

„Dodaję działkę w 30–60 sekund i natychmiast widzę: **czy warto ją dalej cisnąć**, **jakie są ryzyka**, **jak stoi cenowo do okolicy**, oraz **jak wypada względem shortlisty**."

### Użytkownicy MVP

| Rola | Opis | Dostęp |
|---|---|---|
| Rola A (Wojtek) | Właściciel workspace, dodaje działki, ocenia, zarządza | Owner — pełny dostęp |
| Rola B (Sabina) | Partner decyzyjny, ocenia, komentuje, dodaje notatki | Editor — współdzielony workspace |

### Problem do rozwiązania

- Oferty działek są **rozproszone** po Facebooku (grupy, Marketplace), Otodom, OLX, Adresowo, Gratka, bezpośrednich kontaktach
- Nie ma wspólnego miejsca do **porównywania** wielu działek obok siebie
- Brak **ustrukturyzowanej oceny** prowadzi do subiektywnych i niespójnych decyzji
- Informacje o ryzykach (powódź, linia energetyczna, brak drogi, brak MPZP) są trudne do zebrania bez systemu
- Współpraca Wojtek–Sabina odbywa się przez chaotyczne wiadomości/screenshoty

---

## 2. Zakres MVP (must-have)

### 2.1 Intake działek

| Feature | Opis | Priorytet |
|---|---|---|
| Share-to-app (iOS + Android) | Udostępnij link z Facebooka bezpośrednio do aplikacji | P0 |
| Paste URL + detekcja domeny | Wklej link → system rozpoznaje portal (Otodom/OLX/FB/inne) | P0 |
| Upload screenshotów | Dodaj zdjęcia ekranu z ogłoszenia FB | P0 |
| Ręczne dodanie | Formularz bez URL (działka z kontaktu/wizji) | P0 |
| Facebook intake flow | Dedykowany formularz dla linków FB (typ grupy, autor, treść, screeny) | P0 |
| Preview linku | OpenGraph: tytuł, zdjęcie, domena — dla draftu | P1 |
| Duplikat guard | Blokuje ten sam source_url w workspace | P1 |

### 2.2 Draft flow i statusy

```
inbox → draft → to_analyze → to_visit → visited → due_diligence → shortlist → top3 → rejected / closed
```

Każda zmiana statusu jest logowana w `plot_activity` (kto, kiedy, z czego na co).

### 2.3 Karta działki (Plot Detail)

Sekcje:
- **Overview**: tytuł, cena, m², cena/m², lokalizacja, opis, źródło, status
- **Mapa**: pin na mapie (Mapbox), strefa dojazdu, POI w pobliżu
- **Media**: zdjęcia z ogłoszenia, screeny, zdjęcia z wizyty
- **Ryzyka**: checklist deal breakers, flagi AI, enrichment data (ISOK, PSE)
- **Scoring**: oceny Wojtek/Sabina/Shared per kryterium + werdykt
- **AI Panel**: extraction confidence, risk flags, valuation note, pytania do sprzedającego
- **Kontakty**: lista kontaktów + log interakcji (call/SMS/messenger/visit)
- **Activity log**: historia zmian (kto/co/kiedy)

### 2.4 System scoringu

- Oceny per kryterium (0–10 sliders), per użytkownik
- 6 kryteriów z edytowalnymi wagami (patrz: `docs/deep-research-report.md`)
- Shared score = średnia ważona − penalizacja rozbieżności
- Deal breaker triggered → verdict = 'no', score max 3.0
- Werdykt: GO / MAYBE / NO

### 2.5 Porównanie

- **Mobile**: porównanie 2–5 działek (tabela pól + różnice score)
- **Web panel**: tabela 50–100 działek (filtry, sortowanie, bulk edit statusów)
- **Shortlist**: premium cards z hero zdjęciem, score, risk badge

### 2.6 Collaboration

- Supabase Realtime: live-update listy i statusów
- Push notyfikacje: gdy partner doda/zmieni działkę (Expo → APNs/FCM)
- In-app toast: „Sabina zmieniła status działki X"
- Change log UI: filtrowanie per użytkownik

### 2.7 Offline

- Outbox pattern: każda akcja → zapis lokalny → sync po reconnect
- Offline banner w dole ekranu (wzór z DecisionEngine-Design-System.md sekcja 19)
- Conflict resolution: last-write-wins + activity trail
- Sync indicator: pending / synced pill

### 2.8 AI pipeline

- Extraction z tekstu + screenshotów (Claude API, vision + structured outputs)
- Risk flags + deal breaker suggestions
- Valuation note (porównanie z RCN jeśli dostępne)
- Question generator (pytania do sprzedającego)
- Verdict summary (GO/MAYBE/NO + uzasadnienie)
- Każde pole: confidence 0.0–1.0 + oznaczenie AI-generated/manual/missing

---

## 3. Non-goals (explicit MVP exclusions)

- Pełne czytanie grup Facebooka przez API (Graph API v19 deprecations)
- Automatyczna analiza prawna „jak notariusz"
- Pełny scraping portali (OLX/Otodom/Gratka)
- Symulacja inwestycyjna (flip/rental calculator)
- Publiczny marketplace / SaaS onboarding (MVP = prywatny workspace)
- Multi-workspace z rolami granularnymi (v2)
- Parsery domenowe per portal (v2 — test-driven, bo portale zmieniają DOM)

---

## 4. Ekrany aplikacji

### Nawigacja główna (Bottom Nav — mobile)

```
Home/Dashboard | Inbox | [+] Quick Add | Shortlist | More
```

Środkowy przycisk (+) = FAB wyróżniony, accent color, podniesiony.

### Lista ekranów

| Platforma | Ekran | Opis |
|---|---|---|
| Mobile | Auth / Workspace | Logowanie (email + magic link); tworzenie/dołączanie workspace |
| Mobile | Home/Dashboard | Top 3 działki, ostatnia aktywność partnera, szybkie stats, alert nowych |
| Mobile | Inbox | Świeże linki/drafty, status RAW/DRAFT, filtry source/status |
| Mobile | Quick Add (modal) | 1 pole URL + opcjonalnie tekst + upload screenów |
| Mobile | Plot Draft | Uzupełnij brakujące pola; confidence indicator; CTA „Run analysis" |
| Mobile | Plot Detail | Sekcje: overview, mapa, media, ryzyka, scoring, AI, kontakty, activity |
| Mobile | Plot Edit | Edycja wszystkich pól działki |
| Mobile | Scoring Screen | Slidery 0–10 per kryterium; podgląd score partnera |
| Mobile | Compare (2–5) | Tabelaryczne zestawienie pól + różnice score |
| Mobile | Shortlist | Premium cards z hero zdjęciem, score, risk badge |
| Mobile | Field Mode | Zdjęcia, notatka głosowa/tekst, checklist wizyty, ocena post-visit |
| Mobile | Contacts | Lista kontaktów + log interakcji |
| Mobile | Settings | Wagi scoringu, deal breakery, strefy lokalizacji, targety dojazdu |
| Web | Table View | Tabela 50–100 działek, filtry, sort, saved views, bulk edit |
| Web | Compare / Shortlist | Tabelaryczne + premium cards + eksport CSV |
| Web | Admin/Config | Konfiguracja endpointów WMS/WFS, integracji |

---

## 5. Model danych (summary)

Pełne SQL migracje → `docs/deep-research-report.md`

| Tabela | Opis |
|---|---|
| `workspaces` | Workspace (prywatny lub współdzielony) |
| `workspace_members` | Przynależność użytkowników do workspace |
| `workspace_invites` | Tokeny zaproszeń (Rola B) |
| `plots` | Główna encja — działka |
| `plot_sources` | Źródła ogłoszenia (FB / portal / agent / inne) |
| `plot_contacts` | Kontakty związane z działką |
| `contact_logs` | Historia interakcji (call/SMS/messenger/visit) |
| `plot_media` | Zdjęcia, screenshoty, dokumenty |
| `plot_notes` | Notatki użytkowników |
| `plot_assessments` | Oceny per użytkownik per kryterium (0–10) |
| `plot_scores` | Agregowany score (W/S/Shared) + werdykt |
| `plot_ai_reports` | Wyniki AI (extraction, risk flags, valuation, questions) |
| `plot_enrichments` | Dane z RCN, ISOK, PSE, travel times |
| `plot_activity` | Audit log wszystkich zmian |
| `scoring_profiles` | Profile wag scoringu per workspace |
| `commute_targets` | Zdefiniowane targety dojazdu |
| `integration_endpoints` | Konfiguracja endpointów WMS/WFS |

---

## 6. Stack technologiczny

| Warstwa | Technologia |
|---|---|
| Mobile | Expo / React Native + TypeScript + Expo Router |
| Web | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS (web) + StyleSheet/theme.ts (mobile) |
| Backend | Supabase (Postgres, Auth, Realtime, Storage, Edge Functions) |
| AI | Anthropic Claude API — structured outputs + vision |
| Mapy | Mapbox SDK (offline) + Google Distance Matrix API |
| Push | Expo Notifications (APNs/FCM) + Supabase web push |
| Offline | Expo SQLite + outbox sync pattern |
| CI/CD | GitHub Actions + Expo EAS Build + Vercel/Netlify |

---

## 7. Kluczowe zasady implementacji

### Design

- **Inspiracja**: mobile.de — duże hero zdjęcia, premium cards, minimalizm
- **NIE**: BMW glassmorphism jako dominujący motyw
- Glassmorphism tylko na kartach (surface variants z `docs/design-tokens.md`)
- Typografia: **Rajdhani** (headings) + **Inter** (body)
- Każda działka = „ogłoszenie auta" w mobile.de
- STATUS_COLORS, RISK_COLORS, SOURCE_LABELS → stałe mappings w `packages/ui`

### Facebook Intake

- Share-to-app jako primary flow (iOS share extension / Android share intent)
- Fallback: paste URL + screenshoty + ręczny tekst
- **NIE** buduj rdzenia wokół Facebook API (zdeprecjonowane)
- Po rozpoznaniu `facebook.com` → dedykowany formularz FB

### AI Pipeline

- Użyj promptów DOKŁADNIE z `docs/prompt-library.md`
- Wszystkie AI outputs: structured JSON + confidence 0–1
- Oznaczaj pola: AI-generated / manual / missing
- Nie wyświetlaj AI output bez confidence indicator

### Scoring

- Formuły DOKŁADNIE z `docs/deep-research-report.md` sekcja „Model scoringu"
- Deal breaker triggered → verdict = 'no', score max 3.0
- Wagi konfigurowalne w Settings (persystowane w `scoring_profiles`)

### Offline

- Outbox pattern: każda akcja → zapis lokalny → sync po reconnect
- Konflikt resolution: last-write-wins + activity trail
- Offline banner na dole ekranu (wzór z DecisionEngine-Design-System.md sekcja 19)

### Realtime

- Supabase Realtime na tabeli `plot_activity` i `plots`
- Push notification gdy partner zmieni lub doda działkę

---

## 8. Roadmapa (sprinty)

| Sprint | Zakres | Czas |
|---|---|---|
| Sprint 0 | Monorepo setup, Supabase schema + RLS, design tokens, auth, bottom nav, CI/CD | 4 dni |
| Sprint 1 | Quick Add, Inbox, FB share-to-app, AI draft, screenshoty | 4 dni |
| Sprint 2 | Plot Detail, status workflow, contacts + logs, mapa v0, activity log | 4 dni |
| Sprint 3 | Scoring per user + shared, deal breakers, compare (2–5), shortlist | 4 dni |
| Sprint 4 | AI extraction, risk flags, valuation note, question generator, confidence UI | 4 dni |
| Sprint 5 | Enrichment: RCN, ISOK flood, PSE, travel times, POI | 4 dni |
| Sprint 6 | Push notyfikacje, change log UI, presence | 4 dni |
| Sprint 7 | Web table view, bulk edit, compare web, eksport | 3 dni |
| Sprint 8 | Offline sync hardening, field mode v1, QA regression, performance | 3 dni |

---

## 9. Metryki sukcesu MVP

| Metryka | Target |
|---|---|
| Time-to-capture | < 60 s od znalezienia ogłoszenia do Draft |
| Completeness score | > 80% działek z uzupełnioną: cena + m² + lokalizacja + kontakt (w 24h) |
| Decision velocity | > 70% działek z inbox → rejected/to_visit w ciągu 7 dni |
| AI usefulness | > 50% działek z użytym question generator przed kontaktem |
| Collaboration | Średni czas reakcji Sabiny na push < 4h |

---

## 10. Dokumenty powiązane

| Dokument | Lokalizacja | Status |
|---|---|---|
| Deep Research Report | `docs/deep-research-report.md` | ✅ Gotowy |
| Design System (DecisionEngine) | `docs/DecisionEngine-Design-System.md` | ✅ Gotowy |
| Design Tokens | `docs/design-tokens.md` | ✅ Gotowy |
| Prompt Library | `docs/prompt-library.md` | ✅ Gotowy |
| Test Scenarios | `docs/test-scenarios.md` | ✅ Gotowy |
| Onboarding Flow (Rola B) | `docs/onboarding-flow.md` | ✅ Gotowy |
| SQL Migrations | `supabase/migrations/` | Generuje Claude Code |
| TypeScript Types | `packages/db/types.ts` | Generuje Claude Code |

---

*PRD przygotowany na podstawie sesji discovery z Wojtkiem i Sabiną.*
*Ostatnia aktualizacja: 2026-03-21*
