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

const DEFAULT_NODES: NodeData[] = [
  { id: "root",       label: "<root>",                type: "registry" },
  { id: "eth-l",      label: "eth",                   type: "label"    },
  { id: "eth-r",      label: "eth",                   type: "registry" },
  { id: "montoya-l1", label: "montoya",               type: "label"    },
  { id: "montoya-l2", label: "montoya",               type: "label"    },
  { id: "workemon",   label: "workemon.eth",          type: "registry" },
  { id: "resolver1",  label: "Resolver 1",            type: "dashed"   },
  { id: "delegate-l", label: "delegate",              type: "label"    },
  { id: "wallet-l",   label: "wallet",                type: "label"    },
  { id: "delegate-r", label: "delegate.workemon.eth", type: "registry" },
  { id: "wallet-r",   label: "wallet.workemon.eth",   type: "registry" },
]

const DEFAULT_EDGES: EdgeData[] = [
  { from: "root",       to: "eth-l"      },
  { from: "eth-l",      to: "eth-r"      },
  { from: "eth-r",      to: "montoya-l1" },
  { from: "eth-r",      to: "montoya-l2" },
  { from: "montoya-l1", to: "workemon"   },
  { from: "montoya-l2", to: "resolver1"  },
  { from: "workemon",   to: "delegate-l" },
  { from: "workemon",   to: "wallet-l"   },
  { from: "delegate-l", to: "delegate-r" },
  { from: "wallet-l",   to: "wallet-r"   },
]

const DEFAULT_MERMAID = serializeMermaid(DEFAULT_NODES, DEFAULT_EDGES)

export default function App() {
  const nodes = useDialKit("Nodes", {
    fontSize:     [16, 8, 40],
    paddingH:     [16, 4, 48],
    paddingV:     [10, 4, 32],
    borderRadius: [6, 0, 24],
    borderWidth:  [1.5, 0.5, 4, 0.5],
    color:        { type: "color" as const, default: "#ffffff" },
  })

  const labels = useDialKit("Labels", {
    fontSize: [14, 8, 32],
    paddingH: [8, 0, 32],
    paddingV: [4, 0, 24],
    color:    { type: "color" as const, default: "#cfcfcf" },
  })

  const edges = useDialKit("Edges", {
    strokeWidth:  [1.5, 0.5, 4, 0.5],
    cornerRadius: [10, 0, 48],
    dotRadius:    [4, 1, 10, 0.5],
    color:        { type: "color" as const, default: "#ffffff" },
  })

  const layout = useDialKit("Layout", {
    ranksep: [70, 20, 200],
    nodesep: [50, 10, 150],
  })

  const animation = useDialKit("Animation", {
    preset: {
      type: "select" as const,
      options: ["draw", "fade", "pop", "none"],
      default: "draw",
    },
    stagger: [0.08, 0, 0.4, 0.01],
    spring: { type: "spring" as const, visualDuration: 0.4, bounce: 0.1 },
  })

  const [mermaid, setMermaid] = useState(DEFAULT_MERMAID)
  const parsed = useMemo(() => parseMermaid(mermaid), [mermaid])

  // Re-mount the diagram when preset changes so entrance variants re-fire
  const [key, setKey] = useState(0)
  useEffect(() => {
    setKey((k) => k + 1)
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
      style={{
        minHeight: "100vh",
        background: "#0a0908",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
      }}
    >
      <DialRoot position="top-right" defaultOpen theme="dark" />

      <MermaidInput value={mermaid} onChange={setMermaid} error={parsed.error} />

      <RegistryDiagram
        key={key}
        nodes={parsed.nodes}
        edges={parsed.edges}
        animation={animationConfig}
        config={config}
      />
    </div>
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
        position: "fixed",
        left: 16,
        bottom: 16,
        width: 360,
        zIndex: 50,
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
          {error ? "parse error" : "[reg]  (label)  {dashed}"}
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
