import { useState, useEffect, useMemo } from "react"
import { DialRoot, useDialKit } from "dialkit"
import "dialkit/styles.css"
import { RegistryDiagram } from "./components/RegistryDiagram"
import type {
  AnimationConfig,
  DiagramConfig,
  NodeData,
  EdgeData,
} from "./components/RegistryDiagram/types"
import { parseMermaid, serializeMermaid } from "./lib/mermaid"

/** Default graph uses compound registry nodes + slot arrow anchors (Figma Diagram System). */
const DEFAULT_NODES: NodeData[] = [
  { id: "root", label: "<root>", type: "registry", slots: ["eth"] },
  { id: "eth-r", label: "eth", type: "registry", slots: ["workemon"] },
  { id: "workemon", label: "workemon.eth", type: "registry", slots: ["delegate", "wallet"] },
  { id: "resolver1", label: "Resolver 1", type: "dashed" },
  { id: "delegate-r", label: "delegate.workemon.eth", type: "registry" },
  { id: "wallet-r", label: "wallet.workemon.eth", type: "registry" },
  { id: "wallet-child", label: "delegate", type: "labelHatched" },
]

const DEFAULT_EDGES: EdgeData[] = [
  { from: "root", to: "eth-r", fromSlotIndex: 0 },
  { from: "eth-r", to: "workemon", fromSlotIndex: 0 },
  { from: "eth-r", to: "resolver1", fromSlotIndex: 0 },
  { from: "workemon", to: "delegate-r", fromSlotIndex: 0 },
  { from: "workemon", to: "wallet-r", fromSlotIndex: 1 },
  { from: "wallet-r", to: "wallet-child" },
]

const DEFAULT_MERMAID = serializeMermaid(DEFAULT_NODES, DEFAULT_EDGES)

export default function App() {
  const nodes = useDialKit("Nodes", {
    fontSize:     [16, 8, 40],
    paddingH:     [16, 4, 48],
    paddingV:     [10, 4, 32],
    borderRadius: [6, 0, 24],
    borderWidth:  [0.5, 0.5, 4, 0.5],
    color:        { type: "color" as const, default: "#ffffff" },
  })

  const labels = useDialKit("Labels", {
    fontSize: [14, 8, 32],
    paddingH: [8, 0, 32],
    paddingV: [12, 0, 24],
    color:    { type: "color" as const, default: "#ffffff" },
  })

  const resolver = useDialKit("Resolver", {
    fontSize:       [17, 8, 40],
    paddingH:       [30, 0, 120],
    paddingV:       [15, 0, 80],
    borderRadius:   [19, 0, 40],
    borderWidth:    [0.5, 0.5, 4, 0.5],
    color:          { type: "color" as const, default: "#ffffff" },
    frameInset:     [0, 0, 40],
    radiusBonus:    [0, 0, 32],
    socketSize:     [4, 0, 32],
    socketOverhang: [0, 0, 20],
    minWidth:       [140, 120, 600],
    minHeight:      [50, 48, 300],
    dashLength:     [5, 1, 32],
    dashGap:        [6, 1, 32],
  })

  const edges = useDialKit("Edges", {
    strokeWidth:  [1, 0.5, 4, 0.5],
    cornerRadius: [17, 0, 48],
    dotRadius:    [3.5, 1, 10, 0.5],
    color:        { type: "color" as const, default: "#ffffff" },
  })

  const layout = useDialKit("Layout", {
    ranksep: [70, 20, 200],
    nodesep: [50, 10, 150],
  })

  // Re-mount the diagram to re-fire entrance variants
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

  useEffect(() => {
    replay()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animation.preset])

  const config: DiagramConfig = {
    fontSize:     nodes.fontSize,
    paddingH:     nodes.paddingH,
    paddingV:     nodes.paddingV,
    borderRadius: nodes.borderRadius,
    borderWidth:  nodes.borderWidth,
    nodeColor:    nodes.color,
    labelFontSize: labels.fontSize,
    labelPaddingH: labels.paddingH,
    labelPaddingV: labels.paddingV,
    labelColor:    labels.color,
    resolverFontSize:       resolver.fontSize,
    resolverPaddingH:       resolver.paddingH,
    resolverPaddingV:       resolver.paddingV,
    resolverBorderRadius:   resolver.borderRadius,
    resolverBorderWidth:    resolver.borderWidth,
    resolverColor:          resolver.color,
    resolverFrameInset:     resolver.frameInset,
    resolverRadiusBonus:    resolver.radiusBonus,
    resolverSocketSize:     resolver.socketSize,
    resolverSocketOverhang: resolver.socketOverhang,
    resolverMinWidth:       resolver.minWidth,
    resolverMinHeight:      resolver.minHeight,
    resolverDashLength:     resolver.dashLength,
    resolverDashGap:        resolver.dashGap,
    strokeWidth:  edges.strokeWidth,
    cornerRadius: edges.cornerRadius,
    dotRadius:    edges.dotRadius,
    edgeColor:    edges.color,
    ranksep:      layout.ranksep,
    nodesep:      layout.nodesep,
  }

  const animationConfig: AnimationConfig = {
    preset: animation.preset as AnimationConfig["preset"],
    stagger: animation.stagger,
    spring: animation.spring,
  }

  return (
    <div
      className="app-shell"
      style={{
        minHeight: "100vh",
        background: "#0a0908",
        display: "flex",
        alignItems: "stretch",
        overflowX: "auto",
      }}
    >
      <main
        className="app-main"
        style={{
          /* Do not use minWidth: 0 here — beside a fixed-width aside it collapses the diagram to a sliver on narrow viewports. */
          minWidth: 280,
          flex: "1 1 auto",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
          paddingRight: 24,
          overflow: "auto",
        }}
      >
        <RegistryDiagram
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
          background: "rgba(12, 12, 12, 0.96)",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "-16px 0 40px rgba(0,0,0,0.32)",
        }}
      >
        <ReplayButton onClick={replay} />
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
          <DialRoot mode="inline" defaultOpen theme="dark" />
        </div>
        <MermaidInput value={mermaid} onChange={setMermaid} error={parsed.error} />
      </aside>
    </div>
  )
}

function ReplayButton({ onClick }: { onClick: () => void }) {
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
        background: "rgba(18, 18, 18, 0.92)",
        color: "#e5e5e5",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 8,
        backdropFilter: "blur(8px)",
        boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
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
}

function MermaidInput({ value, onChange, error }: MermaidInputProps) {
  return (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        zIndex: 80,
        width: "100%",
        flexShrink: 0,
        background: "rgba(18, 18, 18, 0.92)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 10,
        backdropFilter: "blur(8px)",
        boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
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
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          color: "#e5e5e5",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: 0.2,
        }}
      >
        <span>Mermaid</span>
        <span
          style={{
            color: error ? "#ff8a8a" : "rgba(255,255,255,0.4)",
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
        style={{
          display: "block",
          width: "100%",
          height: 240,
          background: "transparent",
          color: "#e5e5e5",
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
    </div>
  )
}
