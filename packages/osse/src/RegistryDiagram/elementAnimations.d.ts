import type { Variants, Transition } from "motion/react"

/** Ambient typings for Motion animation helpers (JS module). */
export const EASE_OUT_QUART: number[]
export const EASE_OUT_QUINT: number[]
export const DEFAULT_SPRING: Transition
export const DIAGRAM_ELEMENTS: string[]

export function buildDiagramElementAnimations(
  preset: string,
  spring: Transition | undefined,
  duration: number
): {
  node: Variants
  edge: Variants
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildArrowheadAnimation(
  delay: number,
  arrowDelayOffset: number,
  instant?: boolean
): any
