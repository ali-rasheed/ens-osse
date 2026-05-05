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

export function RegistryNode({ label, x, y, width, height, variants }: Props) {
  return (
    <motion.div
      variants={variants}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        height,
        background: "#595755",
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 32px",
        fontFamily: "'Geist Mono', monospace",
        fontWeight: 500,
        fontSize: 40,
        color: "#faf9f7",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </motion.div>
  )
}
