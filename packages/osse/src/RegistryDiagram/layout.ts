/**
 * Dagre layout for registry / label / resolver nodes, plus deterministic sizing for
 * compound registry frames (header + hatched slots or nested `children`), and optional
 * edge anchors on hatched slot bottom-centers (Figma Diagram System ports). Registries default
 * to a double outline; `registryFrame: "single"` or Mermaid ` # frame=single` uses one stroke.
 * Edge polylines
 * are orthogonalized to axis-aligned segments (90° only); `pointsToPath` fillets bends of any
 * angle using the layout `cornerRadius` (quadratic beziers) and emits straight `L` runs for
 * diagonal legs. Final approach legs are snapped to
 * the target node’s top/bottom center (vertical tail) or left/right center (horizontal tail)
 * so the arrow meets the frame on-axis (skipped when `toSlotIndex` pins the head to a slot).
 *
 * Octilinear vocabulary (layout invariant 2): edges use horizontal, vertical, and 45° segments
 * only. `insertChamfer45` softens 90° bends into 45° legs (opt-in via `LayoutOptions.chamfer`,
 * wired into the hierarchy/alias routers); `validateOctilinear` asserts the vocabulary in tests —
 * every 45° leg is sandwiched by axis-aligned legs, and port approach legs stay axis-aligned.
 */
import dagre from "dagre"
import type { GraphDirection } from "../mermaid"
import { ALIAS_ROUTING, isAliasEdge, isAliasRouteEdge } from "./linkStyles"
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

/** XY shift per layer for dashed resolver stacks with `stackDepth` > 1; matches `DiagonalStack` on canvas. */
export const RESOLVER_STACK_LAYER_OFFSET = 8

/** Padding inside the registry stroke before header / body (Figma `p-[8px]`); keep in sync with `RegistryNode`. */
export const REGISTRY_FRAME_PADDING = 8

/** Gap between outer and inner registry borders (double-frame default); keep in sync with `RegistryNode`. */
export const REGISTRY_SHELL_GAP = 3

/** Vertical gap between stacked nested registry cards inside `children`. */
export const REGISTRY_NESTED_CHILD_GAP = 16

/** Vertical gap between mono lines when `slots` are stacked (nested registries). */
export const REGISTRY_SLOT_TEXT_GAP = 8

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
  /**
   * When measuring nodes nested inside a parent registry’s `children`, registry `slots` are
   * a vertical mono stack (not a hatched row).
   */
  insideRegistryChildrenTree?: boolean
}

/** One side: stroke + inner frame padding (content flex starts after this). */
export function registryContentInset(borderWidth: number): number {
  return borderWidth + REGISTRY_FRAME_PADDING
}

function registryFrameTotalBreadth(borderWidth: number): number {
  return 2 * registryContentInset(borderWidth)
}

function registryIsSingleFrame(node: NodeData): boolean {
  return node.type === "registry" && node.registryFrame === "single"
}

/** One side of double chrome: border + gap + inner border. */
export function registryDoubleSideChrome(borderWidth: number): number {
  return borderWidth + REGISTRY_SHELL_GAP + borderWidth
}

/** Horizontal/vertical chrome from outer edge to inner content (paddingH/V) start. */
export function registryLayoutSideInset(node: NodeData, borderWidth: number): number {
  if (node.type !== "registry") return registryContentInset(borderWidth)
  return registryIsSingleFrame(node)
    ? registryContentInset(borderWidth)
    : registryDoubleSideChrome(borderWidth)
}

function registryOuterBreadth(node: NodeData, borderWidth: number): number {
  if (node.type !== "registry") return registryFrameTotalBreadth(borderWidth)
  return registryIsSingleFrame(node)
    ? registryFrameTotalBreadth(borderWidth)
    : 2 * registryDoubleSideChrome(borderWidth)
}

