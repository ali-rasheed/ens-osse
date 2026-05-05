import { useMemo } from "react"
import { motion } from "motion/react"
import type { Variants } from "motion/react"
import type { NodeData, EdgeData, AnimationConfig } from "./types"
import { computeLayout } from "./layout"
import { RegistryNode } from "./RegistryNode"
import { LabelNode } from "./LabelNode"
import { DiagramEdge, ArrowheadDef } from "./DiagramEdge"

interface Props {
  nodes: NodeData[]
  edges: EdgeData[]
  animation?: AnimationConfig
}

function buildVariants(
  preset: AnimationConfig["preset"],
  stagger: number,
  duration: number,
  nodeCount: number
): { container: Variants; node: Variants; edge: Variants } {
  const none: Variants = { hidden: {}, visible: {} }

  if (preset === "none") return { container: none, node: none, edge: none }

  const edgeDelay = nodeCount * stagger

  const container: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: stagger,
        delayChildren: 0,
      },
    },
  }

  const edgeContainer: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: stagger * 0.8,
        delayChildren: edgeDelay,
      },
    },
  }

  const nodeVariants: Record<string, Variants> = {
    fade: {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration } },
    },
    pop: {
      hidden: { opacity: 0, scale: 0.7 },
      visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 20 } },
    },
    draw: {
      hidden: { opacity: 0, scale: 0.85 },
      visible: { opacity: 1, scale: 1, transition: { duration: duration * 0.8 } },
    },
  }

  const edgeVariants: Record<string, Variants> = {
    fade: {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration } },
    },
    pop: {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: duration * 0.5 } },
    },
    draw: {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: duration * 0.3 } },
    },
  }

  const key = preset ?? "fade"
  return {
    container,
    node: nodeVariants[key] ?? nodeVariants.fade,
    edge: { ...edgeContainer, ...(edgeVariants[key] ?? edgeVariants.fade) },
  }
}

export function RegistryDiagram({ nodes, edges, animation = {} }: Props) {
  const { preset = "draw", stagger = 0.1, duration = 0.5 } = animation

  const layout = useMemo(() => computeLayout(nodes, edges), [nodes, edges])

  const sortedNodes = useMemo(
    () => [...layout.nodes].sort((a, b) => a.rank - b.rank || a.x - b.x),
    [layout.nodes]
  )

  const { container, node: nodeVariants, edge: edgeVariants } = useMemo(
    () => buildVariants(preset, stagger, duration, sortedNodes.length),
    [preset, stagger, duration, sortedNodes.length]
  )

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={container}
      style={{ position: "relative", width: layout.width, height: layout.height }}
    >
      {/* SVG overlay for edges */}
      <motion.svg
        variants={edgeVariants}
        style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}
        width={layout.width}
        height={layout.height}
      >
        <ArrowheadDef />
        {layout.edges.map((edge) => (
          <DiagramEdge
            key={`${edge.from}-${edge.to}`}
            edge={edge}
            variants={edgeVariants}
            preset={preset}
          />
        ))}
      </motion.svg>

      {/* Nodes */}
      {sortedNodes.map((node) =>
        node.type === "registry" ? (
          <RegistryNode
            key={node.id}
            label={node.label}
            x={node.x}
            y={node.y}
            width={node.width}
            height={node.height}
            variants={nodeVariants}
          />
        ) : (
          <LabelNode
            key={node.id}
            label={node.label}
            x={node.x}
            y={node.y}
            width={node.width}
            height={node.height}
            variants={nodeVariants}
          />
        )
      )}
    </motion.div>
  )
}
