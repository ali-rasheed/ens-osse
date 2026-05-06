/**
 * Registry frame: default double outline (outer + inner border); `registryFrame === "single"`
 * uses one stroke + frame padding (Figma nested cards). Plain center label, optional hatched
 * `slots` row (top-level compound only), vertical `slots` stack when nested, or recursive
 * `children` column. All label copy uses `letterSpacing: 0.05em` tracking.
 */
import type { CSSProperties } from "react"
import { motion } from "motion/react"
import type { Variants } from "motion/react"
import type { NodeData } from "./types"
import type { DiagramTypography } from "./theme"
import { DIAGRAM_FONTS } from "./theme"
import {
  REGISTRY_FRAME_PADDING,
  REGISTRY_HEADER_SLOT_GAP,
  REGISTRY_NESTED_CHILD_GAP,
  REGISTRY_SLOT_CELL_GAP,
  REGISTRY_SLOT_TEXT_GAP,
  REGISTRY_SHELL_GAP,
  layoutNodeDimensions,
  type LayoutOptions,
} from "./layout"
import { LabelNode } from "./LabelNode"
import { DashedNode } from "./DashedNode"

/** Props bundled for compact resolver nodes nested inside a registry column. */
export interface NestedDashedNodeProps {
  fontSize: number
  paddingH: number
  paddingV: number
  borderRadius: number
  borderWidth: number
  /** Dashed stroke + socket outline color (Diagram System). */
  color: string
  /** Center label; defaults to `color` when omitted. */
  textColor?: string
  surfaceFill?: string
  socketColor?: string
  frameInset: number
  radiusBonus: number
  socketSize: number
  dashLength: number
  dashGap: number
}

interface Props {
  label: string
  slots?: string[]
  children?: NodeData[]
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
  nestedBorderRadius?: number
  borderWidth?: number
  color?: string
  slotFontSize?: number
  slotPaddingH?: number
  slotPaddingV?: number
  slotColor?: string
  hatchBase?: string
  hatchStripe1?: string
  hatchStripe2?: string
  /** When true, this node is drawn inside a parent registry’s `children` column. */
  nested?: boolean
  /** Same numbers passed to `computeLayout` / `layoutNodeDimensions` for nested sizing. */
  layoutOptions?: LayoutOptions
  nestedDashed?: NestedDashedNodeProps
  labelSurfaceFill?: string
  labelSurfaceBorder?: string
  /** Pill radius for hatched slot chips and nested label nodes (DialKit Labels). */
  labelBorderRadius?: number
  /** Marist tracking in em for slot row + nested labels. */
  labelLetterSpacing?: number
  /** Hatched slot row + nested `slots` stack: Marist (records) vs Semi-Mono (roles / wallets). */
  slotsFont?: DiagramTypography
  /** Omit or unset for double border (default); `"single"` for one stroke + frame padding. */
  registryFrame?: NodeData["registryFrame"]
}

function buildLayoutOpts(props: Props): LayoutOptions {
  const {
    fontSize = 16,
    paddingH = 16,
    paddingV = 10,
    borderWidth = 1.5,
    slotFontSize,
    slotPaddingH,
    slotPaddingV,
    layoutOptions: lo = {},
  } = props
  return {
    fontSize,
    paddingH,
    paddingV,
    borderWidth,
    resolverFontSize: lo.resolverFontSize,
    resolverPaddingH: lo.resolverPaddingH,
    resolverPaddingV: lo.resolverPaddingV,
    resolverBorderWidth: lo.resolverBorderWidth,
    resolverSocketOverhang: lo.resolverSocketOverhang,
    resolverMinWidth: lo.resolverMinWidth,
    resolverMinHeight: lo.resolverMinHeight,
    labelFontSize: slotFontSize ?? lo.labelFontSize,
    labelPaddingH: slotPaddingH ?? lo.labelPaddingH,
    labelPaddingV: slotPaddingV ?? lo.labelPaddingV,
  }
}

