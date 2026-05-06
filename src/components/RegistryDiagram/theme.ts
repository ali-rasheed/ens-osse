/**
 * ENS Core + Diagram System Figma variables → app modes.
 * Tokens: lapis/* and quartz/* from design files; modes map shell + diagram surfaces.
 *
 * Protocol / “blueprint” canvas reference (grid, lapis/100 field, 2px lapis/500 strokes,
 * lapis/900 resolver corner squares, plain labels without pill chrome):
 * https://www.figma.com/design/BYUUCeRHgEgzbLZrGmxXHE/Diagram-System?node-id=76-623
 *
 * Protocol canvas grid tones are overridable via `--protocol-grid-minor` / `--protocol-grid-major`
 * on `.app-shell[data-theme="protocol"]` (see `src/index.css`; `prefers-contrast: more` strengthens them).
 */
import type { CSSProperties } from "react"

/** Marist = ENS record names; Semi-Mono = roles and `0x` wallet lines (Diagram System). */
export const DIAGRAM_FONTS = {
  marist: "'ABC Marist', Georgia, serif",
  semimono: "'ABC Monument Grotesk Semi-Mono', ui-monospace, monospace",
} as const

export type DiagramTypography = keyof typeof DIAGRAM_FONTS

export const ENS_TOKENS = {
  "lapis/100": "#dbf0f8",
  "lapis/500": "#0082bb",
  "lapis/900": "#02293b",
  "quartz/100": "#eeeded",
  "quartz/500": "#595755",
  "quartz/900": "#191919",
  "quartz/0": "#ffffff",
} as const

export type DiagramMode = "light" | "dark" | "protocol"

/** App chrome (shell, aside, controls) — inline styles in App.tsx */
export interface AppChromeTheme {
  shellBg: string
  mainBg: string
  asideBg: string
  asideBorder: string
  asideShadow: string
  text: string
  textMuted: string
  panelBg: string
  panelBorder: string
  errorText: string
  /** DialKit panel theme */
  dialKitTheme: "light" | "dark"
}

/** Stroke + fill tokens passed through DiagramConfig / nodes */
export interface DiagramPalette {
  nodeColor: string
  labelColor: string
  resolverColor: string
  /** Label text inside dashed resolver (can differ from stroke for contrast on dark fill). */
  resolverLabelColor: string
  /**
   * Solid fill inside the dashed resolver pill (Diagram System stacked resolver, Figma node
   * 76:5895: `#141416` on dark).
   */
  resolverSurfaceFill: string
  /** Filled corner sockets on dashed resolver frame (Diagram System: lapis/900 in protocol). */
  resolverSocketColor: string
  edgeColor: string
  labelSurfaceFill: string
  labelSurfaceBorder: string
  hatchBase: string
  hatchStripe1: string
  hatchStripe2: string
}

const T = ENS_TOKENS

export const APP_CHROME_BY_MODE: Record<DiagramMode, AppChromeTheme> = {
  light: {
    shellBg: T["quartz/100"],
    mainBg: T["quartz/0"],
    asideBg: "rgba(255, 255, 255, 0.96)",
    asideBorder: `1px solid color-mix(in srgb, ${T["quartz/500"]} 25%, transparent)`,
    asideShadow: "-16px 0 40px rgba(0,0,0,0.06)",
    text: T["quartz/900"],
    textMuted: `color-mix(in srgb, ${T["quartz/900"]} 55%, ${T["quartz/0"]})`,
    panelBg: "rgba(255, 255, 255, 0.92)",
    panelBorder: `1px solid color-mix(in srgb, ${T["quartz/500"]} 20%, transparent)`,
    errorText: "#c62828",
    dialKitTheme: "light",
  },
  dark: {
    shellBg: "#0a0908",
    mainBg: "#0a0908",
    asideBg: "rgba(12, 12, 12, 0.96)",
    asideBorder: "1px solid rgba(255,255,255,0.08)",
    asideShadow: "-16px 0 40px rgba(0,0,0,0.32)",
    text: "#e5e5e5",
    textMuted: "rgba(255,255,255,0.4)",
    panelBg: "rgba(18, 18, 18, 0.92)",
    panelBorder: "1px solid rgba(255,255,255,0.08)",
    errorText: "#ff8a8a",
    dialKitTheme: "dark",
  },
  protocol: {
    shellBg: T["lapis/100"],
    mainBg: T["lapis/100"],
    asideBg: `color-mix(in srgb, ${T["lapis/100"]} 90%, ${T["lapis/900"]})`,
    asideBorder: `1px solid color-mix(in srgb, ${T["lapis/500"]} 42%, transparent)`,
    asideShadow: `-16px 0 40px color-mix(in srgb, ${T["lapis/900"]} 25%, transparent)`,
    text: T["lapis/900"],
    /** AA-friendly muted on light lapis-tinted panels (was lapis/500-heavy mix). */
    textMuted: `color-mix(in srgb, ${T["lapis/900"]} 58%, ${T["quartz/0"]})`,
    panelBg: `color-mix(in srgb, ${T["lapis/100"]} 82%, ${T["quartz/0"]})`,
    panelBorder: `1px solid color-mix(in srgb, ${T["lapis/500"]} 38%, transparent)`,
    errorText: "#b71c1c",
    dialKitTheme: "light",
  },
}

