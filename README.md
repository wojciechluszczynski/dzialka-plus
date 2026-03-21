# DecisionEngine — Działki Budowlane

> Twój system decyzyjny dla działek budowlanych. Dodaj działkę w 30–60 sekund i natychmiast wiedz: czy warto ją dalej cisnąć.

## Stack

| Warstwa | Technologia |
|---|---|
| Mobile | Expo 51 / React Native + TypeScript + Expo Router |
| Web | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS (web) + StyleSheet/theme.ts (mobile) |
| Backend | Supabase (Postgres, Auth, Realtime, Storage, Edge Functions) |
| AI | Anthropic Claude API — structured outputs + vision |
| Mapy | Mapbox SDK + Google Distance Matrix API |
| Push | Expo Notifications (APNs/FCM) + Supabase web push |
| Offline | Expo SQLite + outbox sync pattern |
| CI/CD | GitHub Actions + Expo EAS Build + Vercel |

## Monorepo struktura

```
decision-engine/
├── apps/
│   ├── mobile/          # Expo React Native
│   └── web/             # Next.js 14
├── packages/
│   ├── db/              # TypeScript types + Supabase client
│   ├── ai/              # AI prompts + Anthropic client
│   ├── scoring/         # Scoring formulas
│   └── ui/              # Shared design tokens
├── supabase/
│   └── migrations/      # SQL migrations
├── docs/                # PRD, Design System, Prompt Library, etc.
└── .github/workflows/   # CI/CD
```

## Start lokalny

### Wymagania

- Node.js >= 20
- npm >= 10
- Expo CLI: `npm i -g expo-cli eas-cli`
- Supabase CLI: `brew install supabase/tap/supabase`

### Setup

```bash
# 1. Klonuj repo
git clone git@github.com:wojciechluszczynski/dzialka-plus.git
cd dzialka-plus

# 2. Zainstaluj dependencies
npm install

# 3. Skopiuj .env
cp .env.example .env.local
# Uzupełnij: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, itd.

# 4. Uruchom Supabase lokalnie
supabase start
supabase db reset  # uruchomi wszystkie migracje

# 5. Uruchom web
npm run web

# 6. Uruchom mobile
npm run mobile
```

### Supabase local

Po `supabase start` Studio dostępne pod: http://localhost:54323

## Sprinty

| Sprint | Zakres | Status |
|---|---|---|
| Sprint 0 | Monorepo, schema, auth, bottom nav, CI/CD | ✅ Done |
| Sprint 1 | Quick Add, Inbox, FB share-to-app, AI draft | 🔜 |
| Sprint 2 | Plot Detail, status workflow, contacts, mapa | 🔜 |
| Sprint 3 | Scoring + shared, deal breakers, compare | 🔜 |
| Sprint 4 | AI extraction, risk flags, valuation, questions | 🔜 |
| Sprint 5 | Enrichment: RCN, ISOK, PSE, travel times | 🔜 |
| Sprint 6 | Push notifications, change log, presence | 🔜 |
| Sprint 7 | Web table view, bulk edit, export CSV | 🔜 |
| Sprint 8 | Offline hardening, QA, performance | 🔜 |

## Dokumenty

| Dokument | Ścieżka |
|---|---|
| PRD | `docs/PRD.md` |
| Deep Research | `docs/deep-research-report.md` |
| Design System | `docs/DecisionEngine-Design-System.md` |
| Design Tokens | `docs/design-tokens.md` |
| Prompt Library | `docs/prompt-library.md` |
| Test Scenarios | `docs/test-scenarios.md` |
| Onboarding Flow | `docs/onboarding-flow.md` |

---

*DecisionEngine v1.0.0 — Sprint 0 · 2026-03-21*