export function RegistryNode({
  label,
  slots,
  children: childNodes,
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
  nestedBorderRadius = borderRadius + 18,
  borderWidth = 1.5,
  color = "#ffffff",
  slotFontSize = 14,
  slotPaddingH = 8,
  slotPaddingV = 4,
  slotColor = "#cfcfcf",
  hatchBase = "rgba(255, 255, 255, 0.04)",
  hatchStripe1 = "rgba(255,255,255,0.14)",
  hatchStripe2 = "rgba(255,255,255,0.12)",
  nested = false,
  layoutOptions: layoutOptionsProp,
  nestedDashed,
  labelSurfaceFill,
  labelSurfaceBorder,
  labelBorderRadius = 12,
  labelLetterSpacing = 0.05,
  slotsFont = "marist",
  registryFrame,
}: Props) {
  const layoutOptions = buildLayoutOpts({
    label,
    slots,
    children: childNodes,
    x,
    y,
    width,
    height,
    variants,
    delay,
    fontSize,
    paddingH,
    paddingV,
    borderRadius,
    nestedBorderRadius,
    borderWidth,
    color,
    slotFontSize,
    slotPaddingH,
    slotPaddingV,
    slotColor,
    hatchBase,
    hatchStripe1,
    hatchStripe2,
    nested,
    layoutOptions: layoutOptionsProp,
    nestedDashed,
    labelSurfaceFill,
    labelSurfaceBorder,
    registryFrame,
  })
  const activeChildren = childNodes?.filter(Boolean) ?? []
  const activeSlots = slots?.filter(Boolean) ?? []
  const showHatchedRow = activeChildren.length === 0 && activeSlots.length > 0 && !nested
  const showTextStack = activeChildren.length === 0 && activeSlots.length > 0 && nested
  const singleFrame = registryFrame === "single"
  const innerCorner = nested ? nestedBorderRadius : borderRadius
  const outerCorner = innerCorner + REGISTRY_SHELL_GAP

  const innerColumn = (
    <>
      <div
        style={{
          fontFamily: "'ABC Monument Grotesk Semi-Mono', ui-monospace, monospace",
          fontWeight: 500,
          fontSize,
          letterSpacing: "0.05em",
          color,
          whiteSpace: "nowrap",
          lineHeight: 1.4,
          textAlign: showHatchedRow || activeChildren.length > 0 ? "center" : undefined,
          alignSelf:
            showHatchedRow || activeChildren.length > 0 || showTextStack ? "center" : undefined,
        }}
      >
        {label}
      </div>

      {activeChildren.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            gap: REGISTRY_NESTED_CHILD_GAP,
            width: "100%",
          }}
        >
          {activeChildren.map((child, i) => (
            <NestedDiagramNode
              key={child.id || `${child.label}-${i}`}
              node={child}
              variants={variants}
              delay={delay + 0.03 * (i + 1)}
              layoutOptions={layoutOptions}
              registryProps={{
                fontSize,
                paddingH,
                paddingV,
                borderRadius,
                nestedBorderRadius,
                borderWidth,
                color,
                slotFontSize,
                slotPaddingH,
                slotPaddingV,
                slotColor,
                hatchBase,
                hatchStripe1,
                hatchStripe2,
                nestedDashed,
                labelSurfaceFill,
                labelSurfaceBorder,
                labelBorderRadius,
                labelLetterSpacing,
              }}
            />
          ))}
        </div>
      ) : null}

      {showHatchedRow ? (
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
                borderRadius: labelBorderRadius,
                color: slotColor,
                whiteSpace: "nowrap",
              }}
            >
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: labelBorderRadius,
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
                  fontFamily: DIAGRAM_FONTS[slotsFont],
                  fontWeight: 400,
                  fontSize: slotFontSize,
                  lineHeight: 1.4,
                  letterSpacing: slotsFont === "semimono" ? "0.05em" : `${labelLetterSpacing}em`,
                  color: slotColor,
                }}
              >
                {slotLabel}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {showTextStack ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: REGISTRY_SLOT_TEXT_GAP,
            width: "100%",
          }}
        >
          {activeSlots.map((line, i) => (
            <p
              key={`${line}-${i}`}
              style={{
                margin: 0,
                fontFamily: DIAGRAM_FONTS[slotsFont],
                fontWeight: 400,
                fontSize: slotFontSize,
                lineHeight: 1.4,
                letterSpacing: slotsFont === "semimono" ? "0.05em" : `${labelLetterSpacing}em`,
                color: slotColor,
                whiteSpace: "nowrap",
                textAlign: "center",
              }}
            >
              {line}
            </p>
          ))}
        </div>
      ) : null}
    </>
  )

  const hasBody = activeChildren.length > 0 || showHatchedRow || showTextStack

  const innerPadStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: hasBody ? "stretch" : "center",
    padding: `${paddingV}px ${paddingH}px`,
    boxSizing: "border-box",
    flex: activeChildren.length > 0 ? "1 1 auto" : undefined,
    gap: hasBody ? REGISTRY_HEADER_SLOT_GAP : 0,
    width: hasBody ? "100%" : undefined,
    height: singleFrame ? undefined : "100%",
  }

  if (singleFrame) {
    return (
      <motion.div
        variants={variants}
        custom={delay}
        style={{
          position: nested ? "relative" : "absolute",
          left: nested ? undefined : x,
          top: nested ? undefined : y,
          width,
          height,
          boxSizing: "border-box",
          border: `${borderWidth}px solid ${color}`,
          borderRadius: innerCorner,
          padding: REGISTRY_FRAME_PADDING,
          display: "flex",
          flexDirection: "column",
          alignItems: hasBody ? "stretch" : "center",
          justifyContent: hasBody ? "flex-start" : "center",
          transformOrigin: "0 0",
          alignSelf: nested ? "center" : undefined,
        }}
      >
        <div style={innerPadStyle}>{innerColumn}</div>
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={variants}
      custom={delay}
      style={{
        position: nested ? "relative" : "absolute",
        left: nested ? undefined : x,
        top: nested ? undefined : y,
        width,
        height,
        background: "transparent",
        border: `${borderWidth}px solid ${color}`,
        borderRadius: outerCorner,
        padding: REGISTRY_SHELL_GAP,
        boxSizing: "border-box",
        transformOrigin: "0 0",
        alignSelf: nested ? "center" : undefined,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          border: `${borderWidth}px solid ${color}`,
          borderRadius: innerCorner,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: hasBody ? "stretch" : "center",
          justifyContent: hasBody ? "flex-start" : "center",
        }}
      >
        <div style={innerPadStyle}>{innerColumn}</div>
      </div>
    </motion.div>
  )
}

