import dagre from "dagre"
import type { NodeData, NodeType, EdgeData, LayoutResult, PositionedNode, PositionedEdge } from "./types"

// Approximate char widths at the rendered font sizes
const CHAR_WIDTH = { registry: 9.7, dashed: 9.7, label: 7 }
const PADDING_H = { registry: 32, dashed: 32, label: 16 }
const MIN_WIDTH = { registry: 56, dashed: 96, label: 32 }
const NODE_HEIGHT = { registry: 30, dashed: 30, label: 22 }

function nodeWidth(type: NodeType, label: string): number {
  return Math.max(MIN_WIDTH[type], label.length * CHAR_WIDTH[type] + PADDING_H[type])
}

const PADDING = 40

interface LayoutOptions {
  ranksep?: number
  nodesep?: number
  cornerRadius?: number
}

function pointsToPath(points: { x: number; y: number }[], cornerRadius: number): string {
  if (points.length === 0) return ""
  if (points.length < 3 || cornerRadius <= 0) {
    const [first, ...rest] = points
    return `M ${first.x} ${first.y} ` + rest.map((p) => `L ${p.x} ${p.y}`).join(" ")
  }

  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const next = points[i + 1]

    const dxIn = curr.x - prev.x
    const dyIn = curr.y - prev.y
    const dxOut = next.x - curr.x
    const dyOut = next.y - curr.y
    const lenIn = Math.hypot(dxIn, dyIn) || 1
    const lenOut = Math.hypot(dxOut, dyOut) || 1
    const r = Math.min(cornerRadius, lenIn / 2, lenOut / 2)

    const sx = curr.x - (dxIn / lenIn) * r
    const sy = curr.y - (dyIn / lenIn) * r
    const ex = curr.x + (dxOut / lenOut) * r
    const ey = curr.y + (dyOut / lenOut) * r

    d += ` L ${sx} ${sy} Q ${curr.x} ${curr.y} ${ex} ${ey}`
  }
  const last = points[points.length - 1]
  return d + ` L ${last.x} ${last.y}`
}

export function computeLayout(
  nodes: NodeData[],
  edges: EdgeData[],
  options: LayoutOptions = {}
): LayoutResult {
  const { ranksep = 70, nodesep = 50, cornerRadius = 10 } = options
  const g = new dagre.graphlib.Graph()
  g.setGraph({
    rankdir: "TB",
    ranksep,
    nodesep,
    edgesep: 10,
    marginx: PADDING,
    marginy: PADDING,
  })
  g.setDefaultEdgeLabel(() => ({}))

  for (const node of nodes) {
    g.setNode(node.id, {
      label: node.label,
      width: nodeWidth(node.type, node.label),
      height: NODE_HEIGHT[node.type],
    })
  }

  for (const edge of edges) {
    g.setEdge(edge.from, edge.to)
  }

  dagre.layout(g)

  // Derive rank from y position after layout (nodes at the same y share the same rank)
  const yValues = g.nodes().map((id) => g.node(id).y)
  const uniqueYs = [...new Set(yValues)].sort((a, b) => a - b)

  const positionedNodes: PositionedNode[] = nodes.map((node) => {
    const n = g.node(node.id)
    return {
      ...node,
      x: n.x - n.width / 2,
      y: n.y - n.height / 2,
      width: n.width,
      height: n.height,
      rank: uniqueYs.indexOf(n.y),
    }
  })

  const positionedEdges: PositionedEdge[] = edges.map((edge) => {
    const e = g.edge(edge.from, edge.to)
    const points = e?.points ?? []
    return {
      ...edge,
      points,
      d: pointsToPath(points, cornerRadius),
    }
  })

  const graphData = g.graph() as { width?: number; height?: number }
  const width = (graphData.width ?? 600) + PADDING
  const height = (graphData.height ?? 600) + PADDING

  return { nodes: positionedNodes, edges: positionedEdges, width, height, cornerRadius }
}
