import type {
  NodeData,
  EdgeData,
} from "./RegistryDiagram/types"
import type { LinkStyle } from "./RegistryDiagram/linkStyles"
import { extractFrontmatter, type OsseFrontmatter } from "./frontmatter"

export type { FitMode, OsseFrontmatter, FrontmatterParseResult } from "./frontmatter"
export { extractFrontmatter, parseFrontmatterBlock } from "./frontmatter"

/* Double-paren first so `((hatched))` does not match as a single `(`. */
const NODE_RE =
  /^([\w-]+)(?:\[([^\]]*)\]|\(\(([^)]*)\)\)|\(([^)]*)\)|\{([^}]*)\})?$/

interface Endpoint {
  id: string
  node?: NodeData
}

interface ParsedLink {
  linkStyle: LinkStyle
  label?: string
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

/** Split Mermaid `<br/>` / `<br>` multiline text into title + body lines. */
function splitMultilineLabel(raw: string): { title: string; bodyLines?: string[] } {
  const normalized = raw.replace(/<br\s*\/?>/gi, "\n")
  const lines = normalized
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length <= 1) {
    return { title: lines[0] ?? raw.trim() }
  }
  const [title, ...bodyLines] = lines
  return { title, bodyLines }
}

/** Strip optional outer quotes from Mermaid `id["text"]` bracket bodies. */
function unquoteBracketBody(body: string): string {
  const s = body.trim()
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1)
  }
  return s
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

function parseResolverBrace(body: string): Omit<NodeData, "id"> {
  const { main, meta } = splitLabelAndHashMeta(body)
  let stackDepth: number | undefined
  for (const bit of meta.split(/\s+/).filter(Boolean)) {
    const sm = /^stack=(\d+)$/.exec(bit)
    if (sm) {
      const n = parseInt(sm[1], 10)
      if (n >= 2 && n <= 24) stackDepth = n
    }
  }
  const { title, bodyLines } = splitMultilineLabel(main.replace(/\s+/g, " ").trim())
  const base: Omit<NodeData, "id"> = { title, type: "resolver" }
  if (bodyLines?.length) return { ...base, bodyLines }
  if (stackDepth != null) return { ...base, stackDepth }
  return base
}

function parseRegistryBracket(body: string): NodeData {
  const { main: mainRaw, meta } = splitLabelAndHashMeta(body)
  const main = unquoteBracketBody(mainRaw)
  const hasPipeSlots = !/<br\s*\/?>/i.test(main) && main.includes("|")
  const parts = hasPipeSlots
    ? main.split("|").map((p) => p.trim())
    : [main.trim()]
  const multiline = splitMultilineLabel(hasPipeSlots ? (parts[0] ?? "") : main.trim())
  const title = hasPipeSlots ? (parts[0] ?? multiline.title) : multiline.title
  const slots = hasPipeSlots ? parts.slice(1).filter(Boolean) : undefined
  let registryFrame: NodeData["registryFrame"]
  for (const bit of meta.split(/\s+/)) {
    if (bit === "frame=single" || bit === "border=single") registryFrame = "single"
  }
  const base: NodeData = { id: "", title, type: "registry", registryFrame }
  if (multiline.bodyLines?.length) {
    return { ...base, bodyLines: multiline.bodyLines, ...(slots?.length ? { slots } : {}) }
  }
  if (slots?.length) return { ...base, slots }
  return base
}

