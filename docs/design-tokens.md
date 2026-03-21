# Design Tokens — DecisionEngine

> Wersja: 1.0 | Data: 2026-03-21
> Źródło: DecisionEngine Design System + adaptacja na stack Tailwind CSS (web) + Expo theme.ts (mobile)

---

## Filozofia designu

- **Inspiracja**: mobile.de — premium cards, duże zdjęcia hero, minimalizm, czytelność danych
- **NIE**: BMW glassmorphism jako dominujący motyw; glassmorphism tylko na kartach (surface variants)
- **Typografia**: Rajdhani (headings, sport mood) + Inter (body, czytelność)
- Każda działka = „ogłoszenie auta" w mobile.de — emocje i estetyka przed gęstością informacji

---

## Paleta kolorów

### Kolory bazowe

| Token | Wartość | Użycie |
|---|---|---|
| `color-bg-0` | `#060C18` | Najgłębsza navy — główne tło |
| `color-bg-1` | `#0A1428` | Karty, overlay |
| `color-bg-2` | `#0F1C38` | Elementy trzeciego planu |

### Akcent primary (Blue)

| Token | Wartość | Użycie |
|---|---|---|
| `color-accent` | `#1C69D4` | Główny CTA, active states |
| `color-accent-2` | `#3D8EF0` | Hover, ikony, score bar |
| `color-accent-glow` | `rgba(28,105,212,0.40)` | Glow pod przyciskami, box-shadow |
| `color-blue-dark` | `#0653B1` | Ciemniejszy blue — gradienty |

### Akcent secondary (Risk / Warning)

| Token | Wartość | Użycie |
|---|---|---|
| `color-danger` | `#CC0605` | Deal breakers, errory, NO verdict |
| `color-warning` | `#FF9F43` | Ostrzeżenia, MAYBE verdict, medium risk |
| `color-destructive` | `#FF4757` | Delete, wyloguj, high risk |

### Status i scoring

| Token | Wartość | Użycie |
|---|---|---|
| `color-success` | `#00B894` | GO verdict, score high, aktywny |
| `color-info` | `#3D8EF0` | Informacje, confidence high |
| `color-muted` | `rgba(255,255,255,0.38)` | Placeholder, metadane |

### Surfaces (glassmorphism)

| Token | Wartość | Użycie |
|---|---|---|
| `surface` | `rgba(255,255,255,0.055)` | Karta podstawowa |
| `surface-md` | `rgba(255,255,255,0.09)` | Karta średnia, listy, dropdown |
| `surface-hi` | `rgba(255,255,255,0.14)` | Karta podświetlona, selected |

### Borders

| Token | Wartość | Użycie |
|---|---|---|
| `border` | `rgba(255,255,255,0.09)` | Standardowe obramowanie |
| `border-hi` | `rgba(255,255,255,0.18)` | Podświetlone obramowanie |

### Typografia — kolory

| Token | Wartość | Użycie |
|---|---|---|
| `text-primary` | `#FFFFFF` | Główny tekst |
| `text-secondary` | `rgba(255,255,255,0.65)` | Podtytuły, opisy |
| `text-tertiary` | `rgba(255,255,255,0.38)` | Placeholder, metadane |

---

## Typografia

### Fonty

```
Rajdhani — headings, sport mood, przyciski CTA
Inter    — body, opisy, formularze, wszystko poza headings
```

### Skala typograficzna

| Użycie | Rozmiar | Weight | Font | Uwagi |
|---|---|---|---|---|
| Tytuł strony (h1) | 30–32px | 700–900 | Rajdhani | UPPERCASE, letter-spacing: -0.6px |
| Podtytuł | 14px | 500 | Inter | color: text-secondary |
| Sekcja label | 11px | 600 | Inter | UPPERCASE, letter-spacing: 1.8px, color: text-tertiary |
| Karta tytuł | 17–20px | 800 | Inter | |
| Karta opis | 13–14px | 500–600 | Inter | color: text-secondary |
| Badge/chip tekst | 11–12px | 700–800 | Inter | |
| Placeholder/meta | 11px | 600 | Inter | color: text-tertiary |
| Przycisk główny | 15–16px | 700 | Rajdhani | letter-spacing: 0.5px |
| Body text | 15px | 400–500 | Inter | |

---

## Spacing

