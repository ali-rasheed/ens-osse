import { motion } from "motion/react"
import type { Variants } from "motion/react"
import type { PositionedEdge } from "./types"

interface Props {
  edge: PositionedEdge
  variants: Variants
  preset: "draw" | "fade" | "pop" | "none"
  strokeWidth?: number
  dotRadius?: number
  color?: string
}

export function DiagramEdge({
  edge,
  variants,
  preset,
  strokeWidth = 1.5,
  dotRadius = 4,
  color = "#ffffff",
}: Props) {
  if (edge.points.length < 2) return null

  const start = edge.points[0]

  return (
    <g>
      <motion.circle
        variants={variants}
        cx={start.x}
        cy={start.y}
        r={dotRadius}
        fill={color}
      />
      <motion.path
        variants={variants}
        d={edge.d}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        markerEnd="url(#arrowhead)"
        {...(preset === "draw"
          ? { initial: { pathLength: 0 }, animate: { pathLength: 1 } }
          : {})}
      />
    </g>
  )
}

interface ArrowheadDefProps {
  strokeWidth?: number
  color?: string
}

export function ArrowheadDef({ strokeWidth = 1.5, color = "#ffffff" }: ArrowheadDefProps = {}) {
  return (
    <defs>
      <marker
        id="arrowhead"
        markerWidth={8}
        markerHeight={8}
        refX={4}
        refY={4}
        orient="auto"
      >
        <path d="M 0 1.5 L 4 4 L 0 6.5" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </marker>
    </defs>
  )
}
