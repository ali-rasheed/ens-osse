/**
 * Diagram “label” nodes (ABC Marist): two variants aligned with the Diagram System Figma —
 * plain (solid fill) vs hatched (cross-hatch behind type). `hatched` selects the background treatment;
 * typography and padding come from the parent diagram config. Label text uses
 * `letterSpacing: 0.05em` for light tracking.
 */
import { motion } from "motion/react"
import type { Variants } from "motion/react"

const LABEL_RADIUS = 12

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
  hatched: boolean
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
  paddingV = 12,
  color = "#ffffff",
  hatched,
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
        boxSizing: "border-box",
        overflow: "hidden",
        borderRadius: LABEL_RADIUS,
        color,
        whiteSpace: "nowrap",
        background: hatched ? "transparent" : "rgba(255, 255, 255, 0.06)",
        border: hatched ? undefined : "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      {hatched ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: LABEL_RADIUS,
            backgroundColor: "rgba(255, 255, 255, 0.04)",
            backgroundImage: [
              "repeating-linear-gradient(45deg, transparent 0 8px, rgba(255,255,255,0.14) 8px 9px, transparent 9px 16px)",
              "repeating-linear-gradient(-45deg, transparent 0 8px, rgba(255,255,255,0.12) 8px 9px, transparent 9px 16px)",
            ].join(", "),
          }}
        />
      ) : null}
      <span
        style={{
          position: "relative",
          fontFamily: "'ABC Marist', Georgia, serif",
          fontWeight: 400,
          fontSize,
          lineHeight: 1,
          letterSpacing: "0.05em",
          color,
        }}
      >
        {label}
      </span>
    </motion.div>
  )
}
