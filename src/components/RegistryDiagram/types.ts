import type { DiagramMode } from "./theme"

/** `label` = solid pill (Figma default); `labelHatched` = cross-hatch fill (Figma variant 2). */
export type NodeType = "registry" | "label" | "labelHatched" | "dashed"

export interface NodeData {
  id: string
  label: string
  type: NodeType
  /** `registry` only: inner hatched slot labels inside one compound frame (Figma Diagram System). */
  slots?: string[]
  /**
   * `registry` only: nested nodes drawn inside this frame (vertical stack; Figma nested Registry).
   * When `children?.length` is set, `slots` is ignored for layout/render. Not represented in Mermaid v1.
   */
  children?: NodeData[]
}

/** Orthogonal routing between non–axis-aligned polyline joints from Dagre. */
export type EdgeOrthogonalStyle = "hv" | "vhv"

export interface EdgeData {
  from: string
  to: string
  /**
   * When `from` is a compound `registry` with a hatched `slots` row (no `children`), attach the edge
   * tail to this slot’s bottom-center. Ignored for `registry` nodes that use `children` instead of `slots`.
   */
  fromSlotIndex?: number
  /**
   * When `to` is a compound `registry` with a hatched `slots` row (no `children`), attach the edge
   * head to this slot’s bottom-center. Ignored for `registry` nodes that use `children` instead of `slots`.
   */
  toSlotIndex?: number
  /**
   * How to square off diagonal segments: `hv` = horizontal then vertical; `vhv` = vertical,
   * horizontal, vertical (mid‑Y jog). When omitted, edges with `fromSlotIndex` default to `vhv`
   * so tails leave slot ports downward before jogging; others default to `hv`.
   */
  orthogonalStyle?: EdgeOrthogonalStyle
}

export interface AnimationConfig {
  preset?: "draw" | "fade" | "pop" | "none"
  stagger?: number
  duration?: number
  spring?: import("motion/react").Transition
}

export interface DiagramConfig {
  /** Active appearance preset; drives default surface/hatch tokens when set from App. */
  mode?: DiagramMode
  fontSize?: number
  paddingH?: number
  paddingV?: number
  borderRadius?: number
  /** Extra rounding on registry cards nested inside a parent `registry` (Figma ~24px vs ~6px shell). */
  nestedRegistryBorderRadius?: number
  borderWidth?: number
  nodeColor?: string
  /** Solid label pill fill (non-hatched). */
  labelSurfaceFill?: string
  /** Solid label pill border (non-hatched). */
  labelSurfaceBorder?: string
  /** Cross-hatch base fill under stripes. */
  hatchBase?: string
  /** Hatch stripe colors (45° / -45°). */
  hatchStripe1?: string
  hatchStripe2?: string
  labelFontSize?: number
  labelPaddingH?: number
  labelPaddingV?: number
  labelColor?: string
  resolverFontSize?: number
  resolverPaddingH?: number
  resolverPaddingV?: number
  resolverBorderRadius?: number
  resolverBorderWidth?: number
  resolverColor?: string
  /** Corner square fills on dashed resolver (protocol: lapis/900 per Diagram System). */
  resolverSocketColor?: string
  resolverFrameInset?: number
  resolverRadiusBonus?: number
  resolverSocketSize?: number
  resolverSocketOverhang?: number
  resolverMinWidth?: number
  resolverMinHeight?: number
  resolverDashLength?: number
  resolverDashGap?: number
  strokeWidth?: number
  cornerRadius?: number
  dotRadius?: number
  edgeColor?: string
  ranksep?: number
  nodesep?: number
}

export interface PositionedNode extends NodeData {
  x: number
  y: number
  width: number
  height: number
  rank: number
}

export interface PositionedEdge extends EdgeData {
  points: { x: number; y: number }[]
  d: string
}

export interface LayoutResult {
  nodes: PositionedNode[]
  edges: PositionedEdge[]
  width: number
  height: number
  cornerRadius: number
}
