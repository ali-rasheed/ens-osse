/**
 * App shell: DialKit geometry + Mermaid source, theme modes (Figma tokens), docs embed snippet,
 * and retina PNG export of the diagram canvas only.
 */
import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { motion } from "motion/react"
import { DialRoot, useDialKit } from "dialkit"
import "dialkit/styles.css"
import { EnsMarkLogo } from "./components/EnsMarkLogo"
import { RegistryDiagram } from "./components/RegistryDiagram"
import {
  ANIMATION_PRESET_OPTIONS,
  DEFAULT_ANIMATION_CONFIG,
} from "./components/RegistryDiagram/animationConfig"
import type {
  AnimationConfig,
  DiagramConfig,
  PathPulseConfig,
} from "./components/RegistryDiagram/types"
import {
  APP_CHROME_BY_MODE,
  DIAGRAM_PALETTE_BY_MODE,
  protocolMainBackground,
  protocolMainBackgroundSize,
  diagramExportBackground,
  type DiagramMode,
} from "./components/RegistryDiagram/theme"
import { parseMermaid } from "./lib/mermaid"
import {
  MERMAID_TEMPLATES,
  NESTED_COLUMN_MERMAID,
  findTemplateIdForSource,
  type MermaidTemplate,
} from "./lib/mermaidTemplates"
import mermaidPatternsSource from "../docs/mermaid-patterns.md?raw"
import userGuideSource from "../docs/docs.md?raw"
import { buildDocsEmbedSnippet } from "./lib/docsEmbed"
import { downloadDiagramPng, type ExportScale } from "./lib/exportPng"
import { mergeNestedColumnDemoNodes } from "./lib/nestedColumnDemoData"

/** Initial editor: nested preset; bundled JSON children merge in `mergeNestedColumnDemoNodes`. */
const DEFAULT_MERMAID = NESTED_COLUMN_MERMAID

const MODES: DiagramMode[] = ["light", "dark", "protocol"]

const DIALKIT_STORAGE_KEY = "ens-osse-dialkit-open"
const DIALKIT_EXPANDED_WIDTH = 300
const DIALKIT_COLLAPSED_WIDTH = 40

function readDialKitOpenPreference(): boolean {
  try {
    const stored = localStorage.getItem(DIALKIT_STORAGE_KEY)
    if (stored === "false") return false
    if (stored === "true") return true
  } catch {
    /* ignore */
  }
  return true
}

/** Drop the doc H1 so the panel doesn’t repeat the disclosure title. */
function mermaidDocPanelBody(md: string): string {
  return md.replace(/^#[^\n]*\n+/, "").trimStart()
}

/**
 * DialKit numeric parameters as free-form text so custom values can be typed.
 * `parseDialNumber` accepts plain numbers and unit-suffixed values (`16px`, `0.08s`, `0.05em`).
 */
function dialNumSelect(
  defaultVal: number,
  choices: readonly number[],
  formatLabel: (n: number) => string = (n) => String(n)
): { type: "text"; default: string; placeholder: string } {
  const sample = choices.length > 0 ? choices[0] : defaultVal
  return {
    type: "text" as const,
    default: String(defaultVal),
    placeholder: `e.g. ${formatLabel(sample)}`,
  }
}

function dialPxSelect(defaultVal: number, choices: readonly number[]) {
  return dialNumSelect(defaultVal, choices, (n) => `${n}px`)
}

function parseDialNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  const match = String(value ?? "").trim().match(/-?\d*\.?\d+/)
  if (!match) return fallback
  const parsed = Number(match[0])
  return Number.isFinite(parsed) ? parsed : fallback
}