interface NestedDiagramNodeProps {
  node: NodeData
  variants: Variants
  delay: number
  layoutOptions: LayoutOptions
  registryProps: Pick<
    Props,
    | "fontSize"
    | "paddingH"
    | "paddingV"
    | "borderRadius"
    | "nestedBorderRadius"
    | "borderWidth"
    | "color"
    | "slotFontSize"
    | "slotPaddingH"
    | "slotPaddingV"
    | "slotColor"
    | "hatchBase"
    | "hatchStripe1"
    | "hatchStripe2"
    | "nestedDashed"
    | "labelSurfaceFill"
    | "labelSurfaceBorder"
    | "labelBorderRadius"
    | "labelLetterSpacing"
  >
}

function NestedDiagramNode({ node, variants, delay, layoutOptions, registryProps }: NestedDiagramNodeProps) {
  const { width, height } = layoutNodeDimensions(node, {
    ...layoutOptions,
    insideRegistryChildrenTree: true,
  })

  if (node.type === "registry") {
    return (
      <RegistryNode
        label={node.label}
        slots={node.slots}
        children={node.children}
        x={0}
        y={0}
        width={width}
        height={height}
        variants={variants}
        delay={delay}
        nested
        layoutOptions={layoutOptions}
        nestedDashed={registryProps.nestedDashed}
        labelSurfaceFill={registryProps.labelSurfaceFill}
        labelSurfaceBorder={registryProps.labelSurfaceBorder}
        fontSize={registryProps.fontSize}
        paddingH={registryProps.paddingH}
        paddingV={registryProps.paddingV}
        borderRadius={registryProps.borderRadius}
        nestedBorderRadius={registryProps.nestedBorderRadius}
        borderWidth={registryProps.borderWidth}
        color={registryProps.color}
        slotFontSize={registryProps.slotFontSize}
        slotPaddingH={registryProps.slotPaddingH}
        slotPaddingV={registryProps.slotPaddingV}
        slotColor={registryProps.slotColor}
        hatchBase={registryProps.hatchBase}
        hatchStripe1={registryProps.hatchStripe1}
        hatchStripe2={registryProps.hatchStripe2}
        labelBorderRadius={registryProps.labelBorderRadius}
        labelLetterSpacing={registryProps.labelLetterSpacing}
        slotsFont={node.slotsFont ?? "marist"}
        registryFrame={node.registryFrame}
      />
    )
  }

  if (node.type === "dashed" && registryProps.nestedDashed) {
    const d = registryProps.nestedDashed
    return (
      <DashedNode
        label={node.label}
        x={0}
        y={0}
        width={width}
        height={height}
        variants={variants}
        delay={delay}
        embedded
        stackDepth={node.stackDepth}
        surfaceFill={d.surfaceFill}
        fontSize={d.fontSize}
        paddingH={d.paddingH}
        paddingV={d.paddingV}
        borderRadius={d.borderRadius}
        borderWidth={d.borderWidth}
        color={d.color}
        labelColor={d.textColor ?? d.color}
        socketColor={d.socketColor}
        frameInset={d.frameInset}
        radiusBonus={d.radiusBonus}
        socketSize={d.socketSize}
        dashLength={d.dashLength}
        dashGap={d.dashGap}
      />
    )
  }

  return (
    <LabelNode
      label={node.label}
      x={0}
      y={0}
      width={width}
      height={height}
      variants={variants}
      delay={delay}
      embedded
      hatched={node.type === "labelHatched"}
      fontSize={registryProps.slotFontSize}
      paddingH={registryProps.slotPaddingH}
      paddingV={registryProps.slotPaddingV}
      color={registryProps.slotColor}
      surfaceFill={registryProps.labelSurfaceFill}
      surfaceBorder={registryProps.labelSurfaceBorder}
      hatchBase={registryProps.hatchBase}
      hatchStripe1={registryProps.hatchStripe1}
      hatchStripe2={registryProps.hatchStripe2}
      borderRadius={registryProps.labelBorderRadius}
      letterSpacingEm={registryProps.labelLetterSpacing}
      typography={node.labelFont ?? "marist"}
    />
  )
}
