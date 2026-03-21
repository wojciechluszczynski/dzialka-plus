# DecisionEngine — Design System & UI Rules
> Wersja: 1.0 | Data: 2026-03-15
> Dokument opisuje kompletny system designu wyekstrahowany z aplikacji DecisionEngine.
> **Przeznaczenie:** gotowe reguły do odtworzenia tego stylu w dowolnej innej aplikacji mobilnej / PWA.

---

## 0. Stack techniczny i deployment

### Aplikacja
| Element | Wybór |
|---|---|
| Framework | Vite + React 18 + TypeScript |
| Routing | React Router v6 |
| Ikony | Lucide React |
| Wykresy | Recharts |
| Style | Vanilla CSS (custom properties) + inline React styles |
| PWA | Vite PWA plugin (`vite-plugin-pwa`) |
| Fonty | Google Fonts (Rajdhani + Inter) |

### Netlify deployment (standardowy setup)
```bash
# 1. Inicjalizacja projektu
npm create vite@latest moja-apka -- --template react-ts
cd moja-apka && npm install

# 2. Netlify CLI (globalne)
npm install -g netlify-cli

# 3. Pierwsze wdrożenie (bez buildu po stronie Netlify — wdrażamy gotowy dist)
npm run build
netlify deploy --dir=dist --site=SITE_ID --auth=NETLIFY_TOKEN --prod

# 4. Każdy kolejny deploy
npm run build && netlify deploy --dir=dist --site=SITE_ID --auth=NETLIFY_TOKEN --prod
```

**netlify.toml** — wymagany do SPA (React Router):
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Zmienne środowiskowe** — wstrzykiwane przez Netlify Dashboard (Settings → Environment Variables):
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxx...
VITE_ANTHROPIC_API_KEY=sk-ant-xxx
```
W kodzie: `import.meta.env.VITE_SUPABASE_URL`

---

## 1. Paleta kolorów

> Inspiracja: BMW M Performance — głęboka navy + elektryczny niebieski + M Red.
> Filozofia: **Ciemna aplikacja, glassmorphism, glow effects** — jak My BMW app.

### CSS Custom Properties (`:root`)

```css
:root {
  /* === TŁA === */
  --c0: #060C18;       /* Najgłębsza navy — główne tło */
  --c1: #0A1428;       /* Nieco jaśniejsza — karty, overlay */
  --c2: #0F1C38;       /* Jeszcze jaśniejsza — elementy 3. planu */

  /* === AKCENT PRIMARY — BMW M Blue === */
  --accent:       #1C69D4;                /* Główny niebieski CTA */
  --accent2:      #3D8EF0;                /* Jaśniejszy niebieski — hover, ikony */
  --accent-glow:  rgba(28, 105, 212, 0.40); /* Glow pod przyciskami */
  --blue:         #0653B1;                /* Ciemniejszy niebieski — gradienty */

  /* === AKCENT SECONDARY — BMW M Red === */
  --purple: #CC0605;   /* M Red — błędy, ostrzeżenia, guest banner */
  --orange: #FF9F43;   /* Pomarańczowy — statusy, ostrzeżenia */
  --rose:   #FF4757;   /* Czerwony — delete, wyloguj */

  /* === POWIERZCHNIE (glassmorphism) === */
  --surface:    rgba(255, 255, 255, 0.055); /* Karta podstawowa */
  --surface-md: rgba(255, 255, 255, 0.09);  /* Karta średnia */
  --surface-hi: rgba(255, 255, 255, 0.14);  /* Karta podświetlona */

  /* === OBRAMOWANIA === */
  --border:    rgba(255, 255, 255, 0.09);
  --border-hi: rgba(255, 255, 255, 0.18);

  /* === TYPOGRAFIA === */
  --text:   #FFFFFF;
  --text-2: rgba(255, 255, 255, 0.65); /* Podtytuły, opisy */
  --text-3: rgba(255, 255, 255, 0.38); /* Placeholder, metadane */

  /* === LAYOUT === */
  --nav-h:  72px;                           /* Wysokość BottomNav */
  --safe-b: env(safe-area-inset-bottom, 0px); /* iPhone home bar */
  --safe-t: env(safe-area-inset-top, 0px);    /* iPhone notch */

  /* === BLUR === */
  --blur:    blur(32px) saturate(200%);
  --blur-sm: blur(16px) saturate(180%);
}
```

### Gradient tła (`#root`)
```css
#root {
  max-width: 430px;    /* Mobile-first: max szerokość */
  margin: 0 auto;
  background: linear-gradient(170deg, #0A1428 0%, #060C18 55%, #080E1E 100%);
}
```

