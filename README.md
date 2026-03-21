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

## Deployment — Netlify (dzialkometr.netlify.app)

Aplikacja web jest deployowana przez Netlify na adres **https://dzialkometr.netlify.app**.

### Pierwsze wdrożenie

1. Zaloguj się na [netlify.com](https://app.netlify.com)
2. **Add new site → Import an existing project → GitHub**
3. Wybierz repo: `wojciechluszczynski/dzialka-plus`
4. **Site name**: `dzialkometr`
5. Build settings są automatycznie pobierane z `netlify.toml` w root repo:
   - Base dir: `apps/web`
   - Build command: `cd ../.. && npm install && cd apps/web && npm run build`
   - Publish dir: `apps/web/.next`
6. **Environment variables** (Settings → Environment variables):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ANTHROPIC_API_KEY=sk-ant-...
   NEXTAUTH_SECRET=<random-32-chars>
   NEXT_PUBLIC_APP_URL=https://dzialkometr.netlify.app
   ```
7. Kliknij **Deploy site**

### Kolejne deploy'e

Każdy push do `main` triggeruje automatyczny deploy przez webhook GitHub → Netlify.

### Supabase Edge Functions

Deploy Edge Functions ręcznie przez Supabase CLI:

```bash
supabase functions deploy process_plot --project-ref YOUR_PROJECT_REF
supabase functions deploy generate_invite --project-ref YOUR_PROJECT_REF
supabase functions deploy accept_invite --project-ref YOUR_PROJECT_REF
```

Ustaw też secrets w Supabase Dashboard → Edge Functions → Secrets:
```
ANTHROPIC_API_KEY=sk-ant-...
APP_URL=https://dzialkometr.netlify.app
```

---

## Sprinty

| Sprint | Zakres | Status |
|---|---|---|
| Sprint 0 | Monorepo, schema, auth, bottom nav, CI/CD | ✅ Done |
| Sprint 1 | Quick Add (3 tryby + image), Inbox swipe, AI Edge Fn, PlotDetail + real-time, Web Add/Status/Invite, Netlify config | ✅ Done |
| Sprint 2 | Scoring UI, deal-breakers, partner view, notatki + kontakty | 🔜 |
| Sprint 3 | AI extraction full flow, risk flags UI, valuation, auto-questions | 🔜 |
| Sprint 4 | Enrichment: RCN, ISOK, PSE, travel times (Mapbox/Google) | 🔜 |
| Sprint 5 | Push notifications, change log, presence, activity feed | 🔜 |
| Sprint 6 | Web: bulk edit, export CSV, compare view | 🔜 |
| Sprint 7 | Offline hardening (SQLite + outbox), QA, performance | 🔜 |

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

*DecisionEngine v1.1.0 — Sprint 1 · 2026-03-21*