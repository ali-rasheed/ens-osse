/**
 * SVG edge: dotted start, stroked path, chevron. Arrowhead eases in after `arrowDelayOffset`
 * unless `instantArrowhead` (diagram preset `none` or system reduced motion).
 */
import { motion } from "motion/react"
import type { Variants } from "motion/react"
import type { PositionedEdge } from "./types"
import { buildPathPulseTransition } from "./pathPulseTiming"

/** ease-out-quart — responsive start for UI reveals */
const ARROWHEAD_EASE: [number, number, number, number] = [0.165, 0.84, 0.44, 1]

interface Props {
  edge: PositionedEdge
  variants: Variants
  delay?: number
  strokeWidth?: number
  dotRadius?: number
  color?: string
  arrowDelayOffset?: number
  instantArrowhead?: boolean
  /** Tail-node–synced stroke overlay; does not use entrance `variants`. */
  pathPulse?: {
    active: boolean
    pathIndex: number
    pathLength: number
    stagger: number
    segmentDuration: number
    hold: number
    highlightColor: string
  }
}

export function DiagramEdge({
  edge,
  variants,
  delay = 0,
  strokeWidth = 1.5,
  dotRadius = 4,
  color = "#ffffff",
  arrowDelayOffset = 0,
  instantArrowhead = false,
  pathPulse,
}: Props) {
  if (edge.points.length < 2) return null

  const edgePulse =
    pathPulse &&
    pathPulse.active &&
    pathPulse.pathIndex >= 0 &&
    pathPulse.pathLength >= 1
  const pulseMotion = edgePulse
    ? buildPathPulseTransition(
        pathPulse.pathIndex,
        pathPulse.pathLength,
        pathPulse.stagger,
        pathPulse.segmentDuration,
        pathPulse.hold
      )
    : null

  const start = edge.points[0]
  const end = edge.points[edge.points.length - 1]
  const beforeEnd = edge.points[edge.points.length - 2]
  const arrowhead = getArrowheadPath(beforeEnd, end)

  return (
    <g>
      <motion.circle
        variants={variants}
        custom={delay}
        cx={start.x}
        cy={start.y}
        r={dotRadius}
        fill={color}
      />
      <motion.path
        variants={variants}
        custom={delay}
        d={edge.d}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {pulseMotion && pathPulse ? (
        <motion.path
          initial={false}
          d={edge.d}
          stroke={pathPulse.highlightColor}
          strokeWidth={strokeWidth * 1.75}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
          animate={{ opacity: pulseMotion.opacity }}
          transition={pulseMotion.transition}
          style={{ pointerEvents: "none" }}
        />
      ) : null}
      {instantArrowhead ? (
        <path
          d={arrowhead}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <motion.path
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 0.1,
            delay: delay + arrowDelayOffset,
            ease: ARROWHEAD_EASE,
          }}
          d={arrowhead}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </g>
  )
}

function getArrowheadPath(
  from: { x: number; y: number },
  tip: { x: number; y: number }
): string {
  const dx = tip.x - from.x
  const dy = tip.y - from.y
  const length = Math.hypot(dx, dy) || 1
  const ux = dx / length
  const uy = dy / length
  const px = -uy
  const py = ux
  const arrowLength = 4
  const arrowSpread = 2.5
  const baseX = tip.x - ux * arrowLength
  const baseY = tip.y - uy * arrowLength
  const leftX = baseX + px * arrowSpread
  const leftY = baseY + py * arrowSpread
  const rightX = baseX - px * arrowSpread
  const rightY = baseY - py * arrowSpread

  return `M ${leftX} ${leftY} L ${tip.x} ${tip.y} L ${rightX} ${rightY}`
}

interface ArrowheadDefProps {
  strokeWidth?: number
  color?: string
}

export function ArrowheadDef(_props: ArrowheadDefProps = {}) {
  return null
}
