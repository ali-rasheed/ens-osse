/**
 * Dagre layout for registry / label / resolver nodes, plus deterministic sizing for
 * compound registry frames (header + hatched slots) and optional edge anchors
 * on slot bottom-centers (Figma Diagram System ports). Edge polylines are
 * orthogonalized to axis-aligned segments (90° only); `pointsToPath` fillets 90° bends
 * using the layout `cornerRadius` (quadratic beziers). Final approach legs are snapped to
 * the target node’s top/bottom center (vertical tail) or left/right center (horizontal tail)
 * so the arrow meets the frame on-axis (skipped when `toSlotIndex` pins the head to a slot).
 */
import dagre from "dagre"
import type {
  NodeData,
  EdgeData,
  EdgeOrthogonalStyle,
  LayoutResult,
  PositionedNode,
  PositionedEdge,
} from "./types"

// Char-width ratios per font (px per character at 1px fontSize)
const CHAR_RATIO = { registry: 0.6, dashed: 0.6, label: 0.5 }

/** Gap between outer and inner registry outlines; keep in sync with `RegistryNode`. */
export const REGISTRY_SHELL_GAP = 3

/** Vertical gap between mono header and slot row (Figma `gap-[12px]`). */
export const REGISTRY_HEADER_SLOT_GAP = 12

/** Horizontal gap between hatched slot cells. */
export const REGISTRY_SLOT_CELL_GAP = 8

interface BoxOptions {
  fontSize: number
  paddingH: number
  paddingV: number
  borderWidth: number
  resolverFontSize: number
  resolverPaddingH: number
  resolverPaddingV: number
  resolverBorderWidth: number
  resolverSocketOverhang: number
  resolverMinWidth: number
  resolverMinHeight: number
  labelFontSize: number
  labelPaddingH: number
  labelPaddingV: number
}

/** Horizontal chrome from outer border → inner content (one side): b + shellGap + b. */
function registrySideChrome(borderWidth: number): number {
  return borderWidth + REGISTRY_SHELL_GAP + borderWidth
}

function registryShell(borderWidth: number): number {
  return 2 * registrySideChrome(borderWidth)
}

function nodeBox(node: NodeData, opts: BoxOptions): { width: number; height: number } {
  const { type, label, slots } = node
  if (type === "label" || type === "labelHatched") {
    const w = label.length * CHAR_RATIO.label * opts.labelFontSize + opts.labelPaddingH * 2
    const h = opts.labelFontSize * 1.4 + opts.labelPaddingV * 2
    return { width: Math.max(32, w), height: h }
  }
  if (type === "dashed") {
    const shell = 2 * (opts.resolverBorderWidth + opts.resolverSocketOverhang)
    const w =
      label.length * CHAR_RATIO.dashed * opts.resolverFontSize +
      opts.resolverPaddingH * 2 +
      shell
    const h = opts.resolverFontSize * 1.4 + opts.resolverPaddingV * 2 + shell
    return {
      width: Math.max(opts.resolverMinWidth, w),
      height: Math.max(opts.resolverMinHeight, h),
    }
  }

  const minW = 56
  const shell = registryShell(opts.borderWidth)

  const activeSlots = type === "registry" && slots?.length ? slots : undefined
  if (!activeSlots) {
    const w =
      label.length * CHAR_RATIO.registry * opts.fontSize + opts.paddingH * 2 + shell
    const h = opts.fontSize * 1.4 + opts.paddingV * 2 + shell
    return { width: Math.max(minW, w), height: h }
  }

  const headerTextW = label.length * CHAR_RATIO.registry * opts.fontSize
  const headerLineH = opts.fontSize * 1.4
  const slotRowH = opts.labelFontSize * 1.4 + opts.labelPaddingV * 2

  let slotRowInnerW = 0
  for (let i = 0; i < activeSlots.length; i++) {
    const s = activeSlots[i]
    const cellW = s.length * CHAR_RATIO.label * opts.labelFontSize + opts.labelPaddingH * 2
    slotRowInnerW += cellW
    if (i < activeSlots.length - 1) slotRowInnerW += REGISTRY_SLOT_CELL_GAP
  }

  const innerContentW = Math.max(headerTextW, slotRowInnerW) + opts.paddingH * 2
  const innerContentH =
    opts.paddingV +
    headerLineH +
    REGISTRY_HEADER_SLOT_GAP +
    slotRowH +
    opts.paddingV

  const w = Math.max(minW, innerContentW + shell)
  const h = innerContentH + shell
  return { width: w, height: h }
}

