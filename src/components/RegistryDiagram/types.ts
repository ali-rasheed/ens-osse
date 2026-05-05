export type NodeType = "registry" | "label" | "dashed"

export interface NodeData {
  id: string
  label: string
  type: NodeType
}

export interface EdgeData {
  from: string
  to: string
}

export interface AnimationConfig {
  preset?: "draw" | "fade" | "pop" | "none"
  stagger?: number
  duration?: number
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
