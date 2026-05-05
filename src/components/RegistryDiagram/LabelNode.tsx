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
}

export function LabelNode({ label, x, y, width, height, variants, delay = 0 }: Props) {
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
        padding: "4px 8px",
        fontFamily: "'ABC Marist', Georgia, serif",
        fontWeight: 400,
        fontSize: 14,
        color: "#cfcfcf",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </motion.div>
  )
}