export default function App() {
  const [mode, setMode] = useState<DiagramMode>("dark")
  const [exportScale, setExportScale] = useState<ExportScale>(2)
  const [embedCopied, setEmbedCopied] = useState(false)
  const diagramRef = useRef<HTMLDivElement>(null)

  const chrome = APP_CHROME_BY_MODE[mode]
  const palette = DIAGRAM_PALETTE_BY_MODE[mode]

  /**
   * Nested DialKit folders map to registry frame UI: primary title (`eth`), double-outline shell,
   * and owner / slot line (`owner: 0x…`) — same knobs drive layout (`computeLayout`).
   */
  const registryCards = useDialKit("Registry cards", {
    primary: {
      _collapsed: true,
      fontSize: dialPxSelect(16, [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40]),
      /** Stroke + primary title on dark canvas; light/protocol still use palette for contrast. */
      color: { type: "color" as const, default: "#ffffff" },
      letterSpacing: dialNumSelect(
        0.05,
        [0, 0.02, 0.03, 0.04, 0.05, 0.06, 0.08, 0.1, 0.12, 0.15, 0.2],
        (n) => `${n}em`
      ),
    },
    frame: {
      _collapsed: false,
      paddingH: dialPxSelect(16, [4, 8, 12, 16, 20, 24, 32, 40, 48]),
      paddingV: dialPxSelect(10, [4, 6, 8, 10, 12, 16, 20, 24, 28, 32]),
      borderRadius: dialPxSelect(2, [0, 2, 4, 6, 8, 10, 12, 16, 20, 24]),
      nestedBorderRadius: dialPxSelect(12, [0, 6, 12, 18, 24, 30, 36, 42, 48]),
      borderWidth: dialNumSelect(0.5, [0.5, 1, 1.5, 2, 2.5, 3, 4], (n) => `${n}px`),
    },
    owner: {
      _collapsed: false,
      fontSize: dialPxSelect(14, [8, 10, 12, 14, 16, 18, 20, 24, 28, 32]),
      paddingH: dialPxSelect(22, [0, 8, 12, 16, 22, 24, 32, 40, 48]),
      paddingV: dialPxSelect(5, [0, 4, 5, 8, 10, 12, 16, 20, 24, 28, 32]),
      pillRadius: dialPxSelect(4, [0, 2, 4, 6, 8, 10, 12, 16, 20, 24, 32]),
      textColor: { type: "color" as const, default: "#e1e1e0" },
      letterSpacing: dialNumSelect(
        0.05,
        [0, 0.02, 0.03, 0.04, 0.05, 0.06, 0.08, 0.1, 0.12, 0.15, 0.2],
        (n) => `${n}em`
      ),
    },
  })

  const labels = useDialKit("Pills", {
    appearance: {
      _collapsed: true,
      /** Pill chrome + hatch only; typography for registry slots lives under Registry cards → owner. */
      surfaceFill: { type: "color" as const, default: "#2a2a2a" },
      surfaceBorder: { type: "color" as const, default: "#3d3d3d" },
      surfaceBorderWidth: dialNumSelect(1, [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3], (n) => `${n}px`),
    },
    hatch: {
      _collapsed: true,
      hatchBase: { type: "color" as const, default: "#1c1c1c" },
      hatchStripe1: { type: "color" as const, default: "#6a6a6a" },
      hatchStripe2: { type: "color" as const, default: "#565656" },
    },
  })

  const resolver = useDialKit("Resolver", {
    frame: {
      _collapsed: true,
      fontSize: dialPxSelect(17, [8, 10, 12, 14, 16, 17, 18, 20, 24, 28, 32, 36, 40]),
      paddingH: dialPxSelect(30, [0, 8, 16, 24, 30, 40, 48, 64, 80, 96, 120]),
      paddingV: dialPxSelect(15, [0, 8, 10, 12, 15, 20, 24, 32, 40, 48, 64, 80]),
      borderRadius: dialPxSelect(19, [0, 4, 8, 12, 16, 19, 24, 28, 32, 40]),
      borderWidth: dialNumSelect(0.5, [0.5, 1, 1.5, 2, 2.5, 3, 4], (n) => `${n}px`),
      frameInset: dialPxSelect(0, [0, 4, 8, 10, 12, 16, 20, 24, 32, 40]),
      radiusBonus: dialPxSelect(0, [0, 4, 8, 12, 16, 20, 24, 32]),
    },
    sockets: {
      _collapsed: true,
      socketSize: dialPxSelect(4, [0, 2, 4, 6, 8, 10, 12, 16, 20, 24, 32]),
      socketOverhang: dialPxSelect(0, [0, 4, 6, 8, 10, 12, 16, 20]),
    },
    size: {
      _collapsed: true,
      minWidth: dialPxSelect(140, [120, 140, 160, 200, 240, 291, 320, 400, 480, 600]),
      minHeight: dialPxSelect(50, [48, 50, 64, 80, 96, 115, 140, 180, 240, 300]),
    },
    dash: {
      _collapsed: true,
      dashLength: dialPxSelect(5, [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 24, 32]),
      dashGap: dialPxSelect(6, [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 24, 32]),
    },
  })

  const edges = useDialKit("Edges", {
    style: {
      _collapsed: true,
      strokeWidth: dialNumSelect(1, [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4], (n) => `${n}px`),
      cornerRadius: dialPxSelect(17, [0, 4, 8, 12, 16, 17, 20, 24, 32, 40, 48]),
      dotRadius: dialNumSelect(3.5, [1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 8, 10], (n) => `${n}px`),
    },
  })

  const layout = useDialKit("Layout", {
    spacing: {
      _collapsed: true,
      ranksep: dialPxSelect(70, [20, 32, 40, 50, 60, 70, 80, 96, 120, 160, 200]),
      nodesep: dialPxSelect(50, [10, 20, 32, 40, 50, 60, 80, 100, 120, 150]),
    },
  })

  const [key, setKey] = useState(0)
  const replay = () => setKey((k) => k + 1)

  const animation = useDialKit(
    "Animation",
    {
      controls: {
        _collapsed: true,
        preset: {
          type: "select" as const,
          options: [...ANIMATION_PRESET_OPTIONS],
          default: DEFAULT_ANIMATION_CONFIG.preset!,
        },
        stagger: dialNumSelect(DEFAULT_ANIMATION_CONFIG.stagger!, [
          0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.12, 0.16, 0.2, 0.24, 0.32, 0.4,
        ], (n) => `${n}s`),
        spring: DEFAULT_ANIMATION_CONFIG.spring as {
          type: "spring"
          visualDuration: number
          bounce: number
        },
      },
      replay: { type: "action" as const, label: "Replay" },
    },
    {
      onAction: (action) => {
        if (action === "replay") replay()
      },
    }
  )

  const pathPulseDials = useDialKit("Path pulse", {
    controls: {
      _collapsed: true,
      enabled: {
        type: "select" as const,
        options: [
          { value: "off", label: "Off" },
          { value: "on", label: "On" },
        ],
        default: "off",
      },
      from: {
        type: "text" as const,
        default: "registry-root",
        placeholder: "Start node id",
      },
      to: {
        type: "text" as const,
        default: "resolvers",
        placeholder: "End node id",
      },
      stagger: dialNumSelect(0.08, [
        0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.12, 0.16, 0.2, 0.24, 0.32, 0.4,
      ], (n) => `${n}s`),
      segmentDuration: dialNumSelect(
        0.35,
        [0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.5, 0.6, 0.75, 1.0],
        (n) => `${n}s`
      ),
      hold: dialNumSelect(
        0,
        [0, 0.05, 0.1, 0.15, 0.2, 0.3, 0.5, 0.75, 1.0],
        (n) => `${n}s`
      ),
      includeEdges: {
        type: "select" as const,
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
        default: "yes",
      },
      highlight: { type: "color" as const, default: "#0082bb" },
    },
  })

  const pathPulseConfig = useMemo((): PathPulseConfig | null => {
    if (pathPulseDials.controls.enabled !== "on") return null
    return {
      from: pathPulseDials.controls.from.trim() || "registry-root",
      to: pathPulseDials.controls.to.trim() || "resolvers",
      stagger: parseDialNumber(pathPulseDials.controls.stagger),
      segmentDuration: parseDialNumber(pathPulseDials.controls.segmentDuration),
      hold: parseDialNumber(pathPulseDials.controls.hold),
      includeEdges: pathPulseDials.controls.includeEdges === "yes",
      highlightColor: pathPulseDials.controls.highlight,
    }
  }, [
    pathPulseDials.controls.enabled,
    pathPulseDials.controls.from,
    pathPulseDials.controls.to,
    pathPulseDials.controls.stagger,
    pathPulseDials.controls.segmentDuration,
    pathPulseDials.controls.hold,
    pathPulseDials.controls.includeEdges,
    pathPulseDials.controls.highlight,
  ])

  const [mermaid, setMermaid] = useState(DEFAULT_MERMAID)
  const parsed = useMemo(() => parseMermaid(mermaid), [mermaid])
  const diagramNodes = useMemo(
    () => mergeNestedColumnDemoNodes(parsed.nodes, mermaid),
    [parsed.nodes, mermaid]
  )

  const embedSnippet = useMemo(
    () => buildDocsEmbedSnippet(mermaid, mode, parsed.caption),
    [mermaid, mode, parsed.caption]
  )

  /* Replay only when the animation preset changes — not on every DialKit tweak (stagger/spring). */
  useEffect(() => {
    replay()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: preset-only
  }, [animation.controls.preset])

  /** Dark canvas: Labels dials own pill/hatch hex (charcoal chip). Light/protocol keep Figma palette. */
  const labelPaintFromDials = mode === "dark"

  const config: DiagramConfig = {
    mode,
    fontSize: parseDialNumber(registryCards.primary.fontSize),
    paddingH: parseDialNumber(registryCards.frame.paddingH),
    paddingV: parseDialNumber(registryCards.frame.paddingV),
    borderRadius: parseDialNumber(registryCards.frame.borderRadius),
    nestedRegistryBorderRadius: parseDialNumber(registryCards.frame.nestedBorderRadius),
    borderWidth: parseDialNumber(registryCards.frame.borderWidth),
    nodeColor: mode === "dark" ? registryCards.primary.color : palette.nodeColor,
    primaryLetterSpacing: parseDialNumber(registryCards.primary.letterSpacing),
    labelSurfaceFill: labelPaintFromDials ? labels.appearance.surfaceFill : palette.labelSurfaceFill,
    labelSurfaceBorder: labelPaintFromDials
      ? `${parseDialNumber(labels.appearance.surfaceBorderWidth)}px solid ${labels.appearance.surfaceBorder}`
      : palette.labelSurfaceBorder,
    hatchBase: labelPaintFromDials ? labels.hatch.hatchBase : palette.hatchBase,
    hatchStripe1: labelPaintFromDials ? labels.hatch.hatchStripe1 : palette.hatchStripe1,
    hatchStripe2: labelPaintFromDials ? labels.hatch.hatchStripe2 : palette.hatchStripe2,
    labelFontSize: parseDialNumber(registryCards.owner.fontSize),
    labelPaddingH: parseDialNumber(registryCards.owner.paddingH),
    labelPaddingV: parseDialNumber(registryCards.owner.paddingV),
    labelColor: labelPaintFromDials ? registryCards.owner.textColor : palette.labelColor,
    labelBorderRadius: parseDialNumber(registryCards.owner.pillRadius),
    labelLetterSpacing: parseDialNumber(registryCards.owner.letterSpacing),
    resolverFontSize: parseDialNumber(resolver.frame.fontSize),
    resolverPaddingH: parseDialNumber(resolver.frame.paddingH),
    resolverPaddingV: parseDialNumber(resolver.frame.paddingV),
    resolverBorderRadius: parseDialNumber(resolver.frame.borderRadius),
    resolverBorderWidth: parseDialNumber(resolver.frame.borderWidth),
    resolverColor: palette.resolverColor,
    resolverSurfaceFill: palette.resolverSurfaceFill,
    resolverSocketColor: palette.resolverSocketColor,
    resolverFrameInset: parseDialNumber(resolver.frame.frameInset),
    resolverRadiusBonus: parseDialNumber(resolver.frame.radiusBonus),
    resolverSocketSize: parseDialNumber(resolver.sockets.socketSize),
    resolverSocketOverhang: parseDialNumber(resolver.sockets.socketOverhang),
    resolverMinWidth: parseDialNumber(resolver.size.minWidth),
    resolverMinHeight: parseDialNumber(resolver.size.minHeight),
    resolverDashLength: parseDialNumber(resolver.dash.dashLength),
    resolverDashGap: parseDialNumber(resolver.dash.dashGap),
    strokeWidth: parseDialNumber(edges.style.strokeWidth),
    cornerRadius: parseDialNumber(edges.style.cornerRadius),
    dotRadius: parseDialNumber(edges.style.dotRadius),
    edgeColor: palette.edgeColor,
    ranksep: parseDialNumber(layout.spacing.ranksep),
    nodesep: parseDialNumber(layout.spacing.nodesep),
  }

  const animationConfig: AnimationConfig = {
    preset: animation.controls.preset as AnimationConfig["preset"],
    stagger: parseDialNumber(animation.controls.stagger),
    spring: animation.controls.spring,
  }

  const mainBackground =
    mode === "protocol"
      ? {
          background: protocolMainBackground(),
          backgroundSize: protocolMainBackgroundSize(),
        }
      : { background: chrome.mainBg }

  const handleExportPng = useCallback(async () => {
    const el = diagramRef.current
    if (!el) return
    const bg = diagramExportBackground(mode)
    await downloadDiagramPng(el, {
      scale: exportScale,
      fileName: `ens-registry-diagram-${mode}-${exportScale}x.png`,
      backgroundColor: bg,
    })
  }, [mode, exportScale])

  const handleCopyEmbed = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(embedSnippet)
      setEmbedCopied(true)
      window.setTimeout(() => setEmbedCopied(false), 2000)
    } catch {
      setEmbedCopied(false)
    }
  }, [embedSnippet])

  return (
    <div
      className="app-shell"
      data-theme={mode}
      style={{
        minHeight: "100vh",
        background: chrome.shellBg,
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
      }}
    >
      <header
        className="app-header"
        style={{
          flex: "0 0 auto",
          padding: "12px 20px",
          borderBottom: chrome.asideBorder,
          background: chrome.shellBg,
        }}
      >
        <h1
          style={{
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: "'ABC Monument Grotesk', ui-sans-serif, system-ui, sans-serif",
            fontSize: 20,
            fontWeight: 500,
            lineHeight: 1.2,
            color: chrome.text,
            letterSpacing: "-0.02em",
          }}
        >
          <EnsMarkLogo size={28} />
          ENS Ossë
        </h1>
      </header>

      <div
        className="app-shell-body"
        style={{
          flex: "1 1 auto",
          display: "flex",
          alignItems: "stretch",
          minHeight: 0,
          overflowX: "auto",
        }}
      >
        <DialKitPanel chrome={chrome} />

        <main
          className="app-main"
          style={{
            minWidth: 280,
            flex: "1 1 auto",
            minHeight: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 40,
            paddingLeft: 24,
            paddingRight: 24,
            overflow: "auto",
            ...mainBackground,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 24,
              maxWidth: "100%",
            }}
          >
            <RegistryDiagram
              ref={diagramRef}
              key={key}
              nodes={diagramNodes}
              edges={parsed.edges}
              animation={animationConfig}
              config={config}
              pathPulse={pathPulseConfig}
            />
            {parsed.caption ? (
              <p
                style={{
                  margin: 0,
                  maxWidth: 640,
                  fontFamily: "'ABC Marist', Georgia, serif",
                  fontSize: 15,
                  lineHeight: 1.55,
                  letterSpacing: "0.02em",
                  color: chrome.textMuted,
                  textAlign: "center",
                }}
              >
                {parsed.caption}
              </p>
            ) : null}
          </div>
        </main>

        <aside
          className="app-aside"
          style={{
            width: 380,
            flex: "0 0 380px",
            height: "auto",
            maxHeight: "100vh",
            overflowY: "auto",
            overflowX: "hidden",
            boxSizing: "border-box",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            gap: 12,
            background: chrome.asideBg,
            borderLeft: chrome.asideBorder,
            boxShadow: chrome.asideShadow,
          }}
        >
          <ModeSwitch mode={mode} onChange={setMode} chrome={chrome} />
          <ReplayButton onClick={replay} chrome={chrome} />
          <ExportPanel
            chrome={chrome}
            exportScale={exportScale}
            onScaleChange={setExportScale}
            onExportPng={handleExportPng}
          />
          <EmbedPanel
            chrome={chrome}
            snippet={embedSnippet}
            copied={embedCopied}
            onCopy={handleCopyEmbed}
          />
          <MermaidInput
            value={mermaid}
            onChange={setMermaid}
            error={parsed.error}
            chrome={chrome}
            templates={MERMAID_TEMPLATES}
            onReplay={replay}
          />
        </aside>
      </div>
    </div>
  )
}