| Token | Wartość |
|---|---|
| `space-1` | 4px |
| `space-2` | 8px |
| `space-3` | 12px |
| `space-4` | 16px |
| `space-5` | 20px |
| `space-6` | 24px |
| `space-8` | 32px |
| `space-10` | 40px |
| `space-12` | 48px |

Grid: 8pt base grid.

---

## Border Radius

| Token | Wartość | Użycie |
|---|---|---|
| `radius-sm` | 8px | Chip pills, malé elementy |
| `radius-md` | 14px | Przyciski, inputy, badge |
| `radius-lg` | 16–18px | Karty flat, modale |
| `radius-xl` | 22px | Hero cards, główne karty |
| `radius-full` | 99px | Badge, pills, avatary |

---

## Tailwind Config (apps/web/tailwind.config.ts)

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        'bg-0': '#060C18',
        'bg-1': '#0A1428',
        'bg-2': '#0F1C38',
        // Accent
        accent: '#1C69D4',
        'accent-2': '#3D8EF0',
        'blue-dark': '#0653B1',
        // Status
        danger: '#CC0605',
        warning: '#FF9F43',
        destructive: '#FF4757',
        success: '#00B894',
        // Text
        'text-primary': '#FFFFFF',
        'text-secondary': 'rgba(255,255,255,0.65)',
        'text-tertiary': 'rgba(255,255,255,0.38)',
        // Status colors (plot status)
        'status-inbox': '#6B7280',
        'status-draft': '#F59E0B',
        'status-to-analyze': '#3B82F6',
        'status-to-visit': '#8B5CF6',
        'status-visited': '#06B6D4',
        'status-due-diligence': '#F97316',
        'status-shortlist': '#10B981',
        'status-top3': '#FBBF24',
        'status-rejected': '#EF4444',
        'status-closed': '#6B7280',
        // Risk colors
        'risk-low': '#00B894',
        'risk-medium': '#FF9F43',
        'risk-high': '#FF4757',
        'risk-unknown': 'rgba(255,255,255,0.38)',
        // Verdict colors
        'verdict-go': '#00B894',
        'verdict-maybe': '#FF9F43',
        'verdict-no': '#CC0605',
      },
      fontFamily: {
        heading: ['Rajdhani', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['11px', { lineHeight: '1.4' }],
        xs: ['12px', { lineHeight: '1.4' }],
        sm: ['13px', { lineHeight: '1.5' }],
        base: ['15px', { lineHeight: '1.6' }],
        lg: ['17px', { lineHeight: '1.4' }],
        xl: ['20px', { lineHeight: '1.3' }],
        '2xl': ['24px', { lineHeight: '1.2' }],
        '3xl': ['30px', { lineHeight: '1.1' }],
        '4xl': ['32px', { lineHeight: '1' }],
      },
      borderRadius: {
        sm: '8px',
        md: '14px',
        lg: '18px',
        xl: '22px',
        full: '99px',
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        'nav-h': '72px',
      },
      backdropBlur: {
        glass: '32px',
        'glass-sm': '16px',
      },
      boxShadow: {
        card: '0 8px 32px rgba(0,0,0,0.24), 0 1px 2px rgba(0,0,0,0.16)',
        'card-hi': '0 4px 20px rgba(0,0,0,0.30)',
        accent: '0 4px 24px rgba(28,105,212,0.40)',
        glow: '0 0 20px rgba(28,105,212,0.40)',
        danger: '0 4px 16px rgba(204,6,5,0.30)',
      },
      backgroundImage: {
        'gradient-main': 'linear-gradient(170deg, #0A1428 0%, #060C18 55%, #080E1E 100%)',
        'gradient-hero': 'linear-gradient(145deg, rgba(28,105,212,0.18) 0%, rgba(204,6,5,0.05) 60%, transparent 100%)',
        'gradient-overlay': 'linear-gradient(to bottom, rgba(6,12,24,0.1) 0%, transparent 30%, rgba(6,12,24,0.92) 100%)',
        'gradient-accent': 'linear-gradient(135deg, #1C69D4 0%, #0653B1 100%)',
        'glass-shine': 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%)',
      },
    },
  },
  plugins: [],
}