### Ambient glows (`#root::before` / `#root::after`)
```css
/* Niebieski glow — lewy górny róg */
#root::before {
  content: ''; position: fixed;
  top: -120px; left: -80px;
  width: 400px; height: 400px;
  background: radial-gradient(circle, rgba(28,105,212,0.16) 0%, transparent 70%);
  pointer-events: none; z-index: 0;
}
/* M Red glow — prawy dolny róg */
#root::after {
  content: ''; position: fixed;
  bottom: 80px; right: -60px;
  width: 280px; height: 280px;
  background: radial-gradient(circle, rgba(204,6,5,0.08) 0%, transparent 70%);
  pointer-events: none; z-index: 0;
}
```

---

## 2. Typografia

### Fonty
```html
<!-- Google Fonts import w index.html lub index.css -->
<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

| Font | Rola | Użycie |
|---|---|---|
| **Rajdhani** | Headings, sport mood | `font-family: 'Rajdhani', sans-serif` — naglówki h1-h3, przyciski CTA, navig |
| **Inter** | Body, czytelność | `font-family: 'Inter', sans-serif` — cały body, opisy, formularze |

### Skala typograficzna

```
Tytuł strony (h1):      30-32px, weight 900, letter-spacing: -0.6px, Rajdhani UPPERCASE
Podtytuł (sub):         14px, weight 500, color: --text-2, Inter
Sekcja (sec label):     11px, weight 600, UPPERCASE, letter-spacing: 1.8px, color: --text-3
Karta tytuł:            17-20px, weight 800, Inter
Karta opis:             13-14px, weight 500-600, color: --text-2
Badge/chip tekst:       11-12px, weight 700-800
Placeholder/meta:       11px, weight 600, color: --text-3
Przycisk główny:        15-16px, weight 700, Rajdhani, letter-spacing: 0.5px
```

---

## 3. Glassmorphism — karty i kontenery

### Klasa `.glass` — podstawowa karta

```css
.glass {
  background: var(--surface);                    /* rgba(255,255,255,0.055) */
  backdrop-filter: blur(32px) saturate(200%);
  -webkit-backdrop-filter: blur(32px) saturate(200%);
  border: 1px solid var(--border);               /* rgba(255,255,255,0.09) */
  border-radius: 22px;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.12),        /* highlight na górze */
    0 8px 32px rgba(0,0,0,0.24),
    0 1px 2px rgba(0,0,0,0.16);
  position: relative; overflow: hidden;
}
/* Gradient połysk (Apple Liquid Glass efekt) */
.glass::before {
  content: '';
  position: absolute; inset: 0; border-radius: inherit;
  background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%);
  pointer-events: none;
}
```

### Warianty kart

```css
/* Padding i margines — gotowy "card" */
.glass-card { padding: 16px; margin-bottom: 12px; }

/* Średnia intensywność — listy, dropdown */
.glass-md {
  background: var(--surface-md);  /* rgba(255,255,255,0.09) */
  backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid var(--border);
  border-radius: 18px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.10), 0 4px 16px rgba(0,0,0,0.20);
}

