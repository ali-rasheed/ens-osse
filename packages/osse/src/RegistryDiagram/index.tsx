import { forwardRef, useMemo } from "react"
import { motion, useReducedMotion } from "motion/react"
import type {
  NodeData,
  EdgeData,
  AnimationConfig,
  DiagramConfig,
  PathPulseConfig,
} from "./types"
import { DEFAULT_PATH_PULSE_HIGHLIGHT } from "./theme"
import { findDirectedPath } from "./findDirectedPath"
import {
  buildVariants,
  getArrowheadDelayOffset,
  resolveAnimationConfig,
} from "./animationConfig"
import { computeLayout } from "./layout"
import type { GraphDirection } from "../mermaid"
import { RegistryNode } from "./RegistryNode"
import { PillNode } from "./PillNode"
import { ResolverNode } from "./ResolverNode"
import { DiagramEdge, ArrowheadDef } from "./DiagramEdge"

interface Props {
  nodes: NodeData[]
  edges: EdgeData[]
  animation?: AnimationConfig
  config?: DiagramConfig
  /** Dagre rank direction from parsed Mermaid `graph TD|LR|…`. */
  direction?: GraphDirection
  /** Directed shortest-path pulse; disabled when `prefers-reduced-motion` is set. */
  pathPulse?: PathPulseConfig | null
}

