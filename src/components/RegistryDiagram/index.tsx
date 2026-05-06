import { forwardRef, useMemo } from "react"
import { motion } from "motion/react"
import type { NodeData, EdgeData, AnimationConfig, DiagramConfig } from "./types"
import {
  buildVariants,
  getArrowheadDelayOffset,
  resolveAnimationConfig,
} from "./animationConfig"
import { computeLayout, DIAGRAM_SYSTEM_EMBEDDED_RESOLVER } from "./layout"
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

export const RegistryDiagram = forwardRef<HTMLDivElement, Props>(function RegistryDiagram(
  { nodes, edges, animation = {}, config = {} },
  ref
) {
  const {
    fontSize = 16,
    paddingH = 16,
    paddingV = 10,
    borderRadius = 6,
    nestedRegistryBorderRadius = 24,
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
    labelBorderRadius = 12,
    labelLetterSpacing = 0.05,
    resolverFontSize = 16,
    resolverPaddingH = 16,
    resolverPaddingV = 10,
    resolverBorderRadius = 6,
    resolverBorderWidth = 0.5,
    resolverColor = "#ffffff",
    resolverLabelColor,
    resolverSurfaceFill = "transparent",
    resolverSocketColor,
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

  const { preset, stagger, spring, duration } = resolveAnimationConfig(animation)

  const layoutMetrics = useMemo(
    () => ({
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

  const nestedDashedProps = useMemo(() => {
    const e = DIAGRAM_SYSTEM_EMBEDDED_RESOLVER
    return {
      /** Mono size aligned with sibling owner lines in nested registry (`labelFontSize`). */
      fontSize: labelFontSize,
      paddingH: e.paddingH,
      paddingV: e.paddingV,
      borderRadius: e.borderRadius,
      borderWidth: e.borderWidth,
      color: resolverColor,
      textColor: resolverLabelColor ?? resolverColor,
      surfaceFill: resolverSurfaceFill,
      socketColor: resolverSocketColor,
      frameInset: e.frameInset,
      radiusBonus: e.radiusBonus,
      socketSize: e.socketSize,
      dashLength: e.dashLength,
      dashGap: e.dashGap,
    }
  }, [
    labelFontSize,
    resolverColor,
    resolverLabelColor,
    resolverSurfaceFill,
    resolverSocketColor,
  ])

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
  const arrowDelayOffset = getArrowheadDelayOffset(preset, duration)

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
          labelColor: resolverLabelColor ?? resolverColor,
          surfaceFill: resolverSurfaceFill,
          socketColor: resolverSocketColor,
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
              nestedBorderRadius={nestedRegistryBorderRadius}
              slots={node.slots}
              children={node.children}
              registryFrame={node.registryFrame}
              slotFontSize={labelFontSize}
              slotPaddingH={labelPaddingH}
              slotPaddingV={labelPaddingV}
              slotColor={labelColor}
              hatchBase={hatchBase}
              hatchStripe1={hatchStripe1}
              hatchStripe2={hatchStripe2}
              layoutOptions={layoutMetrics}
              nestedDashed={nestedDashedProps}
              labelSurfaceFill={surface.surfaceFill}
              labelSurfaceBorder={surface.surfaceBorder}
              labelBorderRadius={labelBorderRadius}
              labelLetterSpacing={labelLetterSpacing}
              slotsFont={node.slotsFont ?? "marist"}
            />
          )
        if (node.type === "dashed")
          return <DashedNode {...props} {...resolverStyled} stackDepth={node.stackDepth} />
        return (
          <LabelNode
            {...props}
            hatched={node.type === "labelHatched"}
            typography={node.labelFont ?? "marist"}
            fontSize={labelFontSize}
            paddingH={labelPaddingH}
            paddingV={labelPaddingV}
            color={labelColor}
            surfaceFill={surface.surfaceFill}
            surfaceBorder={surface.surfaceBorder}
            hatchBase={surface.hatchBase}
            hatchStripe1={surface.hatchStripe1}
            hatchStripe2={surface.hatchStripe2}
            borderRadius={labelBorderRadius}
            letterSpacingEm={labelLetterSpacing}
          />
        )
      })}
    </motion.div>
  )
})

RegistryDiagram.displayName = "RegistryDiagram"