/* Wysoka intensywność — wybrane elementy, podświetlone */
.glass-hi {
  background: var(--surface-hi);  /* rgba(255,255,255,0.14) */
  backdrop-filter: blur(32px) saturate(200%);
  border: 1px solid var(--border-hi);
  border-radius: 16px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.20), 0 4px 20px rgba(0,0,0,0.30);
}
```

---

## 4. Layout strony

### `.page` — kontener każdej zakładki

```css
.page {
  padding-bottom: calc(var(--nav-h) + var(--safe-b) + 20px);
  /* Brak min-height — content determinuje wysokość */
  position: relative; z-index: 1;
}
```

### `.page-hero` — hero sekcja na górze strony

```css
.page-hero {
  position: relative;
  padding: calc(var(--safe-t) + 20px) 20px 32px;
  overflow: hidden;
}
/* Gradient tła hero */
.page-hero-bg {
  position: absolute; inset: 0;
  background: linear-gradient(145deg,
    rgba(28,105,212,0.18) 0%,
    rgba(204,6,5,0.05) 60%,
    transparent 100%);
  pointer-events: none;
}
/* Typografia hero */
.page-hero h1 {
  font-size: 32px; font-weight: 700;
  letter-spacing: 0.2px; line-height: 1;
  font-family: 'Rajdhani', sans-serif;
  text-transform: uppercase;
}
.page-hero .sub {
  font-size: 14px; color: var(--text-2);
  margin-top: 3px; font-weight: 500;
}
```

**Hero z obrazkiem tła (strony z zdjęciem):**
```tsx
<div style={{ position: 'relative', overflow: 'hidden' }}>
  <img
    src="https://images.unsplash.com/photo-xxx?w=800&q=65"
    style={{
      position: 'absolute', inset: 0,
      width: '100%', height: '100%',
      objectFit: 'cover', opacity: 0.18
    }}
  />
  {/* Gradient overlay */}
  <div style={{
    position: 'absolute', inset: 0,
    background: 'linear-gradient(to bottom, rgba(6,12,24,0.2), rgba(6,12,24,0.92))'
  }} />
  {/* Treść hero — position: relative, z-index: 1 */}
  <div style={{ position: 'relative', padding: 'calc(env(safe-area-inset-top,0px) + 20px) 20px 28px' }}>
    <h1>Tytuł</h1>
  </div>
</div>
```

### `.content` — zawartość pod hero

```css
.content { padding: 0 16px; }
```

---

## 5. Przyciski

### `.btn-accent` — CTA główny

```css
.btn-accent {
  background: linear-gradient(135deg, var(--accent) 0%, var(--blue) 100%);
  color: #fff;
  padding: 15px 24px; width: 100%;
  font-weight: 700; font-size: 16px;
  letter-spacing: 0.5px;
  font-family: 'Rajdhani', sans-serif;
  box-shadow: 0 4px 24px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.15);
  border: none; border-radius: 14px; cursor: pointer;
}
```

### `.btn-glass` — secondary

```css
.btn-glass {
  background: var(--surface-md);
  backdrop-filter: blur(16px);
  border: 1px solid var(--border-hi);
  color: var(--text);
  padding: 11px 18px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.12);
  border-radius: 14px; cursor: pointer;
  font-family: 'Rajdhani', sans-serif; font-weight: 700;
}
```

### Zasady przycisków
- Zawsze `border-radius: 14-16px` (nie `4px`, nie pełne `99px` poza badges)
- `transition: all .15s` + `transform: scale(0.97)` on `:active`
- `-webkit-tap-highlight-color: transparent` — brak domyślnego highlight na iOS
- Przycisk destructive (wyloguj, usuń): `background: rgba(255,77,109,0.10)`, `border: 1px solid rgba(255,77,109,0.25)`, `color: #FF4D6D`

---

## 6. Formularze i inputy

### Input field

```tsx
<div style={{
  display: 'flex', alignItems: 'center', gap: 10,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 14, padding: '13px 16px',
}}>
  <Mail size={18} color="rgba(255,255,255,0.4)" />
  <input
    style={{
      flex: 1, background: 'transparent',
      border: 'none', outline: 'none',
      color: '#fff', fontSize: 15,
      fontFamily: 'Inter, sans-serif', fontWeight: 600,
    }}
  />
</div>
```

**Focus state** (via CSS):
```css
.input-wrap:focus-within {
  border-color: rgba(28,105,212,0.5);
}
```

### Searchbar

```css
.search-wrap { position: relative; margin-bottom: 14px; }
.search-wrap input {
  width: 100%;
  background: var(--surface);
  backdrop-filter: blur(16px);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 13px 14px 13px 44px;   /* miejsce na ikonę lupy po lewej */
  font-size: 15px; color: var(--text);
  outline: none;
}
.search-wrap input::placeholder { color: var(--text-3); }
.search-wrap input:focus { border-color: rgba(28,105,212,0.5); }
/* Ikona lupy */
.search-icon {
  position: absolute; left: 14px; top: 50%;
  transform: translateY(-50%);
  color: rgba(255,255,255,0.55);  /* Ważne: wystarczająca opacity żeby ikona była widoczna */
}
```

