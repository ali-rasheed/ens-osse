import { motion } from "motion/react"
import type { Variants } from "motion/react"
import type { PositionedEdge } from "./types"

interface Props {
  edge: PositionedEdge
  variants: Variants
  delay?: number
  strokeWidth?: number
  dotRadius?: number
  color?: string
  arrowDelayOffset?: number
}

export function DiagramEdge({
  edge,
  variants,
  delay = 0,
  strokeWidth = 1.5,
  dotRadius = 4,
  color = "#ffffff",
  arrowDelayOffset = 0,
}: Props) {
  if (edge.points.length < 2) return null

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
      />
      <motion.path
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.01, delay: delay + arrowDelayOffset }}
        d={arrowhead}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
