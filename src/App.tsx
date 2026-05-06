/**
 * App shell: DialKit geometry + Mermaid source, theme modes (Figma tokens), docs embed snippet,
 * and retina PNG export of the diagram canvas only.
 */
import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { DialRoot, useDialKit } from "dialkit"
import "dialkit/styles.css"
import { RegistryDiagram } from "./components/RegistryDiagram"
import type {
  AnimationConfig,
  DiagramConfig,
  NodeData,
  EdgeData,
} from "./components/RegistryDiagram/types"
import {
  APP_CHROME_BY_MODE,
  DIAGRAM_PALETTE_BY_MODE,
  protocolMainBackground,
  protocolMainBackgroundSize,
  diagramExportBackground,
  type DiagramMode,
} from "./components/RegistryDiagram/theme"
import { parseMermaid, serializeMermaid } from "./lib/mermaid"
import { buildDocsEmbedSnippet } from "./lib/docsEmbed"
import { downloadDiagramPng, type ExportScale } from "./lib/exportPng"

/**
 * Default graph: nested registries inside one compound frame + edge to Resolvers
 * (Figma Diagram System nested Registry reference).
 */
const DEFAULT_NODES: NodeData[] = [
  {
    id: "registry-root",
    label: "Registry",
    type: "registry",
    children: [
      {
        id: "nest-root",
        label: "<root>",
        type: "registry",
        slots: ["owner: 0x0123..."],
      },
      {
        id: "nest-eth",
        label: "eth",
        type: "registry",
        slots: ["owner: 0x0123..."],
      },
      {
        id: "nest-workemon",
        label: "workemon.eth",
        type: "registry",
        slots: ["owner: 0x0123..."],
      },
      {
        id: "nest-wallet",
        label: "wallet.workemon.eth",
        type: "registry",
        children: [
          { id: "w-owner", label: "owner: 0x0123...", type: "label" },
          { id: "w-res", label: "resolver: 0x6789...", type: "dashed" },
        ],
      },
      {
        id: "nest-delegate",
        label: "delegate.workemon.eth",
        type: "registry",
        children: [
          { id: "d-owner", label: "owner: 0x0123...", type: "label" },
          { id: "d-res", label: "resolver: 0x6789...", type: "dashed" },
        ],
      },
    ],
  },
  { id: "resolvers", label: "Resolvers", type: "dashed" },
]

const DEFAULT_EDGES: EdgeData[] = [{ from: "registry-root", to: "resolvers" }]

const DEFAULT_MERMAID = serializeMermaid(DEFAULT_NODES, DEFAULT_EDGES)

const MODES: DiagramMode[] = ["light", "dark", "protocol"]

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
        options: ["draw", "fade", "pop", "none"],
        default: "draw",
      },
      stagger: [0.08, 0, 0.4, 0.01],
      spring: { type: "spring" as const, visualDuration: 0.4, bounce: 0.1 },
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

  const embedSnippet = useMemo(() => buildDocsEmbedSnippet(mermaid, mode), [mermaid, mode])

  useEffect(() => {
    replay()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animation.preset])

  const config: DiagramConfig = {
    mode,
    fontSize: nodes.fontSize,
    paddingH: nodes.paddingH,
    paddingV: nodes.paddingV,
    borderRadius: nodes.borderRadius,
    nestedRegistryBorderRadius: nodes.borderRadius + 18,
    borderWidth: nodes.borderWidth,
    nodeColor: palette.nodeColor,
    labelSurfaceFill: palette.labelSurfaceFill,
    labelSurfaceBorder: palette.labelSurfaceBorder,
    hatchBase: palette.hatchBase,
    hatchStripe1: palette.hatchStripe1,
    hatchStripe2: palette.hatchStripe2,
    labelFontSize: labels.fontSize,
    labelPaddingH: labels.paddingH,
    labelPaddingV: labels.paddingV,
    labelColor: palette.labelColor,
    resolverFontSize: resolver.fontSize,
    resolverPaddingH: resolver.paddingH,
    resolverPaddingV: resolver.paddingV,
    resolverBorderRadius: resolver.borderRadius,
    resolverBorderWidth: resolver.borderWidth,
    resolverColor: palette.resolverColor,
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
        alignItems: "stretch",
        overflowX: "auto",
      }}
    >
      <main
        className="app-main"
        style={{
          minWidth: 280,
          flex: "1 1 auto",
          minHeight: "100vh",
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
          nodes={parsed.nodes}
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
          height: "100vh",
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
        />
      </aside>
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
}

function MermaidInput({ value, onChange, error, chrome }: MermaidInputProps) {
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
          {error ? "parse error" : "[reg]  (plain)  ((hatched))  {dashed}"}
        </span>
      </div>
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
          Getting started with this editor
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
            This panel is a small Mermaid-style flowchart: each line is a node or an edge. The
            diagram updates as you type; invalid syntax shows a parse error in the header.
          </p>
          <p style={{ margin: "0 0 8px", fontWeight: 600, color: chrome.text, fontSize: 11 }}>
            Node shapes
          </p>
          <ul style={{ margin: "0 0 10px", paddingLeft: 18 }}>
            <li>
              <code style={{ color: chrome.text }}>id[label]</code> — registry (optional{" "}
              <code style={{ color: chrome.text }}>|slot1|slot2</code> for a hatched slot row)
            </li>
            <li>
              <code style={{ color: chrome.text }}>id(label)</code> — label pill
            </li>
            <li>
              <code style={{ color: chrome.text }}>id((label))</code> — hatched label
            </li>
            <li>
              <code style={{ color: chrome.text }}>{"id{label}"}</code> — dashed resolver
            </li>
          </ul>
          <p style={{ margin: "0 0 8px", fontWeight: 600, color: chrome.text, fontSize: 11 }}>
            Edges & routing
          </p>
          <ul style={{ margin: "0 0 10px", paddingLeft: 18 }}>
            <li>
              <code style={{ color: chrome.text }}>{"a --> b"}</code> — default orthogonal edge
            </li>
            <li>
              Add{" "}
              <code style={{ color: chrome.text }}># fromSlot=0 toSlot=1 route=vhv</code> on the
              line to pin arrows to hatched slot ports or change the elbow style.
            </li>
          </ul>
          <p style={{ margin: 0 }}>
            <strong style={{ color: chrome.text }}>Nested registries</strong> (one frame with
            child cards, as in the default diagram) are not expressible in this Mermaid subset —
            define them in code as <code style={{ color: chrome.text }}>NodeData.children</code>,
            or keep using the default source and adjust in the app bundle.
          </p>
        </div>
      </details>
    </div>
  )
}
