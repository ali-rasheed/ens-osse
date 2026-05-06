import type {
  NodeData,
  EdgeData,
  NodeType,
} from "../components/RegistryDiagram/types"

/* Double-paren first so `((hatched))` does not match as a single `(`. */
const NODE_RE =
  /^([\w-]+)(?:\[([^\]]*)\]|\(\(([^)]*)\)\)|\(([^)]*)\)|\{([^}]*)\})?$/
/** Mermaid commonly uses `-->`; `->` is accepted as an alias. */
const EDGE_RE = /^(.+?)\s*(?:-->|->)\s*(.+)$/

interface Endpoint {
  id: string
  node?: NodeData
}

/**
 * Split label/slots from trailing hash meta on the **last** whitespace + `#` + whitespace (e.g. ` # stack=3`).
 * Supports a line break before `#` (whitespace includes newlines).
 */
function splitLabelAndHashMeta(body: string): { main: string; meta: string } {
  const s = body.trim()
  const re = /\s#\s+/g
  let lastIdx = -1
  let lastLen = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(s)) !== null) {
    lastIdx = m.index
    lastLen = m[0].length
  }
  if (lastIdx < 0) return { main: s, meta: "" }
  return {
    main: s.slice(0, lastIdx).trim(),
    meta: s.slice(lastIdx + lastLen).trim(),
  }
}

/** Unclosed `{` on a line: merge following lines until braces balance (multiline `id{…}`). */
function mergeLinesWithOpenBraces(lines: string[]): string[] {
  function braceDepth(s: string): number {
    let d = 0
    for (const c of s) {
      if (c === "{") d++
      if (c === "}") d--
    }
    return d
  }
  const out: string[] = []
  let acc = ""
  for (const line of lines) {
    if (/^(graph|flowchart)\b/i.test(line)) {
      if (acc) {
        out.push(acc.trim())
        acc = ""
      }
      out.push(line)
      continue
    }
    acc = acc ? `${acc}\n${line}` : line
    if (braceDepth(acc) <= 0) {
      out.push(acc.trim())
      acc = ""
    }
  }
  if (acc.length) out.push(acc.trim())
  return out
}

function parseDashedBrace(body: string): Omit<NodeData, "id"> {
  const { main, meta } = splitLabelAndHashMeta(body)
  let stackDepth: number | undefined
  for (const bit of meta.split(/\s+/).filter(Boolean)) {
    const sm = /^stack=(\d+)$/.exec(bit)
    if (sm) {
      const n = parseInt(sm[1], 10)
      if (n >= 2 && n <= 24) stackDepth = n
    }
  }
  const base: Omit<NodeData, "id"> = { label: main.replace(/\s+/g, " ").trim(), type: "dashed" }
  if (stackDepth != null) return { ...base, stackDepth }
  return base
}

function parseRegistryBracket(body: string): NodeData {
  const { main: mainRaw, meta } = splitLabelAndHashMeta(body)
  const main = mainRaw.replace(/\s+/g, " ").trim()
  const parts = main.split("|").map((p) => p.trim())
  const label = parts[0] ?? ""
  const slots = parts.slice(1).filter(Boolean)
  let registryFrame: NodeData["registryFrame"]
  for (const bit of meta.split(/\s+/)) {
    if (bit === "frame=single" || bit === "border=single") registryFrame = "single"
  }
  const base: NodeData = { id: "", label, type: "registry", registryFrame }
  if (slots.length) return { ...base, slots }
  return base
}

/** Optional tail on edge lines: `a --> b # fromSlot=0 toSlot=1 route=vhv` */
function parseEdgeAnchorMeta(
  meta: string
): Pick<EdgeData, "fromSlotIndex" | "toSlotIndex" | "orthogonalStyle"> {
  const o: Partial<Pick<EdgeData, "fromSlotIndex" | "toSlotIndex" | "orthogonalStyle">> = {}
  for (const part of meta.trim().split(/\s+/)) {
    const fs = /^fromSlot=(\d+)$/.exec(part)
    if (fs) o.fromSlotIndex = Number(fs[1])
    const ts = /^toSlot=(\d+)$/.exec(part)
    if (ts) o.toSlotIndex = Number(ts[1])
    const rt = /^route=(hv|vhv)$/.exec(part)
    if (rt) o.orthogonalStyle = rt[1] as EdgeData["orthogonalStyle"]
  }
  return o as Pick<EdgeData, "fromSlotIndex" | "toSlotIndex" | "orthogonalStyle">
}

