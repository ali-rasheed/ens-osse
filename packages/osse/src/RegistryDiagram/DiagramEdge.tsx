/**
 * SVG edge: dotted start, stroked path, chevron. Supports Mermaid link styles (solid, dotted,
 * open, thick) and mid-path edge labels. Arrowhead eases in after `arrowDelayOffset` unless
 * `instantArrowhead` (diagram preset `none` or system reduced motion).
 */
import { motion } from "motion/react"
import type { Variants } from "motion/react"
import type { PositionedEdge } from "./types"
import { buildPathPulseTransition } from "./pathPulseTiming"
import { buildArrowheadAnimation } from "./elementAnimations.jsx"
import { EDGE_LABEL, LINK_STYLES } from "./linkStyles"

interface Props {
  edge: PositionedEdge
  variants: Variants
  delay?: number
  strokeWidth?: number
  dotRadius?: number
  color?: string
  arrowDelayOffset?: number
  instantArrowhead?: boolean
  edgeLabelFill?: string
  edgeLabelBorder?: string
  edgeLabelColor?: string
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
  edgeLabelFill = "rgba(255,255,255,0.08)",
  edgeLabelBorder = "rgba(255,255,255,0.2)",
  edgeLabelColor = "#cfcfcf",
  pathPulse,
}: Props) {
  if (edge.points.length < 2) return null

  const linkDef = LINK_STYLES[edge.linkStyle ?? "solid"]
  const effectiveStrokeWidth = strokeWidth * (linkDef.strokeWidthMultiplier ?? 1)
  const showArrowhead = linkDef.arrowhead

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
  const arrowhead = showArrowhead ? getArrowheadPath(beforeEnd, end) : ""
  const arrow = buildArrowheadAnimation(delay, arrowDelayOffset, instantArrowhead)

  const labelPos = edge.label ? midpointAlongPolyline(edge.points) : null

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
        strokeWidth={effectiveStrokeWidth}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray={linkDef.strokeDasharray}
      />
      {pulseMotion && pathPulse ? (
        <motion.path
          initial={false}
          d={edge.d}
          stroke={pathPulse.highlightColor}
          strokeWidth={effectiveStrokeWidth * 1.75}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray={linkDef.strokeDasharray}
          animate={{ opacity: pulseMotion.opacity }}
          transition={pulseMotion.transition}
          style={{ pointerEvents: "none" }}
        />
      ) : null}
      {showArrowhead &&
        (instantArrowhead ? (
          <path
            d={arrowhead}
            stroke={color}
            strokeWidth={effectiveStrokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <motion.path
            initial={arrow.entry}
            animate={arrow.visible}
            exit={arrow.exit}
            transition={arrow.transition}
            d={arrowhead}
            stroke={color}
            strokeWidth={effectiveStrokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      {labelPos && edge.label ? (
        <EdgeLabelChip
          x={labelPos.x}
          y={labelPos.y}
          text={edge.label}
          fill={edgeLabelFill}
          border={edgeLabelBorder}
          color={edgeLabelColor}
          variants={variants}
          delay={delay}
        />
      ) : null}
    </g>
  )
}

function EdgeLabelChip({
  x,
  y,
  text,
  fill,
  border,
  color,
  variants,
  delay,
}: {
  x: number
  y: number
  text: string
  fill: string
  border: string
  color: string
  variants: Variants
  delay: number
}) {
  const padH = EDGE_LABEL.paddingH
  const padV = EDGE_LABEL.paddingV
  const fontSize = EDGE_LABEL.fontSize
  const textW = text.length * fontSize * 0.55
  const w = textW + padH * 2
  const h = fontSize * 1.4 + padV * 2
  const rx = EDGE_LABEL.borderRadius

  return (
    <motion.g variants={variants} custom={delay}>
      <rect
        x={x - w / 2}
        y={y - h / 2}
        width={w}
        height={h}
        rx={rx}
        ry={rx}
        fill={fill}
        stroke={border}
        strokeWidth={1}
      />
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize={fontSize}
        fontFamily="'ABC Monument Grotesk Semi-Mono', ui-monospace, monospace"
        letterSpacing={`${EDGE_LABEL.letterSpacing}em`}
      >
        {text}
      </text>
    </motion.g>
  )
}

function midpointAlongPolyline(points: { x: number; y: number }[]): { x: number; y: number } {
  if (points.length === 0) return { x: 0, y: 0 }
  if (points.length === 1) return points[0]
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
  }
  const half = total / 2
  let acc = 0
  for (let i = 1; i < points.length; i++) {
    const segLen = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
    if (acc + segLen >= half) {
      const t = segLen > 0 ? (half - acc) / segLen : 0
      return {
        x: points[i - 1].x + t * (points[i].x - points[i - 1].x),
        y: points[i - 1].y + t * (points[i].y - points[i - 1].y),
      }
    }
    acc += segLen
  }
  return points[points.length - 1]
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