/**
 * Left sidebar for DialKit — inline mode has no native collapse, so the shell owns
 * expand/collapse (300px ↔ 40px) with persisted preference.
 */
function DialKitPanel({
  chrome,
}: {
  chrome: (typeof APP_CHROME_BY_MODE)[DiagramMode]
}) {
  const [open, setOpen] = useState(readDialKitOpenPreference)
  const panelId = "ens-osse-dialkit-panel"

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev
      try {
        localStorage.setItem(DIALKIT_STORAGE_KEY, String(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  return (
    <motion.aside
      className="app-dialkit"
      aria-label="Diagram controls"
      initial={false}
      animate={{ width: open ? DIALKIT_EXPANDED_WIDTH : DIALKIT_COLLAPSED_WIDTH }}
      transition={{ type: "spring", visualDuration: 0.28, bounce: 0.08 }}
      style={{
        flex: "0 0 auto",
        height: "auto",
        maxHeight: "100vh",
        overflow: "hidden",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        background: chrome.asideBg,
        borderRight: chrome.asideBorder,
        boxShadow: chrome.asideShadow,
        position: "relative",
      }}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Collapse controls panel" : "Expand controls panel"}
        style={{
          position: "absolute",
          top: 12,
          right: open ? 8 : "50%",
          transform: open ? "none" : "translateX(50%)",
          zIndex: 2,
          width: 28,
          height: 28,
          padding: 0,
          borderRadius: 6,
          border: chrome.panelBorder,
          background: chrome.panelBg,
          color: chrome.textMuted,
          fontSize: 14,
          lineHeight: 1,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {open ? "‹" : "›"}
      </button>
      <div
        id={panelId}
        className="app-dialkit-content sidebar-dialkit"
        aria-hidden={!open}
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          overflowY: open ? "auto" : "hidden",
          overflowX: "hidden",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          padding: open ? "12px 12px 16px" : 0,
          paddingTop: open ? 44 : 0,
          transition: "opacity 0.15s ease",
        }}
      >
        {open ? (
          <>
            <div
              style={{
                fontFamily: "'ABC Monument Grotesk Semi-Mono', ui-monospace, monospace",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 0.3,
                color: chrome.textMuted,
                marginBottom: 10,
              }}
            >
              Layout &amp; style
            </div>
            <DialRoot mode="inline" defaultOpen theme={chrome.dialKitTheme} />
          </>
        ) : null}
      </div>
    </motion.aside>
  )
}

function ModeSwitch({
  mode,
  onChange,
  chrome,
}: {
  mode: DiagramMode
  onChange: (m: DiagramMode) => void
  chrome: (typeof APP_CHROME_BY_MODE)[DiagramMode]
}) {
  return (
    <div
      role="group"
      aria-label="Theme mode"
      style={{
        display: "flex",
        gap: 6,
        width: "100%",
      }}
    >
      {MODES.map((m) => {
        const active = mode === m
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            style={{
              flex: 1,
              padding: "8px 6px",
              borderRadius: 8,
              border: chrome.panelBorder,
              background: active ? chrome.panelBg : "transparent",
              color: chrome.text,
              boxShadow: active ? "0 2px 8px rgba(0,0,0,0.12)" : "none",
              fontFamily: "'ABC Monument Grotesk Semi-Mono', ui-monospace, monospace",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.4,
              textTransform: "capitalize",
              cursor: "pointer",
            }}
          >
            {m}
          </button>
        )
      })}
    </div>
  )
}

function ExportPanel({
  chrome,
  exportScale,
  onScaleChange,
  onExportPng,
}: {
  chrome: (typeof APP_CHROME_BY_MODE)[DiagramMode]
  exportScale: ExportScale
  onScaleChange: (s: ExportScale) => void
  onExportPng: () => void
}) {
  const scales: ExportScale[] = [1, 2, 3]
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 12,
        background: chrome.panelBg,
        border: chrome.panelBorder,
        borderRadius: 10,
      }}
    >
      <div
        style={{
          fontFamily: "'ABC Monument Grotesk Semi-Mono', ui-monospace, monospace",
          fontSize: 11,
          fontWeight: 600,
          color: chrome.text,
          letterSpacing: 0.3,
        }}
      >
        Export PNG
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {scales.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onScaleChange(s)}
            style={{
              flex: 1,
              padding: "6px 0",
              borderRadius: 6,
              border: chrome.panelBorder,
              background: exportScale === s ? chrome.panelBg : "transparent",
              color: chrome.text,
              fontFamily: "system-ui, sans-serif",
              fontSize: 12,
              fontWeight: exportScale === s ? 700 : 500,
              cursor: "pointer",
            }}
          >
            {s}x
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onExportPng}
        style={{
          width: "100%",
          padding: "8px 12px",
          borderRadius: 8,
          border: chrome.panelBorder,
          background: chrome.panelBg,
          color: chrome.text,
          fontFamily: "'ABC Monument Grotesk Semi-Mono', ui-monospace, monospace",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Download diagram PNG
      </button>
    </div>
  )
}