export const RegistryDiagram = forwardRef<HTMLDivElement, Props>(function RegistryDiagram(
  { nodes, edges, animation = {}, config = {}, direction, pathPulse = null },
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
    primaryLetterSpacing = 0.05,
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
    edgeLabelFill,
    edgeLabelBorder,
    edgeLabelColor,
    ranksep = 70,
    nodesep = 50,
  } = config

  const { preset, stagger, spring, duration } = resolveAnimationConfig(animation)
  const prefersReducedMotion = useReducedMotion() === true
  /** Empty variants + instant arrow; also used when `prefers-reduced-motion` is set. */
  const displayPreset = prefersReducedMotion ? "none" : preset

  const resolvedEdgeLabelFill = edgeLabelFill ?? labelSurfaceFill ?? "rgba(255,255,255,0.08)"
  const resolvedEdgeLabelBorder = edgeLabelBorder ?? labelSurfaceBorder ?? "rgba(255,255,255,0.2)"
  const resolvedEdgeLabelColor = edgeLabelColor ?? labelColor

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

  const nestedResolverProps = useMemo(
    () => ({
      fontSize: resolverFontSize,
      paddingH: resolverPaddingH,
      paddingV: resolverPaddingV,
      borderRadius: resolverBorderRadius,
      borderWidth: resolverBorderWidth,
      color: resolverColor,
      surfaceFill: resolverSurfaceFill,
      socketColor: resolverSocketColor,
      frameInset: resolverFrameInset,
      radiusBonus: resolverRadiusBonus,
      socketSize: resolverSocketSize,
      dashLength: resolverDashLength,
      dashGap: resolverDashGap,
    }),
    [
      resolverFontSize,
      resolverPaddingH,
      resolverPaddingV,
      resolverBorderRadius,
      resolverBorderWidth,
      resolverColor,
      resolverLabelColor,
      resolverSurfaceFill,
      resolverSocketColor,
      resolverFrameInset,
      resolverRadiusBonus,
      resolverSocketSize,
      resolverDashLength,
      resolverDashGap,
    ]
  )

  const pathResult = useMemo(() => {
    if (!pathPulse) return null
    const from = pathPulse.from.trim()
    const to = pathPulse.to.trim()
    if (!from || !to) return null
    return findDirectedPath(edges, from, to)
  }, [pathPulse, edges])

  const pathLen = pathResult?.nodeIds.length ?? 0
  const pulseActive = Boolean(
    pathPulse && pathResult && pathLen > 0 && !prefersReducedMotion
  )
  const pulseHighlight =
    pathPulse?.highlightColor?.trim() || DEFAULT_PATH_PULSE_HIGHLIGHT
  const pulseHold = pathPulse?.hold ?? 0
  const pulseIncludeEdges = pathPulse?.includeEdges !== false

  const nodePathIndex = useMemo(() => {
    const m = new Map<string, number>()
    if (!pathResult) return m
    pathResult.nodeIds.forEach((id, i) => m.set(id, i))
    return m
  }, [pathResult])

  const edgePulseTailIndex = useMemo(() => {
    const m = new Map<number, number>()
    if (!pathResult) return m
    pathResult.edgeIndices.forEach((ei, segIdx) => {
      m.set(ei, segIdx + 1)
    })
    return m
  }, [pathResult])

  const layout = useMemo(
    () =>
      computeLayout(nodes, edges, {
        ranksep,
        nodesep,
        cornerRadius,
        direction,
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
      direction,
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
  const arrowDelayOffset = getArrowheadDelayOffset(displayPreset, duration)

  const { node: nodeVariants, edge: edgeVariants } = useMemo(
    () => buildVariants(displayPreset, spring, duration),
    [displayPreset, spring, duration]
  )
  const instantArrowhead = displayPreset === "none"

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

  function nodePathPulseProps(nodeId: string) {
    if (!pulseActive || !pathPulse) return undefined
    const pathIndex = nodePathIndex.get(nodeId) ?? -1
    if (pathIndex < 0) return undefined
    return {
      active: true as const,
      pathIndex,
      pathLength: pathLen,
      stagger: pathPulse.stagger,
      segmentDuration: pathPulse.segmentDuration,
      hold: pulseHold,
      highlightColor: pulseHighlight,
    }
  }

  function edgePathPulseProps(edgeIdx: number) {
    if (!pulseActive || !pathPulse || !pulseIncludeEdges) return undefined
    const pathIndex = edgePulseTailIndex.get(edgeIdx) ?? -1
    if (pathIndex < 0) return undefined
    return {
      active: true as const,
      pathIndex,
      pathLength: pathLen,
      stagger: pathPulse.stagger,
      segmentDuration: pathPulse.segmentDuration,
      hold: pulseHold,
      highlightColor: pulseHighlight,
    }
  }

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
        {layout.edges.map((edge, edgeIdx) => (
          <DiagramEdge
            key={`${edge.from}-${edge.to}-${edgeIdx}`}
            edge={edge}
            variants={edgeVariants}
            delay={edgeDelay(edge.from)}
            strokeWidth={strokeWidth}
            dotRadius={dotRadius}
            color={edgeColor}
            arrowDelayOffset={arrowDelayOffset}
            instantArrowhead={instantArrowhead}
            pathPulse={edgePathPulseProps(edgeIdx)}
            edgeLabelFill={resolvedEdgeLabelFill}
            edgeLabelBorder={resolvedEdgeLabelBorder}
            edgeLabelColor={resolvedEdgeLabelColor}
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
          titleColor: resolverLabelColor ?? resolverColor,
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
          title: node.title,
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
              bodyLines={node.bodyLines}
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
              nestedResolver={nestedResolverProps}
              labelSurfaceFill={surface.surfaceFill}
              labelSurfaceBorder={surface.surfaceBorder}
              labelBorderRadius={labelBorderRadius}
              labelLetterSpacing={labelLetterSpacing}
              primaryLetterSpacing={primaryLetterSpacing}
              slotsFont={node.slotsFont ?? "marist"}
              pathPulse={nodePathPulseProps(node.id)}
            />
          )
        if (node.type === "resolver")
          return (
            <ResolverNode
              {...props}
              {...resolverStyled}
              stackDepth={node.stackDepth}
              pathPulse={nodePathPulseProps(node.id)}
            />
          )
        return (
          <PillNode
            {...props}
            hatched={node.hatched === true}
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
            pathPulse={nodePathPulseProps(node.id)}
          />
        )
      })}
    </motion.div>
  )
})

RegistryDiagram.displayName = "RegistryDiagram"
