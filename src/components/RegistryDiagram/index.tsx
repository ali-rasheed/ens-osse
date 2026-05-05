import { useMemo } from "react"
import { motion } from "motion/react"
import type { Variants, Transition } from "motion/react"
import type { NodeData, EdgeData, AnimationConfig, DiagramConfig } from "./types"
import { computeLayout } from "./layout"
import { RegistryNode } from "./RegistryNode"
import { LabelNode } from "./LabelNode"
import { DashedNode } from "./DashedNode"
import { DiagramEdge, ArrowheadDef } from "./DiagramEdge"

interface Props {
  nodes: NodeData[]
  edges: EdgeData[]
  animation?: AnimationConfig
  config?: DiagramConfig
}

function buildVariants(
  preset: AnimationConfig["preset"],
  stagger: number,
  spring: Transition | undefined,
  duration: number,
  nodeCount: number
): { container: Variants; node: Variants; edge: Variants } {
  const none: Variants = { hidden: {}, visible: {} }
  if (preset === "none") return { container: none, node: none, edge: none }

  const edgeDelay = nodeCount * stagger
  const nodeTransition: Transition =
    spring ?? { type: "spring", visualDuration: 0.4, bounce: 0.1 }

  const container: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: stagger, delayChildren: 0 } },
  }

  const edgeContainer: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: stagger * 0.8, delayChildren: edgeDelay },
    },
  }

  const nodeVariants: Record<string, Variants> = {
    fade: {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration } },
    },
    pop: {
      hidden: { opacity: 0, scale: 0.7 },
      visible: { opacity: 1, scale: 1, transition: nodeTransition },
    },
    draw: {
      hidden: { opacity: 0, scale: 0.85 },
      visible: { opacity: 1, scale: 1, transition: nodeTransition },
    },
  }

  const edgeVariants: Record<string, Variants> = {
    fade: { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration } } },
    pop: { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: duration * 0.5 } } },
    draw: { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: duration * 0.3 } } },
  }

  const key = preset ?? "fade"
  return {
    container,
    node: nodeVariants[key] ?? nodeVariants.fade,
    edge: { ...edgeContainer, ...(edgeVariants[key] ?? edgeVariants.fade) },
  }
}

export function RegistryDiagram({ nodes, edges, animation = {}, config = {} }: Props) {
  const {
    fontSize = 16,
    paddingH = 16,
    paddingV = 10,
    borderRadius = 6,
    borderWidth = 1.5,
    nodeColor = "#ffffff",
    strokeWidth = 1.5,
    cornerRadius = 10,
    dotRadius = 4,
    edgeColor = "#ffffff",
    ranksep = 70,
    nodesep = 50,
  } = config

  const { preset = "draw", stagger = 0.08, spring, duration = 0.5 } = animation

  const layout = useMemo(
    () =>
      computeLayout(nodes, edges, {
        ranksep,
        nodesep,
        cornerRadius,
        fontSize,
        paddingH,
        paddingV,
        borderWidth,
      }),
    [nodes, edges, ranksep, nodesep, cornerRadius, fontSize, paddingH, paddingV, borderWidth]
  )

  const sortedNodes = useMemo(
    () => [...layout.nodes].sort((a, b) => a.rank - b.rank || a.x - b.x),
    [layout.nodes]
  )

  const { container, node: nodeVariants, edge: edgeVariants } = useMemo(
    () => buildVariants(preset, stagger, spring, duration, sortedNodes.length),
    [preset, stagger, spring, duration, sortedNodes.length]
  )

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={container}
      style={{ position: "relative", width: layout.width, height: layout.height }}
    >
      <motion.svg
        variants={edgeVariants}
        style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}
        width={layout.width}
        height={layout.height}
      >
        <ArrowheadDef strokeWidth={strokeWidth} color={edgeColor} />
        {layout.edges.map((edge) => (
          <DiagramEdge
            key={`${edge.from}-${edge.to}`}
            edge={edge}
            variants={edgeVariants}
            preset={preset}
            strokeWidth={strokeWidth}
            dotRadius={dotRadius}
            color={edgeColor}
          />
        ))}
      </motion.svg>

      {sortedNodes.map((node) => {
        const styled = {
          fontSize,
          paddingH,
          paddingV,
          borderRadius,
          borderWidth,
          color: nodeColor,
        }
        const props = {
          key: node.id,
          label: node.label,
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
          variants: nodeVariants,
        }
        if (node.type === "registry") return <RegistryNode {...props} {...styled} />
        if (node.type === "dashed") return <DashedNode {...props} {...styled} />
        return <LabelNode {...props} />
      })}
    </motion.div>
  )
}