function EmbedPanel({
  chrome,
  snippet,
  copied,
  onCopy,
}: {
  chrome: (typeof APP_CHROME_BY_MODE)[DiagramMode]
  snippet: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 12,
        background: chrome.panelBg,
        border: chrome.panelBorder,
        borderRadius: 10,
        minHeight: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: "'ABC Monument Grotesk Semi-Mono', ui-monospace, monospace",
            fontSize: 11,
            fontWeight: 600,
            color: chrome.text,
            letterSpacing: 0.3,
          }}
        >
          Docs embed (MDX)
        </span>
        <button
          type="button"
          onClick={onCopy}
          style={{
            padding: "4px 10px",
            borderRadius: 6,
            border: chrome.panelBorder,
            background: "transparent",
            color: chrome.textMuted,
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <textarea
        readOnly
        value={snippet}
        spellCheck={false}
        aria-label="MDX embed snippet"
        style={{
          width: "100%",
          height: 120,
          resize: "vertical",
          boxSizing: "border-box",
          padding: 8,
          borderRadius: 6,
          border: chrome.panelBorder,
          background: "transparent",
          color: chrome.textMuted,
          fontFamily: "'ABC Monument Grotesk Semi-Mono', ui-monospace, monospace",
          fontSize: 10,
          lineHeight: 1.45,
        }}
      />
    </div>
  )
}

