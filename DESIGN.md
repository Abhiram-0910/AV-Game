# DESIGN.md — Royal UI

The locked design system for every menu, panel and HUD element in `src/ui/`. Tokens and frame styles live in
`src/ui/royal.css`; the frame components in `src/ui/Frame.tsx`. Per-element styles in `src/ui/ui.css` reference
tokens by name only.

**Direction.** The UI belongs in the L1 court: gold filigree on deep lapis (art-deco Indian frames), crimson lacquer,
coral, white plaster stencil, the scalloped arch of the arcade. Mythological and royal, but a 12-year-old on a lab
monitor at 1366×768 must read every word first. **Ornament never sits under text.**

References (not copied): `docs/reference/royal-frames.png`, `docs/reference/palace-ref-*.jpg` in the main checkout.

## Hard rules

| Rule | Value | Where enforced |
|---|---|---|
| Minimum text size | `--text-min` 16px (the `?debug` perf overlay is exempt) | audit in the UI screenshot script |
| Minimum hit target | `--hit` 48px on every button and input | same |
| Contrast | ≥ 4.5:1 for every text/background token pair (table below) | measured |
| Image assets | none: inline SVG and CSS only, no new dependencies | review |
| Layout | frames are overlays (absolute, `pointer-events: none`); a framed element keeps its box and anchor | rect diff in the screenshot script |
| Test ids | ornaments are `aria-hidden` and hold no text, so `textContent` and every `data-testid` are unchanged | e2e |
| Display face | Yatra One (`--font-display`) for h1/h2, buttons and speaker names only; body stays the system font. It has no bold (`font-synthesis-weight: none`) | — |
| Motion | colour and border transitions ≤ 150ms on hover; focus ring shows instantly | — |

## Tokens

| Token | Value | Use |
|---|---|---|
| `--royal-night` | #13102e | panel edge, plates behind gems, rings |
| `--royal-lapis` | #241e5c | panel centre, choice buttons |
| `--royal-lapis-bright` | #322a78 | choice button top light |
| `--royal-lapis-hover` | #3d3490 | choice button hover top |
| `--royal-ground` | rgba(19,16,46,0.94) | HUD cards, bar tracks, dialogue edge |
| `--gold` | #e6b450 | outer rule, headings, labels, gems |
| `--gold-bright` | #ffd784 | hover rule, focus ring, waypoint arrow |
| `--gold-deep` | #a8762a | inner rule on buttons and plates |
| `--gold-mid` | #c8953d | inner rule of SVG frames (reads on lapis where gold-deep goes muddy) |
| `--crimson` / `-bright` / `-deep` | #7c1526 / #9e2237 / #53101b | action buttons (lacquer), boss accents |
| `--crimson-hover` | #b52a41 | action button hover top |
| `--coral` | #e8866b | inner gems, heading diamond, speaker diamonds, hover inner rule, boss name |
| `--stencil` | #fff6e6 | plaster stencil pattern at 7% opacity, border band only |
| `--ink` / `--ink-dim` | #f6eedc / #dccfb3 | body text / secondary text |
| `--ink-on-gold` | #1a120b | text on gold (prompt banner, chosen answer) |
| `--danger` / `--correct` | #ff6b5c / #86e88e | quiz verdict |
| `--scrim` | rgba(9,7,20,0.66) | full-screen dim behind a panel |
| `--rule-outer` / `--rule-inner` | 2px / 1px | the double rule |

## Contrast (WCAG 2.1, measured on the solid token colours)

| Text | Background | Ratio |
|---|---|---|
| ink | royal-night / lapis / lapis-bright | 15.9 / 12.8 / 10.5 |
| ink | choice hover top (#3d3490) | 8.7 |
| ink-dim | royal-night / lapis | 11.9 / 9.6 |
| gold | royal-night / lapis | 9.6 / 7.8 |
| ink | crimson / crimson-bright / hover top (#b52a41) | 9.1 / 6.6 / 5.4 |
| ink-on-gold | gold / gold-bright | 9.7 / 13.5 |
| coral | royal-night | 7.1 |
| danger / correct | lapis | 5.3 / 9.9 |

HUD text that sits directly on the 3D scene (labels, stat numbers, controls line) carries a `--shadow` text-shadow.

## Frame components

`Frame({ kind })` is the host's first child and draws **behind** its content: `.frame` has `z-index: -1`, so the host
must be positioned and have `isolation: isolate`, and must have no background of its own. It draws:
- a lapis ground cut on the chamfer (`clip-path`, `--chamfer` = 45% of the corner size), so a cut corner shows the
  scene, not a square box behind the gold line;
- a double rule (2px gold at 1px in, 1px gold-mid at 6.5px in) whose corners are SVG: outer rule chamfered, inner
  rule stepped, a gold gem in the cut, and on panel corners (40px) a short inward stroke to a coral gem (it reaches 26px in, which only
  a panel's padding keeps clear of text).

Corners and edges meet on the same pixel lines, so any box size works.

| Kind | Corner | Extras | Used by |
|---|---|---|---|
| `panel` | 40px | scalloped-arch crest (top), diamond finials (bottom, left, right), plaster stencil | `Panel` |
| `dialogue` | 36px | crest, bottom finial | `DialoguePanel` |
| `card` | 22px | none (small HUD box) | objective card, boss health bar |

`Panel({ children })` is the framed lapis container for every full-screen menu: title, confirm, settings, codex list
and card, loading, pause, quiz, result, ending. The screen root (`.screen`, `.settings`, `.codex`) stays the scrim
and keeps its `data-testid`. The panel body scrolls if content outgrows the viewport; the frame never scrolls.
A panel's direct `h1`/`h2` gets a gold rule with a coral diamond beneath it.

CSS-only frames (too small or too many for SVG):
- **`.btn`** (actions): crimson lacquer gradient, ivory Yatra text, a 2px gold border plus a 1px gold-deep inner rule
  (inset shadow), and a gold diamond finial straddling each end.
- **`.btn-choice`** (quiz options, codex entries, quality tier): lapis with the same double rule, body font.
- **`.hud-prompt`**: a gold banner with pointed ends (clip-path cut into the side padding only) and fine inner rules.
- **`.bar`**: health, yajna and loading tracks get a night gap and a 1px gold ring outside the box (`box-shadow`).
- **`.codex-unlock`**: night plate in a gold double rule.

## Button states

| State | `.btn` | `.btn-choice` |
|---|---|---|
| default | crimson, gold rule | lapis, gold-deep inner rule |
| hover | brighter crimson, gold-bright rule, coral inner rule, bright finials | lighter lapis, gold inner rule |
| focus-visible | 3px gold-bright outline, 4px offset, instant | same |
| active | 1px press | same |
| disabled | 0.55 opacity, no hover | same; a chosen (`aria-pressed`) answer stays at full opacity |
| pressed (`aria-pressed`) | — | gold fill, ink-on-gold text |

No `clip-path` on buttons, so the focus ring is never cut.

## Adding UI

- A new full-screen menu: its root keeps the scrim class and test id; its content goes in `<Panel>`.
- A new HUD box: put `<Frame kind="card" />` as its first child; give the box `position: absolute` (or relative),
  `isolation: isolate` and no background (the frame's ground is the background). Do not add borders that change its
  size.
- No `filter` on anything whose text changes per frame (dialogue typewriter, HUD counters): a filtered layer
  re-rasterises on every change, which the integrated-GPU lab PCs pay for. Menu panels may carry a drop shadow.
- A new colour: add a token to `royal.css` and a row here, with its contrast ratio against what it sits on.
