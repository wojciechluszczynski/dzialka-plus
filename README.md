# Działkometr

AI-powered building plot evaluation tool for the Polish real estate market. Add a listing via URL, pasted text, or screenshot — Claude extracts structured data and runs a risk analysis.

**Production:** https://dzialkometr.netlify.app

## Tech Stack

- **Web:** Next.js 14 (App Router), TypeScript, Tailwind CSS — deployed on Netlify
- **Mobile:** Expo 51 / React Native *(in progress)*
- **Backend:** Supabase — Postgres, Auth, Edge Functions
- **AI:** Anthropic Claude — listing extraction, risk flagging, Claude Vision for screenshots

## Local Development

```bash
git clone git@github.com:wojciechluszczynski/dzialka-plus.git
cd dzialka-plus && npm install
cp apps/web/.env.example apps/web/.env.local  # fill in Supabase keys
cd apps/web && npm run dev
```

## Edge Functions

```bash
supabase login
supabase functions deploy process_plot --project-ref sdhwhtsikglsfzewhgqc
```

## Structure

```
apps/web/          Next.js web app
apps/mobile/       Expo React Native
packages/db/       TypeScript types + Supabase client
packages/ui/       Design tokens
packages/scoring/  Scoring formulas
supabase/          Migrations + Edge Functions
```

## License

Copyright © Wojciech Łuszczyński. All rights reserved.
