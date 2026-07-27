# Styleguide — Multiplayer Tic-Tac-Toe

**Dark mode only.** No light theme, no toggle, no `prefers-color-scheme` switching. This file is the single source of truth for the visual system. Every screen, feature, and future change must look like it was always part of this product — colours and type below do not get re-picked per feature.

## Design thesis

The **board is the hero** on a deep slate canvas; all chrome around it stays quiet. The product's identity is the **rivalry between X and O**, so each mark owns a colour — **X = cool azure, O = warm amber** — and the signature move is that _the interface takes sides_: the turn indicator, the focus ring on empty cells, and a thin board accent all shift to whoever is to move. A single neutral **iris** accent drives primary buttons and focus so calls-to-action never get confused with a player's turn. Restrained, professional, precise — the boldness is spent in exactly one place (the turn-aware accent), everything else is disciplined monochrome.

Inherited from the previous codebase: only the dark base hue (`#12181b`) as the seed of the surface ramp, refined below. Everything else is new (see `docs/AUDIT.md`).

---

## Color

All values are authored as CSS custom properties on `:root`. Use the tokens, never raw hex, in components.

### Surfaces (dark ramp)

| Token | Hex | Use |
| --- | --- | --- |
| `--surface-0` | `#0D1014` | App background (deepest) |
| `--surface-1` | `#151A21` | Panels, cards, home-screen tiles |
| `--surface-2` | `#1C232C` | Board cells, inputs, raised chrome |
| `--surface-3` | `#232C37` | Hover / pressed raised elements |
| `--border` | `#2A333F` | Hairline dividers, board gridlines, cell borders |
| `--border-strong` | `#3A4653` | Input borders, focused container edges |

### Text

| Token | Hex | Use |
| --- | --- | --- |
| `--text-primary` | `#E8EDF2` | Headings, board marks fallback, key values |
| `--text-secondary` | `#A8B3C0` | Body copy, labels, status text |
| `--text-tertiary` | `#6B7787` | Captions, hints, disabled, eyebrow labels |
| `--text-on-accent` | `#0D1014` | Text/icon on top of a solid accent fill |

### Player marks (the two-sided system)

| Token | Hex | Use |
| --- | --- | --- |
| `--x` | `#5CC8FF` | Player X mark, X score, X-turn accent |
| `--x-dim` | `rgba(92,200,255,0.14)` | X hover wash on empty cell, X winning-line glow |
| `--o` | `#FFB454` | Player O mark, O score, O-turn accent |
| `--o-dim` | `rgba(255,180,84,0.14)` | O hover wash on empty cell, O winning-line glow |

`--turn` is a runtime alias set to `--x` or `--o` by the active seat; components reference `var(--turn)` for turn-aware chrome (turn indicator, empty-cell focus ring, board edge accent).

### Brand & semantic

| Token | Hex | Use |
| --- | --- | --- |
| `--accent` | `#7B8CFF` | Primary buttons, links, brand marks, default focus ring |
| `--accent-hover` | `#8F9EFF` | Primary button hover |
| `--accent-press` | `#6675F0` | Primary button active |
| `--success` | `#46D19E` | Win result, good latency band, connected |
| `--warning` | `#E8C15A` | Mid latency band, soft warnings |
| `--danger` | `#F2555A` | Loss/error, bad latency band, disconnected, destructive |

### Latency bands

`--lat-good: var(--success)` (RTT ≤ 80 ms) · `--lat-mid: var(--warning)` (81–180 ms) · `--lat-bad: var(--danger)` (> 180 ms).

---

## Typography

