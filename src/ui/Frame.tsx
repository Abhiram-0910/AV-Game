// Gold filigree from the court: a chamfer-cut lapis ground, a double rule with stepped corners, a cusped-arch crest,
// diamond finials and a faint white stencil. Drawn behind its host's content (z-index -1 inside an isolated host;
// aria-hidden, no text, pointer-events none), so it never changes a host's size, position or textContent. Colours
// come from royal.css tokens through classes. DESIGN.md documents the kinds.
import { useId, type CSSProperties, type ReactNode } from 'react'

type FrameKind = 'panel' | 'card' | 'dialogue'
type CornerAt = 'tl' | 'tr' | 'bl' | 'br'

const CORNER_PX: Record<FrameKind, number> = { panel: 40, card: 22, dialogue: 36 }
const CORNERS: readonly CornerAt[] = ['tl', 'tr', 'bl', 'br']
const EDGES = ['top', 'right', 'bottom', 'left'] as const

/** Where the outer rule's chamfer meets the edge; the ground is cut on the same line. */
const chamferPx = (s: number) => Math.round(s * 0.45)

/** The top-left corner in pixels (CSS mirrors it): outer rule chamfered, inner rule stepped, a gem in the cut.
 * The rules sit at 1 and 6.5 px, the same lines the CSS edges draw, so corner and edge meet exactly. */
function Corner({ s, at }: { s: number; at: CornerAt }) {
  const a = chamferPx(s)
  const c = Math.max(11, Math.round(s * 0.35))
  return (
    <svg className={`frame-corner frame-corner--${at}`} width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <path className="frame-line" d={`M${s},1 L${a},1 L1,${a} L1,${s}`} />
      <path className="frame-line frame-line--inner" d={`M${s},6.5 L${c},6.5 L${c},${c} L6.5,${c} L6.5,${s}`} />
      {s >= 30 && <path className="frame-gem" d="M5.5,2 L9,5.5 L5.5,9 L2,5.5 Z" />}
      {/* The inward gem reaches 26px in: only a panel's padding keeps it clear of text. */}
      {s >= 40 && <path className="frame-line frame-line--inner" d={`M${c},${c} L${c + 6},${c + 6}`} />}
      {s >= 40 && <path className="frame-gem frame-gem--coral" d={`M${c + 9},${c + 5} L${c + 13},${c + 9} L${c + 9},${c + 13} L${c + 5},${c + 9} Z`} />}
    </svg>
  )
}

/** A scalloped arch on the top rule, after the court's arcade: a night plate in a double gold line, gems above and
 * inside. Its base sits on the outer rule (the CSS lifts it by its height less 1px). */
function Crest() {
  return (
    <svg className="frame-crest" width="120" height="34" viewBox="0 0 120 34">
      <path
        className="frame-plate"
        d="M2,33 C20,33 30,27 38,22 C42,19 44,21 47,17 C50,13 53,15 56,11 C58,8 59,8 60,6 C61,8 62,8 64,11 C67,15 70,13 73,17 C76,21 78,19 82,22 C90,27 100,33 118,33 Z"
      />
      <path
        className="frame-crest-inner"
        d="M22,33 C32,31 38,28 44,25 C48,23 50,24 52,21 C55,18 57,19 60,15 C63,19 65,18 68,21 C70,24 72,23 76,25 C82,28 88,31 98,33"
      />
      <path className="frame-gem" d="M60,0 L62.5,2.5 L60,5 L57.5,2.5 Z" />
      <path className="frame-gem frame-gem--coral" d="M60,21 L63,25 L60,29 L57,25 Z" />
    </svg>
  )
}

function Finial({ at }: { at: 'bottom' | 'left' | 'right' }) {
  return (
    <svg className={`frame-finial frame-finial--${at}`} width="20" height="20" viewBox="0 0 20 20">
      <path className="frame-plate" d="M10,1.5 L18.5,10 L10,18.5 L1.5,10 Z" />
      <path className="frame-gem frame-gem--coral" d="M10,6.5 L13.5,10 L10,13.5 L6.5,10 Z" />
    </svg>
  )
}

/** White plaster stencil: a four-petal flower with dots, faded out behind the text by a mask in royal.css. */
function Stencil() {
  const id = `stencil${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <svg className="frame-stencil" width="100%" height="100%">
      <defs>
        <pattern id={id} width="56" height="56" patternUnits="userSpaceOnUse">
          <path d="M28,12 C33,19 33,23 28,28 C23,23 23,19 28,12 Z M28,44 C23,37 23,33 28,28 C33,33 33,37 28,44 Z M12,28 C19,23 23,23 28,28 C23,33 19,33 12,28 Z M44,28 C37,33 33,33 28,28 C33,23 37,23 44,28 Z" />
          <circle cx="0" cy="0" r="3" />
          <circle cx="56" cy="0" r="3" />
          <circle cx="0" cy="56" r="3" />
          <circle cx="56" cy="56" r="3" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

export function Frame({ kind }: { kind: FrameKind }) {
  const s = CORNER_PX[kind]
  const style = { '--corner': `${s}px`, '--chamfer': `${chamferPx(s)}px` } as CSSProperties
  return (
    <span className={`frame frame--${kind}`} style={style} aria-hidden="true">
      <span className="frame-ground" />
      {kind === 'panel' && <Stencil />}
      {EDGES.map((e) => (
        <span key={e} className={`frame-edge frame-edge--${e}`} />
      ))}
      {CORNERS.map((at) => (
        <Corner key={at} s={s} at={at} />
      ))}
      {kind !== 'card' && <Crest />}
      {kind !== 'card' && <Finial at="bottom" />}
      {kind === 'panel' && <Finial at="left" />}
      {kind === 'panel' && <Finial at="right" />}
    </span>
  )
}

/** A framed lapis panel for menus and result screens. The body scrolls if it must; the frame never does. */
export function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="panel">
      <Frame kind="panel" />
      <div className="panel-body">{children}</div>
    </div>
  )
}
