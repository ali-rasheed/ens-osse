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

/** A logical source line after comment/frontmatter stripping, carrying its position for diagnostics. */
interface SourceLine {
  text: string
  /** 1-based line number in the original `parseMermaid` input (after any YAML frontmatter). */
  line: number
  /** 1-based column of `text[0]` within that original line. */
  column: number
}

export interface ParseDiagnostic {
  /** Human-readable message; also embedded (with position) in the legacy `error` string. */
  message: string
  /** 1-based line number within the diagram source (frontmatter lines count too). */
  line: number
  /** 1-based column, when practical to compute. */
  column?: number
  severity: "error" | "warning"
}

export interface ParseMermaidOptions {
  /**
   * Error (not just warn) on node ids referenced by an edge but never declared with a shape
   * anywhere in the source — closes the "undeclared id silently creates a node" typo trap.
   * Defaults to `false`, or to frontmatter `strict: true` when set. An explicit option here
   * always overrides frontmatter.
   */
  strict?: boolean
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function formatDiagnostic(d: ParseDiagnostic): string {
  return `Line ${d.line}${d.column != null ? `:${d.column}` : ""}: ${d.message}`
}

function formatDiagnostics(diags: ParseDiagnostic[]): string {
  return diags.map(formatDiagnostic).join("\n")
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

/**
 * Unclosed `{` on a line: merge following lines until braces balance (multiline `id{…}`).
 * A merged block keeps the position (line/column) of its first sub-line for diagnostics.
 */
function mergeLinesWithOpenBraces(lines: SourceLine[]): SourceLine[] {
  function braceDepth(s: string): number {
    let d = 0
    for (const c of s) {
      if (c === "{") d++
      if (c === "}") d--
    }
    return d
  }
  const out: SourceLine[] = []
  let acc: SourceLine | null = null
  for (const line of lines) {
    if (/^(graph|flowchart)\b/i.test(line.text)) {
      if (acc) {
        out.push({ ...acc, text: acc.text.trim() })
        acc = null
      }
      out.push(line)
      continue
    }
    if (acc) {
      acc.text = `${acc.text}\n${line.text}`
    } else {
      acc = { ...line }
    }
    if (braceDepth(acc.text) <= 0) {
      out.push({ ...acc, text: acc.text.trim() })
      acc = null
    }
  }
  if (acc) out.push({ ...acc, text: acc.text.trim() })
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

export type GraphDirection = "TD" | "TB" | "LR" | "RL" | "BT"

const GRAPH_HEADER_RE = /^(?:graph|flowchart)\s+(TD|TB|LR|RL|BT)\s*$/i

export interface ParsedGraph {
  nodes: NodeData[]
  edges: EdgeData[]
  caption?: string
  /** Direction from `graph TD|LR|…` (default `TD`). */
  direction?: GraphDirection
  /** Document-level config from leading YAML `---` frontmatter. */
  frontmatter?: OsseFrontmatter
  /** First/only error formatted as `Line N[:C]: message` (joined by newline when several). */
  error?: string
  /**
   * Every parse issue found in one pass: line-level syntax errors, and undeclared-id
   * warnings (non-strict) or errors (strict). Present whenever non-empty; see strict mode below.
   */
  diagnostics?: ParseDiagnostic[]
}

export interface SerializeMermaidOptions {
  caption?: string
  direction?: GraphDirection
}

interface ScopeTree {
  header: SourceLine | null
  lines: SourceLine[]
  children: ScopeTree[]
}

interface BareRefLocation {
  line: number
  column: number
  childrenTarget: NodeData[] | null
}

interface ParseContext {
  nodeMap: Map<string, NodeData>
  edges: EdgeData[]
  diagnostics: ParseDiagnostic[]
  strict: boolean
  bareRefs: Map<string, BareRefLocation>
  /** When set, node declarations and auto-created nodes land in this children array. */
  childrenTarget: NodeData[] | null
}

function parseGraphDirection(line: string): GraphDirection | null {
  const m = GRAPH_HEADER_RE.exec(line.trim())
  if (!m) return null
  return m[1].toUpperCase() as GraphDirection
}

function mergeNodeData(existing: NodeData, incoming: NodeData): NodeData {
  return {
    ...existing,
    ...incoming,
    children: incoming.children?.length ? incoming.children : existing.children,
    slots: incoming.slots?.length ? incoming.slots : existing.slots,
    bodyLines: incoming.bodyLines?.length ? incoming.bodyLines : existing.bodyLines,
  }
}

function findNodeInChildren(id: string, children?: NodeData[]): NodeData | undefined {
  if (!children?.length) return undefined
  for (const child of children) {
    if (child.id === id) return child
    const nested = findNodeInChildren(id, child.children)
    if (nested) return nested
  }
  return undefined
}

function findNodeById(id: string, nodeMap: Map<string, NodeData>): NodeData | undefined {
  if (nodeMap.has(id)) return nodeMap.get(id)
  for (const node of nodeMap.values()) {
    const nested = findNodeInChildren(id, node.children)
    if (nested) return nested
  }
  return undefined
}

function upsertNode(node: NodeData, ctx: ParseContext): void {
  const target = ctx.childrenTarget
  if (target) {
    const idx = target.findIndex((c) => c.id === node.id)
    if (idx >= 0) target[idx] = mergeNodeData(target[idx], node)
    else target.push(node)
    return
  }
  if (ctx.nodeMap.has(node.id)) {
    ctx.nodeMap.set(node.id, mergeNodeData(ctx.nodeMap.get(node.id)!, node))
  } else {
    ctx.nodeMap.set(node.id, node)
  }
}

function recordBareRef(id: string, source: SourceLine, ctx: ParseContext): void {
  if (ctx.bareRefs.has(id)) return
  const idx = new RegExp(`\\b${escapeRegExp(id)}\\b`).exec(source.text)?.index
  ctx.bareRefs.set(id, {
    line: source.line,
    column: idx != null ? source.column + idx : source.column,
    childrenTarget: ctx.childrenTarget,
  })
}

function parseSubgraphHeader(text: string): { id: string; node: NodeData } {
  const s = text.trim()
  const m = /^subgraph\s+([\w-]+)(?:\[([^\]]*)\])?\s*$/i.exec(s)
  if (!m) throw new Error(`Cannot parse subgraph header "${s}"`)
  const id = m[1]
  if (m[2] !== undefined) {
    return { id, node: { ...parseRegistryBracket(m[2]), id, type: "registry" } }
  }
  return { id, node: { id, title: id, type: "registry" } }
}

function buildScopeTree(lines: SourceLine[], diagnostics: ParseDiagnostic[]): ScopeTree {
  const root: ScopeTree = { header: null, lines: [], children: [] }
  const stack: ScopeTree[] = [root]

  for (const line of lines) {
    if (/^(?:graph|flowchart)\b/i.test(line.text)) continue

    if (/^subgraph\b/i.test(line.text)) {
      const scope: ScopeTree = { header: line, lines: [], children: [] }
      stack[stack.length - 1].children.push(scope)
      stack.push(scope)
      continue
    }

    if (/^end\b/i.test(line.text)) {
      if (stack.length <= 1) {
        diagnostics.push({
          message: "Unexpected `end` without matching `subgraph`",
          line: line.line,
          column: line.column,
          severity: "error",
        })
      } else {
        stack.pop()
      }
      continue
    }

    stack[stack.length - 1].lines.push(line)
  }

  if (stack.length > 1) {
    const open = stack[stack.length - 1]
    diagnostics.push({
      message: "Unclosed `subgraph` block (missing `end`)",
      line: open.header?.line ?? 1,
      column: open.header?.column,
      severity: "error",
    })
  }

  return root
}

function upsertSubgraphRegistry(registry: NodeData, ctx: ParseContext): NodeData[] {
  const withChildren: NodeData = { ...registry, children: registry.children ?? [] }
  if (ctx.childrenTarget) {
    const idx = ctx.childrenTarget.findIndex((c) => c.id === withChildren.id)
    if (idx >= 0) {
      ctx.childrenTarget[idx] = mergeNodeData(ctx.childrenTarget[idx], withChildren)
      const children = ctx.childrenTarget[idx].children ?? (ctx.childrenTarget[idx].children = [])
      return children
    }
    ctx.childrenTarget.push(withChildren)
    return withChildren.children!
  }
  if (ctx.nodeMap.has(withChildren.id)) {
    const existing = ctx.nodeMap.get(withChildren.id)!
    const merged = mergeNodeData(existing, withChildren)
    ctx.nodeMap.set(withChildren.id, merged)
    return merged.children ?? (merged.children = [])
  }
  ctx.nodeMap.set(withChildren.id, withChildren)
  return withChildren.children!
}

function processScopeLines(lines: SourceLine[], ctx: ParseContext): void {
  const expandedLines: SourceLine[] = []
  for (const line of lines) {
    for (const text of expandChainedEdges(line.text)) {
      expandedLines.push({ ...line, text })
    }
  }

  for (const entry of expandedLines) {
    try {
      const edge = parseEdgeLine(entry.text)
      if (edge) {
        const { from: a, to: b, link, anchors } = edge
        if (a.node) upsertNode(a.node, ctx)
        else recordBareRef(a.id, entry, ctx)
        if (b.node) upsertNode(b.node, ctx)
        else recordBareRef(b.id, entry, ctx)
        ctx.edges.push({
          from: a.id,
          to: b.id,
          linkStyle: link.linkStyle,
          ...(link.label ? { label: link.label } : {}),
          ...anchors,
        })
      } else {
        const ep = parseEndpoint(entry.text)
        if (ep.node) upsertNode(ep.node, ctx)
      }
    } catch (err) {
      ctx.diagnostics.push({
        message: err instanceof Error ? err.message : String(err),
        line: entry.line,
        column: entry.column,
        severity: "error",
      })
    }
  }
}

function processScopeTree(scope: ScopeTree, ctx: ParseContext): void {
  let scopeCtx = ctx

  if (scope.header) {
    try {
      const { id, node } = parseSubgraphHeader(scope.header.text)
      const children = upsertSubgraphRegistry(node, ctx)
      scopeCtx = { ...ctx, childrenTarget: children }
    } catch (err) {
      ctx.diagnostics.push({
        message: err instanceof Error ? err.message : String(err),
        line: scope.header.line,
        column: scope.header.column,
        severity: "error",
      })
      return
    }
  }

  processScopeLines(scope.lines, scopeCtx)
  for (const child of scope.children) {
    processScopeTree(child, scopeCtx)
  }
}

function resolveBareRefs(ctx: ParseContext): void {
  for (const [id, loc] of ctx.bareRefs) {
    if (findNodeById(id, ctx.nodeMap)) continue
    if (ctx.strict) {
      ctx.diagnostics.push({
        message: `Undeclared node id "${id}" is used in an edge but never declared with a shape (strict mode)`,
        line: loc.line,
        column: loc.column,
        severity: "error",
      })
    } else {
      ctx.diagnostics.push({
        message: `Undeclared node id "${id}" auto-created as a registry — declare it explicitly (e.g. "${id}[${id}]") if this isn't a typo`,
        line: loc.line,
        column: loc.column,
        severity: "warning",
      })
      const auto: NodeData = { id, title: id, type: "registry" }
      if (loc.childrenTarget) {
        const idx = loc.childrenTarget.findIndex((c) => c.id === id)
        if (idx >= 0) loc.childrenTarget[idx] = mergeNodeData(loc.childrenTarget[idx], auto)
        else loc.childrenTarget.push(auto)
      } else {
        ctx.nodeMap.set(id, auto)
      }
    }
  }
}

const CAPTION_RE = /^%%\s*caption:?\s*(.+)$/i

/**
 * Parser for the project’s Mermaid subset. Canonical spec: `docs/mermaid-patterns.md`.
 *
 * Optional YAML frontmatter (`---` … `---`) sets theme, animation, pulse, fit, and strict (§7A).
 * Directions: `graph TD|TB|LR|RL|BT`. Nested registries via `subgraph` / `end` → `registry.children`.
 * Mermaid-compatible links: `-->`, `---`, `-.->`, `==>`, `-- text -->`, `-. text .->`, `-->|text|`.
 * Multiline labels: `<br/>` inside brackets or quotes.
 *
 * **Diagnostics & strict mode** — every parse issue is collected in one pass onto
 * `ParsedGraph.diagnostics` (line + column when practical). Node ids referenced by an edge
 * but never declared with a shape (`id[…]` / `id(…)` / `id{…}`) are the classic typo trap:
 * by default they're silently auto-created as a registry node (warning diagnostic); pass
 * `{ strict: true }` (or set frontmatter `strict: true`) to make that a hard parse error
 * instead — `nodes`/`edges` come back empty and `error` is set, same as a syntax error.
 */
export function parseMermaid(src: string, options?: ParseMermaidOptions): ParsedGraph {
  const diagnostics: ParseDiagnostic[] = []
  let caption: string | undefined
  try {
    const extracted = extractFrontmatter(src)
    if (extracted.error) {
      const d: ParseDiagnostic = { message: extracted.error, line: extracted.line ?? 1, severity: "error" }
      return {
        nodes: [],
        edges: [],
        error: formatDiagnostics([d]),
        diagnostics: [d],
        ...(extracted.frontmatter ? { frontmatter: extracted.frontmatter } : {}),
      }
    }
    const frontmatter = extracted.frontmatter
    const strict = options?.strict ?? frontmatter?.strict ?? false

    const frontmatterLineCount = src.slice(0, src.length - extracted.body.length).split("\n").length - 1

    const rawLines: SourceLine[] = []
    extracted.body.split("\n").forEach((raw, idx) => {
      const text = raw.trim()
      if (!text || text.startsWith("//")) return
      rawLines.push({
        text,
        line: frontmatterLineCount + idx + 1,
        column: raw.length - raw.trimStart().length + 1,
      })
    })

    for (const l of rawLines) {
      const cap = CAPTION_RE.exec(l.text)
      if (cap) caption = cap[1].trim()
    }

    const contentLines = rawLines.filter((l) => !CAPTION_RE.test(l.text) && !l.text.startsWith("%%"))
    const mergedLines = mergeLinesWithOpenBraces(contentLines)

    let direction: GraphDirection = "TD"
    for (const l of mergedLines) {
      const parsedDir = parseGraphDirection(l.text)
      if (parsedDir) {
        direction = parsedDir
        break
      }
    }

    const scopeTree = buildScopeTree(mergedLines, diagnostics)
    const ctx: ParseContext = {
      nodeMap: new Map<string, NodeData>(),
      edges: [],
      diagnostics,
      strict,
      bareRefs: new Map<string, BareRefLocation>(),
      childrenTarget: null,
    }

    processScopeTree(scopeTree, ctx)
    resolveBareRefs(ctx)

    const errors = ctx.diagnostics.filter((d) => d.severity === "error")
    if (errors.length > 0) {
      return {
        nodes: [],
        edges: [],
        error: formatDiagnostics(errors),
        diagnostics: ctx.diagnostics,
        direction,
        ...(frontmatter ? { frontmatter } : {}),
      }
    }

    return {
      nodes: Array.from(ctx.nodeMap.values()),
      edges: ctx.edges,
      caption,
      direction,
      ...(frontmatter ? { frontmatter } : {}),
      ...(ctx.diagnostics.length ? { diagnostics: ctx.diagnostics } : {}),
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

function formatNodeDecl(n: NodeData): string {
  const [open, close] = nodeBrackets(n)
  const singleSuffix = n.type === "registry" && n.registryFrame === "single" ? " # frame=single" : ""
  if (n.type === "registry" && n.slots?.length) {
    return `${n.id}${open}${[n.title, ...n.slots].join("|")}${singleSuffix}${close}`
  }
  if (n.type === "registry") {
    const body = n.bodyLines?.length ? formatNodeLabel(n) : n.title
    return `${n.id}${open}${body}${singleSuffix}${close}`
  }
  if (n.type === "resolver") {
    const stack = n.stackDepth != null && n.stackDepth >= 2 ? ` # stack=${n.stackDepth}` : ""
    const body = n.bodyLines?.length ? formatNodeLabel(n) : n.title
    return `${n.id}${open}${body}${stack}${close}`
  }
  const body = n.bodyLines?.length ? formatNodeLabel(n) : n.title
  return `${n.id}${open}${body}${close}`
}

function serializeSubgraphHeader(registry: NodeData): string {
  const id = registry.id
  const singleSuffix = registry.registryFrame === "single" ? " # frame=single" : ""
  if (registry.slots?.length) {
    return `subgraph ${id}[${[registry.title, ...registry.slots].join("|")}${singleSuffix}]`
  }
  if (registry.bodyLines?.length) {
    return `subgraph ${id}[${formatNodeLabel(registry)}${singleSuffix}]`
  }
  return `subgraph ${id}[${registry.title}${singleSuffix}]`
}

function serializeSubgraph(registry: NodeData, indent: string): string[] {
  const lines: string[] = []
  lines.push(`${indent}${serializeSubgraphHeader(registry)}`)
  const childIndent = `${indent}  `
  for (const child of registry.children ?? []) {
    if (child.type === "registry" && child.children?.length) {
      lines.push(...serializeSubgraph(child, childIndent))
    } else {
      lines.push(`${childIndent}${formatNodeDecl(child)}`)
    }
  }
  lines.push(`${indent}end`)
  return lines
}

export function serializeMermaid(
  nodes: NodeData[],
  edges: EdgeData[],
  captionOrOptions?: string | SerializeMermaidOptions
): string {
  const options: SerializeMermaidOptions =
    typeof captionOrOptions === "string" ? { caption: captionOrOptions } : (captionOrOptions ?? {})
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const declared = new Set<string>()
  const subgraphIds = new Set(
    nodes.filter((n) => n.type === "registry" && n.children?.length).map((n) => n.id)
  )
  const out: string[] = []
  if (options.caption?.trim()) out.push(`%% caption: ${options.caption.trim()}`)
  out.push(`graph ${options.direction ?? "TD"}`)

  for (const n of nodes) {
    if (n.type === "registry" && n.children?.length) {
      out.push(...serializeSubgraph(n, "  "))
      declared.add(n.id)
    }
  }

  const decl = (id: string) => {
    if (declared.has(id)) return id
    declared.add(id)
    const n = nodeMap.get(id)
    if (!n) return id
    if (subgraphIds.has(id)) return id
    return formatNodeDecl(n)
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
  for (const n of nodes) {
    if (!declared.has(n.id)) {
      out.push(`  ${formatNodeDecl(n)}`)
      declared.add(n.id)
    }
  }
  return out.join("\n")
}
