# Design System

## Principles

- **Clean and professional.** Neutral backgrounds, white surfaces, thin
  borders, soft shadows. No decorative gradients, glassmorphism, or
  oversized hero graphics.
- **One source of truth.** Every color, radius, shadow, and layout
  dimension is a CSS variable in `src/app/globals.css`. Components
  consume tokens; they do not invent values.
- **Dense but comfortable.** Business data density with an 8-point
  spacing rhythm (4-point base) and a 12px body text floor.
- **Honest states.** Every control either works or is visibly disabled
  with an explanation. Status is never communicated by color alone.
- **Motion is optional.** Transitions are subtle and short; all are
  disabled under `prefers-reduced-motion`.

## Color tokens

All tokens are defined in `:root` in `src/app/globals.css` and exposed
to Tailwind through `@theme inline`. A `.dark` token set exists as a
foundation but is **not exposed** in Phase 1 (no theme toggle).

| Token | Value (light) | Usage |
| --- | --- | --- |
| `--background` | `#F7F8FA` | Application background |
| `--card` | `#FFFFFF` | Card, sidebar, and top bar surfaces |
| `--foreground` | `#172033` | Primary text |
| `--muted-foreground` | `#64748B` | Secondary text, captions |
| `--border` / `--input` | `#E2E8F0` | Hairlines, dividers, control borders |
| `--primary` | `#2563EB` | Primary actions, links, focus rings, active nav |
| `--primary-foreground` | `#FFFFFF` | Text on primary |
| `--secondary` / `--muted` | `#F1F5F9` | Subtle fills, hover surfaces, skeletons |
| `--accent` | `#EFF4FF` | Selected/hover tint for menus and lists |
| `--success` | `#15803D` | Positive status, qualified, won |
| `--warning` | `#B45309` | In-progress status, tasks due today |
| `--destructive` | `#B91C1C` | Errors, overdue, destructive actions |
| `--ring` | `#2563EB` | Keyboard focus ring |
| `--chart-1…4` | blue ramp | Pipeline stages (light → dark as stages advance) |
| `--chart-5` | `#15803D` | Closed-won stage |

**Soft status surfaces** follow one pattern everywhere:
`bg-<tone>/10 text-<tone>` (e.g. `bg-success/10 text-success`). Status
badges always include a text label, so state is legible without color
vision and to screen readers.

**Contrast.** Body text (`#172033` on `#FFFFFF`) is ~15:1; secondary
text (`#64748B` on white) is ~4.8:1; primary text on primary is ~4.6:1
for large/UI usage. Status tones on their 10% tints all exceed 4.5:1.

## Typography

- **Font families:** Geist (sans) and Geist Mono, loaded with
  `next/font/google`, which downloads and self-hosts at build time — no
  external font service at runtime. Mapped via `--font-sans` /
  `--font-mono`; `--font-heading` aliases the sans face.
- **Scale (Tailwind utilities):**

| Role | Classes |
| --- | --- |
| Page title | `text-2xl font-semibold tracking-tight` |
| Section heading | `text-base font-semibold tracking-tight` |
| Card/row primary text | `text-sm font-medium` |
| Body / secondary | `text-sm text-muted-foreground` |
| Micro text (captions, column headers) | `text-xs` |
| KPI value | `text-3xl font-semibold tabular-nums` |

- **Numbers** always render with `tabular-nums` so columns of figures
  align.

## Spacing, radius, and elevation

- **Spacing rhythm:** 8-point major grid, 4-point base (Tailwind's
  default scale). Page gutters: `px-4` (mobile) → `sm:px-6` →
  `lg:px-8`; page vertical rhythm uses `space-y-6`; grids use `gap-4`.
- **Radius:** base `--radius: 0.5rem` (8px). Cards, inputs, and menus
  use `rounded-lg` (8px); nav items and list rows use `rounded-md`
  (6.4px); badges and pills are `rounded-full`. No ad-hoc radii.