### Toggle (switch)

```tsx
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} style={{
      width: 46, height: 27, borderRadius: 99,
      background: on ? '#1C69D4' : 'rgba(255,255,255,0.14)',
      display: 'flex', alignItems: 'center', padding: 3,
      cursor: 'pointer', transition: 'background .22s', flexShrink: 0,
      boxShadow: on ? '0 0 10px rgba(28,105,212,0.40)' : 'none',
    }}>
      <div style={{
        width: 21, height: 21, borderRadius: '50%', background: '#fff',
        marginLeft: on ? 'auto' : 0,
        transition: 'margin .22s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </div>
  )
}
```

---

## 7. Nawigacja dolna (BottomNav)

```css
/* Kontener */
nav.bottom-nav {
  position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
  width: 100%; max-width: 430px;
  background: rgba(8, 14, 28, 0.88);
  backdrop-filter: blur(32px) saturate(200%);
  border-top: 1px solid rgba(255,255,255,0.07);
  padding-bottom: var(--safe-b);
  display: flex; align-items: center;
  height: calc(var(--nav-h) + var(--safe-b));
  z-index: 100;
}
```

### Reguły BottomNav
- 5 zakładek: Listy, Paragony, **+** (FAB), Przepisy, Profil
- Środkowy przycisk (+) jest wyróżniony — `position: absolute`, większy, `background: --accent`, `border-radius: 50%`, `box-shadow: 0 0 20px var(--accent-glow)`
- Ikony boczne: 24-26px, `color: rgba(255,255,255,0.38)` inactive, `color: #1C69D4` active
- Etykiety: 10px, `font-weight: 700`, wyświetlane pod ikonami
- Active state: ikona + tekst w `--accent` + kropka/indicator pod ikoną

---

## 8. Badges i chipsety

### Badge (małe etykiety)

```css
.badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: 99px;
  font-size: 12px; font-weight: 700;
}
.badge-accent  { background: rgba(28,105,212,0.18);  color: var(--accent); border: 1px solid rgba(28,105,212,0.25); }
.badge-muted   { background: var(--surface);          color: var(--text-2); border: 1px solid var(--border); }
.badge-orange  { background: rgba(255,107,53,0.18);   color: #FFA07A;       border: 1px solid rgba(255,107,53,0.25); }
```

### Chip pills (filtry, kategorie)

```css
.chip-scroll {
  display: flex; gap: 8px; overflow-x: auto;
  padding-bottom: 2px; scrollbar-width: none; margin-bottom: 14px;
}
.chip-scroll::-webkit-scrollbar { display: none; }

.chip-pill {
  flex-shrink: 0; padding: 8px 16px;
  border-radius: 8px; border: 1px solid var(--border);
  background: var(--surface); color: var(--text-2);
  font-size: 13px; font-weight: 600; cursor: pointer;
  font-family: 'Inter', sans-serif;
  transition: all .15s;
}
.chip-pill.active {
  background: var(--accent); color: var(--c0);
  border-color: var(--accent);
  box-shadow: 0 4px 14px var(--accent-glow);
}
```

---

## 9. Progress bar

```css
.prog-track {
  background: rgba(255,255,255,0.08);
  border-radius: 99px; height: 5px; overflow: hidden;
}
.prog-fill {
  height: 100%; border-radius: 99px;
  background: linear-gradient(90deg, var(--accent), var(--accent2));
  transition: width .5s;
}
```

---

## 10. Recipe cards (karty z obrazkiem)

### Hero recipe card (duże)

