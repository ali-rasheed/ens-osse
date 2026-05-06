/**
 * DiagonalStack layers multiple children with a cumulative down-right offset (each step uses
 * offsetX/offsetY). First child is the visual front (no extra translate); later children sit
 * behind. The wrapper adds bottom/right padding so back layers are not clipped. Optional
 * animate: staggered opacity only (transform stays on the layer for layout).
 */
import { Children, type CSSProperties, type ReactNode } from "react"
import { motion } from "motion/react"

export interface DiagonalStackProps {
  children: ReactNode
  offsetX?: number
  offsetY?: number
  className?: string
  style?: CSSProperties
  /** Staggered fade-in; keeps static translate so layout matches non-animated stacks. */
  animate?: boolean
}

export function DiagonalStack({
  children,
  offsetX = 10,
  offsetY = 10,
  className,
  style,
  animate = false,
}: DiagonalStackProps) {
  const items = Children.toArray(children).filter((c) => c != null)
  const n = items.length
  if (n === 0) return null

  const padR = Math.max(0, n - 1) * offsetX
  const padB = Math.max(0, n - 1) * offsetY

  const indices = Array.from({ length: n }, (_, i) => n - 1 - i)

  return (
    <div
      className={className}
      style={{
        position: "relative",
        display: "inline-block",
        paddingRight: padR,
        paddingBottom: padB,
        ...style,
      }}
    >
      {indices.map((i) => {
        const child = items[i]
        const isFront = i === 0
        const z = n - i
        const layerStyle: CSSProperties = {
          position: isFront ? "relative" : "absolute",
          left: isFront ? undefined : 0,
          top: isFront ? undefined : 0,
          transform: `translate(${i * offsetX}px, ${i * offsetY}px)`,
          zIndex: z,
        }

        if (animate) {
          return (
            <motion.div
              key={i}
              style={layerStyle}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: 0.3,
                delay: (n - 1 - i) * 0.05,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {child}
            </motion.div>
          )
        }

        return (
          <div key={i} style={layerStyle}>
            {child}
          </div>
        )
      })}
    </div>
  )
}
