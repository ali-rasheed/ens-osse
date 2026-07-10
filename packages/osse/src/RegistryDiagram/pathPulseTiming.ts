/**
 * Keyframed opacity for one path-pulse step: forward stagger, plateau, reverse stagger, optional hold.
 * Used by node rings and edge stroke overlays.
 */
import type { Transition } from "motion/react"

const EPS = 1e-6

function mergeKeyframes(points: { t: number; o: number }[]): { opacity: number[]; times: number[] } {
  points.sort((a, b) => a.t - b.t)
  const opacity: number[] = []
  const times: number[] = []
  for (const { t, o } of points) {
    if (times.length && Math.abs(times[times.length - 1]! - t) < EPS) {
      opacity[opacity.length - 1] = o
      continue
    }
    times.push(t)
    opacity.push(o)
  }
  return { opacity, times }
}

/**
 * @param pathIndex — index of this node (or tail-synced edge) along the path, 0..L-1
 * @param pathLength — number of nodes on the path (L ≥ 1)
 */
export function buildPathPulseKeyframes(
  pathIndex: number,
  pathLength: number,
  stagger: number,
  segmentDuration: number,
  hold: number
): { opacity: number[]; times: number[]; cycleDuration: number } {
  const L = pathLength
  const seg = Math.max(segmentDuration, EPS)
  const st = Math.max(stagger, 0)
  const h = Math.max(hold, 0)
  const i = pathIndex

  const TForward = (L <= 1 ? 0 : (L - 1) * st) + seg
  const TReverse = TForward
  const total = TForward + TReverse + h

  const pts: { t: number; o: number }[] = [
    { t: 0, o: 0 },
    { t: i * st, o: 0 },
    { t: i * st + seg, o: 1 },
    { t: TForward, o: 1 },
    { t: TForward + (L - 1 - i) * st, o: 1 },
    { t: TForward + (L - 1 - i) * st + seg, o: 0 },
    { t: TForward + TReverse, o: 0 },
    { t: total, o: 0 },
  ]

  const { opacity, times } = mergeKeyframes(pts)
  const normTimes = times.map((t) => t / total)
  return { opacity, times: normTimes, cycleDuration: total }
}

export function buildPathPulseTransition(
  pathIndex: number,
  pathLength: number,
  stagger: number,
  segmentDuration: number,
  hold: number
): { opacity: number[]; transition: Transition } {
  const { opacity, times, cycleDuration } = buildPathPulseKeyframes(
    pathIndex,
    pathLength,
    stagger,
    segmentDuration,
    hold
  )
  return {
    opacity,
    transition: {
      duration: cycleDuration,
      times,
      repeat: Infinity,
      ease: "linear",
    },
  }
}
