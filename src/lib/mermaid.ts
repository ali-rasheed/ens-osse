import type {
  NodeData,
  EdgeData,
  NodeType,
} from "../components/RegistryDiagram/types"

const NODE_RE = /^([\w-]+)(?:\[([^\]]*)\]|\(([^)]*)\)|\{([^}]*)\})?$/
const EDGE_RE = /^(.+?)\s*-->\s*(.+)$/

interface Endpoint {
  id: string
  node?: NodeData
}

function parseEndpoint(raw: string): Endpoint {
  const s = raw.trim()
  const m = NODE_RE.exec(s)
  if (!m) throw new Error(`Cannot parse node "${s}"`)
  const id = m[1]
  if (m[2] !== undefined) return { id, node: { id, label: m[2], type: "registry" } }
  if (m[3] !== undefined) return { id, node: { id, label: m[3], type: "label" } }
  if (m[4] !== undefined) return { id, node: { id, label: m[4], type: "dashed" } }
  return { id }
}

export interface ParsedGraph {
  nodes: NodeData[]
  edges: EdgeData[]
  error?: string
}

export function parseMermaid(src: string): ParsedGraph {
  const nodeMap = new Map<string, NodeData>()
  const edges: EdgeData[] = []
  try {
    const lines = src
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("//") && !l.startsWith("%%"))
    for (const line of lines) {
      if (/^(graph|flowchart)\b/i.test(line)) continue
      const em = EDGE_RE.exec(line)
      if (em) {
        const a = parseEndpoint(em[1])
        const b = parseEndpoint(em[2])
        if (a.node && !nodeMap.has(a.id)) nodeMap.set(a.id, a.node)
        if (b.node && !nodeMap.has(b.id)) nodeMap.set(b.id, b.node)
        edges.push({ from: a.id, to: b.id })
      } else {
        const ep = parseEndpoint(line)
        if (ep.node && !nodeMap.has(ep.id)) nodeMap.set(ep.id, ep.node)
      }
    }
    // Fill in any referenced-but-undeclared nodes as registry with id as label
    for (const e of edges) {
      if (!nodeMap.has(e.from)) nodeMap.set(e.from, { id: e.from, label: e.from, type: "registry" })
      if (!nodeMap.has(e.to)) nodeMap.set(e.to, { id: e.to, label: e.to, type: "registry" })
    }
    return { nodes: Array.from(nodeMap.values()), edges }
  } catch (err) {
    return {
      nodes: [],
      edges: [],
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

const BRACKETS: Record<NodeType, readonly [string, string]> = {
  registry: ["[", "]"],
  label: ["(", ")"],
  dashed: ["{", "}"],
}

export function serializeMermaid(nodes: NodeData[], edges: EdgeData[]): string {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const declared = new Set<string>()
  const out = ["graph TD"]
  const decl = (id: string) => {
    if (declared.has(id)) return id
    declared.add(id)
    const n = nodeMap.get(id)
    if (!n) return id
    const [open, close] = BRACKETS[n.type]
    return `${id}${open}${n.label}${close}`
  }
  for (const e of edges) {
    out.push(`  ${decl(e.from)} --> ${decl(e.to)}`)
  }
  // Any nodes that aren't on an edge
  for (const n of nodes) {
    if (!declared.has(n.id)) {
      const [open, close] = BRACKETS[n.type]
      out.push(`  ${n.id}${open}${n.label}${close}`)
    }
  }
  return out.join("\n")
}