```tsx
<div style={{
  position: 'relative', borderRadius: 22, overflow: 'hidden',
  marginBottom: 14, cursor: 'pointer',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
}}>
  <img
    src={recipe.image} alt={recipe.name}
    style={{ width: '100%', height: 210, objectFit: 'cover', objectPosition: 'center 60%' }}
  />
  {/* Gradient overlay — od transparentnego do pełnego ciemnego */}
  <div style={{
    position: 'absolute', inset: 0,
    background: 'linear-gradient(to bottom, rgba(6,12,24,0.1) 0%, transparent 30%, rgba(6,12,24,0.92) 100%)',
  }} />
  {/* Badge kategorii — lewy górny róg */}
  <div style={{ position: 'absolute', top: 14, left: 14 }}>
    <span style={{
      background: 'rgba(10,22,34,0.75)', backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: 99, padding: '4px 10px',
      fontSize: 11, fontWeight: 800, color: '#fff',
    }}>{recipe.cat}</span>
  </div>
  {/* Treść — lewy dolny róg */}
  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 18px 18px' }}>
    <p style={{ fontSize: 21, fontWeight: 900, letterSpacing: -0.3, marginBottom: 10 }}>{recipe.name}</p>
    <div style={{ display: 'flex', gap: 8 }}>
      <InfoPill><Clock size={12} />{recipe.time} min</InfoPill>
      <InfoPill><Users size={12} />{recipe.servings} os.</InfoPill>
    </div>
  </div>
</div>
```

**InfoPill** (transparentny pill na zdjęciu):
```tsx
const InfoPill = ({ children }) => (
  <span style={{
    display: 'flex', alignItems: 'center', gap: 4,
    background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
    borderRadius: 99, padding: '4px 10px',
    fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)',
  }}>{children}</span>
)
```

### Flat recipe card (lista)

```tsx
<div style={{
  display: 'flex', borderRadius: 18, overflow: 'hidden',
  background: 'rgba(255,255,255,0.045)',
  border: '1px solid rgba(255,255,255,0.07)',
  marginBottom: 10, cursor: 'pointer',
  backdropFilter: 'blur(16px)',
  boxShadow: '0 4px 18px rgba(0,0,0,0.25)',
}}>
  <img src={recipe.image} style={{ width: 95, height: 95, objectFit: 'cover' }} />
  <div style={{ padding: '12px 14px', flex: 1 }}>
    <p style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>{recipe.name}</p>
    {/* meta row */}
  </div>
</div>
```

---

## 11. Statystyki — wykresy (Recharts)

### Paleta kolorów do wykresów (monochromatyczna — BMW Blue)

```ts
const CHART_PALETTE = ['#1C69D4', '#2E7FE8', '#4A97F5', 'rgba(28,105,212,0.45)']
// Dla wykresów barowych (sklepy):
const STORE_PALETTE = ['#1C69D4', '#3D8EF0', '#0653B1', '#2E7FE8', '#5AABFF']
```

### AreaChart (wydatki w czasie)

```tsx
<AreaChart data={data}>
  <defs>
    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%"  stopColor="#1C69D4" stopOpacity={0.35} />
      <stop offset="95%" stopColor="#1C69D4" stopOpacity={0.02} />
    </linearGradient>
  </defs>
  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
  <XAxis dataKey="name" stroke="rgba(255,255,255,0.25)" tick={{ fontSize: 11 }} />
  <YAxis stroke="rgba(255,255,255,0.25)" tick={{ fontSize: 11 }} />
  <Tooltip
    contentStyle={{
      background: 'rgba(10,20,40,0.92)',
      border: '1px solid rgba(28,105,212,0.25)',
      borderRadius: 12, backdropFilter: 'blur(20px)',
    }}
  />
  <Area type="monotone" dataKey="value" stroke="#1C69D4" strokeWidth={2.5} fill="url(#grad)" />
</AreaChart>
```

---

## 12. Sekcja — nagłówek

```css
.sec {
  font-size: 11px; font-weight: 600;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 1.8px;
  margin: 22px 0 10px;
  font-family: 'Inter', sans-serif;
}
```

---

## 13. Avatar użytkownika (UserAvatar)

```tsx
// Brak zdjęcia: inicjały lub ikona User na półprzezroczystym tle
<div style={{
  width: size, height: size, borderRadius: '50%',
  background: 'rgba(28,105,212,0.15)',
  border: '1.5px solid rgba(28,105,212,0.35)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}}>
  {initials
    ? <span style={{ fontSize: size * 0.36, fontWeight: 800 }}>{initials}</span>
    : <User size={size * 0.44} color="#3D8EF0" />
  }
</div>

// Ze zdjęciem:
<img
  src={avatarUrl}
  style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
/>
```

---

## 14. Swipe gestures (listy zakupów)

