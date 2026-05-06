import { motion } from "motion/react"
import type { Variants } from "motion/react"

interface Props {
  label: string
  x: number
  y: number
  width: number
  height: number
  variants: Variants
  delay?: number
  fontSize?: number
  paddingH?: number
  paddingV?: number
  borderRadius?: number
  borderWidth?: number
  color?: string
  /** Corner sockets; defaults to `color` when omitted. */
  socketColor?: string
  frameInset?: number
  radiusBonus?: number
  socketSize?: number
  dashLength?: number
  dashGap?: number
  /** Nested in a registry column: no absolute canvas positioning. */
  embedded?: boolean
}

export function DashedNode({
  label,
  x,
  y,
  width,
  height,
  variants,
  delay = 0,
  fontSize = 16,
  paddingH = 16,
  paddingV = 10,
  borderRadius = 6,
  borderWidth = 0.5,
  color = "#ffffff",
  socketColor,
  frameInset = 10,
  radiusBonus = 8,
  socketSize = 12,
  dashLength = 6,
  dashGap = 5,
  embedded = false,
}: Props) {
  const socketFill = socketColor ?? color
  const strokeInset = frameInset + borderWidth / 2
  const socketOffset = -socketSize / 2
  const socketMaxX = width - socketSize / 2
  const socketMaxY = height - socketSize / 2
  return (
    <motion.div
      variants={variants}
      custom={delay}
      style={{
        position: embedded ? "relative" : "absolute",
        left: embedded ? undefined : x,
        top: embedded ? undefined : y,
        width,
        height,
        transformOrigin: "0 0",
        alignSelf: embedded ? "center" : undefined,
      }}
    >
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}
      >
        <rect
          x={strokeInset}
          y={strokeInset}
          width={width - strokeInset * 2}
          height={height - strokeInset * 2}
          rx={borderRadius + radiusBonus}
          ry={borderRadius + radiusBonus}
          fill="none"
          stroke={color}
          strokeWidth={borderWidth}
          strokeDasharray={`${dashLength} ${dashGap}`}
          strokeLinecap="butt"
        />
        <rect x={socketOffset} y={socketOffset} width={socketSize} height={socketSize} fill={socketFill} />
        <rect x={socketMaxX} y={socketOffset} width={socketSize} height={socketSize} fill={socketFill} />
        <rect x={socketOffset} y={socketMaxY} width={socketSize} height={socketSize} fill={socketFill} />
        <rect
          x={socketMaxX}
          y={socketMaxY}
          width={socketSize}
          height={socketSize}
          fill={socketFill}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: `${paddingV}px ${paddingH}px`,
          fontFamily: "'ABC Monument Grotesk Semi-Mono', ui-monospace, monospace",
          fontWeight: 500,
          fontSize,
          letterSpacing: "0.05em",
          color,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
    </motion.div>
  )
}
