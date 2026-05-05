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

const SHELL_GAP = 3

export function RegistryNode({
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
  const outerRadius = borderRadius + SHELL_GAP
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
        background: "transparent",
        border: `${borderWidth}px solid ${color}`,
        borderRadius: outerRadius,
        padding: SHELL_GAP,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          border: `${borderWidth}px solid ${color}`,
          borderRadius,
          boxSizing: "border-box",
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
