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
  color?: string
}

export function LabelNode({
  label,
  x,
  y,
  width,
  height,
  variants,
  delay = 0,
  fontSize = 14,
  paddingH = 8,
  paddingV = 4,
  color = "#cfcfcf",
}: Props) {
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
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: `${paddingV}px ${paddingH}px`,
        fontFamily: "'ABC Marist', Georgia, serif",
        fontWeight: 400,
        fontSize,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </motion.div>
  )
}