function parsePillText(text: string): Pick<NodeData, "title" | "bodyLines"> {
  const { title, bodyLines } = splitMultilineLabel(text.trim())
  return bodyLines?.length ? { title, bodyLines } : { title }
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

/**
 * Parse Mermaid-compatible link tokens between two endpoints.
 * Supports: `-->`, `---`, `-.->`, `==>`, `-- text -->`, `-. text .->`, `-->|text|`, `->`.
 */
function parseMermaidLink(middle: string): ParsedLink | null {
  const s = middle.trim()
  // Pipe label: -->|text|
  const pipe = /^(--?\|)([^|]+)\|\>?\>?$/.exec(s)
  if (pipe) {
    return { linkStyle: "solid", label: pipe[2].trim() }
  }
  // Dotted with text: -. text .->
  const dottedText = /^-\.\s*(.+?)\s*\.->?$/.exec(s)
  if (dottedText) {
    return { linkStyle: "dotted", label: dottedText[1].trim() }
  }
  // Solid with text: -- text -->
  const solidText = /^--\s*(.+?)\s*-->?$/.exec(s)
  if (solidText) {
    return { linkStyle: "solid", label: solidText[1].trim() }
  }
  // Dotted: -.-> or .->
  if (/^-\.?\.->?$/.test(s) || /^-\.->?$/.test(s)) {
    return { linkStyle: "dotted" }
  }
  // Thick: ==>
  if (/^==>?$/.test(s)) {
    return { linkStyle: "thick" }
  }
  // Open: ---
  if (/^---$/.test(s)) {
    return { linkStyle: "open" }
  }
  // Solid: --> or ->
  if (/^-->?$/.test(s) || /^->$/.test(s)) {
    return { linkStyle: "solid" }
  }
  return null
}

/** Strip optional Mermaid edge id prefix: `e1@-.->` */
function stripEdgeIdPrefix(line: string): string {
  return line.replace(/^([\w-]+)@/, "")
}

/**
 * Expand Mermaid chained edges: `A --> B & C & D` → separate edge lines.
 */
function expandChainedEdges(line: string): string[] {
  const stripped = stripEdgeIdPrefix(line.trim())
  const chainMatch = /^(.+?\s+(?:--?\|[^|]+\|>?|-\.\s*.+?\s*\.->|--\s*.+?\s*-->|-\.->?|==>?|--?>?|---)\s+)(.+)$/i.exec(
    stripped
  )
  if (!chainMatch) return [line]

  const lhsAndLink = chainMatch[1]
  const rhs = chainMatch[2].trim()
  if (!rhs.includes("&")) return [line]

  const targets = rhs.split("&").map((t) => t.trim()).filter(Boolean)
  if (targets.length <= 1) return [line]

  return targets.map((target) => `${lhsAndLink}${target}`.trim())
}

/** Try to split a line into lhs, link middle, rhs (+ optional ENS meta). */
function parseEdgeLine(line: string): {
  from: Endpoint
  to: Endpoint
  link: ParsedLink
  anchors: Pick<EdgeData, "fromSlotIndex" | "toSlotIndex" | "orthogonalStyle">
} | null {
  const stripped = stripEdgeIdPrefix(line.trim())

  // Find link token in the line — try patterns from most specific to least
  const patterns: Array<{
    re: RegExp
    linkGroup: number
  }> = [
    { re: /^(.+?)\s+(-\.\s*.+?\s*\.->?)\s+(.+)$/i, linkGroup: 2 },
    { re: /^(.+?)\s+(--\s*.+?\s*-->?)\s+(.+)$/i, linkGroup: 2 },
    { re: /^(.+?)\s+(--?\|[^|]+\|>?)\s+(.+)$/i, linkGroup: 2 },
    { re: /^(.+?)\s+(-\.->?)\s+(.+)$/i, linkGroup: 2 },
    { re: /^(.+?)\s+(==>?)\s+(.+)$/i, linkGroup: 2 },
    { re: /^(.+?)\s+(---)\s+(.+)$/i, linkGroup: 2 },
    { re: /^(.+?)\s+(-->?)\s+(.+)$/i, linkGroup: 2 },
    { re: /^(.+?)\s+(->)\s+(.+)$/i, linkGroup: 2 },
  ]

  for (const { re, linkGroup } of patterns) {
    const m = re.exec(stripped)
    if (!m) continue
    const linkMiddle = m[linkGroup]
    const parsed = parseMermaidLink(linkMiddle)
    if (!parsed) continue
    const { endpoint: rhsEp, meta } = splitEdgeRhs(m[3])
    const from = parseEndpoint(m[1].trim())
    const to = parseEndpoint(rhsEp)
    const anchors = meta ? parseEdgeAnchorMeta(meta) : {}
    return { from, to, link: parsed, anchors }
  }
  return null
}

function parseEndpoint(raw: string): Endpoint {
  const s = raw.trim()
  const m = NODE_RE.exec(s)
  if (!m) throw new Error(`Cannot parse node "${s}"`)
  const id = m[1]
  if (m[2] !== undefined) return { id, node: { ...parseRegistryBracket(m[2]), id } }
  if (m[3] !== undefined) {
    const parsed = parsePillText(m[3])
    return { id, node: { id, ...parsed, type: "pill", hatched: true } }
  }
  if (m[4] !== undefined) {
    const parsed = parsePillText(m[4])
    return { id, node: { id, ...parsed, type: "pill" } }
  }
  if (m[5] !== undefined) return { id, node: { ...parseResolverBrace(m[5]), id } }
  return { id }
}

export interface ParsedGraph {
  nodes: NodeData[]
  edges: EdgeData[]
  caption?: string
  /** Document-level config from leading YAML `---` frontmatter. */
  frontmatter?: OsseFrontmatter
  error?: string
}

const CAPTION_RE = /^%%\s*caption:?\s*(.+)$/i

/**
 * Parser for the project’s Mermaid subset. Canonical spec: `docs/mermaid-patterns.md`.
 *
 * Optional YAML frontmatter (`---` … `---`) sets theme, animation, pulse, and fit (§7A).
 * Nested `registry.children` trees are not expressible in this syntax; use JSON `NodeData[]`.
 * Mermaid-compatible links: `-->`, `---`, `-.->`, `==>`, `-- text -->`, `-. text .->`, `-->|text|`.
 * Multiline labels: `<br/>` inside brackets or quotes.
 */
export function parseMermaid(src: string): ParsedGraph {
  const nodeMap = new Map<string, NodeData>()
  const edges: EdgeData[] = []
  let caption: string | undefined
  try {
    const extracted = extractFrontmatter(src)
    if (extracted.error) {
      return { nodes: [], edges: [], error: extracted.error, frontmatter: extracted.frontmatter }
    }
    const frontmatter = extracted.frontmatter

    const rawLines = extracted.body
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("//"))

    for (const line of rawLines) {
      const cap = CAPTION_RE.exec(line)
      if (cap) {
        caption = cap[1].trim()
        continue
      }
    }

    const lines = mergeLinesWithOpenBraces(
      rawLines.filter((l) => !CAPTION_RE.test(l) && !l.startsWith("%%"))
    )

    const expandedLines: string[] = []
    for (const line of lines) {
      if (/^(graph|flowchart)\b/i.test(line)) {
        expandedLines.push(line)
        continue
      }
      expandedLines.push(...expandChainedEdges(line))
    }

    for (const line of expandedLines) {
      if (/^(graph|flowchart)\b/i.test(line)) continue

      const edge = parseEdgeLine(line)
      if (edge) {
        const { from: a, to: b, link, anchors } = edge
        if (a.node && !nodeMap.has(a.id)) nodeMap.set(a.id, a.node)
        if (b.node && !nodeMap.has(b.id)) nodeMap.set(b.id, b.node)
        edges.push({
          from: a.id,
          to: b.id,
          linkStyle: link.linkStyle,
          ...(link.label ? { label: link.label } : {}),
          ...anchors,
        })
      } else {
        const ep = parseEndpoint(line)
        if (ep.node && !nodeMap.has(ep.id)) nodeMap.set(ep.id, ep.node)
      }
    }
    // Fill in any referenced-but-undeclared nodes as registry with id as title
    for (const e of edges) {
      if (!nodeMap.has(e.from)) nodeMap.set(e.from, { id: e.from, title: e.from, type: "registry" })
      if (!nodeMap.has(e.to)) nodeMap.set(e.to, { id: e.to, title: e.to, type: "registry" })
    }
    return {
      nodes: Array.from(nodeMap.values()),
      edges,
      caption,
      ...(frontmatter ? { frontmatter } : {}),
    }
  } catch (err) {
    return {
      nodes: [],
      edges: [],
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

function nodeBrackets(n: NodeData): readonly [string, string] {
  if (n.type === "registry") return ["[", "]"]
  if (n.type === "resolver") return ["{", "}"]
  return n.hatched ? ["((", "))"] : ["(", ")"]
}

function formatNodeLabel(n: NodeData): string {
  const lines = n.bodyLines?.length ? [n.title, ...n.bodyLines] : [n.title]
  const text = lines.join("<br/>")
  return text.includes("|") || text.includes("<br") ? `"${text}"` : text
}

function serializeLink(e: EdgeData): string {
  const style = e.linkStyle ?? "solid"
  const lbl = e.label?.trim()
  if (style === "dotted") {
    return lbl ? `-. ${lbl} .->` : "-.->"
  }
  if (style === "open") return "---"
  if (style === "thick") return "==>"
  if (lbl) return `-- ${lbl} -->`
  return "-->"
}

export function serializeMermaid(
  nodes: NodeData[],
  edges: EdgeData[],
  caption?: string
): string {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const declared = new Set<string>()
  const out: string[] = []
  if (caption?.trim()) out.push(`%% caption: ${caption.trim()}`)
  out.push("graph TD")
  const decl = (id: string) => {
    if (declared.has(id)) return id
    declared.add(id)
    const n = nodeMap.get(id)
    if (!n) return id
    const [open, close] = nodeBrackets(n)
    const singleSuffix = n.type === "registry" && n.registryFrame === "single" ? " # frame=single" : ""
    if (n.type === "registry" && n.slots?.length) {
      return `${id}${open}${[n.title, ...n.slots].join("|")}${singleSuffix}${close}`
    }
    if (n.type === "registry") {
      const body = n.bodyLines?.length ? formatNodeLabel(n) : n.title
      return `${id}${open}${body}${singleSuffix}${close}`
    }
    if (n.type === "resolver") {
      const stack =
        n.stackDepth != null && n.stackDepth >= 2 ? ` # stack=${n.stackDepth}` : ""
      const body = n.bodyLines?.length ? formatNodeLabel(n) : n.title
      return `${id}${open}${body}${stack}${close}`
    }
    const body = n.bodyLines?.length ? formatNodeLabel(n) : n.title
    return `${id}${open}${body}${close}`
  }
  const edgeAnchorSuffix = (e: EdgeData): string => {
    const bits: string[] = []
    if (e.fromSlotIndex !== undefined) bits.push(`fromSlot=${e.fromSlotIndex}`)
    if (e.toSlotIndex !== undefined) bits.push(`toSlot=${e.toSlotIndex}`)
    if (e.orthogonalStyle !== undefined) bits.push(`route=${e.orthogonalStyle}`)
    return bits.length ? ` # ${bits.join(" ")}` : ""
  }

  for (const e of edges) {
    out.push(`  ${decl(e.from)} ${serializeLink(e)} ${decl(e.to)}${edgeAnchorSuffix(e)}`)
  }
  // Any nodes that aren't on an edge
  for (const n of nodes) {
    if (!declared.has(n.id)) {
      out.push(`  ${decl(n.id)}`)
    }
  }
  return out.join("\n")
}