const PADDING = 40

interface LayoutOptions {
  ranksep?: number
  nodesep?: number
  cornerRadius?: number
  fontSize?: number
  paddingH?: number
  paddingV?: number
  borderWidth?: number
  resolverFontSize?: number
  resolverPaddingH?: number
  resolverPaddingV?: number
  resolverBorderWidth?: number
  resolverSocketOverhang?: number
  resolverMinWidth?: number
  resolverMinHeight?: number
  labelFontSize?: number
  labelPaddingH?: number
  labelPaddingV?: number
}

const ORTH_EPS = 0.5

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

function isAxisAligned(
  a: { x: number; y: number },
  b: { x: number; y: number }
): boolean {
  return Math.abs(a.x - b.x) < ORTH_EPS || Math.abs(a.y - b.y) < ORTH_EPS
}

function effectiveOrthogonalStyle(edge: EdgeData): EdgeOrthogonalStyle {
  if (edge.orthogonalStyle === "hv" || edge.orthogonalStyle === "vhv") return edge.orthogonalStyle
  if (edge.fromSlotIndex !== undefined) return "vhv"
  return "hv"
}

/**
 * Insert elbows so every segment is horizontal or vertical (Manhattan routing).
 * `hv`: one corner (horizontal at start Y, then vertical). `vhv`: jog at mid‑Y
 * (vertical → horizontal → vertical), for “drop from port, run across, drop to target”.
 */
function orthogonalizePolyline(
  points: { x: number; y: number }[],
  style: EdgeOrthogonalStyle
): { x: number; y: number }[] {
  if (points.length < 2) return points.slice()

  const out: { x: number; y: number }[] = [points[0]]
  for (let i = 1; i < points.length; i++) {
    const a = out[out.length - 1]
    const b = points[i]
    if (Math.hypot(b.x - a.x, b.y - a.y) < ORTH_EPS) continue

    if (isAxisAligned(a, b)) {
      out.push(b)
      continue
    }
    if (style === "vhv") {
      const yMid = (a.y + b.y) / 2
      const p1 = { x: a.x, y: yMid }
      const p2 = { x: b.x, y: yMid }
      if (Math.hypot(p1.x - a.x, p1.y - a.y) >= ORTH_EPS) out.push(p1)
      if (Math.hypot(p2.x - out[out.length - 1].x, p2.y - out[out.length - 1].y) >= ORTH_EPS)
        out.push(p2)
      if (Math.hypot(b.x - out[out.length - 1].x, b.y - out[out.length - 1].y) >= ORTH_EPS)
        out.push(b)
      continue
    }
    // `hv`: horizontal then vertical — (a)→(b.x, a.y)→(b)
    const elbow = { x: b.x, y: a.y }
    if (Math.hypot(elbow.x - a.x, elbow.y - a.y) >= ORTH_EPS) out.push(elbow)
    out.push(b)
  }

  return simplifyAxisCollinear(out)
}

/**
 * Walk backward from the end along co-linear vertical segments (same x), then set that
 * run’s x to `cx` so the elbow + tail stay orthogonal (avoids only moving the tip).
 */
function snapFinalVerticalRunToX(points: { x: number; y: number }[], cx: number): void {
  const n = points.length
  if (n < 2) return
  const endX = points[n - 1].x
  let k = n - 1
  while (k > 0) {
    const sameX = Math.abs(points[k - 1].x - endX) < ORTH_EPS
    const verticalSeg = Math.abs(points[k].y - points[k - 1].y) >= ORTH_EPS
    if (sameX && verticalSeg) {
      k--
      continue
    }
    break
  }
  for (let i = k; i < n; i++) {
    if (Math.abs(points[i].x - endX) < ORTH_EPS) points[i].x = cx
  }
}