export default config
```

---

## Expo theme.ts (apps/mobile/theme.ts)

```typescript
// apps/mobile/theme.ts
export const colors = {
  // Backgrounds
  bg0: '#060C18',
  bg1: '#0A1428',
  bg2: '#0F1C38',

  // Accent
  accent: '#1C69D4',
  accent2: '#3D8EF0',
  accentGlow: 'rgba(28,105,212,0.40)',
  blueDark: '#0653B1',

  // Status
  danger: '#CC0605',
  warning: '#FF9F43',
  destructive: '#FF4757',
  success: '#00B894',

  // Text
  text: '#FFFFFF',
  text2: 'rgba(255,255,255,0.65)',
  text3: 'rgba(255,255,255,0.38)',

  // Surfaces (glassmorphism)
  surface: 'rgba(255,255,255,0.055)',
  surfaceMd: 'rgba(255,255,255,0.09)',
  surfaceHi: 'rgba(255,255,255,0.14)',

  // Borders
  border: 'rgba(255,255,255,0.09)',
  borderHi: 'rgba(255,255,255,0.18)',

  // Nav
  navBg: 'rgba(8,14,28,0.88)',
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
}

export const borderRadius = {
  sm: 8,
  md: 14,
  lg: 18,
  xl: 22,
  full: 99,
}

export const fontSize = {
  '2xs': 11,
  xs: 12,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 32,
}

export const fontFamily = {
  heading: 'Rajdhani',
  body: 'Inter',
}

export const layout = {
  navHeight: 72,
  maxWidth: 430,
}

// =====================
// STATUS COLORS MAPPING
// =====================
export const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  inbox:           { bg: 'rgba(107,114,128,0.18)', text: '#9CA3AF', border: 'rgba(107,114,128,0.25)' },
  draft:           { bg: 'rgba(245,158,11,0.18)',  text: '#F59E0B', border: 'rgba(245,158,11,0.25)' },
  to_analyze:      { bg: 'rgba(59,130,246,0.18)',  text: '#3B82F6', border: 'rgba(59,130,246,0.25)' },
  to_visit:        { bg: 'rgba(139,92,246,0.18)',  text: '#8B5CF6', border: 'rgba(139,92,246,0.25)' },
  visited:         { bg: 'rgba(6,182,212,0.18)',   text: '#06B6D4', border: 'rgba(6,182,212,0.25)' },
  due_diligence:   { bg: 'rgba(249,115,22,0.18)',  text: '#F97316', border: 'rgba(249,115,22,0.25)' },
  shortlist:       { bg: 'rgba(16,185,129,0.18)',  text: '#10B981', border: 'rgba(16,185,129,0.25)' },
  top3:            { bg: 'rgba(251,191,36,0.18)',  text: '#FBBF24', border: 'rgba(251,191,36,0.25)' },
  rejected:        { bg: 'rgba(239,68,68,0.18)',   text: '#EF4444', border: 'rgba(239,68,68,0.25)' },
  closed:          { bg: 'rgba(107,114,128,0.18)', text: '#6B7280', border: 'rgba(107,114,128,0.25)' },
}

export const STATUS_LABELS: Record<string, string> = {
  inbox: 'Inbox',
  draft: 'Draft',
  to_analyze: 'Do analizy',
  to_visit: 'Do obejrzenia',
  visited: 'Obejrzana',
  due_diligence: 'Due Diligence',
  shortlist: 'Shortlist',
  top3: 'Top 3',
  rejected: 'Odrzucona',
  closed: 'Zamknięta',
}

// =====================
// RISK COLORS MAPPING
// =====================
export const RISK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  low:     { bg: 'rgba(0,184,148,0.18)',  text: '#00B894', border: 'rgba(0,184,148,0.25)' },
  medium:  { bg: 'rgba(255,159,67,0.18)', text: '#FF9F43', border: 'rgba(255,159,67,0.25)' },
  high:    { bg: 'rgba(255,71,87,0.18)',  text: '#FF4757', border: 'rgba(255,71,87,0.25)' },
  unknown: { bg: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.38)', border: 'rgba(255,255,255,0.12)' },
}

export const RISK_LABELS: Record<string, string> = {
  low: 'Niskie ryzyko',
  medium: 'Średnie ryzyko',
  high: 'Wysokie ryzyko',
  unknown: 'Ryzyko nieznane',
}

