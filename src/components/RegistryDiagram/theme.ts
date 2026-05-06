/**
 * ENS Core + Diagram System Figma variables → app modes.
 * Tokens: lapis/* and quartz/* from design files; modes map shell + diagram surfaces.
 */
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
  /** Optional layered background for diagram column (protocol grid). */
  mainBgLayered?: string
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
    mainBgLayered: undefined, // set in App via protocolMainBackground()
    asideBg: `color-mix(in srgb, ${T["lapis/100"]} 92%, ${T["lapis/900"]})`,
    asideBorder: `1px solid color-mix(in srgb, ${T["lapis/500"]} 35%, transparent)`,
    asideShadow: `-16px 0 40px color-mix(in srgb, ${T["lapis/900"]} 25%, transparent)`,
    text: T["lapis/900"],
    textMuted: `color-mix(in srgb, ${T["lapis/500"]} 70%, ${T["lapis/900"]})`,
    panelBg: `color-mix(in srgb, ${T["lapis/100"]} 88%, ${T["quartz/0"]})`,
    panelBorder: `1px solid color-mix(in srgb, ${T["lapis/500"]} 30%, transparent)`,
    errorText: "#b71c1c",
    dialKitTheme: "light",
  },
}

export const DIAGRAM_PALETTE_BY_MODE: Record<DiagramMode, DiagramPalette> = {
  light: {
    nodeColor: T["quartz/900"],
    labelColor: T["quartz/900"],
    resolverColor: T["quartz/900"],
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
    edgeColor: T["quartz/0"],
    labelSurfaceFill: "rgba(255, 255, 255, 0.06)",
    labelSurfaceBorder: "1px solid rgba(255, 255, 255, 0.08)",
    hatchBase: "rgba(255, 255, 255, 0.04)",
    hatchStripe1: "rgba(255,255,255,0.14)",
    hatchStripe2: "rgba(255,255,255,0.12)",
  },
  protocol: {
    nodeColor: T["lapis/500"],
    labelColor: T["lapis/500"],
    resolverColor: T["lapis/500"],
    edgeColor: T["lapis/900"],
    labelSurfaceFill: `color-mix(in srgb, ${T["lapis/500"]} 12%, ${T["lapis/100"]})`,
    labelSurfaceBorder: `1px solid color-mix(in srgb, ${T["lapis/500"]} 40%, transparent)`,
    hatchBase: `color-mix(in srgb, ${T["lapis/900"]} 10%, ${T["lapis/100"]})`,
    hatchStripe1: `color-mix(in srgb, ${T["lapis/900"]} 35%, transparent)`,
    hatchStripe2: `color-mix(in srgb, ${T["lapis/500"]} 30%, transparent)`,
  },
}

/**
 * Lapis grid-lined canvas (Diagram System): light grid on lapis/100.
 */
export function protocolMainBackground(): string {
  const bg = T["lapis/100"]
  const line = `color-mix(in srgb, ${T["lapis/500"]} 18%, transparent)`
  const grid = [
    `linear-gradient(${line} 1px, transparent 1px)`,
    `linear-gradient(90deg, ${line} 1px, transparent 1px)`,
  ].join(", ")
  return `${bg} ${grid}`
}

export function protocolMainBackgroundSize(): string {
  return "24px 24px"
}

/** Flat color under diagram for PNG export (grid is not rasterized as vector). */
export function diagramExportBackground(mode: DiagramMode): string {
  if (mode === "light") return T["quartz/0"]
  if (mode === "protocol") return T["lapis/100"]
  return "#0a0908"
}