/** Same as `snapFinalVerticalRunToX` but for a horizontal tail (same y → `cy`). */
function snapFinalHorizontalRunToY(points: { x: number; y: number }[], cy: number): void {
  const n = points.length
  if (n < 2) return
  const endY = points[n - 1].y
  let k = n - 1
  while (k > 0) {
    const sameY = Math.abs(points[k - 1].y - endY) < ORTH_EPS
    const horizSeg = Math.abs(points[k].x - points[k - 1].x) >= ORTH_EPS
    if (sameY && horizSeg) {
      k--
      continue
    }
    break
  }
  for (let i = k; i < n; i++) {
    if (Math.abs(points[i].y - endY) < ORTH_EPS) points[i].y = cy
  }
}

/** Align the last approach leg with the target’s attachment edge center (for arrow + rounded path). */
function snapEdgeEndToTargetAttachment(
  points: { x: number; y: number }[],
  target: PositionedNode
): void {
  if (points.length < 2) return
  const a = points[points.length - 2]
  const b = points[points.length - 1]
  const cx = target.x + target.width / 2
  const cy = target.y + target.height / 2
  const dx = Math.abs(b.x - a.x)
  const dy = Math.abs(b.y - a.y)
  if (dx < ORTH_EPS && dy >= ORTH_EPS) snapFinalVerticalRunToX(points, cx)
  else if (dy < ORTH_EPS && dx >= ORTH_EPS) snapFinalHorizontalRunToY(points, cy)
}

/** Drop middle vertices that lie on the same axis-aligned segment as their neighbors. */
function simplifyAxisCollinear(pts: { x: number; y: number }[]): { x: number; y: number }[] {
  if (pts.length < 3) return pts
  const out: { x: number; y: number }[] = [pts[0]]
  for (let i = 1; i < pts.length - 1; i++) {
    const p0 = out[out.length - 1]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const sameX = Math.abs(p0.x - p1.x) < ORTH_EPS && Math.abs(p1.x - p2.x) < ORTH_EPS
    const sameY = Math.abs(p0.y - p1.y) < ORTH_EPS && Math.abs(p1.y - p2.y) < ORTH_EPS
    const redundant =
      (sameX && p1.y >= Math.min(p0.y, p2.y) - ORTH_EPS && p1.y <= Math.max(p0.y, p2.y) + ORTH_EPS) ||
      (sameY && p1.x >= Math.min(p0.x, p2.x) - ORTH_EPS && p1.x <= Math.max(p0.x, p2.x) + ORTH_EPS)
    if (redundant) continue
    out.push(p1)
  }
  out.push(pts[pts.length - 1])
  return out
}

function slotCellWidths(slots: string[], opts: BoxOptions): number[] {
  return slots.map(
    (s) => s.length * CHAR_RATIO.label * opts.labelFontSize + opts.labelPaddingH * 2
  )
}

/**
 * Bottom-center of each hatched slot in absolute graph coordinates (matches
 * `RegistryNode` flex + padding + borders). Uses the same width as the padded
 * inner track (`innerContentW − 2·paddingH`) for centering so ports align with pills.
 */
export function compoundRegistrySlotBottomCenters(
  node: NodeData,
  pos: { x: number; y: number; width: number; height: number },
  opts: BoxOptions
): { x: number; y: number }[] {
  const slots = node.type === "registry" ? node.slots?.filter(Boolean) : undefined
  if (!slots?.length) return []

  const b = opts.borderWidth
  const side = registrySideChrome(b)
  const innerContentW = pos.width - 2 * side
  const cellWs = slotCellWidths(slots, opts)
  let slotRowInnerW = 0
  for (let i = 0; i < cellWs.length; i++) {
    slotRowInnerW += cellWs[i]
    if (i < cellWs.length - 1) slotRowInnerW += REGISTRY_SLOT_CELL_GAP
  }

  const headerLineH = opts.fontSize * 1.4
  const slotRowH = opts.labelFontSize * 1.4 + opts.labelPaddingV * 2

  const offset = side
  /** Row is centered in the inner column’s content box (inside `paddingH`), not the full inner width. */
  const slotTrackW = innerContentW - 2 * opts.paddingH
  const rowLeft = pos.x + offset + opts.paddingH + (slotTrackW - slotRowInnerW) / 2
  const slotRowBottomY =
    pos.y +
    offset +
    opts.paddingV +
    headerLineH +
    REGISTRY_HEADER_SLOT_GAP +
    slotRowH

  const out: { x: number; y: number }[] = []
  let xCursor = rowLeft
  for (let i = 0; i < slots.length; i++) {
    const cw = cellWs[i]
    out.push({ x: xCursor + cw / 2, y: slotRowBottomY })
    xCursor += cw
    if (i < slots.length - 1) xCursor += REGISTRY_SLOT_CELL_GAP
  }
  return out
}