// =====================
// SOURCE LABELS MAPPING
// =====================
export const SOURCE_LABELS: Record<string, { label: string; short: string; color: string }> = {
  facebook_group:       { label: 'Grupa Facebook', short: 'FB Grupa', color: '#1877F2' },
  facebook_marketplace: { label: 'Facebook Marketplace', short: 'FB Mkt', color: '#1877F2' },
  facebook_profile:     { label: 'Profil Facebook', short: 'FB Profil', color: '#1877F2' },
  otodom:               { label: 'Otodom', short: 'Otodom', color: '#D4430A' },
  olx:                  { label: 'OLX', short: 'OLX', color: '#002F34' },
  adresowo:             { label: 'Adresowo', short: 'Adresowo', color: '#0066CC' },
  gratka:               { label: 'Gratka', short: 'Gratka', color: '#E63946' },
  agent:                { label: 'Agent / Biuro', short: 'Agent', color: '#6B7280' },
  other:                { label: 'Inne', short: 'Inne', color: '#6B7280' },
}

// =====================
// VERDICT COLORS
// =====================
export const VERDICT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  go:    { bg: 'rgba(0,184,148,0.18)',  text: '#00B894', border: 'rgba(0,184,148,0.25)' },
  maybe: { bg: 'rgba(255,159,67,0.18)', text: '#FF9F43', border: 'rgba(255,159,67,0.25)' },
  no:    { bg: 'rgba(204,6,5,0.18)',    text: '#CC0605', border: 'rgba(204,6,5,0.25)' },
}

export const VERDICT_LABELS: Record<string, string> = {
  go: 'GO — Warto dalej',
  maybe: 'MAYBE — Sprawdzić',
  no: 'NO — Odrzucamy',
}

// =====================
// SCORING CRITERIA
// =====================
export const SCORING_CRITERIA = [
  { key: 'location_score',   label: 'Lokalizacja + klimat',    weight: 0.25 },
  { key: 'price_score',      label: 'Cena vs rynek',           weight: 0.20 },
  { key: 'utilities_score',  label: 'Media/infrastruktura',    weight: 0.15 },
  { key: 'size_shape_score', label: 'Wielkość i ustawność',    weight: 0.15 },
  { key: 'legal_risk_score', label: 'Formalności/ryzyka',      weight: 0.15 },
  { key: 'access_score',     label: 'Dojazd',                  weight: 0.10 },
]

export const DEAL_BREAKERS = [
  { key: 'no_road',         label: 'Brak drogi dojazdowej' },
  { key: 'flood_risk',      label: 'Wysokie ryzyko powodziowe' },
  { key: 'power_line',      label: 'Linia NN/WN w strefie kolizyjnej' },
  { key: 'no_legal',        label: 'Nieuregulowany stan prawny' },
  { key: 'no_building',     label: 'Brak możliwości zabudowy (MPZP/WZ)' },
  { key: 'too_small',       label: 'Powierzchnia < 1000 m²' },
]
```

---

## CSS Variables (dla DecisionEngine Design System)

```css
:root {
  /* === TŁA === */
  --c0: #060C18;
  --c1: #0A1428;
  --c2: #0F1C38;

  /* === AKCENT PRIMARY === */
  --accent:       #1C69D4;
  --accent2:      #3D8EF0;
  --accent-glow:  rgba(28, 105, 212, 0.40);
  --blue:         #0653B1;

  /* === AKCENT SECONDARY === */
  --danger:  #CC0605;
  --warning: #FF9F43;
  --rose:    #FF4757;
  --success: #00B894;

  /* === POWIERZCHNIE === */
  --surface:    rgba(255, 255, 255, 0.055);
  --surface-md: rgba(255, 255, 255, 0.09);
  --surface-hi: rgba(255, 255, 255, 0.14);

  /* === OBRAMOWANIA === */
  --border:    rgba(255, 255, 255, 0.09);
  --border-hi: rgba(255, 255, 255, 0.18);

  /* === TYPOGRAFIA === */
  --text:   #FFFFFF;
  --text-2: rgba(255, 255, 255, 0.65);
  --text-3: rgba(255, 255, 255, 0.38);

  /* === LAYOUT === */
  --nav-h:  72px;
  --safe-b: env(safe-area-inset-bottom, 0px);
  --safe-t: env(safe-area-inset-top, 0px);

  /* === BLUR === */
  --blur:    blur(32px) saturate(200%);
  --blur-sm: blur(16px) saturate(180%);
}
```

---

*Tokeny na podstawie DecisionEngine Design System v1.0*
*Ostatnia aktualizacja: 2026-03-21*
