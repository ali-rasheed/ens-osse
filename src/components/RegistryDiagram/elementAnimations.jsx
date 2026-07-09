/**
 * Per-element Motion definitions for RegistryDiagram.
 *
 * Each diagram element exposes three lifecycle phases:
 *   entry     — initial state (`variants.hidden` / `initial`)
 *   visible   — animate-in target (`variants.visible` / `animate`)
 *   exit      — teardown (`variants.exit`; for replay / AnimatePresence)
 *
 * `transition` is attached to `visible` and `exit` (and inline arrowhead helpers).
 * Delay is passed via Motion `custom` (rank-based stagger from `RegistryDiagram`).
 */

/** ease-out-quart — arrowhead snap-in */
export const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1]

/** ease-out-quint — node / canvas exit */
export const EASE_OUT_QUINT = [0.22, 1, 0.36, 1]

/** Default spring when preset is `draw` or `pop`. */
export const DEFAULT_SPRING = {
  type: "spring",
  visualDuration: 0.4,
  bounce: 0.1,
}

/** Diagram elements that participate in entrance sequencing. */
export const DIAGRAM_ELEMENTS = [
  "canvas",
  "registryNode",
  "labelNode",
  "dashedNode",
  "nestedChild",
  "edgeDot",
  "edgePath",
  "edgeArrowhead",
  "pathPulseRing",
  "pathPulseEdge",
]

const NONE = {
  entry: {},
  visible: () => ({}),
  exit: {},
}

/**
 * @param {{ entry: object, visible: (delay: number) => object, exit: object }} spec
 * @returns {import('motion/react').Variants}
 */
function toVariants(spec) {
  return {
    hidden: spec.entry,
    visible: spec.visible,
    exit: spec.exit,
  }
}

/**
 * @typedef {'draw'|'fade'|'pop'|'none'} AnimationPreset
 */

/**
 * @param {AnimationPreset} preset
 * @param {import('motion/react').Transition | undefined} spring
 * @param {number} duration
 */
function buildNodeSpec(preset, spring, duration) {
  if (preset === "none") return NONE

  const nodeSpring = spring ?? DEFAULT_SPRING
  const exitTransition = {
    duration: Math.min(duration * 0.45, 0.2),
    ease: EASE_OUT_QUINT,
  }

  if (preset === "fade") {
    return {
      entry: { opacity: 0 },
      visible: (delay) => ({
        opacity: 1,
        transition: { duration, delay },
      }),
      exit: {
        opacity: 0,
        transition: exitTransition,
      },
    }
  }

  if (preset === "pop") {
    return {
      entry: { opacity: 0, scale: 0.7 },
      visible: (delay) => ({
        opacity: 1,
        scale: 1,
        transition: { ...nodeSpring, delay },
      }),
      exit: {
        opacity: 0,
        scale: 0.85,
        transition: exitTransition,
      },
    }
  }

  // draw (default)
  return {
    entry: { opacity: 0, scale: 0.85 },
    visible: (delay) => ({
      opacity: 1,
      scale: 1,
      transition: { ...nodeSpring, delay },
    }),
    exit: {
      opacity: 0,
      scale: 0.92,
      transition: exitTransition,
    },
  }
}

/**
 * Nested registry children reuse node motion but add a small index offset in the parent.
 * @param {AnimationPreset} preset
 * @param {import('motion/react').Transition | undefined} spring
 * @param {number} duration
 */
function buildNestedChildSpec(preset, spring, duration) {
  const base = buildNodeSpec(preset, spring, duration)
  if (preset === "none") return base

  const nestedStagger = 0.03
  return {
    ...base,
    visible: (delay) => base.visible(delay + nestedStagger),
  }
}

/**
 * @param {AnimationPreset} preset
 * @param {number} duration
 */
function buildEdgeDotSpec(preset, duration) {
  if (preset === "none") return NONE

  const exitTransition = {
    duration: Math.min(duration * 0.35, 0.15),
    ease: EASE_OUT_QUART,
  }

  if (preset === "pop") {
    return {
      entry: { opacity: 0, scale: 0 },
      visible: (delay) => ({
        opacity: 1,
        scale: 1,
        transition: { duration: duration * 0.35, delay },
      }),
      exit: { opacity: 0, scale: 0, transition: exitTransition },
    }
  }

  return {
    entry: { opacity: 0, scale: 0.5 },
    visible: (delay) => ({
      opacity: 1,
      scale: 1,
      transition: { duration: duration * 0.25, delay },
    }),
    exit: { opacity: 0, scale: 0.5, transition: exitTransition },
  }
}

/**
 * @param {AnimationPreset} preset
 * @param {number} duration
 */