export const DIAGRAM_PALETTE_BY_MODE: Record<DiagramMode, DiagramPalette> = {
  light: {
    nodeColor: T["quartz/900"],
    labelColor: T["quartz/900"],
    resolverColor: T["quartz/900"],
    resolverLabelColor: T["quartz/900"],
    resolverSurfaceFill: T["quartz/0"],
    resolverSocketColor: T["quartz/900"],
    edgeColor: T["quartz/500"],
    labelSurfaceFill: `color-mix(in srgb, ${T["quartz/500"]} 12%, ${T["quartz/0"]})`,
    labelSurfaceBorder: `1px solid color-mix(in srgb, ${T["quartz/500"]} 35%, transparent)`,
    hatchBase: `color-mix(in srgb, ${T["quartz/500"]} 8%, ${T["quartz/0"]})`,
    hatchStripe1: `color-mix(in srgb, ${T["quartz/500"]} 28%, transparent)`,
    hatchStripe2: `color-mix(in srgb, ${T["quartz/500"]} 22%, transparent)`,
  },
  dark: {
    nodeColor: T["quartz/0"],
    labelColor: T["quartz/100"],
    resolverColor: T["quartz/0"],
    resolverLabelColor: T["quartz/0"],
    /** Figma Diagram System resolver stack (node 76:5895). */
    resolverSurfaceFill: "#141416",
    resolverSocketColor: T["quartz/0"],
    edgeColor: T["quartz/0"],
    labelSurfaceFill: "rgba(255, 255, 255, 0.06)",
    labelSurfaceBorder: "1px solid rgba(255, 255, 255, 0.08)",
    hatchBase: "rgba(255, 255, 255, 0.04)",
    hatchStripe1: "rgba(255,255,255,0.14)",
    hatchStripe2: "rgba(255,255,255,0.12)",
  },
  protocol: {
    /** Double-outline + dashed stroke (Diagram System). */
    nodeColor: T["lapis/500"],
    /** Edge labels + slot Marist text: dark ink on lapis/100 for AA. */
    labelColor: T["lapis/900"],
    resolverColor: T["lapis/500"],
    /** Center label on dark resolver fill. */
    resolverLabelColor: T["lapis/100"],
    resolverSurfaceFill: `color-mix(in srgb, ${T["lapis/900"]} 82%, ${T["lapis/100"]})`,
    resolverSocketColor: T["lapis/900"],
    edgeColor: T["lapis/500"],
    labelSurfaceFill: "transparent",
    labelSurfaceBorder: "none",
    hatchBase: `color-mix(in srgb, ${T["lapis/900"]} 8%, ${T["lapis/100"]})`,
    hatchStripe1: `color-mix(in srgb, ${T["lapis/500"]} 28%, transparent)`,
    hatchStripe2: `color-mix(in srgb, ${T["lapis/900"]} 22%, transparent)`,
  },
}

const MINOR_GRID_PX = 8
const MAJOR_GRID_PX = 80

/**
 * Graph-paper canvas: lapis/100 field, major grid (80px) over minor (8px). Grid line colors use
 * CSS variables with fallbacks so `index.css` can tune and strengthen under `prefers-contrast: more`.
 */
export function protocolCanvasStyle(): CSSProperties {
  const minor = `var(--protocol-grid-minor, color-mix(in srgb, ${T["lapis/500"]} 14%, transparent))`
  const major = `var(--protocol-grid-major, color-mix(in srgb, ${T["lapis/500"]} 32%, transparent))`
  return {
    backgroundColor: T["lapis/100"],
    backgroundImage: [
      `linear-gradient(${major} 1px, transparent 1px)`,
      `linear-gradient(90deg, ${major} 1px, transparent 1px)`,
      `linear-gradient(${minor} 1px, transparent 1px)`,
      `linear-gradient(90deg, ${minor} 1px, transparent 1px)`,
    ].join(", "),
    backgroundSize: `${MAJOR_GRID_PX}px ${MAJOR_GRID_PX}px, ${MAJOR_GRID_PX}px ${MAJOR_GRID_PX}px, ${MINOR_GRID_PX}px ${MINOR_GRID_PX}px, ${MINOR_GRID_PX}px ${MINOR_GRID_PX}px`,
    backgroundRepeat: "repeat",
  }
}

/** @deprecated Use `protocolCanvasStyle()` for new code. */
export function protocolMainBackground(): string {
  const s = protocolCanvasStyle()
  const images = s.backgroundImage
  if (typeof images !== "string") return T["lapis/100"]
  return `${s.backgroundColor ?? ""} ${images}`.trim()
}

/** @deprecated Use `protocolCanvasStyle().backgroundSize`. */
export function protocolMainBackgroundSize(): string {
  const s = protocolCanvasStyle()
  return typeof s.backgroundSize === "string" ? s.backgroundSize : ""
}

/** Flat color under diagram for PNG export (grid is not rasterized as vector). */
export function diagramExportBackground(mode: DiagramMode): string {
  if (mode === "light") return T["quartz/0"]
  if (mode === "protocol") return T["lapis/100"]
  return "#0a0908"
}
