import { forwardRef, useMemo } from "react"
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
  spring: Transition | undefined,
  duration: number
): { node: Variants; edge: Variants } {
  const none: Variants = { hidden: {}, visible: {} }
  if (preset === "none") return { node: none, edge: none }

  const nodeTransition: Transition =
    spring ?? { type: "spring", visualDuration: 0.4, bounce: 0.1 }

  const nodeByPreset: Record<string, Variants> = {
    fade: {
      hidden: { opacity: 0 },
      visible: (delay: number) => ({
        opacity: 1,
        transition: { duration, delay },
      }),
    },
    pop: {
      hidden: { opacity: 0, scale: 0.7 },
      visible: (delay: number) => ({
        opacity: 1,
        scale: 1,
        transition: { ...nodeTransition, delay },
      }),
    },
    draw: {
      hidden: { opacity: 0, scale: 0.85 },
      visible: (delay: number) => ({
        opacity: 1,
        scale: 1,
        transition: { ...nodeTransition, delay },
      }),
    },
  }

  const drawDuration = Math.max(duration * 0.6, 0.25)
  const edgeByPreset: Record<string, Variants> = {
    fade: {
      hidden: { opacity: 0 },
      visible: (delay: number) => ({
        opacity: 1,
        transition: { duration, delay },
      }),
    },
    pop: {
      hidden: { opacity: 0 },
      visible: (delay: number) => ({
        opacity: 1,
        transition: { duration: duration * 0.5, delay },
      }),
    },
    draw: {
      hidden: { opacity: 0, pathLength: 0 },
      visible: (delay: number) => ({
        opacity: 1,
        pathLength: 1,
        transition: {
          opacity: { duration: duration * 0.2, delay },
          pathLength: { duration: drawDuration, delay },
          default: { duration: drawDuration, delay },
        },
      }),
    },
  }

  const key = preset ?? "fade"
  return {
    node: nodeByPreset[key] ?? nodeByPreset.fade,
    edge: edgeByPreset[key] ?? edgeByPreset.fade,
  }
}