> Kluczowe: ZERO re-renderów podczas swipe — używaj `useRef` i bezpośredniej manipulacji DOM.

```tsx
function SwipeItem({ onDelete, onCheck, children }) {
  const rowRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const isDragging = useRef(false)

  const handleTouchStart = (e: TouchEvent) => {
    startX.current = e.touches[0].clientX
    isDragging.current = true
  }
  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging.current || !rowRef.current) return
    const delta = e.touches[0].clientX - startX.current
    rowRef.current.style.transform = `translateX(${delta}px)`  // bezpośredni DOM
    rowRef.current.style.transition = 'none'
  }
  const handleTouchEnd = (e: TouchEvent) => {
    if (!rowRef.current) return
    const delta = e.changedTouches[0].clientX - startX.current
    rowRef.current.style.transition = 'transform .25s ease'
    rowRef.current.style.transform = 'translateX(0)'
    isDragging.current = false
    if (delta < -80) onDelete()
    if (delta >  80) onCheck()
  }

  return (
    <div className="swipe-row">
      {/* Tło (delete / check) */}
      <div className="swipe-bg" style={{ justifyContent: 'flex-end' }}>
        <Trash2 color="#FF4757" />
      </div>
      <div className="swipe-bg">
        <Check color="#1C69D4" />
      </div>
      {/* Treść */}
      <div
        ref={rowRef}
        className="swipe-content"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}
```

```css
.swipe-row    { position: relative; overflow: hidden; }
.swipe-bg     { position: absolute; inset: 0; display: flex; align-items: center; padding: 0 20px; pointer-events: none; }
.swipe-content { will-change: transform; background: var(--c0); position: relative; z-index: 1; }
```

---

## 15. Checkbox (niestandardowy)

```css
.cb {
  width: 26px; height: 26px; border-radius: 8px;
  border: 2px solid rgba(255,255,255,0.22);
  background: transparent;                     /* WAŻNE: transparent, nie biały */
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .2s;
}
.cb.on {
  background: var(--accent);
  border-color: var(--accent);
  box-shadow: 0 0 12px var(--accent-glow);
}
```

---

## 16. Strikethrough animacja (iOS Notes styl)

```css
.item-name-wrap { position: relative; display: inline; }
.item-name-wrap::after {
  content: '';
  position: absolute; left: 0; top: 50%;
  width: 0; height: 1.5px;
  background: rgba(255,255,255,0.55);
  transform: translateY(-50%); border-radius: 2px;
}
.item-name-wrap.struck::after {
  animation: ios-strike .28s cubic-bezier(.4,0,.2,1) forwards;
}
@keyframes ios-strike {
  from { width: 0; }
  to   { width: 100%; }
}
```

---

## 17. Empty states

```css
.empty {
  display: flex; flex-direction: column;
  align-items: center; text-align: center;
  padding: 60px 20px;
}
.empty h3 { font-size: 19px; font-weight: 800; margin-bottom: 8px; }
.empty p  { font-size: 14px; color: var(--text-2); line-height: 1.5; }
```

```tsx
<div className="empty">
  <p style={{ fontSize: 40, marginBottom: 12 }}>🛒</p>
  <h3>Brak list</h3>
  <p>Utwórz pierwszą listę zakupów<br/>i zacznij ogarniać zakupy z głową.</p>
</div>
```

---

## 18. Ekran logowania (AuthPage)

### Zasady

- Pełnoekranowy (`min-height: 100dvh`), dark background (`#060F18`)
- Ambient glow: `position: absolute` niebieski glow u góry + gradient u dołu
- Logo: `objectFit: contain` + `filter: drop-shadow(...)` — **bez** `borderRadius: 50%`, **bez** `objectFit: cover`
- Zakładki Login/Register: wewnętrzny `segmented control` (nie nawigacja)
- Przycisk "Obejrzyj bez logowania →" (guest mode): subtelny, pod głównym CTA
- Gradient u dołu ekranu:
```tsx
<div style={{
  position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
  width: '100%', height: 280,
  background: 'linear-gradient(to top, rgba(28,105,212,0.07) 0%, transparent 100%)',
  pointerEvents: 'none',
}} />
```

---

## 19. Guest Banner (tryb podglądu)

