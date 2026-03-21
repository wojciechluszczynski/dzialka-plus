# Onboarding Flow — Rola B (Sabina / Invite Token)

> Wersja: 1.0 | Data: 2026-03-21
> Opis przepływu dołączenia drugiego użytkownika do workspace przez invite token.

---

## Kontekst

System obsługuje model **2-osobowego workspace**: Rola A (Owner — np. Wojtek) tworzy workspace po pierwszym logowaniu i generuje zaproszenie dla Roli B (Editor — np. Sabina).

Zaproszenie działa przez **jednorazowy token** (tabela `workspace_invites`). Token ma określony czas ważności i jest unieważniany po użyciu.

---

## Flow Roli A (Owner) — generowanie zaproszenia

### Krok 1: Pierwsze logowanie i tworzenie workspace

```
AuthScreen
  ↓ [Zaloguj się / Zarejestruj]
  ↓ Supabase Auth (email + magic link)
  ↓ Callback: sprawdź czy user ma workspace
  → Jeśli NIE → WorkspaceSetup screen
  → Jeśli TAK → Home/Dashboard
```

**WorkspaceSetup screen:**
- Pole: Nazwa workspace (np. „Wojtek i Sabina — Działki 2026")
- Przycisk: „Utwórz workspace"
- POST: tworzy rekord w `workspaces` + dodaje usera do `workspace_members` (role = 'owner')

### Krok 2: Zaproszenie partnera

**Ścieżka:** Settings → Workspace → „Zaproś partnera" → Generuj token

```sql
-- Backend logic (Edge Function: generate_invite)
INSERT INTO workspace_invites (
  workspace_id,
  invite_token,
  invited_by,
  expires_at
) VALUES (
  :workspace_id,
  gen_random_uuid()::text,  -- lub shortcode np. 8 chars
  :user_id,
  now() + interval '7 days'
);
```

**UI wyświetla:**
- Wygenerowany link invite: `https://app.decisionengine.app/invite/[TOKEN]`
- Lub: krótki kod do wpisania ręcznie (8 znaków, np. `WXYZ-1234`)
- Przycisk: „Kopiuj link" + „Wyślij przez WhatsApp/SMS" (native share)
- Info: „Link wygasa za 7 dni"

---

## Flow Roli B (Editor) — dołączenie do workspace

### Wariant 1: Przez link (deeplink)

```
Sabina otwiera link: https://app.decisionengine.app/invite/[TOKEN]
  ↓
  → Jeśli aplikacja zainstalowana → deeplink otwiera aplikację → InviteAcceptScreen
  → Jeśli brak aplikacji → strona web → CTA „Pobierz aplikację" lub „Otwórz w przeglądarce"
```

### Wariant 2: Ręczny kod w aplikacji

```
Settings → „Mam kod zaproszenia" → input 8 znaków → Verify → InviteAcceptScreen
```

### InviteAcceptScreen

**Sprawdzenie tokenu:**
```sql
SELECT wi.*, w.name as workspace_name, u.full_name as invited_by_name
FROM workspace_invites wi
JOIN workspaces w ON w.id = wi.workspace_id
JOIN auth.users u ON u.id = wi.invited_by
WHERE wi.invite_token = :token
  AND wi.expires_at > now()
  AND wi.used_at IS NULL
```

**Jeśli token ważny:**
- Ekran pokazuje: „Wojtek zaprasza Cię do workspace »[Nazwa workspace]«"
- Jeśli Sabina nie jest zalogowana → najpierw AuthScreen → po zalogowaniu powrót do InviteAcceptScreen
- Jeśli zalogowana → bezpośrednio

**Przycisk:** „Dołącz do workspace"

**Po kliknięciu:**
```sql
-- Edge Function: accept_invite
BEGIN;
  -- Dodaj usera do workspace
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (:workspace_id, :auth_uid, 'editor')
  ON CONFLICT DO NOTHING;

  -- Oznacz token jako użyty
  UPDATE workspace_invites
  SET used_at = now(), used_by = :auth_uid
  WHERE invite_token = :token;
COMMIT;
```

**Po dołączeniu:**
- Przekierowanie → Home/Dashboard (workspace Wojtka i Sabiny)
- Toast: „Dołączyłaś do workspace »[Nazwa]« 🎉"
- Powiadomienie dla Wojtka: „Sabina dołączyła do workspace"

---

## Stany błędów (InviteAcceptScreen)

| Błąd | UI Message | Akcja |
|---|---|---|
| Token nie istnieje | „Nieprawidłowy kod zaproszenia" | Pole do ponownego wpisania |
| Token wygasł | „Zaproszenie wygasło. Poproś Wojtka o nowe." | Przycisk: „Powiadom zapraszającego" (native share) |
| Token już użyty | „To zaproszenie zostało już wykorzystane." | — |
| User już w workspace | „Jesteś już w tym workspace!" | Przekierowanie do Home |
| Zbyt wiele błędnych prób | Rate limit (5 prób / 10 min) | „Spróbuj ponownie za X minut" |

---

## Uprawnienia Roli B (Editor)

Po dołączeniu do workspace, Sabina ma prawa **Editor**:

| Operacja | Owner (Wojtek) | Editor (Sabina) |
|---|---|---|
| Dodaj działkę | ✅ | ✅ |
| Edytuj działkę | ✅ | ✅ |
| Zmień status | ✅ | ✅ |
| Dodaj kontakt / log | ✅ | ✅ |
| Oceń działkę (scoring) | ✅ | ✅ |
| Usuń działkę | ✅ | ❌ |
| Generuj zaproszenie | ✅ | ❌ |
| Edytuj wagi scoringu | ✅ | ✅ (jeśli Owner to skonfiguruje) |
| Usuń workspace | ✅ | ❌ |
| Zarządzaj członkami | ✅ | ❌ |

---

## Model danych (tabela workspace_invites)

```sql
create table workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  invite_token text not null unique,
  invited_by uuid not null,            -- auth.uid() of Owner
  expires_at timestamptz not null,     -- default: now() + 7 days
  used_at timestamptz,                 -- null = nieużyty
  used_by uuid,                        -- auth.uid() of invited user
  created_at timestamptz not null default now()
);

-- Index dla szybkiego lookup po tokenie
create index on workspace_invites(invite_token) where used_at is null;

-- RLS: Owner widzi swoje zaproszenia
create policy "owners can manage invites"
  on workspace_invites for all
  using (
    exists(
      select 1 from workspace_members
      where workspace_id = workspace_invites.workspace_id
        and user_id = auth.uid()
        and role = 'owner'
    )
  );

-- Publiczny odczyt ważnego tokenu (dla accept flow — przed zalogowaniem)
create policy "anyone can read valid invite by token"
  on workspace_invites for select
  using (
    expires_at > now()
    and used_at is null
  );
```

---

## Edge Functions wymagane

### 1. `generate_invite`
- Input: `{ workspace_id }`
- Sprawdza: caller jest Owner w workspace
- Tworzy: nowy token (lub unieważnia stary jeśli istnieje nieużyty)
- Output: `{ invite_token, invite_url, expires_at }`

### 2. `accept_invite`
- Input: `{ invite_token }`
- Sprawdza: token ważny (nie wygasł, nie użyty)
- Sprawdza: auth.uid() nie jest już w workspace
- Dodaje: `workspace_members` + oznacza token `used_at`
- Emituje: `plot_activity` event `member_joined`
- Output: `{ workspace_id, workspace_name, role }`

---

## Deeplink Setup (Expo)

```typescript
// apps/mobile/app.json
{
  "expo": {
    "scheme": "decisionengine",
    "intentFilters": [
      {
        "action": "VIEW",
        "data": [{ "scheme": "https", "host": "app.decisionengine.app", "pathPrefix": "/invite" }],
        "category": ["BROWSABLE", "DEFAULT"]
      }
    ]
  }
}

// apps/mobile/app/(auth)/invite/[token].tsx
// Route: /invite/[token]
// Handles: deeplink + manual navigation
```

---

## Web: Middleware ochrony routów + invite redirect

```typescript
// apps/web/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  const isInviteRoute = req.nextUrl.pathname.startsWith('/invite/')
  const isAuthRoute = req.nextUrl.pathname.startsWith('/auth')

  if (!session && !isInviteRoute && !isAuthRoute) {
    // Redirect to login, preserve intended URL
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/auth/login'
    redirectUrl.searchParams.set('next', req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}
```

---

## UI / UX Guidelines

### InviteAcceptScreen (Mobile)

Styl: fullscreen, centered, dark background (`--c0`), ambient glow niebieski.

```
[Logo / ikona workspace]

Wojtek zaprasza Cię do:
━━━━━━━━━━━━━━━━━━━━━━━
   Wojtek i Sabina — Działki 2026
━━━━━━━━━━━━━━━━━━━━━━━

[Globus ikona] Współdzielony workspace
[House ikona] Zarządzanie działkami
[Score ikona] Wspólna ocena i decyzje

[Przycisk: DOŁĄCZ DO WORKSPACE]  ← btn-accent, full width

Zaproszenie wygasa za: 6 dni 23 godz.
```

### Settings → Workspace (Mobile)

```
TWÓJ WORKSPACE
━━━━━━━━━━━━━━━━━━━━━━━━
[Avatar W] Wojtek (Ty)         Owner
[Avatar S] Sabina              Editor    ← po dołączeniu

ZAPROSZENIA
━━━━━━━━━━━━━━━━━━━━━━━━
[Invite code: WXYZ-1234]       Wygasa za 3 dni
[Kopiuj link]  [Wyślij]  [Unieważnij]

[Generuj nowe zaproszenie]
```

---

*Onboarding Flow v1.0 — DecisionEngine*
*Data: 2026-03-21*