function nodeBox(node: NodeData, opts: BoxOptions): { width: number; height: number } {
  const { type, title, slots, children, bodyLines } = node
  if (type === "pill") {
    const w = title.length * CHAR_RATIO.label * opts.labelFontSize + opts.labelPaddingH * 2
    const h = opts.labelFontSize * 1.4 + opts.labelPaddingV * 2
    return { width: Math.max(32, w), height: h }
  }
  if (type === "resolver") {
    const shell = 2 * (opts.resolverBorderWidth + opts.resolverSocketOverhang)
    const w =
      title.length * CHAR_RATIO.dashed * opts.resolverFontSize +
      opts.resolverPaddingH * 2 +
      shell
    const h = opts.resolverFontSize * 1.4 + opts.resolverPaddingV * 2 + shell
    const baseW = Math.max(opts.resolverMinWidth, w)
    const baseH = Math.max(opts.resolverMinHeight, h)
    const depth = Math.max(1, node.stackDepth ?? 1)
    const pad = (depth - 1) * RESOLVER_STACK_LAYER_OFFSET
    return {
      width: baseW + pad,
      height: baseH + pad,
    }
  }

  const minW = 56
  const frameBreadth = registryOuterBreadth(node, opts.borderWidth)
  const activeChildren =
    type === "registry" && children?.filter(Boolean).length
      ? children!.filter(Boolean)
      : undefined

  if (activeChildren?.length) {
    const nestedOpts: BoxOptions = { ...opts, insideRegistryChildrenTree: true }
    let colW = 0
    let colH = 0
    for (let i = 0; i < activeChildren.length; i++) {
      const b = nodeBox(activeChildren[i], nestedOpts)
      colW = Math.max(colW, b.width)
      colH += b.height
      if (i < activeChildren.length - 1) colH += REGISTRY_NESTED_CHILD_GAP
    }
    const headerTextW = title.length * CHAR_RATIO.registry * opts.fontSize
    const headerLineH = opts.fontSize * 1.4
    const innerContentW = Math.max(headerTextW, colW) + opts.paddingH * 2
    const innerContentH =
      opts.paddingV + headerLineH + REGISTRY_HEADER_SLOT_GAP + colH + opts.paddingV
    return {
      width: Math.max(minW, innerContentW + frameBreadth),
      height: innerContentH + frameBreadth,
    }
  }

  const activeSlots = slots?.filter(Boolean) ?? []
  const slotTextStack = activeSlots.length > 0 && Boolean(opts.insideRegistryChildrenTree)

  if (slotTextStack) {
    const headerTextW = title.length * CHAR_RATIO.registry * opts.fontSize
    const headerLineH = opts.fontSize * 1.4
    const lineH = opts.labelFontSize * 1.4
    let maxSlotW = 0
    for (const s of activeSlots) {
      maxSlotW = Math.max(
        maxSlotW,
        s.length * CHAR_RATIO.registry * opts.labelFontSize + opts.labelPaddingH * 2
      )
    }
    const innerContentW = Math.max(headerTextW, maxSlotW) + opts.paddingH * 2
    const stackH =
      activeSlots.length * lineH +
      (activeSlots.length > 1 ? (activeSlots.length - 1) * REGISTRY_SLOT_TEXT_GAP : 0)
    const innerContentH =
      opts.paddingV + headerLineH + REGISTRY_HEADER_SLOT_GAP + stackH + opts.paddingV
    return {
      width: Math.max(minW, innerContentW + frameBreadth),
      height: innerContentH + frameBreadth,
    }
  }

  if (!activeSlots.length) {
    const activeBody = bodyLines?.filter(Boolean) ?? []
    if (activeBody.length > 0) {
      const headerTextW = title.length * CHAR_RATIO.registry * opts.fontSize
      const headerLineH = opts.fontSize * 1.4
      const lineH = opts.labelFontSize * 1.4
      let maxBodyW = 0
      for (const line of activeBody) {
        maxBodyW = Math.max(
          maxBodyW,
          line.length * CHAR_RATIO.registry * opts.labelFontSize + opts.labelPaddingH * 2
        )
      }
      const innerContentW = Math.max(headerTextW, maxBodyW) + opts.paddingH * 2
      const stackH =
        activeBody.length * lineH +
        (activeBody.length > 1 ? (activeBody.length - 1) * REGISTRY_SLOT_TEXT_GAP : 0)
      const innerContentH =
        opts.paddingV + headerLineH + REGISTRY_HEADER_SLOT_GAP + stackH + opts.paddingV
      return {
        width: Math.max(minW, innerContentW + frameBreadth),
        height: innerContentH + frameBreadth,
      }
    }
    const w =
      title.length * CHAR_RATIO.registry * opts.fontSize + opts.paddingH * 2 + frameBreadth
    const h = opts.fontSize * 1.4 + opts.paddingV * 2 + frameBreadth
    return { width: Math.max(minW, w), height: h }
  }

  const headerTextW = title.length * CHAR_RATIO.registry * opts.fontSize
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

  const w = Math.max(minW, innerContentW + frameBreadth)
  const h = innerContentH + frameBreadth
  return { width: w, height: h }
}