function applySlotAnchors(
  nodes: PositionedNode[],
  edges: EdgeData[],
  positionedEdges: PositionedEdge[],
  opts: BoxOptions,
  edgeCornerRadius: number
): void {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const anchorCache = new Map<string, { x: number; y: number }[]>()

  function anchorsFor(id: string): { x: number; y: number }[] {
    const n = byId.get(id)
    if (!n || n.type !== "registry" || !n.slots?.length) return []
    if (!anchorCache.has(id)) {
      anchorCache.set(id, compoundRegistrySlotBottomCenters(n, n, opts))
    }
    return anchorCache.get(id)!
  }

  for (let i = 0; i < positionedEdges.length; i++) {
    const edge = edges[i]
    const pe = positionedEdges[i]
    if (pe.points.length < 2) continue
    const pts = [...pe.points]

    if (edge.fromSlotIndex !== undefined) {
      const a = anchorsFor(edge.from)
      const idx = edge.fromSlotIndex
      if (idx >= 0 && idx < a.length) pts[0] = { ...a[idx] }
    }

    if (edge.toSlotIndex !== undefined) {
      const a = anchorsFor(edge.to)
      const idx = edge.toSlotIndex
      if (idx >= 0 && idx < a.length) pts[pts.length - 1] = { ...a[idx] }
    }

    pe.points = pts
    pe.d = pointsToPath(pts, edgeCornerRadius)
  }
}

export function computeLayout(
  nodes: NodeData[],
  edges: EdgeData[],
  options: LayoutOptions = {}
): LayoutResult {
  const {
    ranksep = 70,
    nodesep = 50,
    cornerRadius = 10,
    fontSize = 16,
    paddingH = 16,
    paddingV = 10,
    borderWidth = 1.5,
    resolverFontSize = 16,
    resolverPaddingH = 16,
    resolverPaddingV = 10,
    resolverBorderWidth = 0.5,
    resolverSocketOverhang = 6,
    resolverMinWidth = 291,
    resolverMinHeight = 115,
    labelFontSize = 14,
    labelPaddingH = 8,
    labelPaddingV = 4,
  } = options
  const boxOpts: BoxOptions = {
    fontSize,
    paddingH,
    paddingV,
    borderWidth,
    resolverFontSize,
    resolverPaddingH,
    resolverPaddingV,
    resolverBorderWidth,
    resolverSocketOverhang,
    resolverMinWidth,
    resolverMinHeight,
    labelFontSize,
    labelPaddingH,
    labelPaddingV,
  }
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
    const { width, height } = nodeBox(node, boxOpts)
    g.setNode(node.id, { label: node.label, width, height })
  }

  for (const edge of edges) {
    g.setEdge(edge.from, edge.to)
  }

  dagre.layout(g)

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
    const points = [...(e?.points ?? [])]
    return {
      ...edge,
      points,
      d: pointsToPath(points, 0),
    }
  })

  applySlotAnchors(positionedNodes, edges, positionedEdges, boxOpts, cornerRadius)

  const nodeById = new Map(positionedNodes.map((n) => [n.id, n]))

  for (let i = 0; i < positionedEdges.length; i++) {
    const pe = positionedEdges[i]
    const edge = edges[i]
    if (pe.points.length >= 2) {
      pe.points = orthogonalizePolyline(pe.points, effectiveOrthogonalStyle(edge))
      const toNode = nodeById.get(edge.to)
      if (toNode !== undefined && edge.toSlotIndex === undefined) {
        snapEdgeEndToTargetAttachment(pe.points, toNode)
      }
      pe.d = pointsToPath(pe.points, cornerRadius)
    }
  }

  const graphData = g.graph() as { width?: number; height?: number }
  const width = (graphData.width ?? 600) + PADDING
  const height = (graphData.height ?? 600) + PADDING

  return { nodes: positionedNodes, edges: positionedEdges, width, height, cornerRadius }
}