- **Shadows:** `shadow-xs` on cards only; `shadow-md` on floating
  surfaces (dropdown, sheet). Shadows are subtle; borders do the
  structural work.
- **Borders:** 1px `--border` everywhere; dashed borders are reserved
  for empty states.

## Layout dimensions

| Token | Value | Purpose |
| --- | --- | --- |
| `--app-sidebar-width` | 248px | Desktop sidebar column |
| `--app-topbar-height` | 64px | Top bar height (sidebar brand row matches it) |
| `--app-content-max-width` | 1400px | Max width of page content, centered |

- **Desktop (≥1024px):** sidebar is a sticky, independently scrolling
  column; the top bar is sticky with a solid white background; content
  scrolls under it. Balanced at 1440×900 and usable at 1280×720.
- **Mobile (<1024px):** the sidebar is hidden entirely and replaced by
  an accessible drawer (Radix sheet): focus is trapped while open,
  Escape closes it, and focus returns to the toggle. The desktop
  sidebar is never squeezed until unreadable.

## Breakpoints and responsive rules

Tailwind defaults: `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px.

| Region | Mobile | Medium | Wide |
| --- | --- | --- | --- |
| KPI grid | 1 column | 2 columns (`sm:grid-cols-2`) | 4 columns (`xl:grid-cols-4`) |
| Dashboard rows | stacked | stacked | `lg:grid-cols-3` with pipeline/leads spanning 2 |
| Leads table | Name, Status, Created; container scrolls if needed | + Company (`md:`) | + Source, Owner (`lg:`) |
| Pipeline rows | label + bar + value (count hidden) | + deal count | same |
| Top bar | icon-only search, no breadcrumb root | + breadcrumb root (`md:`) | + "Soon" cues (`lg:`) |

Tables rely on progressive column hiding first and horizontal scroll
within the table's own container as a last resort — the page itself
never scrolls horizontally.

## Component patterns

- **AppShell** — skip-link, sidebar, sticky top bar, main content with
  `id="main-content"` (skip-link target, `tabIndex={-1}`).
- **SidebarNav / SidebarFooter** — rendered from `lib/navigation.ts`;
  available items are links; upcoming items are disabled buttons with a
  "Soon" chip and an aria-label naming the target phase. Used by both
  desktop sidebar and mobile drawer so they can never diverge.
- **PageHeader** — `h1` + description + badge slot (demo-data
  indicator) + actions slot.
- **SectionHeader** — `h2` (optionally `id`-ed for
  `aria-labelledby`) + description + action slot.
- **MetricCard** — label, prominent `tabular-nums` value, optional
  trend (direction icon + explicit semantics: positive / negative /
  neutral), supporting description.
- **StatusBadge** — soft-tinted pill with text label and decorative
  dot; one tone vocabulary shared by all record kinds.
- **EmptyState / ErrorState / LoadingState** — dashed-border empty
  panels, `role="alert"` error panels with an action slot, and
  skeletons that mirror the dashboard layout to avoid shift.
- **Table primitives** — shadcn/ui `Table*` with header row (`text-xs`
  uppercase tracking), zebra-free rows with subtle hover, and
  `whitespace-nowrap` cells.

## Accessibility standards

- Semantic landmarks: `header`, `nav` (with `aria-label`), `main`,
  `aside`, `header/h1/h2` hierarchy without skipped levels.
- Icon-only controls carry `aria-label`s (menu toggle, search,
  notifications, account menu, sheet close).
- Visible keyboard focus everywhere: `focus-visible:ring-2` with the
  token `--ring`; the skip link appears on focus.
- Disabled controls use the native `disabled` attribute (removed from
  tab order, announced as unavailable) plus visible "Soon" cues — never
  fake-enabled dead controls.
- Statuses are text labels first; color is enhancement only.
- Interactive targets are ≥32px (icon buttons `size-8`), most ≥36px.
- `prefers-reduced-motion` collapses all transitions and animations.
- The mobile drawer is a Radix dialog: focus trap, Escape to close,
  focus restoration, and correct `aria` wiring out of the box.