function buildEdgePathSpec(preset, duration) {
  if (preset === "none") return NONE

  const drawDuration = Math.max(duration * 0.6, 0.25)
  const exitTransition = {
    duration: Math.min(duration * 0.4, 0.2),
    ease: EASE_OUT_QUART,
  }

  if (preset === "fade") {
    return {
      entry: { opacity: 0 },
      visible: (delay) => ({
        opacity: 1,
        transition: { duration, delay },
      }),
      exit: { opacity: 0, transition: exitTransition },
    }
  }

  if (preset === "pop") {
    return {
      entry: { opacity: 0 },
      visible: (delay) => ({
        opacity: 1,
        transition: { duration: duration * 0.5, delay },
      }),
      exit: { opacity: 0, transition: exitTransition },
    }
  }

  // draw — pathLength stroke reveal
  return {
    entry: { opacity: 0, pathLength: 0 },
    visible: (delay) => ({
      opacity: 1,
      pathLength: 1,
      transition: {
        opacity: { duration: duration * 0.2, delay },
        pathLength: { duration: drawDuration, delay },
        default: { duration: drawDuration, delay },
      },
    }),
    exit: {
      opacity: 0,
      pathLength: 0,
      transition: {
        opacity: { duration: exitTransition.duration },
        pathLength: { duration: exitTransition.duration, ease: exitTransition.ease },
      },
    },
  }
}

/**
 * Arrowhead uses inline initial/animate (not parent variants) so it can lag the path.
 * @param {number} delay — edge rank delay (seconds)
 * @param {number} arrowDelayOffset — preset-specific lag after path starts
 * @param {boolean} instant — `none` preset or reduced motion
 */
export function buildArrowheadAnimation(delay, arrowDelayOffset, instant = false) {
  if (instant) {
    return {
      entry: { opacity: 1 },
      visible: { opacity: 1 },
      exit: { opacity: 1 },
      transition: { duration: 0 },
    }
  }

  return {
    entry: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
    transition: {
      duration: 0.1,
      delay: delay + arrowDelayOffset,
      ease: EASE_OUT_QUART,
    },
  }
}

/**
 * Root canvas wrapper — instant container; children carry staggered motion.
 * @param {AnimationPreset} preset
 * @param {number} duration
 */
function buildCanvasSpec(preset, duration) {
  if (preset === "none") return NONE

  return {
    entry: { opacity: 1 },
    visible: () => ({ opacity: 1 }),
    exit: {
      opacity: 0,
      transition: { duration: Math.min(duration * 0.3, 0.15), ease: EASE_OUT_QUINT },
    },
  }
}

/**
 * Path-pulse ring: looped highlight (see `pathPulseTiming.ts`). Not part of entrance variants.
 * Documented here for a single animation map.
 */
export const pathPulseRingAnimation = {
  entry: { opacity: 0 },
  visible: "keyframed loop — buildPathPulseTransition()",
  exit: { opacity: 0 },
  transition: "linear repeat; duration = one full wave cycle",
}

/** Path-pulse edge stroke overlay — same timing as ring, opacity only. */
export const pathPulseEdgeAnimation = {
  entry: { opacity: 0 },
  visible: "keyframed loop — buildPathPulseTransition()",
  exit: { opacity: 0 },
  transition: "linear repeat; duration = one full wave cycle",
}

/**
 * Full animation map for one preset. Keys match `DIAGRAM_ELEMENTS` where applicable.
 *
 * @param {AnimationPreset} preset
 * @param {import('motion/react').Transition | undefined} spring
 * @param {number} duration
 */
export function buildDiagramElementAnimations(preset, spring, duration) {
  const nodeSpec = buildNodeSpec(preset, spring, duration)
  const edgePathSpec = buildEdgePathSpec(preset, duration)
  const edgeDotSpec = buildEdgeDotSpec(preset, duration)

  return {
    canvas: toVariants(buildCanvasSpec(preset, duration)),
    registryNode: toVariants(nodeSpec),
    labelNode: toVariants(nodeSpec),
    dashedNode: toVariants(nodeSpec),
    nestedChild: toVariants(buildNestedChildSpec(preset, spring, duration)),
    edgeDot: toVariants(edgeDotSpec),
    edgePath: toVariants(edgePathSpec),
    edgeArrowhead: buildArrowheadAnimation(0, 0, preset === "none"),
    pathPulseRing: pathPulseRingAnimation,
    pathPulseEdge: pathPulseEdgeAnimation,
    /** @deprecated Use `registryNode` — kept for `animationConfig.buildVariants`. */
    node: toVariants(nodeSpec),
    /** @deprecated Use `edgePath` — dot + path shared this in v0. */
    edge: toVariants(edgePathSpec),
  }
}

/**
 * Human-readable phase map for docs / DialKit tooling.
 * @param {AnimationPreset} preset
 */
export function describeElementPhases(preset) {
  const phases = {
    draw: {
      registryNode: "entry: fade+scale 0.85 → visible: spring → exit: fade+scale 0.92",
      edgePath: "entry: pathLength 0 → visible: draw stroke → exit: pathLength 0",
      edgeArrowhead: "entry: opacity 0 → visible: fade after path offset",
    },
    fade: {
      registryNode: "entry: opacity 0 → visible: tween → exit: opacity 0",
      edgePath: "entry: opacity 0 → visible: tween (no pathLength)",
    },
    pop: {
      registryNode: "entry: scale 0.7 → visible: spring pop → exit: scale 0.85",
      edgeDot: "entry: scale 0 → visible: pop in with edge",
    },
    none: "all elements: instant (no motion)",
  }
  return phases[preset] ?? phases.draw
}
