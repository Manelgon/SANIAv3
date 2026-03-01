# Design System: SanIA — Sistema Médico

**Project ID:** 6978231519022108608
**Stitch Project:** [SanIA - Sistema Médico](https://stitch.withgoogle.com/projects/6978231519022108608)

---

## 1. Visual Theme & Atmosphere

SanIA evokes **calm authority** — the feeling of a well-organized modern clinic: clean, professional, and deeply trustworthy. The aesthetic is neither cold and sterile (like a generic SaaS tool) nor overly warm and consumer-facing. It occupies a precise middle ground: clinical confidence rendered with human warmth.

The design uses generous whitespace to reduce cognitive load for practitioners under pressure. A whisper of mint teal (#BDF7EB) appears throughout as a grounding accent — a constant, reassuring reminder of the brand's identity without overwhelming the information-dense interfaces.

The overall density is **moderate to high** — enough to surface actionable data without feeling cluttered. Sections breathe with consistent 24–48px vertical rhythm.

---

## 2. Color Palette & Roles

### Primary Colors

| Name | Hex | Role |
|------|-----|------|
| **Deep Forest Teal** | `#0f4d40` | Primary brand color. Used for main headings, CTA button backgrounds, active navigation states, icon backgrounds, and all interactive primary actions. This dark teal anchors every screen. |
| **Agua Celestial** | `#BDF7EB` | Brand accent. Used for active tab underlines, hover states on secondary buttons, gradient left panels (auth screens), mini-pattern backgrounds. The "pulse" of the brand. |
| **Soft Aquamarine** | `#7ed8c8` | Mid-tone bridge. Used in gradients between Agua Celestial and white areas, hover states, and gradient overlays on card header images. |

### Neutral Colors

| Name | Hex | Role |
|------|-----|------|
| **Barely-Mint Off-White** | `#f6f8f7` / `#f6f8f8` | Page background. Slightly cooler than pure white to reduce eye strain over long sessions. |
| **Pure White** | `#ffffff` | Card surfaces, form fields, sidebar interiors (practitioner view), login form panel. |
| **Slate 900** | `#0f172a` | Body text. Maximum readable contrast. |
| **Slate 500** | `#64748b` | Secondary text, subtitles, meta-information (dates, "last updated"). |
| **Slate 200** | `#e2e8f0` | Card borders, input borders, dividers. Barely perceptible — separates without cutting. |
| **Slate 100** | `#f1f5f9` | Input field backgrounds (inactive), search bar backgrounds, subtle hover backgrounds. |

### Semantic Colors

| Name | Hex | Role |
|------|-----|------|
| **Alert Red** | `#dc2626` (red-600) | Alert counters, critical notification icons, warning states. Always paired with `#fef2f2` (red-50) background. |
| **Alert Red Background** | `#fef2f2` | Background for alert indicator badges and warning containers. |

### Dark Mode Equivalents
- Background dark: `#12201d` / `#11211e` (very dark mint-tinted near-black)
- Border dark: `#095343` at 20% opacity
- Surface dark: `bg-background-dark/40` (semi-transparent elevated surfaces)

---

## 3. Typography Rules

**Font Family:** Inter (Google Fonts) — weights 300, 400, 500, 600, 700, 800  
**CSS class:** `font-display` (mapped to `["Inter", "sans-serif"]`)

| Usage | Weight | Size | Notes |
|-------|--------|------|-------|
| Page titles (e.g., "Mis Carteras") | 700 Bold | 1.875rem (3xl) | `tracking-tight` to feel authoritative |
| Auth hero headline | 800 Black | 3rem (5xl) | `leading-tight tracking-tight font-black` |
| Card headings | 700 Bold | 1.125rem (lg) | Dark Forest Teal color |
| Section headings | 700 Bold | 1.25rem (xl) | With material icon prefix |
| Body text | 400 Regular | 0.875rem (sm) | Slate 500 for secondary, Slate 900 for primary |
| KPI numbers | 700 Bold | 1.125rem (lg) | Deep Forest Teal |
| Labels / form labels | 600 SemiBold | 0.875rem (sm) | Slate 700 |
| Metadata / timestamps | 400 Regular | 0.75rem (xs) | Slate 400 |
| Navigation tabs | 700 Bold (active) / 500 Medium (inactive) | 0.875rem (sm) | |
| Uppercase tracking labels | 700 Bold | 0.625rem (xs) | `uppercase tracking-wider` for KPI subtitles |

**Icon System:** Google Material Symbols Outlined (`material-symbols-outlined`) — used throughout for consistency.

---

## 4. Component Stylings

### Buttons

**Primary CTA** (e.g., "Entrar", "Crear Nueva Cartera", "Nuevo Usuario"):
- Background: Deep Forest Teal (`#0f4d40` / `bg-primary`)
- Text: White, font-bold or font-semibold
- Shape: Gently rounded corners (`rounded-lg`, 8px)
- Shadow: Soft directional shadow tinted with primary (`shadow-md shadow-primary/20`)
- Hover: Slight opacity reduction (`hover:bg-primary/90`) with scale microinteraction (`active:scale-95`)
- Arrow icon appended on auth CTAs with translate-x hover animation

**Secondary CTA** (e.g., "Ver Cartera"):
- Background: Agua Celestial at 20% opacity (`bg-accent/20`)
- Hover: Full Agua Celestial (`hover:bg-accent`)
- Text: Deep Forest Teal, font-bold
- Shape: Gently rounded (`rounded-lg`)
- No shadow

**Ghost / Outline Buttons** (social login, cancel):
- Border: Slate 200 (`border border-slate-200`)
- Background: White
- Text: Slate 700, font-medium
- Hover: Slate 50 background

### Cards / Containers

**Portfolio / Data Cards:**
- Background: White
- Border: `border border-slate-200` — 1px, barely visible
- Corner rounding: Generously rounded (`rounded-xl`, 12px)
- Shadow: Whisper-soft elevation (`shadow-sm`) upgrading to `shadow-md` on hover
- Hover transition: `transition-shadow` only — no transform, maintaining clinical stability

**KPI Mini-Badges** (header stats):
- Background: White with `border border-slate-200`
- Corner rounding: Subtly rounded (`rounded-lg`, 8px)
- Shadow: `shadow-sm`
- Icon container: `bg-primary/10 rounded-lg` (10% teal tint square)
- Alert KPI: `bg-red-50` icon container, `text-red-600`

**Welcome/Hero Banner Cards:**
- Background: Gradient from Agua Celestial (`#BDF7EB`) to Soft Aquamarine (`#7ed8c8`)
- Text: Deep Forest Teal on the gradient (sufficient contrast)
- Corner rounding: Generously rounded (`rounded-xl`)

**Empty State / Create Cards:**
- Border: `border-2 border-dashed border-slate-200`
- Background: `bg-slate-50/50`
- Hover: `hover:border-primary hover:bg-primary/5` — activates on hover, signaling interactivity
- Icon circle: Large rounded circle (`size-16 rounded-full`) with hover fill transition

### Inputs / Forms

- Shape: Gently rounded corners (`rounded-lg`, 8px)
- Border: `border border-slate-200` (inactive), `border-primary ring-1 ring-primary` (focused)
- Background: White (always, never gray)
- Padding: Comfortable — `px-4 py-3.5`
- Placeholder: Slate 400
- Transition: `transition-all` for smooth focus ring appearance
- Password show/hide: Material icon button absolutely positioned right (`absolute right-3 top-1/2 -translate-y-1/2`)

### Navigation

**Tab Bar Navigation** (Practitioner Dashboard):
- Container: `border-t border-slate-100 bg-slate-50/50` — whisper separator from header
- Active tab: `border-b-4 border-accent text-primary font-bold` — thick Agua Celestial underline
- Inactive tab: `border-b-4 border-transparent text-slate-500 font-medium` — invisible border maintains layout
- Hover: `hover:text-primary` color transition
- Icons: Material Symbols 20px prefixed per tab label

**Sidebar Navigation** (Admin Panel):
- Background: Deep Forest Teal (`#0f4d40`) — full dark teal sidebar
- Text: White for all items
- Active item: Agua Celestial accent left border or background highlight
- Width: Fixed, ~256px

### Headers

**App Header Bar:**
- Background: White, sticky `top-0 z-50`
- Border: `border-b border-primary/10` — subtle teal-tinted separator
- Height: ~64px (py-4)
- Contains: Brand logo-icon + name, search, notifications bell, user avatar

**Brand Logo Pattern:**
- Icon: `size-8 bg-primary text-white rounded-lg` square container with health/medical icon
- Name: `text-xl font-bold text-primary tracking-tight` "SanIA"
- Subtitle: `text-xs font-medium uppercase tracking-wider text-primary/60`

---

## 5. Layout Principles

### Grid Strategy
- Desktop layouts use CSS Grid and Flexbox at 3-column max for cards (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`)
- Content area max-width: `max-w-6xl mx-auto` for comfortable reading line lengths
- Full-bleed horizontal padding: `px-6 lg:px-20` — tighter on mobile, generous on large screens

### Whitespace Strategy
- Section gap: `gap-6` between cards (24px)
- Section vertical rhythm: `py-10` content area top/bottom, `mb-8` between section headers and content
- Card internal padding: `p-5` to `p-6` — room to breathe without wasting space

### Split Layout (Auth Screens)
- 50/50 horizontal split on desktop (`lg:w-1/2` each)
- Left: Gradient brand panel with illustration, tagline, social proof
- Right: White form panel with centered max-width container (`max-w-md`)
- Left panel hidden on mobile, form takes full width

### Elevation Model
- Page background: `f6f8f7` (level 0)
- Cards: White with `shadow-sm` (level 1)
- Header / sticky elements: White with `border-b` (level 2 — no shadow, border separates)
- Modals / overlays: `bg-black/50 backdrop-blur-sm` (level 3)

### Activity / Feed Rows
- Consistent 40px (`size-10`) avatar/icon circles: rounded-full colored containers
- Icon color matches context: `bg-accent/30 text-primary` for positive actions, `bg-red-100 text-red-600` for alerts
- `hover:bg-slate-50` row hover for full-width clickable rows
- Chevron icon right-aligned as affordance signal

---

## 6. Design System Notes for Stitch Generation

When generating new SanIA screens, include this block in your prompt:

```
SANIA DESIGN SYSTEM:
- Color mode: Light
- Primary color: Deep Forest Teal (#0f4d40) — headings, CTAs, active nav, icon containers
- Accent color: Agua Celestial (#BDF7EB) — active tab underlines, secondary button hover, hero gradients
- Mid-tone: Soft Aquamarine (#7ed8c8) — gradient transitions, hover backgrounds
- Page background: #f6f8f7 (barely-mint off-white)
- Card background: White with slate-200 border and shadow-sm
- Font: Inter (Google Fonts), weights 400/500/600/700/800
- Icons: Google Material Symbols Outlined
- Corner rounding: 8px inputs/buttons (rounded-lg), 12px cards (rounded-xl)
- Primary button: bg-primary (#0f4d40) text-white rounded-lg shadow-md
- Secondary button: bg-accent/20 hover:bg-accent text-primary rounded-lg
- Active tab: border-b-4 border-accent (#BDF7EB) text-primary font-bold
- Alert/Warning: red-600 text with red-50 background
- All text in Spanish
- Professional medical/clinical aesthetic — calm authority, not cold
```