export const RegistryDiagram = forwardRef<HTMLDivElement, Props>(function RegistryDiagram(
  { nodes, edges, animation = {}, config = {} },
  ref
) {
  const {
    fontSize = 16,
    paddingH = 16,
    paddingV = 10,
    borderRadius = 6,
    borderWidth = 1.5,
    nodeColor = "#ffffff",
    labelSurfaceFill,
    labelSurfaceBorder,
    hatchBase,
    hatchStripe1,
    hatchStripe2,
    labelFontSize = 14,
    labelPaddingH = 8,
    labelPaddingV = 4,
    labelColor = "#cfcfcf",
    resolverFontSize = 16,
    resolverPaddingH = 16,
    resolverPaddingV = 10,
    resolverBorderRadius = 6,
    resolverBorderWidth = 0.5,
    resolverColor = "#ffffff",
    resolverFrameInset = 10,
    resolverRadiusBonus = 8,
    resolverSocketSize = 12,
    resolverSocketOverhang = 6,
    resolverMinWidth = 291,
    resolverMinHeight = 115,
    resolverDashLength = 6,
    resolverDashGap = 5,
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
        resolverFontSize,
        resolverPaddingH,
        resolverPaddingV,
        resolverBorderWidth,
        resolverSocketOverhang,
        resolverMinWidth,
        resolverMinHeight,
        labelFontSize,
        labelPaddingH,
        labelPaddingV,
      }),
    [
      nodes,
      edges,
      ranksep,
      nodesep,
      cornerRadius,
      fontSize,
      paddingH,
      paddingV,
      borderWidth,
      resolverFontSize,
      resolverPaddingH,
      resolverPaddingV,
      resolverBorderWidth,
      resolverSocketOverhang,
      resolverMinWidth,
      resolverMinHeight,
      labelFontSize,
      labelPaddingH,
      labelPaddingV,
    ]
  )

  const sortedNodes = useMemo(
    () => [...layout.nodes].sort((a, b) => a.rank - b.rank || a.x - b.x),
    [layout.nodes]
  )

  // Interleave timing: each rank gets two beats — its nodes, then the edges
  // leaving them. So the sequence reads node → arrow → node → arrow.
  const rankById = useMemo(
    () => new Map(layout.nodes.map((n) => [n.id, n.rank])),
    [layout.nodes]
  )

  const nodeDelay = (rank: number) => rank * 2 * stagger
  const edgeDelay = (fromId: string) =>
    ((rankById.get(fromId) ?? 0) * 2 + 1) * stagger
  const arrowDelayOffset =
    preset === "draw"
      ? Math.max(duration * 0.6, 0.25)
      : preset === "pop"
        ? duration * 0.5
        : preset === "none"
          ? 0
          : duration

  const { node: nodeVariants, edge: edgeVariants } = useMemo(
    () => buildVariants(preset, spring, duration),
    [preset, spring, duration]
  )

  const surface = {
    surfaceFill: labelSurfaceFill,
    surfaceBorder: labelSurfaceBorder,
    hatchBase,
    hatchStripe1,
    hatchStripe2,
  }

  /** Integer box avoids subpixel foreignObject/border drift in PNG export; dagre coords stay as-is inside. */
  const canvasW = Math.ceil(layout.width)
  const canvasH = Math.ceil(layout.height)

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate="visible"
      style={{
        position: "relative",
        width: canvasW,
        height: canvasH,
        transformOrigin: "0 0",
      }}
    >
      <svg
        style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}
        width={canvasW}
        height={canvasH}
      >
        <ArrowheadDef strokeWidth={strokeWidth} color={edgeColor} />
        {layout.edges.map((edge) => (
          <DiagramEdge
            key={`${edge.from}-${edge.to}`}
            edge={edge}
            variants={edgeVariants}
            delay={edgeDelay(edge.from)}
            strokeWidth={strokeWidth}
            dotRadius={dotRadius}
            color={edgeColor}
            arrowDelayOffset={arrowDelayOffset}
          />
        ))}
      </svg>

      {sortedNodes.map((node) => {
        const styled = {
          fontSize,
          paddingH,
          paddingV,
          borderRadius,
          borderWidth,
          color: nodeColor,
        }
        const resolverStyled = {
          fontSize: resolverFontSize,
          paddingH: resolverPaddingH,
          paddingV: resolverPaddingV,
          borderRadius: resolverBorderRadius,
          borderWidth: resolverBorderWidth,
          color: resolverColor,
          frameInset: resolverFrameInset,
          radiusBonus: resolverRadiusBonus,
          socketSize: resolverSocketSize,
          dashLength: resolverDashLength,
          dashGap: resolverDashGap,
        }
        const props = {
          key: node.id,
          label: node.label,
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
          variants: nodeVariants,
          delay: nodeDelay(node.rank),
        }
        if (node.type === "registry")
          return (
            <RegistryNode
              {...props}
              {...styled}
              slots={node.slots}
              slotFontSize={labelFontSize}
              slotPaddingH={labelPaddingH}
              slotPaddingV={labelPaddingV}
              slotColor={labelColor}
              hatchBase={hatchBase}
              hatchStripe1={hatchStripe1}
              hatchStripe2={hatchStripe2}
            />
          )
        if (node.type === "dashed") return <DashedNode {...props} {...resolverStyled} />
        return (
          <LabelNode
            {...props}
            hatched={node.type === "labelHatched"}
            fontSize={labelFontSize}
            paddingH={labelPaddingH}
            paddingV={labelPaddingV}
            color={labelColor}
            surfaceFill={surface.surfaceFill}
            surfaceBorder={surface.surfaceBorder}
            hatchBase={surface.hatchBase}
            hatchStripe1={surface.hatchStripe1}
            hatchStripe2={surface.hatchStripe2}
          />
        )
      })}
    </motion.div>
  )
})

RegistryDiagram.displayName = "RegistryDiagram"
