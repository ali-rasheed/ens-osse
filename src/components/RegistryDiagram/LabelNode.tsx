/**
 * Diagram label pills: plain (solid fill) vs hatched (`hatched`). Record-style copy uses Marist
 * by default; `typography="semimono"` matches roles / wallet lines (Semi-Mono + 0.05em tracking).
 */
import { motion } from "motion/react"
import type { Variants } from "motion/react"
import type { DiagramTypography } from "./theme"
import { DIAGRAM_FONTS } from "./theme"
import { PathPulseRing } from "./PathPulseRing"

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
  /** Marist (records) vs Semi-Mono (roles / wallets). */
  typography?: DiagramTypography
  /** Mode-driven pill fill (plain labels). */
  surfaceFill?: string
  surfaceBorder?: string
  hatchBase?: string
  hatchStripe1?: string
  hatchStripe2?: string
  /** Nested in a registry column: no absolute canvas positioning. */
  embedded?: boolean
  borderRadius?: number
  letterSpacingEm?: number
  /** Looped highlight along a graph path; ring is a separate Motion layer. */
  pathPulse?: {
    active: boolean
    pathIndex: number
    pathLength: number
    stagger: number
    segmentDuration: number
    hold: number
    highlightColor: string
  }
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
  typography = "marist",
  surfaceFill = "rgba(255, 255, 255, 0.06)",
  surfaceBorder = "1px solid rgba(255, 255, 255, 0.08)",
  hatchBase = "rgba(255, 255, 255, 0.04)",
  hatchStripe1 = "rgba(255,255,255,0.14)",
  hatchStripe2 = "rgba(255,255,255,0.12)",
  embedded = false,
  borderRadius = 12,
  letterSpacingEm = 0.05,
  pathPulse,
}: Props) {
  const pulseRing =
    pathPulse &&
    pathPulse.active &&
    pathPulse.pathIndex >= 0 &&
    pathPulse.pathLength >= 1

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
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: `${paddingV}px ${paddingH}px`,
        boxSizing: "border-box",
        overflow: pulseRing ? "visible" : "hidden",
        borderRadius,
        color,
        whiteSpace: "nowrap",
        background: hatched ? "transparent" : surfaceFill,
        border: hatched ? undefined : surfaceBorder,
        transformOrigin: "0 0",
      }}
    >
      {pathPulse ? (
        <PathPulseRing
          active={pathPulse.active}
          pathIndex={pathPulse.pathIndex}
          pathLength={pathPulse.pathLength}
          stagger={pathPulse.stagger}
          segmentDuration={pathPulse.segmentDuration}
          hold={pathPulse.hold}
          highlightColor={pathPulse.highlightColor}
          borderRadius={borderRadius}
        />
      ) : null}
      {hatched ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: borderRadius,
            backgroundColor: hatchBase,
            backgroundImage: [
              `repeating-linear-gradient(45deg, transparent 0 8px, ${hatchStripe1} 8px 9px, transparent 9px 16px)`,
              `repeating-linear-gradient(-45deg, transparent 0 8px, ${hatchStripe2} 8px 9px, transparent 9px 16px)`,
            ].join(", "),
          }}
        />
      ) : null}
      <span
        style={{
          position: "relative",
          fontFamily: DIAGRAM_FONTS[typography],
          fontWeight: 400,
          fontSize,
          lineHeight: 1,
          letterSpacing: typography === "semimono" ? "0.05em" : `${letterSpacingEm}em`,
          color,
        }}
      >
        {label}
      </span>
    </motion.div>
  )
}