function ReplayButton({
  onClick,
  chrome,
}: {
  onClick: () => void
  chrome: (typeof APP_CHROME_BY_MODE)[DiagramMode]
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        width: "100%",
        padding: "8px 14px",
        background: chrome.panelBg,
        color: chrome.text,
        border: chrome.panelBorder,
        borderRadius: 8,
        backdropFilter: "blur(8px)",
        boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
        fontFamily: "'ABC Monument Grotesk Semi-Mono', ui-monospace, monospace",
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: 0.3,
        cursor: "pointer",
      }}
    >
      <svg width={12} height={12} viewBox="0 0 12 12" fill="none" aria-hidden>
        <path
          d="M2 6a4 4 0 1 1 1.2 2.85"
          stroke="currentColor"
          strokeWidth={1.4}
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M2 3.2v2.6h2.6"
          stroke="currentColor"
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      Replay
    </button>
  )
}

interface MermaidInputProps {
  value: string
  onChange: (next: string) => void
  error?: string
  chrome: (typeof APP_CHROME_BY_MODE)[DiagramMode]
  templates: MermaidTemplate[]
  onReplay?: () => void
}

function MermaidInput({
  value,
  onChange,
  error,
  chrome,
  templates,
  onReplay,
}: MermaidInputProps) {
  const matchedTemplateId = useMemo(() => findTemplateIdForSource(value) ?? "", [value])
  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === matchedTemplateId),
    [templates, matchedTemplateId]
  )

  return (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        zIndex: 80,
        width: "100%",
        flexShrink: 0,
        background: chrome.panelBg,
        border: chrome.panelBorder,
        borderRadius: 10,
        backdropFilter: "blur(8px)",
        boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
        overflow: "hidden",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 4,
          padding: "10px 12px",
          borderBottom: chrome.panelBorder,
          color: chrome.text,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: 0.2,
        }}
      >
        <span>Mermaid</span>
        <span
          style={{
            color: error ? chrome.errorText : chrome.textMuted,
            fontSize: 11,
            fontWeight: 400,
            fontFamily: "'ABC Monument Grotesk Semi-Mono', ui-monospace, monospace",
          }}
        >
          {error
            ? "parse error"
            : "[reg # frame=single]  (plain)  ((hatched))  {dashed # stack=N}"}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          borderBottom: chrome.panelBorder,
          flexWrap: "wrap",
        }}
      >
        <label
          htmlFor="mermaid-template-select"
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: chrome.textMuted,
            fontFamily: "'ABC Monument Grotesk Semi-Mono', ui-monospace, monospace",
            flex: "0 0 auto",
          }}
        >
          Template
        </label>
        <select
          id="mermaid-template-select"
          value={matchedTemplateId || "__none__"}
          onChange={(e) => {
            const id = e.target.value
            if (id === "__none__") return
            const t = templates.find((x) => x.id === id)
            if (!t) return
            onChange(t.source)
            onReplay?.()
          }}
          aria-label="Load a Mermaid preset"
          style={{
            flex: "1 1 140px",
            minWidth: 0,
            padding: "6px 8px",
            borderRadius: 6,
            border: chrome.panelBorder,
            background: "transparent",
            color: chrome.text,
            fontSize: 12,
            fontFamily: "'ABC Monument Grotesk Semi-Mono', ui-monospace, monospace",
            cursor: "pointer",
          }}
        >
          <option value="__none__">— Current source (no preset) —</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
        {activeTemplate?.thumbnailSrc ? (
          <img
            src={activeTemplate.thumbnailSrc}
            alt={`${activeTemplate.title} reference`}
            width={72}
            height={48}
            style={{
              objectFit: "cover",
              objectPosition: "center top",
              borderRadius: 6,
              border: chrome.panelBorder,
              flex: "0 0 auto",
            }}
          />
        ) : null}
      </div>
      {activeTemplate?.description ? (
        <p
          style={{
            margin: 0,
            padding: "0 12px 10px",
            fontSize: 11,
            lineHeight: 1.5,
            color: chrome.textMuted,
          }}
        >
          {activeTemplate.description}
        </p>
      ) : null}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        aria-label="Mermaid graph source"
        placeholder="graph TD ..."
        style={{
          display: "block",
          width: "100%",
          height: 240,
          background: "transparent",
          color: chrome.text,
          fontFamily: "'ABC Monument Grotesk Semi-Mono', ui-monospace, monospace",
          fontSize: 12,
          lineHeight: 1.55,
          padding: 12,
          border: "none",
          outline: "none",
          resize: "vertical",
          boxSizing: "border-box",
        }}
      />
      <details
        className="mermaid-onboarding"
        style={{
          borderTop: chrome.panelBorder,
          padding: "0 12px 0",
          margin: 0,
        }}
      >
        <summary
          style={{
            listStyle: "none",
            cursor: "pointer",
            padding: "10px 0 8px",
            fontFamily: "'ABC Monument Grotesk Semi-Mono', ui-monospace, monospace",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.25,
            color: chrome.textMuted,
            userSelect: "none",
          }}
        >
          How to use Ossë
        </summary>
        <div
          style={{
            paddingBottom: 12,
            fontSize: 12,
            lineHeight: 1.55,
            color: chrome.textMuted,
          }}
        >
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontFamily: "'ABC Monument Grotesk Semi-Mono', ui-monospace, monospace",
              fontSize: 11,
              lineHeight: 1.5,
              color: chrome.textMuted,
              margin: 0,
              padding: "10px 10px 8px",
              maxHeight: 320,
              overflowY: "auto",
              borderRadius: 8,
              border: chrome.panelBorder,
              background: "color-mix(in srgb, currentColor 6%, transparent)",
            }}
          >
            {mermaidDocPanelBody(userGuideSource)}
          </pre>
        </div>
      </details>
      <details
        className="mermaid-onboarding"
        style={{
          borderTop: chrome.panelBorder,
          padding: "0 12px 12px",
          margin: 0,
        }}
      >
        <summary
          style={{
            listStyle: "none",
            cursor: "pointer",
            padding: "10px 0 8px",
            fontFamily: "'ABC Monument Grotesk Semi-Mono', ui-monospace, monospace",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.25,
            color: chrome.textMuted,
            userSelect: "none",
          }}
        >
          Mermaid syntax reference
        </summary>
        <div
          style={{
            paddingBottom: 4,
            fontSize: 12,
            lineHeight: 1.55,
            color: chrome.textMuted,
          }}
        >
          <p style={{ margin: "0 0 10px" }}>
            Live source:{" "}
            <code style={{ color: chrome.text }}>docs/mermaid-patterns.md</code> (imported at build
            time). Use the <strong style={{ color: chrome.text }}>Template</strong> dropdown for
            presets. Invalid lines show a parse error in the header.
          </p>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontFamily: "'ABC Monument Grotesk Semi-Mono', ui-monospace, monospace",
              fontSize: 11,
              lineHeight: 1.5,
              color: chrome.textMuted,
              margin: 0,
              padding: "10px 10px 8px",
              maxHeight: 380,
              overflowY: "auto",
              borderRadius: 8,
              border: chrome.panelBorder,
              background: "color-mix(in srgb, currentColor 6%, transparent)",
            }}
          >
            {mermaidDocPanelBody(mermaidPatternsSource)}
          </pre>
        </div>
      </details>
    </div>
  )
}
