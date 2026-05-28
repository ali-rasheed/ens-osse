/**
 * Centralized Motion timing and variant presets for RegistryDiagram.
 * DialKit in App overrides these per session; `resolveAnimationConfig` fills gaps for the diagram.
 */
import type { Variants, Transition } from "motion/react"
import type { AnimationConfig } from "./types"

export const ANIMATION_PRESET_OPTIONS = ["draw", "fade", "pop", "none"] as const
export type AnimationPreset = (typeof ANIMATION_PRESET_OPTIONS)[number]

/** Default spring for `draw` / `pop` node entrance (matches prior inline fallback). */
export const DEFAULT_SPRING_TRANSITION: Transition = {
  type: "spring",
  visualDuration: 0.4,
  bounce: 0.1,
}

/** Baseline animation when `animation` prop is omitted or fields are partial. */
export const DEFAULT_ANIMATION_CONFIG: AnimationConfig = {
  preset: "draw",
  stagger: 0.08,
  /** Tween preset (`fade` / edge timings); kept ≤300ms for product-style entrances. */
  duration: 0.28,
  spring: DEFAULT_SPRING_TRANSITION,
}

/** Merge caller `animation` with defaults so the diagram always has concrete timing. */
export function resolveAnimationConfig(animation: AnimationConfig | undefined): {
  preset: AnimationPreset
  stagger: number
  duration: number
  spring: Transition | undefined
} {
  const a = animation ?? {}
  const preset = (a.preset ?? DEFAULT_ANIMATION_CONFIG.preset) as AnimationPreset
  return {
    preset,
    stagger: a.stagger ?? DEFAULT_ANIMATION_CONFIG.stagger!,
    duration: a.duration ?? DEFAULT_ANIMATION_CONFIG.duration!,
    spring: a.spring ?? DEFAULT_ANIMATION_CONFIG.spring,
  }
}

/** Delay after edge path starts before showing the arrowhead (per preset). */
export function getArrowheadDelayOffset(
  preset: AnimationPreset,
  duration: number
): number {
  if (preset === "draw") return Math.max(duration * 0.6, 0.25)
  if (preset === "pop") return duration * 0.5
  if (preset === "none") return 0
  return duration
}

export function buildVariants(
  preset: AnimationConfig["preset"],
  spring: Transition | undefined,
  duration: number
): { node: Variants; edge: Variants } {
  const none: Variants = { hidden: {}, visible: {} }
  if (preset === "none") return { node: none, edge: none }

  const nodeTransition: Transition = spring ?? DEFAULT_SPRING_TRANSITION

  const nodeByPreset: Record<string, Variants> = {
    fade: {
      hidden: { opacity: 0 },
      visible: (delay: number) => ({
        opacity: 1,
        transition: { duration, delay },
      }),
    },
    pop: {
      hidden: { opacity: 0, scale: 0.7 },
      visible: (delay: number) => ({
        opacity: 1,
        scale: 1,
        transition: { ...nodeTransition, delay },
      }),
    },
    draw: {
      hidden: { opacity: 0, scale: 0.85 },
      visible: (delay: number) => ({
        opacity: 1,
        scale: 1,
        transition: { ...nodeTransition, delay },
      }),
    },
  }

  const drawDuration = Math.max(duration * 0.6, 0.25)
  const edgeByPreset: Record<string, Variants> = {
    fade: {
      hidden: { opacity: 0 },
      visible: (delay: number) => ({
        opacity: 1,
        transition: { duration, delay },
      }),
    },
    pop: {
      hidden: { opacity: 0 },
      visible: (delay: number) => ({
        opacity: 1,
        transition: { duration: duration * 0.5, delay },
      }),
    },
    draw: {
      hidden: { opacity: 0, pathLength: 0 },
      visible: (delay: number) => ({
        opacity: 1,
        pathLength: 1,
        transition: {
          opacity: { duration: duration * 0.2, delay },
          pathLength: { duration: drawDuration, delay },
          default: { duration: drawDuration, delay },
        },
      }),
    },
  }

  const key = preset ?? "fade"
  return {
    node: nodeByPreset[key] ?? nodeByPreset.fade,
    edge: edgeByPreset[key] ?? edgeByPreset.fade,
  }
}
