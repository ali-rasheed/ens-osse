import type {
  NodeData,
  EdgeData,
  NodeType,
} from "../components/RegistryDiagram/types"

/* Double-paren first so `((hatched))` does not match as a single `(`. */
const NODE_RE =
  /^([\w-]+)(?:\[([^\]]*)\]|\(\(([^)]*)\)\)|\(([^)]*)\)|\{([^}]*)\})?$/
const EDGE_RE = /^(.+?)\s*-->\s*(.+)$/

interface Endpoint {
  id: string
  node?: NodeData
}

function parseRegistryBracket(body: string): NodeData {
  const parts = body.split("|").map((p) => p.trim())
  const label = parts[0] ?? ""
  const slots = parts.slice(1).filter(Boolean)
  const base: NodeData = { id: "", label, type: "registry" }
  if (slots.length) return { ...base, slots }
  return base
}

/** Optional tail on edge lines: `a --> b # fromSlot=0 toSlot=1` */
function parseEdgeAnchorMeta(meta: string): Pick<EdgeData, "fromSlotIndex" | "toSlotIndex"> {
  const o: Partial<Pick<EdgeData, "fromSlotIndex" | "toSlotIndex">> = {}
  for (const part of meta.trim().split(/\s+/)) {
    const fs = /^fromSlot=(\d+)$/.exec(part)
    if (fs) o.fromSlotIndex = Number(fs[1])
    const ts = /^toSlot=(\d+)$/.exec(part)
    if (ts) o.toSlotIndex = Number(ts[1])
  }
  return o as Pick<EdgeData, "fromSlotIndex" | "toSlotIndex">
}

function splitEdgeRhs(rhs: string): { endpoint: string; meta: string } {
  const m = /\s+#\s+(.+)$/.exec(rhs)
  if (!m) return { endpoint: rhs.trim(), meta: "" }
  return { endpoint: rhs.slice(0, m.index).trim(), meta: m[1].trim() }
}

function parseEndpoint(raw: string): Endpoint {
  const s = raw.trim()
  const m = NODE_RE.exec(s)
  if (!m) throw new Error(`Cannot parse node "${s}"`)
  const id = m[1]
  if (m[2] !== undefined) return { id, node: { ...parseRegistryBracket(m[2]), id } }
  if (m[3] !== undefined) return { id, node: { id, label: m[3], type: "labelHatched" } }
  if (m[4] !== undefined) return { id, node: { id, label: m[4], type: "label" } }
  if (m[5] !== undefined) return { id, node: { id, label: m[5], type: "dashed" } }
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
        const a = parseEndpoint(em[1].trim())
        const { endpoint: rhsEp, meta } = splitEdgeRhs(em[2])
        const b = parseEndpoint(rhsEp)
        if (a.node && !nodeMap.has(a.id)) nodeMap.set(a.id, a.node)
        if (b.node && !nodeMap.has(b.id)) nodeMap.set(b.id, b.node)
        const anchors = meta ? parseEdgeAnchorMeta(meta) : {}
        edges.push({ from: a.id, to: b.id, ...anchors })
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
  labelHatched: ["((", "))"],
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
    if (n.type === "registry" && n.slots?.length) {
      return `${id}${open}${[n.label, ...n.slots].join("|")}${close}`
    }
    return `${id}${open}${n.label}${close}`
  }
  const edgeAnchorSuffix = (e: EdgeData): string => {
    const bits: string[] = []
    if (e.fromSlotIndex !== undefined) bits.push(`fromSlot=${e.fromSlotIndex}`)
    if (e.toSlotIndex !== undefined) bits.push(`toSlot=${e.toSlotIndex}`)
    return bits.length ? ` # ${bits.join(" ")}` : ""
  }

  for (const e of edges) {
    out.push(`  ${decl(e.from)} --> ${decl(e.to)}${edgeAnchorSuffix(e)}`)
  }
  // Any nodes that aren't on an edge
  for (const n of nodes) {
    if (!declared.has(n.id)) {
      out.push(`  ${decl(n.id)}`)
    }
  }
  return out.join("\n")
}
