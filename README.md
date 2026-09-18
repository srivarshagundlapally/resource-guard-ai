# LeakSense Dashboard (56)

PHASE 1 — Project Foundation & Design System

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create a new React + TypeScript + Vite project called "LeakSense AI" —

an Intelligent Resource Leakage Detection System for a college campus.

This is Phase 1: Foundation & Design System.

TECH STACK:

- React 18 + TypeScript

- Vite (build tool)

- Tailwind CSS (styling)

- shadcn/ui (component library)

- React Router v6 (routing)

- Recharts (charts)

- Lucide React (icons)

- Axios (API calls)

- React Query / TanStack Query v5 (server state)

PROJECT IDENTITY:

- App Name: LeakSense AI

- Tagline: Intelligent Resource Leakage Detection System

- College: Geethanjali College of Engineering & Technology

- Team: B5 | III B.Tech II Sem AIML | AY 2026–27

DESIGN SYSTEM — implement these exact CSS custom properties in

index.css:

```css

:root {

 --color-primary: #0F4C75;

 --color-primary-light: #1B6CA8;

 --color-primary-dark: #0A3352;

 --color-accent: #00C9A7;

 --color-accent-dark: #009E84;

 --color-warning: #F5A623;

 --color-danger: #E74C3C;

 --color-surface: #0D1B2A;

 --color-card: #162032;

 --color-border: #1E2F45;

}

GLOBAL STYLES to add:

Dark background: #0D1B2A throughout

Card component: bg #162032, border #1E2F45, border-radius 12px, padding

20px

All text on dark: slate-100 for headings, slate-400 for labels, slate-500 for hints

Custom scrollbar: 6px wide, track #0D1B2A, thumb #1E2F45

Font: Inter for body, Space Grotesk for headings/numbers (import from

Google Fonts)

Smooth transitions: 150ms ease for all hover states

TAILWIND CONFIG — extend with these colors:

colors: {

 primary: { DEFAULT: '#0F4C75', light: '#1B6CA8', dark: '#0A3352' },

 accent: { DEFAULT: '#00C9A7', light: '#33D4B7', dark: '#009E84' },

 warning: { DEFAULT: '#F5A623' },

 danger: { DEFAULT: '#E74C3C' },

 surface: { DEFAULT: '#0D1B2A', card: '#162032', border: '#1E2F45' },

}

REUSABLE COMPONENT LIBRARY — create these in src/components/ui/:

1. StatCard.tsx

Props: title (string), value (string|number), unit (string?), change (number?),

icon (LucideIcon), iconColor (string), accent (boolean?)

Layout: icon top-right in colored box, big number with unit, % change below

with up/down arrow colored red (increase) or green (decrease)

2. AlertBadge.tsx

Props: severity ('critical'|'high'|'medium'|'low'|'normal')

Renders colored pill badges:

critical: bg red/20 text red, with animated pulse dot

high: bg orange/20 text orange

medium: bg yellow/20 text yellow

low: bg teal/20 text teal

normal: bg slate-700 text slate-300

3. ResourceIcon.tsx

Props: resource ('water'|'electricity'|'internet'), size (number?)

water → Droplets icon, color #1B6CA8

electricity → Zap icon, color #F5A623

internet → Wifi icon, color #00C9A7

4. SectionTitle.tsx

Props: children, icon (LucideIcon?), action (ReactNode?)

Renders: flex row with optional icon + title (Space Grotesk font, 18px bold) +

optional action button right-aligned

5. EmptyState.tsx

Props: icon (LucideIcon), title, description, action (ReactNode?)

Centered layout for empty data states

LAYOUT SHELL — create src/components/layout/:

Sidebar.tsx — fixed left sidebar, width 240px, bg #162032, border-right #1E2F45:

Logo section top: gradient icon (primary→accent) + "LeakSense" bold + "AI

MONITOR" badge in accent color

Resource pill row: 3 small boxes showing 💧 Water / ⚡ Elec / 🌐 Net

Navigation links (use React Router NavLink):

/dashboard → LayoutDashboard icon → "Dashboard"

/anomalies → AlertTriangle icon → "Anomalies"

/predictions → TrendingUp icon → "Predictions"

/chatbot → MessageSquare icon → "AI Assistant"

/reports → FileText icon → "Reports"

/upload → Upload icon → "Upload Data"

Active link style: bg primary/20, text primary-light, left border 2px primary-light

Footer: team info card — "Team B5 · GCET | III B.Tech II Sem AIML | AY 2026-

27"

Header.tsx — top bar, height 56px, bg #162032, border-bottom #1E2F45:

Left: page title (dynamic, use useLocation to map paths to titles) + date below

it

Right: RefreshCw button, Bell button with red dot, Settings button, Team B5

avatar circle (gradient)

App.tsx — wire up React Router with:

Layout wrapper (Sidebar + Header + main content area)

Routes: /, /dashboard, /anomalies, /predictions, /chatbot, /reports, /upload

Root / redirects to /dashboard

Main content: flex-1, overflow-y-auto, p-6, bg surface

Create a placeholder page for each route that shows:

Page title

"Coming in next phase" message

The relevant icon

DELIVERABLE: A fully working dark-themed shell application with sidebar

navigation, header, routing between 6 pages, and all reusable UI components.

The design must look like a professional real-time monitoring dashboard.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://resource-guard-ai.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d3f61167-9a50-40f9-b571-1040550c73d8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