### Zasady
- **Nie** na górze ekranu (zasłania content)
- **Na dole** — `position: fixed`, `bottom: calc(var(--nav-h) + var(--safe-b) + 10px)`
- Zamykalny X-em (local `useState(false)`) — ukrywa banner bez wylogowywania
- "Zaloguj się" wywołuje `exitGuestMode()` (pełny logout guest)

```tsx
<div style={{
  position: 'fixed',
  bottom: 'calc(var(--nav-h) + var(--safe-b) + 10px)',
  left: '50%', transform: 'translateX(-50%)',
  width: 'calc(100% - 32px)', maxWidth: 398,
  background: 'linear-gradient(135deg, rgba(6,12,24,0.92), rgba(10,20,40,0.95))',
  backdropFilter: 'blur(24px)',
  border: '1px solid rgba(204,6,5,0.30)',
  borderRadius: 18, padding: '10px 12px 10px 16px',
  display: 'flex', alignItems: 'center', gap: 10,
  zIndex: 150,
}}>
  {/* Czerwony pasek akcentu */}
  <div style={{ width: 3, height: 36, borderRadius: 2, background: 'linear-gradient(180deg, #CC0605 0%, rgba(204,6,5,0.4) 100%)', flexShrink: 0 }} />
  <div style={{ flex: 1 }}>
    <p style={{ fontSize: 12, fontWeight: 700 }}>👀 Tryb podglądu</p>
    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Dane demonstracyjne</p>
  </div>
  <button onClick={exitGuestMode}>Zaloguj się</button>
  <button onClick={() => setClosed(true)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.30)', fontSize: 20 }}>✕</button>
</div>
```

---

## 20. Kolekcje (image tiles — 2×2 grid)

```tsx
const COLLECTIONS = [
  { label: 'Szybkie', sublabel: '≤30 min', image: 'URL', color: '#3D8EF0' },
  // ...
]

<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
  {COLLECTIONS.map(c => (
    <div style={{ borderRadius: 18, overflow: 'hidden', position: 'relative', height: 100 }}>
      <img src={c.image} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      {/* Ciemny gradient overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(6,12,24,0.72), rgba(6,12,24,0.45))' }} />
      {/* Tekst — lewy dolny róg */}
      <div style={{ position: 'absolute', inset: 0, padding: '12px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <p style={{ fontSize: 14, fontWeight: 900 }}>{c.label}</p>
        <p style={{ fontSize: 11, color: c.color, fontWeight: 700 }}>{c.sublabel}</p>
      </div>
    </div>
  ))}
</div>
```

---

## 21. iOS Safe Area

```css
/* W każdym hero na górze: */
padding-top: calc(env(safe-area-inset-top, 0px) + 20px);

/* W BottomNav: */
padding-bottom: env(safe-area-inset-bottom, 0px);

/* W viewport meta (index.html): */
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

---

## 22. Ikona aplikacji — zasady

- Format: `512×512` PNG z kanałem alpha (przezroczyste tło)
- **Nigdy** nie stosuj `borderRadius: '50%'` + `objectFit: cover` na `<img>` ikony — tworzy czarny krąg
- Właściwe: `objectFit: 'contain'` + `filter: drop-shadow(...)`
- Dla ikony z białym tłem: BFS flood fill od krawędzi pikseli (tolerancja 60) + unmating białego halo

---

## 23. Animacje

```css
/* Loading pulse — ikona na splash screenie */
@keyframes pulse {
  0%, 100% { transform: scale(1);    opacity: 1;   }
  50%       { transform: scale(1.06); opacity: 0.85; }
}

