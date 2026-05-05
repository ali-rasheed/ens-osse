import { useState, useEffect } from "react"
import { DialRoot, useDialKit } from "dialkit"
import "dialkit/styles.css"
import { RegistryDiagram } from "./components/RegistryDiagram"
import type {
  AnimationConfig,
  DiagramConfig,
} from "./components/RegistryDiagram/types"

const NODES = [
  { id: "root",     label: "<root>",      type: "registry" as const },
  { id: "eth-l",    label: "eth",          type: "label"    as const },
  { id: "eth-r",    label: "eth",          type: "registry" as const },
  { id: "left-l",   label: "eth",          type: "label"    as const },
  { id: "right-l",  label: "eth",          type: "label"    as const },
  { id: "workemon", label: "workemon.eth", type: "registry" as const },
  { id: "root2",    label: "<root>",       type: "registry" as const },
]

const EDGES = [
  { from: "root",    to: "eth-l"   },
  { from: "eth-l",   to: "eth-r"   },
  { from: "eth-r",   to: "left-l"  },
  { from: "eth-r",   to: "right-l" },
  { from: "left-l",  to: "workemon" },
  { from: "right-l", to: "root2"   },
]

export default function App() {
  const nodes = useDialKit("Nodes", {
    fontSize:     [16, 8, 40],
    paddingH:     [16, 4, 48],
    paddingV:     [10, 4, 32],
    borderRadius: [6, 0, 24],
    borderWidth:  [1.5, 0.5, 4, 0.5],
    color:        { type: "color" as const, default: "#ffffff" },
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

      <RegistryDiagram
        key={key}
        nodes={NODES}
        edges={EDGES}
        animation={animationConfig}
        config={config}
      />
    </div>
  )
}
