/**
 * Dashed “resolver” frame with corner sockets. Socket squares use a small radius to match
 * Diagram System corner markers (e.g. 2px rounding).
 *
 * With `stackDepth` > 1, draws duplicate frames offset down-right via `DiagonalStack` (Mermaid
 * `id{label # stack=N}`); only the front layer shows the label.
 */
import { motion } from "motion/react"
import type { Variants } from "motion/react"
import { DiagonalStack } from "../DiagonalStack"
import { RESOLVER_STACK_LAYER_OFFSET } from "./layout"

const SOCKET_CORNER_RADIUS = 2

interface LayerProps {
  label: string
  width: number
  height: number
  fontSize: number
  paddingH: number
  paddingV: number
  borderRadius: number
  borderWidth: number
  color: string
  /** Center label; defaults to `color` (stroke). */
  labelColor?: string
  /** Solid fill inside dashed stroke (Diagram System). */
  surfaceFill: string
  socketColor: string
  frameInset: number
  radiusBonus: number
  socketSize: number
  dashLength: number
  dashGap: number
  /** Back layers: dashed frame + sockets only (no text). */
  frameOnly: boolean
}

function DashedLayerFrame({
  label,
  width,
  height,
  fontSize,
  paddingH,
  paddingV,
  borderRadius,
  borderWidth,
  color,
  labelColor,
  surfaceFill,
  socketColor,
  frameInset,
  radiusBonus,
  socketSize,
  dashLength,
  dashGap,
  frameOnly,
}: LayerProps) {
  const textColor = labelColor ?? color
  const strokeInset = frameInset + borderWidth / 2
  const socketOffset = -socketSize / 2
  const socketMaxX = width - socketSize / 2
  const socketMaxY = height - socketSize / 2
  return (
    <div style={{ position: "relative", width, height }}>
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}
      >
        <rect
          x={strokeInset}
          y={strokeInset}
          width={width - strokeInset * 2}
          height={height - strokeInset * 2}
          rx={borderRadius + radiusBonus}
          ry={borderRadius + radiusBonus}
          fill={surfaceFill}
        />
        <rect
          x={strokeInset}
          y={strokeInset}
          width={width - strokeInset * 2}
          height={height - strokeInset * 2}
          rx={borderRadius + radiusBonus}
          ry={borderRadius + radiusBonus}
          fill="none"
          stroke={color}
          strokeWidth={borderWidth}
          strokeDasharray={`${dashLength} ${dashGap}`}
          strokeLinecap="butt"
        />
        <rect
          x={socketOffset}
          y={socketOffset}
          width={socketSize}
          height={socketSize}
          rx={SOCKET_CORNER_RADIUS}
          ry={SOCKET_CORNER_RADIUS}
          fill={socketColor}
        />
        <rect
          x={socketMaxX}
          y={socketOffset}
          width={socketSize}
          height={socketSize}
          rx={SOCKET_CORNER_RADIUS}
          ry={SOCKET_CORNER_RADIUS}
          fill={socketColor}
        />
        <rect
          x={socketOffset}
          y={socketMaxY}
          width={socketSize}
          height={socketSize}
          rx={SOCKET_CORNER_RADIUS}
          ry={SOCKET_CORNER_RADIUS}
          fill={socketColor}
        />
        <rect
          x={socketMaxX}
          y={socketMaxY}
          width={socketSize}
          height={socketSize}
          rx={SOCKET_CORNER_RADIUS}
          ry={SOCKET_CORNER_RADIUS}
          fill={socketColor}
        />
      </svg>
      {!frameOnly ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: `${paddingV}px ${paddingH}px`,
            fontFamily: "'ABC Monument Grotesk Semi-Mono', ui-monospace, monospace",
            fontWeight: 500,
            fontSize,
            letterSpacing: "0.05em",
            color: textColor,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  )
}

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
  borderRadius?: number
  borderWidth?: number
  color?: string
  /** Corner sockets; defaults to `color` when omitted. */
  socketColor?: string
  /** Resolver center label; defaults to `color`. */
  labelColor?: string
  frameInset?: number
  radiusBonus?: number
  socketSize?: number
  dashLength?: number
  dashGap?: number
  /** Nested in a registry column: no absolute canvas positioning. */
  embedded?: boolean
  /** Mermaid `stack=N`: N offset duplicate frames (N ≥ 2). */
  stackDepth?: number
  /** Fill inside dashed frame; from `DiagramPalette.resolverSurfaceFill`. */
  surfaceFill?: string
}

export function DashedNode({
  label,
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
  borderWidth = 0.5,
  color = "#ffffff",
  socketColor,
  labelColor,
  frameInset = 10,
  radiusBonus = 8,
  socketSize = 12,
  dashLength = 6,
  dashGap = 5,
  embedded = false,
  stackDepth = 1,
  surfaceFill = "transparent",
}: Props) {
  const socketFill = socketColor ?? color
  const depth = Math.max(1, stackDepth ?? 1)
  const ox = RESOLVER_STACK_LAYER_OFFSET
  const innerW = width - (depth - 1) * ox
  const innerH = height - (depth - 1) * ox

  const layerProps: Omit<LayerProps, "frameOnly"> = {
    label,
    width: innerW,
    height: innerH,
    fontSize,
    paddingH,
    paddingV,
    borderRadius,
    borderWidth,
    color,
    labelColor,
    surfaceFill,
    socketColor: socketFill,
    frameInset,
    radiusBonus,
    socketSize,
    dashLength,
    dashGap,
  }

  const content =
    depth <= 1 ? (
      <DashedLayerFrame {...layerProps} frameOnly={false} />
    ) : (
      <DiagonalStack offsetX={ox} offsetY={ox}>
        {Array.from({ length: depth }, (_, i) => (
          <DashedLayerFrame key={i} {...layerProps} frameOnly={i > 0} />
        ))}
      </DiagonalStack>
    )

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
        transformOrigin: "0 0",
        alignSelf: embedded ? "center" : undefined,
      }}
    >
      {content}
    </motion.div>
  )
}
