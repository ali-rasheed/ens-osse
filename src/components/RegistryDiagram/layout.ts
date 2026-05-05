import dagre from "dagre"
import type { NodeData, EdgeData, LayoutResult, PositionedNode, PositionedEdge } from "./types"

// Approximate char widths at 40px (monospace vs proportional)
const CHAR_WIDTH = { registry: 24, label: 22 }
const PADDING_H = 64 // 32px each side
const MIN_WIDTH = { registry: 131, label: 100 }
const NODE_HEIGHT = { registry: 103, label: 97 }

function nodeWidth(type: "registry" | "label", label: string): number {
  return Math.max(MIN_WIDTH[type], label.length * CHAR_WIDTH[type] + PADDING_H)
}

const PADDING = 40

function pointsToPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return ""
  const [first, ...rest] = points
  return `M ${first.x} ${first.y} ` + rest.map((p) => `L ${p.x} ${p.y}`).join(" ")
}

export function computeLayout(nodes: NodeData[], edges: EdgeData[]): LayoutResult {
  const g = new dagre.graphlib.Graph()
  g.setGraph({
    rankdir: "TB",
    ranksep: 80,
    nodesep: 60,
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
      d: pointsToPath(points),
    }
  })

  const graphData = g.graph() as { width?: number; height?: number }
  const width = (graphData.width ?? 600) + PADDING
  const height = (graphData.height ?? 600) + PADDING

  return { nodes: positionedNodes, edges: positionedEdges, width, height }
}
