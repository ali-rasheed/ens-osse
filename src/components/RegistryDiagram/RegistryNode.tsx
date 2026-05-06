/**
 * Registry frame: double outline (Figma Diagram System). Plain `label` fills the inner
 * cell; optional `slots` add a mono header plus one or more hatched Marist slot cells below.
 * All label copy uses `letterSpacing: 0.05em` tracking.
 */
import { motion } from "motion/react"
import type { Variants } from "motion/react"
import {
  REGISTRY_HEADER_SLOT_GAP,
  REGISTRY_SHELL_GAP,
  REGISTRY_SLOT_CELL_GAP,
} from "./layout"

const LABEL_RADIUS = 12

interface Props {
  label: string
  slots?: string[]
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
  slotFontSize?: number
  slotPaddingH?: number
  slotPaddingV?: number
  slotColor?: string
  hatchBase?: string
  hatchStripe1?: string
  hatchStripe2?: string
}

export function RegistryNode({
  label,
  slots,
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
  slotFontSize = 14,
  slotPaddingH = 8,
  slotPaddingV = 4,
  slotColor = "#cfcfcf",
  hatchBase = "rgba(255, 255, 255, 0.04)",
  hatchStripe1 = "rgba(255,255,255,0.14)",
  hatchStripe2 = "rgba(255,255,255,0.12)",
}: Props) {
  const outerRadius = borderRadius + REGISTRY_SHELL_GAP
  const activeSlots = slots?.filter(Boolean) ?? []

  if (activeSlots.length === 0) {
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
          padding: REGISTRY_SHELL_GAP,
          boxSizing: "border-box",
          transformOrigin: "0 0",
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
        padding: REGISTRY_SHELL_GAP,
        boxSizing: "border-box",
        transformOrigin: "0 0",
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
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: REGISTRY_HEADER_SLOT_GAP,
          padding: `${paddingV}px ${paddingH}px`,
        }}
      >
        <div
          style={{
            fontFamily: "'ABC Monument Grotesk Semi-Mono', ui-monospace, monospace",
            fontWeight: 500,
            fontSize,
            letterSpacing: "0.05em",
            color,
            whiteSpace: "nowrap",
            lineHeight: 1.4,
          }}
        >
          {label}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "stretch",
            gap: REGISTRY_SLOT_CELL_GAP,
            justifyContent: "center",
          }}
        >
          {activeSlots.map((slotLabel, slotIndex) => (
            <div
              key={`${slotLabel}-${slotIndex}`}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: `${slotPaddingV}px ${slotPaddingH}px`,
                boxSizing: "border-box",
                overflow: "hidden",
                borderRadius: LABEL_RADIUS,
                color: slotColor,
                whiteSpace: "nowrap",
              }}
            >
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: LABEL_RADIUS,
                  backgroundColor: hatchBase,
                  backgroundImage: [
                    `repeating-linear-gradient(45deg, transparent 0 8px, ${hatchStripe1} 8px 9px, transparent 9px 16px)`,
                    `repeating-linear-gradient(-45deg, transparent 0 8px, ${hatchStripe2} 8px 9px, transparent 9px 16px)`,
                  ].join(", "),
                }}
              />
              <span
                style={{
                  position: "relative",
                  fontFamily: "'ABC Marist', Georgia, serif",
                  fontWeight: 400,
                  fontSize: slotFontSize,
                  lineHeight: 1.4,
                  letterSpacing: "0.05em",
                  color: slotColor,
                }}
              >
                {slotLabel}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
