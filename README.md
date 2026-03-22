# Działkometr

AI-powered building plot evaluation tool for the Polish real estate market. Add a listing via URL, pasted text, or screenshot — Claude extracts structured data and runs a full risk analysis.

**Production:** https://dzialkometr.netlify.app
**Supabase project:** `sdhwhtsikglsfzewhgqc`

---

## Features

- **AI extraction** — paste a listing URL (otodom, OLX, gratka, etc.) or raw text (FB post, SMS) and Claude extracts price, area, location, utilities, contact
- **Claude Vision** — upload a screenshot from your phone and Claude reads the listing image
- **Risk flagging** — automatic risk analysis with severity levels (low/med/high) and dealbreaker detection
- **Scoring** — each plot gets a 0–10 score and a verdict: ✓ GO / ~ MAYBE / ✗ NO
- **Bookmarklet** — one-click save from any browser page (Facebook, portals, anywhere)
- **Dashboard** — overview of all plots with stats, recent activity, quick actions
- **Compare view** — side-by-side comparison of shortlisted plots
- **Google Maps links** — every location has a direct Maps link

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Hosting | Netlify (auto-deploy from `main`) |
| Backend | Supabase — Postgres, Auth (email), Edge Functions (Deno) |
| AI | Anthropic Claude Sonnet — extraction, risk analysis, Vision |
| Mobile | Expo 51 / React Native *(in progress)* |
| Monorepo | Turborepo |

---

## Project Structure

```
dzialka-plus/
├── apps/
│   ├── web/                    Next.js web app
│   │   └── app/
│   │       ├── app/            Authenticated app routes
│   │       │   └── workspace/[id]/
│   │       │       ├── page.tsx          Dashboard (main screen)
│   │       │       ├── inbox/            All plots — add, filter, sort
│   │       │       ├── plot/[id]/        Plot detail with AI panel
│   │       │       ├── shortlist/        Starred / shortlisted plots
│   │       │       └── compare/          Side-by-side comparison
│   │       ├── auth/           Login + workspace setup
│   │       └── auto-add/       Bookmarklet redirect handler
│   └── mobile/                 Expo React Native (WIP)
├── packages/
│   ├── db/                     TypeScript types matching Supabase schema
│   ├── ui/                     Shared design tokens (colors, labels)
│   └── scoring/                Scoring formula utilities
└── supabase/
    ├── migrations/             Postgres schema (versioned SQL)
    └── functions/
        └── process_plot/       Edge Function — AI extraction + scoring
```

---

## Key Database Tables

| Table | Purpose |
|-------|---------|
| `plots` | Core plot data (price, area, location, utilities…) |
| `plot_scores` | AI-computed verdict + score (0–10), dealbreaker flag |
| `plot_ai_reports` | Raw AI JSON (extraction + risk flags) |
| `plot_notes` | User-pasted text notes (used as AI input) |
| `plot_sources` | Original listing source metadata |
| `workspaces` | Multi-user workspace |
| `workspace_members` | User ↔ workspace with role (owner/editor) |

---

## Local Development

```bash
git clone git@github.com:wojciechluszczynski/dzialka-plus.git
cd dzialka-plus
npm install          # installs all workspace dependencies via Turborepo

# Set up env
cp apps/web/.env.example apps/web/.env.local
# Fill in: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# Run web app
cd apps/web && npm run dev
# → http://localhost:3000
```

---

## Edge Function Deployment

The AI processing runs in a Supabase Edge Function (Deno):

```bash
# One-time login
supabase login

# Deploy
supabase functions deploy process_plot --project-ref sdhwhtsikglsfzewhgqc

# View logs
supabase functions logs process_plot --project-ref sdhwhtsikglsfzewhgqc
```

The function requires these Supabase secrets:
- `ANTHROPIC_API_KEY` — Claude API key

---

## Bookmarklet

Install the bookmarklet from: https://dzialkometr.netlify.app/bookmarklet.html

When clicked on any Facebook listing or real estate portal, it redirects to the Działkometr inbox with the URL pre-filled and the add dialog open. For Facebook (which blocks content scraping), paste the listing text manually in the textarea.

---

## Deployment

Netlify auto-deploys on every push to `main`. Build command: `npm run build` (Turborepo). Publish directory: `apps/web/.next`.

**Do not commit `package-lock.json`** — it's in `.gitignore` because the sandbox-generated lockfile causes React version conflicts in Netlify builds.

---

## License

Copyright © Wojciech Łuszczyński. All rights reserved.
