/**
 * Editable Mermaid link + multiline label semantics (ENS Diagram System).
 * Tune stroke patterns, delegation detection, and edge label chips here —
 * parser maps Mermaid syntax to `linkStyle`; renderers read these defaults.
 */
import type { DiagramTypography } from "./theme"

/** Mermaid-compatible link styles parsed from arrow tokens. */
export type LinkStyle = "solid" | "dotted" | "open" | "thick"

export interface LinkStyleDef {
  strokeDasharray?: string
  arrowhead: boolean
  strokeWidthMultiplier?: number
}

/** Visual defaults per Mermaid link token (`-->`, `-.->`, `---`, `==>`). */
export const LINK_STYLES: Record<LinkStyle, LinkStyleDef> = {
  solid: { strokeDasharray: undefined, arrowhead: true },
  dotted: { strokeDasharray: "4 4", arrowhead: true },
  open: { strokeDasharray: undefined, arrowhead: false },
  thick: { strokeWidthMultiplier: 2, arrowhead: true },
}

/** Multiline registry labels from Mermaid `<br/>` (title + body lines). */
export const MULTILINE_LABEL = {
  titleFont: "semimono" as DiagramTypography,
  bodyFont: "marist" as DiagramTypography,
  /** Body lines containing this substring render as hatched (delegated records). */
  delegatedMarker: "(delegated)",
  /** Body lines starting with this prefix use Semi-Mono instead of Marist. */
  ownerPrefix: "owner:",
} as const

/** Mid-path edge label chip (Mermaid `-- text -->` / `-. text .->` / `-->|text|`). */
export const EDGE_LABEL = {
  fontSize: 11,
  paddingH: 6,
  paddingV: 2,
  borderRadius: 4,
  letterSpacing: 0.05,
} as const

/** When edge label matches (case-insensitive), layout uses dedicated alias routing. */
export const ALIAS_EDGE_LABEL = "alias"

/** Lateral alias edge routing (see `layout.ts` `buildAliasEdgePolyline`). */
export const ALIAS_ROUTING = {
  /** Vertical spacing between parallel alias lanes into the same target. */
  laneGap: 14,
  /** Horizontal stub before entering the target’s side port. */
  sideStub: 28,
  /** Lane Y as a fraction of the gap between source bottom and target top. */
  laneFill: 0.45,
  /** Min clearance below the taller endpoint before the first alias lane (fits edge-label chips). */
  belowClearance: 28,
} as const

export function isAliasRouteEdge(edge: {
  linkStyle?: string
  label?: string
}): boolean {
  return edge.linkStyle === "dotted" || isAliasEdge(edge.label)
}

export function isAliasEdge(label: string | undefined): boolean {
  return label?.trim().toLowerCase() === ALIAS_EDGE_LABEL
}

export function bodyLineUsesOwnerFont(line: string): boolean {
  return line.trimStart().toLowerCase().startsWith(MULTILINE_LABEL.ownerPrefix)
}

export function bodyLineIsDelegated(line: string): boolean {
  return line.includes(MULTILINE_LABEL.delegatedMarker)
}
