import { motion } from "motion/react"
import type { Variants } from "motion/react"

interface Props {
  label: string
  x: number
  y: number
  width: number
  height: number
  variants: Variants
}

export function LabelNode({ label, x, y, width, height, variants }: Props) {
  return (
    <motion.div
      variants={variants}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 32px",
        fontFamily: "'Geist', sans-serif",
        fontWeight: 400,
        fontSize: 40,
        color: "#e1e1e0",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </motion.div>
  )
}
