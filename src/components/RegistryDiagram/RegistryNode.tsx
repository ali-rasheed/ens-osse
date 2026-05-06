/**
 * Registry frame: single stroke + inner frame padding (Figma Diagram System). Plain center
 * label, optional hatched `slots` row (top-level compound only), vertical `slots` stack when
 * nested, or recursive `children` column. All label copy uses `letterSpacing: 0.05em` tracking.
 */
import { motion } from "motion/react"
import type { Variants } from "motion/react"
import type { NodeData } from "./types"
import {
  REGISTRY_FRAME_PADDING,
  REGISTRY_HEADER_SLOT_GAP,
  REGISTRY_NESTED_CHILD_GAP,
  REGISTRY_SLOT_CELL_GAP,
  REGISTRY_SLOT_TEXT_GAP,
  layoutNodeDimensions,
  type LayoutOptions,
} from "./layout"
import { LabelNode } from "./LabelNode"
import { DashedNode } from "./DashedNode"

const LABEL_RADIUS = 12

/** Props bundled for compact resolver nodes nested inside a registry column. */
export interface NestedDashedNodeProps {
  fontSize: number
  paddingH: number
  paddingV: number
  borderRadius: number
  borderWidth: number
  color: string
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
  })
  const activeChildren = childNodes?.filter(Boolean) ?? []
  const activeSlots = slots?.filter(Boolean) ?? []
  const showHatchedRow = activeChildren.length === 0 && activeSlots.length > 0 && !nested
  const showTextStack = activeChildren.length === 0 && activeSlots.length > 0 && nested
  const corner = nested ? nestedBorderRadius : borderRadius

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
                fontFamily: "'ABC Monument Grotesk Semi-Mono', ui-monospace, monospace",
                fontWeight: 400,
                fontSize: slotFontSize,
                lineHeight: 1.4,
                letterSpacing: "0.05em",
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
        borderRadius: corner,
        padding: REGISTRY_FRAME_PADDING,
        display: "flex",
        flexDirection: "column",
        alignItems: hasBody ? "stretch" : "center",
        justifyContent: hasBody ? "flex-start" : "center",
        transformOrigin: "0 0",
        alignSelf: nested ? "center" : undefined,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: hasBody ? "stretch" : "center",
          padding: `${paddingV}px ${paddingH}px`,
          boxSizing: "border-box",
          flex: activeChildren.length > 0 ? "1 1 auto" : undefined,
          gap: hasBody ? REGISTRY_HEADER_SLOT_GAP : 0,
          width: hasBody ? "100%" : undefined,
        }}
      >
        {innerColumn}
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
        fontSize={d.fontSize}
        paddingH={d.paddingH}
        paddingV={d.paddingV}
        borderRadius={d.borderRadius}
        borderWidth={d.borderWidth}
        color={d.color}
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
    />
  )
}