function edgeMetaHasAnchorKeys(meta: string): boolean {
  const o = parseEdgeAnchorMeta(meta)
  return (
    o.fromSlotIndex !== undefined ||
    o.toSlotIndex !== undefined ||
    o.orthogonalStyle !== undefined
  )
}

/**
 * Edge lines may end with ` # fromSlot=… toSlot=… route=…`.
 * Do not treat ` # stack=N` (or ` # frame=single` inside `[…]`) as edge meta — that `#` belongs to the target node.
 */
function splitEdgeRhs(rhs: string): { endpoint: string; meta: string } {
  const m = /\s+#\s+(.+)$/.exec(rhs)
  if (!m) return { endpoint: rhs.trim(), meta: "" }
  const meta = m[1].trim()
  if (!edgeMetaHasAnchorKeys(meta)) return { endpoint: rhs.trim(), meta: "" }
  return { endpoint: rhs.slice(0, m.index).trim(), meta }
}

function parseEndpoint(raw: string): Endpoint {
  const s = raw.trim()
  const m = NODE_RE.exec(s)
  if (!m) throw new Error(`Cannot parse node "${s}"`)
  const id = m[1]
  if (m[2] !== undefined) return { id, node: { ...parseRegistryBracket(m[2]), id } }
  if (m[3] !== undefined) return { id, node: { id, label: m[3], type: "labelHatched" } }
  if (m[4] !== undefined) return { id, node: { id, label: m[4], type: "label" } }
  if (m[5] !== undefined) return { id, node: { ...parseDashedBrace(m[5]), id } }
  return { id }
}

export interface ParsedGraph {
  nodes: NodeData[]
  edges: EdgeData[]
  error?: string
}

/**
 * Parser for the project’s Mermaid subset. Canonical spec: `docs/mermaid-patterns.md`.
 *
 * Nested `registry.children` trees are not expressible in this syntax; use JSON `NodeData[]`.
 * Single-bordered registry: ` # frame=single` inside brackets (after slots), e.g.
 * `id[label|slot # frame=single]`.
 * Stacked resolver: `id{label # stack=N}` with 2 ≤ N ≤ 24 (offset duplicate frames).
 * Trailing ` # …` on an edge RHS is edge metadata only when it uses `fromSlot` / `toSlot` / `route`
 * (so `… --> id{label # stack=N}` keeps the whole target node on the RHS).
 */
export function parseMermaid(src: string): ParsedGraph {
  const nodeMap = new Map<string, NodeData>()
  const edges: EdgeData[] = []
  try {
    const lines = mergeLinesWithOpenBraces(
      src
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("//") && !l.startsWith("%%"))
    )
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
    const singleSuffix = n.type === "registry" && n.registryFrame === "single" ? " # frame=single" : ""
    if (n.type === "registry" && n.slots?.length) {
      return `${id}${open}${[n.label, ...n.slots].join("|")}${singleSuffix}${close}`
    }
    if (n.type === "registry") {
      return `${id}${open}${n.label}${singleSuffix}${close}`
    }
    if (n.type === "dashed") {
      const stack =
        n.stackDepth != null && n.stackDepth >= 2 ? ` # stack=${n.stackDepth}` : ""
      return `${id}${open}${n.label}${stack}${close}`
    }
    return `${id}${open}${n.label}${close}`
  }
  const edgeAnchorSuffix = (e: EdgeData): string => {
    const bits: string[] = []
    if (e.fromSlotIndex !== undefined) bits.push(`fromSlot=${e.fromSlotIndex}`)
    if (e.toSlotIndex !== undefined) bits.push(`toSlot=${e.toSlotIndex}`)
    if (e.orthogonalStyle !== undefined) bits.push(`route=${e.orthogonalStyle}`)
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