/* Spinner (przyciski, loading) */
@keyframes spin { to { transform: rotate(360deg) } }
.spinner {
  width: 20px; height: 20px;
  border: 2.5px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
```

---

## 24. Store logos (sieci handlowe)

### Zasady
- Używaj lokalnych plików SVG (`/public/logos/lidl.svg` itp.)
- **Nigdy** zewnętrzne API do logotypów (Clearbit, Brandfetch) — brak kontroli nad dostępnością
- W list itemach: czysty `<img src="/logos/X.svg">` **bez** obramowania, bez tła
- W cards z hero: zdjęcie sklepu jako `background-image` z `opacity: 0.25` + gradient overlay

### Obsługiwane sieci (minimalny MVP)
Lidl, Biedronka, Kaufland, Żabka, Dino, Lewiatan, Stokrotka, Orlen, BP, Makro

---

## 25. Zasady ogólne (checklist)

| Zasada | ✅ Robi | ❌ Nie robi |
|---|---|---|
| Czcionka | Rajdhani (heads) + Inter (body) | Barlow, Roboto, systemowa |
| Tło | Dark navy gradient | Białe lub jasne tło |
| Karty | Glassmorphism + blur | Pełne białe karty z cieniem |
| Przyciski | Rounded (14-16px) + gradient CTA | Flat / pełne zaokrąglenie |
| Ikony | Lucide React | Emoji jako ikony UI |
| Obrazki przepisów | Overhead food-only shot | Zdjęcia z twarzami, złe kadry |
| Kolory chartów | Monochromatyczna BMW Blue | Tęczowe palette |
| Toggle | React state + smooth transition | CSS-only toggle bez thumba |
| Swipe | useRef + direct DOM | useState (powoduje lag) |
| Logotypy sklepów | Lokalne SVG | Zewnętrzne API |
| Bottom banner | Nad BottomNav, zamykalny | Fixed top (zasłania content) |
| Puste przestrzenie | Brak min-height na #root | min-height: 100dvh na .page |
| Gradient na AuthPage | Sięga krawędzi ekranu | Urywa się przed dolną krawędzią |

---

## 26. Struktura plików projektu

```
src/
├── App.tsx                   # Root routing + AppProvider + GuestBanner
├── index.css                 # Design system (wszystkie CSS klasy)
├── main.tsx
│
├── context/
│   ├── AuthContext.tsx        # Supabase auth + isGuest + enterGuestMode
│   └── AppContext.tsx         # Lokalne dane (lists, recipes) + typy
│
├── components/
│   ├── BottomNav.tsx
│   ├── UserAvatar.tsx         # initials / photo / User icon fallback
│   └── GuestBanner.tsx        # Fixed bottom, zamykalny
│
└── pages/
    ├── AuthPage.tsx
    ├── ListyPage.tsx          # SwipeItem, AI suggestions
    ├── ListDetailPage.tsx     # useRef swipe, store picker
    ├── PrzepisyPage.tsx       # collections grid, 3× filter chips
    ├── PrzepisDetailPage.tsx  # hero image, składniki, kroki
    ├── ParagonyPage.tsx       # mosaic hero, lista paragonów
    ├── ReceiptDetailPage.tsx  # store hero bg, pozycje
    ├── StatystykiPage.tsx     # Recharts, monochromatic palette
    ├── UstawieniaPage.tsx     # profil, toggle, wyloguj
    └── PrivacyPage.tsx        # RODO, dostępne bez logowania

public/
├── icon.png                  # 512×512 RGBA transparent BG
├── logos/                    # SVG logotypy sieci
│   ├── lidl.svg
│   ├── biedronka.svg
│   └── ...
└── photos/                   # WebP zdjęcia sklepów (hero backgrounds)
    ├── lidl.webp
    └── ...
```

---

## 27. Supabase — schemat tabel (MVP)

```sql
-- Tabele podstawowe
users (id, email, full_name, avatar_url, created_at)
shopping_lists (id, owner_id → users, name, is_shared, store, created_at)
shopping_list_items (id, list_id → shopping_lists, name, qty, category, checked, created_at)
recipes (id, owner_id → users, name, cat, time_minutes, difficulty, servings, image_url, tip, created_at)
recipe_ingredients (id, recipe_id → recipes, name, quantity, unit)
recipe_steps (id, recipe_id → recipes, step_number, description)
receipts (id, user_id → users, store_name, total_amount, purchased_at)
receipt_items (id, receipt_id → receipts, name, qty, unit_price, total_price)
```

**Row Level Security (RLS):** zawsze włączone. Każdy użytkownik widzi tylko swoje dane.

```sql
-- Przykład polityki RLS
CREATE POLICY "users see own lists"
  ON shopping_lists FOR ALL
  USING (owner_id = auth.uid());
```

---

*Dokument stworzony na podstawie produkcyjnej aplikacji DecisionEngine v1.0 (2026-03-15).*
*Hostowana na Netlify: https://decision-engine.app*
