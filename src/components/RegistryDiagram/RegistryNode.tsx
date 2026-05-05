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
        background: "transparent",
        border: "1.5px solid #ffffff",
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "10px 16px",
        fontFamily: "'ABC Monument Grotesk Semi-Mono', ui-monospace, monospace",
        fontWeight: 500,
        fontSize: 16,
        color: "#ffffff",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </motion.div>
  )
}
