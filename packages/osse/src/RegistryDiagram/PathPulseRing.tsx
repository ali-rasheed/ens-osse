/**
 * Absolute ring + glow driven by `pathPulseTiming` keyframes. Sits inside node wrappers so entrance
 * `variants` on the parent stay unchanged.
 */
import { motion } from "motion/react"
import { buildPathPulseTransition } from "./pathPulseTiming"

export interface PathPulseRingProps {
  /** Combined with `pathIndex >= 0` in the parent. */
  active: boolean
  pathIndex: number
  pathLength: number
  stagger: number
  segmentDuration: number
  hold: number
  highlightColor: string
  borderRadius: number
}

export function PathPulseRing({
  active,
  pathIndex,
  pathLength,
  stagger,
  segmentDuration,
  hold,
  highlightColor,
  borderRadius,
}: PathPulseRingProps) {
  if (!active || pathIndex < 0 || pathLength < 1) return null

  const { opacity, transition } = buildPathPulseTransition(
    pathIndex,
    pathLength,
    stagger,
    segmentDuration,
    hold
  )

  return (
    <motion.div
      aria-hidden
      initial={false}
      animate={{ opacity }}
      transition={transition}
      style={{
        position: "absolute",
        inset: -3,
        borderRadius,
        pointerEvents: "none",
        zIndex: 4,
        border: `2px solid ${highlightColor}`,
        boxShadow: `0 0 14px color-mix(in srgb, ${highlightColor} 50%, transparent)`,
      }}
    />
  )
}