Bundled locally via `@fontsource` packages — **no external CDN**, app renders fully offline after load (audit lesson #12). Every stack has a system fallback.

| Role | Family | Stack | Weights |
| --- | --- | --- | --- |
| Display | **Space Grotesk** | `"Space Grotesk", "Segoe UI", system-ui, sans-serif` | 500, 600, 700 |
| Body / UI | **IBM Plex Sans** | `"IBM Plex Sans", system-ui, -apple-system, sans-serif` | 400, 500, 600 |
| Mono / data | **JetBrains Mono** | `"JetBrains Mono", ui-monospace, "SF Mono", monospace` | 500, 700 |

**Mono is meaningful, not decorative:** room codes, the shareable link, latency `ms`, and score digits are data and render in JetBrains Mono. The board marks (X / O) render in Space Grotesk 700.

### Type scale

| Token | Size / line-height | Weight | Use |
| --- | --- | --- | --- |
| `--fs-display` | 44px / 1.05 | 700 | Home hero "TIC · TAC · TOE" |
| `--fs-h1` | 28px / 1.15 | 600 | Screen titles |
| `--fs-h2` | 20px / 1.25 | 600 | Section / panel titles |
| `--fs-body` | 15px / 1.5 | 400 | Body copy |
| `--fs-label` | 13px / 1.4 | 500 | Buttons, labels, status |
| `--fs-eyebrow` | 11px / 1.3 | 600 | Uppercase eyebrows, letter-spacing 0.14em, `--text-tertiary` |
| `--fs-mark` | clamp(40px, 12vw, 72px) | 700 | X / O on the board (scales with cell) |
| `--fs-code` | 22px / 1 | 700 | Room code display (mono, letter-spacing 0.2em) |

---

## Spacing, radii, elevation, motion

**Spacing scale** (4px base): `--sp-1:4 · --sp-2:8 · --sp-3:12 · --sp-4:16 · --sp-5:20 · --sp-6:24 · --sp-8:32 · --sp-10:40 · --sp-12:48 · --sp-16:64`. No eyeballed magic offsets (audit lesson #9) — layout uses these tokens with grid/flex and relative units.

**Radii:** `--r-sm:6px` (chips, inputs) · `--r-md:10px` (buttons, board cells) · `--r-lg:14px` (panels, tiles) · `--r-xl:20px` (board frame, modals) · `--r-full:999px` (dots, pills, latency indicator). No `border-radius:50%` pills for buttons.

**Elevation** (shadows are subtle on dark):
- `--shadow-1: 0 1px 2px rgba(0,0,0,0.4)` — raised chrome
- `--shadow-2: 0 8px 28px rgba(0,0,0,0.5)` — panels, result overlay
- `--ring: 0 0 0 3px color-mix(in srgb, var(--accent) 45%, transparent)` — default focus
- `--ring-turn: 0 0 0 3px color-mix(in srgb, var(--turn) 45%, transparent)` — empty-cell focus, turn-aware

**Motion:** `--t-fast:120ms · --t-base:180ms · --t-slow:260ms`, easing `--ease: cubic-bezier(0.2, 0.8, 0.2, 1)`. Board interaction is direct CSS transitions only — no animation library, no full-board re-render (audit lesson: latency). **`prefers-reduced-motion: reduce` disables non-essential transitions.**

---

## Components & interactive states

**Board** — the hero. Centered 3×3 grid, `max-width: min(92vw, 460px)`, square via `aspect-ratio: 1`, `gap` = `--border` hairlines over `--surface-2` cells (no heavy white 1px borders). Cell radius `--r-md`. Board frame radius `--r-xl` with a 1px `--border` edge that gains a `var(--turn)` tint while the local player is to move.
- **Empty cell:** cursor pointer; hover → faint `--x-dim`/`--o-dim` wash matching the local seat + a ghost mark at 30% opacity previewing your glyph.
- **Focus (keyboard):** `--ring-turn` visible ring; arrow keys move focus across the grid, Enter/Space places.
- **Filled cell:** mark in `--x`/`--o`, Space Grotesk 700, no pointer.
- **Disabled (not your turn / spectator / over):** cursor default, no hover wash, opacity unchanged (the turn indicator communicates state, not greying the board).
- **Winning line:** the three cells get a `--x-dim`/`--o-dim` glow and a 3px stroke of the winner's colour across them; losing cells dim to 55% opacity.

**Buttons**
- **Primary** (Create room, main CTAs): `--accent` fill, `--text-on-accent`, radius `--r-md`, padding `12px 20px`, `--fs-label`. Hover `--accent-hover`, active `--accent-press`, focus `--ring`. Disabled: `--surface-2` fill, `--text-tertiary`, no pointer.
- **Secondary** (Leave, Pass&Play, back): transparent fill, `1px --border-strong`, `--text-secondary`. Hover: `--surface-2` fill, `--text-primary`.
- **Ghost/icon** (copy, close): no border, `--text-tertiary` → `--text-primary` on hover, `--surface-2` hover bg.
- **Danger** (destructive confirm): `--danger` text on transparent, `1px --danger`; hover fills `--danger` with `--text-on-accent`.

**Inputs** (room-code entry, nickname): `--surface-2` bg, `1px --border-strong`, radius `--r-sm`, `--text-primary`, placeholder `--text-tertiary`. Focus: border `--accent`, `--ring`. Room-code input is mono, uppercased, letter-spacing 0.2em, centered.

**Status chips / presence**
- Connection dot: `--r-full` 8px dot + `--fs-label` text. Connected `--success`, reconnecting `--warning` (pulse if motion allowed), disconnected `--danger`.
- **Latency indicator:** small mono `NNms` + `--r-full` dot in the active band colour (`--lat-good/mid/bad`). Unobtrusive, top-right of the session bar.
- Turn indicator: pill, `--fs-label`, dot + text in `var(--turn)`; reads "Your turn" / "X's turn" / "Waiting for opponent".

**Panels / tiles / overlays:** `--surface-1`, radius `--r-lg` (tiles) / `--r-xl` (result overlay), `--shadow-2`. Result overlay: scrim `rgba(6,8,11,0.72)`, centered card with outcome (colour = `--success` win / `--danger` loss / `--text-secondary` draw), session score in mono, Rematch (primary) + Leave (secondary).

**Eyebrows / labels / dividers** encode real structure only (mode names, room state, seat) — never decorative numbering. Dividers are 1px `--border`.

---

## Quality floor (non-negotiable, every screen)

- Fully responsive; board and all controls usable one-handed on mobile (min touch target 44px).
- Visible keyboard focus everywhere; board fully keyboard-navigable.
- `prefers-reduced-motion` respected.
- Always-visible state: whose turn, connection status, opponent presence, result with winning line highlighted.
- No blocking `alert`/`confirm`; all feedback rendered in-UI (audit lesson #8).
- Contrast: body text and marks meet WCAG AA on their surfaces.
