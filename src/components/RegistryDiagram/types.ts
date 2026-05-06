/** `label` = solid pill (Figma default); `labelHatched` = cross-hatch fill (Figma variant 2). */
export type NodeType = "registry" | "label" | "labelHatched" | "dashed"

export interface NodeData {
  id: string
  label: string
  type: NodeType
  /** `registry` only: inner hatched slot labels inside one compound frame (Figma Diagram System). */
  slots?: string[]
}

export interface EdgeData {
  from: string
  to: string
  /** When `from` is a compound `registry` with `slots`, attach the edge tail to this slot’s bottom-center. */
  fromSlotIndex?: number
  /** When `to` is a compound `registry` with `slots`, attach the edge head to this slot’s bottom-center. */
  toSlotIndex?: number
}

export interface AnimationConfig {
  preset?: "draw" | "fade" | "pop" | "none"
  stagger?: number
  duration?: number
  spring?: import("motion/react").Transition
}

export interface DiagramConfig {
  fontSize?: number
  paddingH?: number
  paddingV?: number
  borderRadius?: number
  borderWidth?: number
  nodeColor?: string
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
