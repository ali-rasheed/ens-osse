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
}

const DASH_PATTERN = "6 5"
const SOCKET = 5

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
  borderWidth = 1.5,
  color = "#ffffff",
}: Props) {
  const inset = borderWidth / 2
  return (
    <motion.div
      variants={variants}
      custom={delay}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        height,
      }}
    >
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        <rect
          x={inset}
          y={inset}
          width={width - borderWidth}
          height={height - borderWidth}
          rx={borderRadius}
          ry={borderRadius}
          fill="none"
          stroke={color}
          strokeWidth={borderWidth}
          strokeDasharray={DASH_PATTERN}
          strokeLinecap="butt"
        />
        {/* Corner sockets */}
        <rect x={0} y={0} width={SOCKET} height={SOCKET} fill={color} />
        <rect x={width - SOCKET} y={0} width={SOCKET} height={SOCKET} fill={color} />
        <rect x={0} y={height - SOCKET} width={SOCKET} height={SOCKET} fill={color} />
        <rect
          x={width - SOCKET}
          y={height - SOCKET}
          width={SOCKET}
          height={SOCKET}
          fill={color}
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
          color,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
    </motion.div>
  )
}
