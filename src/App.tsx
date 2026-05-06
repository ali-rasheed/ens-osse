/**
 * App shell: DialKit geometry + Mermaid source, theme modes (Figma tokens), docs embed snippet,
 * and retina PNG export of the diagram canvas only.
 */
import { useState, useEffect, useMemo, useRef, useCallback } from "react"
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
import { buildDocsEmbedSnippet } from "./lib/docsEmbed"
import { downloadDiagramPng, type ExportScale } from "./lib/exportPng"
import { mergeNestedColumnDemoNodes } from "./lib/nestedColumnDemoData"

/** Initial editor: nested preset; bundled JSON children merge in `mergeNestedColumnDemoNodes`. */
const DEFAULT_MERMAID = NESTED_COLUMN_MERMAID

const MODES: DiagramMode[] = ["light", "dark", "protocol"]

/** Drop the doc H1 so the panel doesn’t repeat the disclosure title. */
function mermaidDocPanelBody(md: string): string {
  return md.replace(/^#[^\n]*\n+/, "").trimStart()
}

export default function App() {
  const [mode, setMode] = useState<DiagramMode>("dark")
  const [exportScale, setExportScale] = useState<ExportScale>(2)
  const [embedCopied, setEmbedCopied] = useState(false)
  const diagramRef = useRef<HTMLDivElement>(null)

  const chrome = APP_CHROME_BY_MODE[mode]
  const palette = DIAGRAM_PALETTE_BY_MODE[mode]

  const nodes = useDialKit("Nodes", {
    fontSize: [16, 8, 40],
    paddingH: [16, 4, 48],
    paddingV: [10, 4, 32],
    borderRadius: [6, 0, 24],
    borderWidth: [0.5, 0.5, 4, 0.5],
  })

  const labels = useDialKit("Labels", {
    fontSize: [14, 8, 32],
    paddingH: [8, 0, 32],
    paddingV: [12, 0, 24],
    /** Plain pill + hatched chips (Marist); colors default near dark-mode Figma; tweak per canvas. */
    pillRadius: [12, 0, 32],
    surfaceFill: { type: "color" as const, default: "#2a2a2a" },
    surfaceBorder: { type: "color" as const, default: "#3d3d3d" },
    surfaceBorderWidth: [1, 0, 3, 0.25],
    textColor: { type: "color" as const, default: "#e1e1e0" },
    letterSpacing: [0.05, 0, 0.2, 0.005],
    hatchBase: { type: "color" as const, default: "#1c1c1c" },
    hatchStripe1: { type: "color" as const, default: "#6a6a6a" },
    hatchStripe2: { type: "color" as const, default: "#565656" },
  })

  const resolver = useDialKit("Resolver", {
    fontSize: [17, 8, 40],
    paddingH: [30, 0, 120],
    paddingV: [15, 0, 80],
    borderRadius: [19, 0, 40],
    borderWidth: [0.5, 0.5, 4, 0.5],
    frameInset: [0, 0, 40],
    radiusBonus: [0, 0, 32],
    socketSize: [4, 0, 32],
    socketOverhang: [0, 0, 20],
    minWidth: [140, 120, 600],
    minHeight: [50, 48, 300],
    dashLength: [5, 1, 32],
    dashGap: [6, 1, 32],
  })

  const edges = useDialKit("Edges", {
    strokeWidth: [1, 0.5, 4, 0.5],
    cornerRadius: [17, 0, 48],
    dotRadius: [3.5, 1, 10, 0.5],
  })

  const layout = useDialKit("Layout", {
    ranksep: [70, 20, 200],
    nodesep: [50, 10, 150],
  })

  const [key, setKey] = useState(0)
  const replay = () => setKey((k) => k + 1)

  const animation = useDialKit(
    "Animation",
    {
      preset: {
        type: "select" as const,
        options: [...ANIMATION_PRESET_OPTIONS],
        default: DEFAULT_ANIMATION_CONFIG.preset!,
      },
      stagger: [
        DEFAULT_ANIMATION_CONFIG.stagger!,
        0,
        0.4,
        0.01,
      ],
      spring: DEFAULT_ANIMATION_CONFIG.spring as {
        type: "spring"
        visualDuration: number
        bounce: number
      },
      replay: { type: "action" as const, label: "Replay" },
    },
    {
      onAction: (action) => {
        if (action === "replay") replay()
      },
    }
  )

  const [mermaid, setMermaid] = useState(DEFAULT_MERMAID)
  const parsed = useMemo(() => parseMermaid(mermaid), [mermaid])
  const diagramNodes = useMemo(
    () => mergeNestedColumnDemoNodes(parsed.nodes, mermaid),
    [parsed.nodes, mermaid]
  )

  const embedSnippet = useMemo(() => buildDocsEmbedSnippet(mermaid, mode), [mermaid, mode])

  /* Replay only when the animation preset changes — not on every DialKit tweak (stagger/spring). */
  useEffect(() => {
    replay()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: preset-only
  }, [animation.preset])

  /** Dark canvas: Labels dials own pill/hatch hex (charcoal chip). Light/protocol keep Figma palette. */
  const labelPaintFromDials = mode === "dark"

  const config: DiagramConfig = {
    mode,
    fontSize: nodes.fontSize,
    paddingH: nodes.paddingH,
    paddingV: nodes.paddingV,
    borderRadius: nodes.borderRadius,
    nestedRegistryBorderRadius: nodes.borderRadius + 18,
    borderWidth: nodes.borderWidth,
    nodeColor: palette.nodeColor,
    labelSurfaceFill: labelPaintFromDials ? labels.surfaceFill : palette.labelSurfaceFill,
    labelSurfaceBorder: labelPaintFromDials
      ? `${labels.surfaceBorderWidth}px solid ${labels.surfaceBorder}`
      : palette.labelSurfaceBorder,
    hatchBase: labelPaintFromDials ? labels.hatchBase : palette.hatchBase,
    hatchStripe1: labelPaintFromDials ? labels.hatchStripe1 : palette.hatchStripe1,
    hatchStripe2: labelPaintFromDials ? labels.hatchStripe2 : palette.hatchStripe2,
    labelFontSize: labels.fontSize,
    labelPaddingH: labels.paddingH,
    labelPaddingV: labels.paddingV,
    labelColor: labelPaintFromDials ? labels.textColor : palette.labelColor,
    labelBorderRadius: labels.pillRadius,
    labelLetterSpacing: labels.letterSpacing,
    resolverFontSize: resolver.fontSize,
    resolverPaddingH: resolver.paddingH,
    resolverPaddingV: resolver.paddingV,
    resolverBorderRadius: resolver.borderRadius,
    resolverBorderWidth: resolver.borderWidth,
    resolverColor: palette.resolverColor,
    resolverSurfaceFill: palette.resolverSurfaceFill,
    resolverSocketColor: palette.resolverSocketColor,
    resolverFrameInset: resolver.frameInset,
    resolverRadiusBonus: resolver.radiusBonus,
    resolverSocketSize: resolver.socketSize,
    resolverSocketOverhang: resolver.socketOverhang,
    resolverMinWidth: resolver.minWidth,
    resolverMinHeight: resolver.minHeight,
    resolverDashLength: resolver.dashLength,
    resolverDashGap: resolver.dashGap,
    strokeWidth: edges.strokeWidth,
    cornerRadius: edges.cornerRadius,
    dotRadius: edges.dotRadius,
    edgeColor: palette.edgeColor,
    ranksep: layout.ranksep,
    nodesep: layout.nodesep,
  }

  const animationConfig: AnimationConfig = {
    preset: animation.preset as AnimationConfig["preset"],
    stagger: animation.stagger,
    spring: animation.spring,
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
            paddingRight: 24,
            overflow: "auto",
            ...mainBackground,
          }}
        >
          <RegistryDiagram
            ref={diagramRef}
            key={key}
            nodes={diagramNodes}
            edges={parsed.edges}
            animation={animationConfig}
            config={config}
          />
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
          <div
            className="sidebar-dialkit"
            style={{
              width: "100%",
              flex: "0 0 auto",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <DialRoot mode="inline" defaultOpen theme={chrome.dialKitTheme} />
          </div>
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
          alignItems: "center",
          justifyContent: "space-between",
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