const PADDING = 40

export interface LayoutOptions {
  ranksep?: number
  nodesep?: number
  /** Dagre rank direction from Mermaid `graph TD|LR|…`. Hierarchy routers are TB-tuned. */
  direction?: GraphDirection
  cornerRadius?: number
  /**
   * When > 0, soften the hierarchy/alias routers' 90° bends into 45° legs of this size (px),
   * yielding octilinear (H/V/45°) paths. Defaults to 0 (pure orthogonal); `OCTILINEAR_CHAMFER`
   * is the recommended value. The `# route=chamfer` token exposes this per-edge (port-tokens todo).
   */
  chamfer?: number
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

/** Builds dagre measurement options (shared by `computeLayout` and `layoutNodeDimensions`). */
export function buildBoxOptions(options: LayoutOptions = {}): BoxOptions {
  const {
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
  return {
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
}

/** Measure a node’s width/height with the same rules as dagre (e.g. nested `children` inside a registry). */
export function layoutNodeDimensions(
  node: NodeData,
  options: LayoutOptions & { insideRegistryChildrenTree?: boolean } = {}
): { width: number; height: number } {
  const { insideRegistryChildrenTree, ...rest } = options
  return nodeBox(node, {
    ...buildBoxOptions(rest),
    insideRegistryChildrenTree,
  })
}

const ORTH_EPS = 0.5

/**
 * Serialize a polyline to an SVG path. Straight legs (axis-aligned or 45° diagonal) emit `L`
 * segments; interior bends of any angle are filleted with a quadratic bezier clamped to
 * `cornerRadius` and half of each adjoining leg. With `cornerRadius <= 0` or fewer than 3 points,
 * it emits a pure `M`/`L` polyline (diagonals included).
 */
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

type Pt = { x: number; y: number }

/** Segment classification for octilinear validation: horizontal, vertical, 45°, zero-length, or off-grid. */
type SegKind = "h" | "v" | "d45" | "zero" | "other"

function segKind(a: Pt, b: Pt): SegKind {
  const adx = Math.abs(b.x - a.x)
  const ady = Math.abs(b.y - a.y)
  if (adx < ORTH_EPS && ady < ORTH_EPS) return "zero"
  if (ady < ORTH_EPS) return "h"
  if (adx < ORTH_EPS) return "v"
  if (Math.abs(adx - ady) < ORTH_EPS) return "d45"
  return "other"
}

export interface OctilinearValidation {
  ok: boolean
  reason?: string
}

/**
 * Validate a polyline against the octilinear vocabulary (layout invariant 2):
 * every segment is horizontal, vertical, or exactly 45°; each 45° leg is sandwiched by
 * axis-aligned legs at both ends; and the first/last legs (port approach) stay axis-aligned.
 * Zero-length segments are ignored; a polyline with fewer than two distinct points is trivially ok.
 */
export function validateOctilinear(points: Pt[]): OctilinearValidation {
  const kinds: SegKind[] = []
  for (let i = 1; i < points.length; i++) {
    const k = segKind(points[i - 1], points[i])
    if (k === "zero") continue
    if (k === "other") return { ok: false, reason: `segment ${i} is neither horizontal, vertical, nor 45°` }
    kinds.push(k)
  }
  for (let i = 0; i < kinds.length; i++) {
    if (kinds[i] !== "d45") continue
    if (i === 0 || i === kinds.length - 1)
      return { ok: false, reason: "45° leg cannot be a port approach (first/last leg must be axis-aligned)" }
    if (kinds[i - 1] === "d45" || kinds[i + 1] === "d45")
      return { ok: false, reason: "45° leg must be sandwiched by axis-aligned legs at both ends" }
  }
  return { ok: true }
}

/** Default 45° chamfer size (px) cut from each leg of a 90° bend when octilinear chamfering is enabled. */
export const OCTILINEAR_CHAMFER = 12

/**
 * Replace each 90° bend (perpendicular axis-aligned legs) with a symmetric 45° chamfer: retreat
 * `chamfer` px back along the incoming leg and advance `chamfer` px along the outgoing leg, so the
 * connecting leg is exactly 45°. Endpoints are preserved (port attachment stays axis-aligned) and
 * non-orthogonal or straight vertices are left untouched. The retreat is clamped to half of each
 * adjoining leg so adjacent chamfers never overrun a shared leg.
 */
export function insertChamfer45(points: Pt[], chamfer: number): Pt[] {
  if (chamfer <= 0 || points.length < 3) return points.slice()
  const out: Pt[] = [points[0]]
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const next = points[i + 1]
    const inKind = segKind(prev, curr)
    const outKind = segKind(curr, next)
    const isRightAngle =
      (inKind === "h" && outKind === "v") || (inKind === "v" && outKind === "h")
    if (!isRightAngle) {
      out.push(curr)
      continue
    }
    const lenIn = Math.hypot(curr.x - prev.x, curr.y - prev.y)
    const lenOut = Math.hypot(next.x - curr.x, next.y - curr.y)
    const c = Math.min(chamfer, lenIn / 2, lenOut / 2)
    if (c < ORTH_EPS) {
      out.push(curr)
      continue
    }
    out.push({
      x: curr.x - ((curr.x - prev.x) / lenIn) * c,
      y: curr.y - ((curr.y - prev.y) / lenIn) * c,
    })
    out.push({
      x: curr.x + ((next.x - curr.x) / lenOut) * c,
      y: curr.y + ((next.y - curr.y) / lenOut) * c,
    })
  }
  out.push(points[points.length - 1])
  return out
}

function effectiveOrthogonalStyle(edge: EdgeData): EdgeOrthogonalStyle {
  if (edge.orthogonalStyle === "hv" || edge.orthogonalStyle === "vhv") return edge.orthogonalStyle
  if (edge.fromSlotIndex !== undefined) return "vhv"
  if (edge.linkStyle === "dotted" || isAliasEdge(edge.label)) return "hv"
  return "hv"
}

/** Parent → child solid edge without slot pins or alias routing (target below source in TB). */
export function isHierarchySolidEdge(
  edge: EdgeData,
  from: PositionedNode | undefined,
  to: PositionedNode | undefined
): boolean {
  if (!from || !to) return false
  if (isAliasRouteEdge(edge)) return false
  if (edge.fromSlotIndex !== undefined || edge.toSlotIndex !== undefined) return false
  const style = edge.linkStyle ?? "solid"
  if (style !== "solid") return false
  if (from.rank === undefined || to.rank === undefined) return false
  return to.rank > from.rank
}

/** Alias edges between nodes that share a solid parent (siblings in the tree). */
function areAliasSiblingNodes(edges: EdgeData[], fromId: string, toId: string): boolean {
  const solidParents = (nodeId: string) =>
    edges
      .filter(
        (e) =>
          e.to === nodeId &&
          !isAliasRouteEdge(e) &&
          (e.linkStyle ?? "solid") === "solid" &&
          e.fromSlotIndex === undefined
      )
      .map((e) => e.from)
  const fromParents = solidParents(fromId)
  return solidParents(toId).some((p) => fromParents.includes(p))
}

/**
 * Dedicated vhv (or hv override) path for parent → child solid hierarchy edges.
 * Tail: source bottom-center; head: target top-center.
 */
export function buildHierarchyEdgePolyline(
  from: PositionedNode,
  to: PositionedNode,
  style: EdgeOrthogonalStyle = "vhv"
): { x: number; y: number }[] {
  const fromCx = from.x + from.width / 2
  const toCx = to.x + to.width / 2
  const tail = { x: fromCx, y: from.y + from.height }
  const head = { x: toCx, y: to.y }

  if (style === "hv") {
    return simplifyAxisCollinear([tail, { x: toCx, y: tail.y }, head])
  }

  const yMid = (tail.y + head.y) / 2
  return simplifyAxisCollinear([
    tail,
    { x: fromCx, y: yMid },
    { x: toCx, y: yMid },
    head,
  ])
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
  target: PositionedNode,
  attachment: "auto" | "side" = "auto"
): void {
  if (points.length < 2) return
  const a = points[points.length - 2]
  const b = points[points.length - 1]
  const cx = target.x + target.width / 2
  const cy = target.y + target.height / 2

  if (attachment === "side") {
    const fromLeft = a.x < cx
    const attachX = fromLeft ? target.x : target.x + target.width
    points[points.length - 1] = { x: attachX, y: cy }
    if (points.length >= 2) {
      const prev = points[points.length - 2]
      if (Math.abs(prev.y - cy) >= ORTH_EPS) {
        points[points.length - 2] = { x: prev.x, y: cy }
      }
    }
    return
  }

  const dx = Math.abs(b.x - a.x)
  const dy = Math.abs(b.y - a.y)
  if (dx < ORTH_EPS && dy >= ORTH_EPS) snapFinalVerticalRunToX(points, cx)
  else if (dy < ORTH_EPS && dx >= ORTH_EPS) snapFinalHorizontalRunToY(points, cy)
}

/**
 * Assign lane indices for alias edges that share a target (sorted by source x)
 * so dev → prod and staging → prod do not overlap.
 */
function buildAliasLaneIndexByEdge(
  edges: EdgeData[],
  nodeById: Map<string, PositionedNode>
): Map<number, number> {
  const byTarget = new Map<string, number[]>()
  edges.forEach((edge, i) => {
    if (!isAliasRouteEdge(edge)) return
    const list = byTarget.get(edge.to) ?? []
    list.push(i)
    byTarget.set(edge.to, list)
  })

  const laneByEdge = new Map<number, number>()
  for (const indices of byTarget.values()) {
    const sorted = [...indices].sort((a, b) => {
      const ax = nodeById.get(edges[a].from)?.x ?? 0
      const bx = nodeById.get(edges[b].from)?.x ?? 0
      return ax - bx
    })
    sorted.forEach((edgeIdx, lane) => laneByEdge.set(edgeIdx, lane))
  }
  return laneByEdge
}

/**
 * Dedicated orthogonal path for Mermaid `-. alias .->` edges.
 *
 * Same-rank / sibling aliases: drop below both nodes, run a horizontal lane, enter the
 * target bottom-center. (Entering top from a below-lane would either cut through the
 * node or detour above into the hierarchy fan-out and park labels on parent→child edges.)
 *
 * Cross-rank aliases: drop from source bottom, run a horizontal lane, enter target side.
 */
function buildAliasEdgePolyline(
  from: PositionedNode,
  to: PositionedNode,
  laneIndex: number,
  laneCount: number,
  edges: EdgeData[]
): { x: number; y: number }[] {
  const fromCx = from.x + from.width / 2
  const toCx = to.x + to.width / 2
  const fromBottom = from.y + from.height
  const toTop = to.y
  const toBottom = to.y + to.height
  const toCy = to.y + to.height / 2

  const sameRank = from.rank !== undefined && to.rank !== undefined && from.rank === to.rank
  const siblingAlias = areAliasSiblingNodes(edges, from.id, to.id)
  const belowLaneEntry = sameRank || siblingAlias

  if (belowLaneEntry) {
    const maxBottom = Math.max(fromBottom, toBottom)
    const gap = Math.max(24, 12)
    const baseLaneY =
      maxBottom + Math.max(ALIAS_ROUTING.belowClearance, gap * ALIAS_ROUTING.laneFill)
    const laneY =
      baseLaneY + (laneIndex - (laneCount - 1) / 2) * ALIAS_ROUTING.laneGap

    return simplifyAxisCollinear([
      { x: fromCx, y: fromBottom },
      { x: fromCx, y: laneY },
      { x: toCx, y: laneY },
      { x: toCx, y: toBottom },
    ])
  }

  const gap = Math.max(toTop - fromBottom, 24)
  const baseLaneY = fromBottom + gap * ALIAS_ROUTING.laneFill
  const laneY =
    baseLaneY + (laneIndex - (laneCount - 1) / 2) * ALIAS_ROUTING.laneGap

  const sourceIsLeft = fromCx <= toCx
  const endX = sourceIsLeft ? to.x : to.x + to.width
  const approachX = sourceIsLeft
    ? endX - ALIAS_ROUTING.sideStub
    : endX + ALIAS_ROUTING.sideStub

  return [
    { x: fromCx, y: fromBottom },
    { x: fromCx, y: laneY },
    { x: approachX, y: laneY },
    { x: approachX, y: toCy },
    { x: endX, y: toCy },
  ]
}

function aliasLaneCountForTarget(edges: EdgeData[], targetId: string): number {
  let count = 0
  for (const e of edges) {
    if (isAliasRouteEdge(e) && e.to === targetId) count++
  }
  return Math.max(1, count)
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
  if (!slots?.length || node.children?.length) return []

  const b = opts.borderWidth
  const side = registryLayoutSideInset(node, b)
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
    if (!n || n.type !== "registry" || n.children?.length || !n.slots?.length) return []
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

function dagreRankdir(direction?: GraphDirection): string {
  if (!direction || direction === "TD" || direction === "TB") return "TB"
  return direction
}

export function computeLayout(
  nodes: NodeData[],
  edges: EdgeData[],
  options: LayoutOptions = {}
): LayoutResult {
  const { ranksep = 70, nodesep = 50, cornerRadius = 10, chamfer = 0, direction, ...layoutRest } = options
  const boxOpts = buildBoxOptions(layoutRest)
  const g = new dagre.graphlib.Graph()
  g.setGraph({
    rankdir: dagreRankdir(direction),
    ranksep,
    nodesep,
    edgesep: 10,
    marginx: PADDING,
    marginy: PADDING,
  })
  g.setDefaultEdgeLabel(() => ({}))

  for (const node of nodes) {
    const { width, height } = nodeBox(node, boxOpts)
    g.setNode(node.id, { label: node.title, width, height })
  }

  // Alias / dotted lateral edges must not participate in ranking — otherwise a sibling
  // alias target (e.g. prod ← dev/staging) is pulled onto a lower rank and hierarchy
  // edges punch through the middle of same-column siblings.
  for (const edge of edges) {
    if (isAliasRouteEdge(edge)) continue
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
  const aliasLaneByEdge = buildAliasLaneIndexByEdge(edges, nodeById)

  for (let i = 0; i < positionedEdges.length; i++) {
    const pe = positionedEdges[i]
    const edge = edges[i]
    const toNode = nodeById.get(edge.to)
    const fromNode = nodeById.get(edge.from)

    if (isAliasRouteEdge(edge) && fromNode && toNode) {
      const lane = aliasLaneByEdge.get(i) ?? 0
      const laneCount = aliasLaneCountForTarget(edges, edge.to)
      pe.points = insertChamfer45(
        buildAliasEdgePolyline(fromNode, toNode, lane, laneCount, edges),
        chamfer
      )
      pe.d = pointsToPath(pe.points, cornerRadius)
      continue
    }

    if (isHierarchySolidEdge(edge, fromNode, toNode) && fromNode && toNode) {
      const style =
        edge.orthogonalStyle === "hv" || edge.orthogonalStyle === "vhv"
          ? edge.orthogonalStyle
          : "vhv"
      pe.points = insertChamfer45(buildHierarchyEdgePolyline(fromNode, toNode, style), chamfer)
      pe.d = pointsToPath(pe.points, cornerRadius)
      continue
    }

    if (pe.points.length >= 2) {
      pe.points = orthogonalizePolyline(pe.points, effectiveOrthogonalStyle(edge))
      if (toNode !== undefined && edge.toSlotIndex === undefined) {
        snapEdgeEndToTargetAttachment(pe.points, toNode, "auto")
      }
      pe.d = pointsToPath(pe.points, cornerRadius)
    }
  }

  // Alias lanes / around-the-side climbs can extend past dagre’s node bbox.
  const graphData = g.graph() as { width?: number; height?: number }
  let width = graphData.width ?? 600
  let height = graphData.height ?? 600
  for (const n of positionedNodes) {
    width = Math.max(width, n.x + n.width)
    height = Math.max(height, n.y + n.height)
  }
  for (const pe of positionedEdges) {
    for (const p of pe.points) {
      width = Math.max(width, p.x)
      height = Math.max(height, p.y)
    }
  }
  width += PADDING
  height += PADDING

  return { nodes: positionedNodes, edges: positionedEdges, width, height, cornerRadius }
}
