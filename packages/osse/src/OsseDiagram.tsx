/**
 * Public diagram entry: accepts either `nodes`/`edges` or Mermaid `source` (with optional YAML frontmatter).
 * Internal canvas remains `RegistryDiagram`.
 */
import { forwardRef, useEffect, useMemo } from "react"
import { RegistryDiagram } from "./RegistryDiagram/index"
import { parseMermaid } from "./mermaid"
import {
  DIAGRAM_PALETTE_BY_MODE,
  type DiagramMode,
} from "./RegistryDiagram/theme"
import type {
  AnimationConfig,
  DiagramConfig,
  EdgeData,
  NodeData,
  PathPulseConfig,
} from "./RegistryDiagram/types"
import type { FitMode } from "./frontmatter"
import type { GraphDirection } from "./mermaid"

export interface OsseDiagramProps {
  /** Mermaid (+ optional YAML frontmatter). When set, overrides `nodes`/`edges`. */
  source?: string
  nodes?: NodeData[]
  edges?: EdgeData[]
  animation?: AnimationConfig
  config?: DiagramConfig
  pathPulse?: PathPulseConfig | null
  /** Appearance mode; frontmatter `theme` wins when `source` is used unless `mode` is set. */
  mode?: DiagramMode
  /** Fit hint for hosts (frontmatter `fit`); not applied by the canvas itself yet. */
  fit?: FitMode
  /**
   * Error (not warn) on undeclared node ids used in edges — the typo trap. Overrides
   * frontmatter `strict:` when set. See `parseMermaid` in `./mermaid`.
   */
  strict?: boolean
  /** Called when parse fails; diagram renders empty. */
  onParseError?: (message: string) => void
}

function paletteConfig(mode: DiagramMode): DiagramConfig {
  const p = DIAGRAM_PALETTE_BY_MODE[mode]
  return {
    mode,
    nodeColor: p.nodeColor,
    labelColor: p.labelColor,
    resolverColor: p.resolverColor,
    resolverLabelColor: p.resolverLabelColor,
    resolverSurfaceFill: p.resolverSurfaceFill,
    resolverSocketColor: p.resolverSocketColor,
    edgeColor: p.edgeColor,
    labelSurfaceFill: p.labelSurfaceFill,
    labelSurfaceBorder: p.labelSurfaceBorder,
    hatchBase: p.hatchBase,
    hatchStripe1: p.hatchStripe1,
    hatchStripe2: p.hatchStripe2,
  }
}

export const OsseDiagram = forwardRef<HTMLDivElement, OsseDiagramProps>(
  function OsseDiagram(
    {
      source,
      nodes: nodesProp,
      edges: edgesProp,
      animation: animationProp,
      config: configProp,
      pathPulse: pathPulseProp,
      mode: modeProp,
      fit: _fit,
      strict,
      onParseError,
    },
    ref
  ) {
    const parsed = useMemo(() => {
      if (source == null) return null
      return parseMermaid(source, { strict })
    }, [source, strict])

    useEffect(() => {
      if (parsed?.error) onParseError?.(parsed.error)
    }, [parsed?.error, onParseError])

    const nodes = source != null ? (parsed?.nodes ?? []) : (nodesProp ?? [])
    const edges = source != null ? (parsed?.edges ?? []) : (edgesProp ?? [])
    const fm = parsed?.frontmatter

    const mode = modeProp ?? fm?.theme ?? configProp?.mode ?? "light"
    const animation: AnimationConfig = {
      ...fm?.animation,
      ...animationProp,
    }
    const pathPulse =
      pathPulseProp !== undefined
        ? pathPulseProp
        : fm?.pulse !== undefined
          ? fm.pulse
          : null

    const config: DiagramConfig = {
      ...paletteConfig(mode),
      ...configProp,
      mode,
    }

    return (
      <RegistryDiagram
        ref={ref}
        nodes={nodes}
        edges={edges}
        animation={animation}
        config={config}
        direction={parsed?.direction}
        pathPulse={pathPulse}
      />
    )
  }
)

OsseDiagram.displayName = "OsseDiagram"
