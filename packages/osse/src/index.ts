/**
 * @ensdomains/osse — ENS Ossë protocol diagrams.
 *
 * Public surface (docs/naming.md):
 * - `OsseDiagram` — primary React export (`source` or nodes/edges)
 * - `OsseEmbed` — docs/MDX embed (`ens-osse/v1`)
 * - Subpaths: `./mermaid`, `./export`, `./remark`
 */

export { OsseDiagram, type OsseDiagramProps } from "./OsseDiagram"
export {
  OsseEmbed,
  OSSE_EMBED_SCHEMA,
  buildOsseEmbedPayload,
  type OsseEmbedProps,
  type OsseEmbedPayload,
} from "./OsseEmbed"

/** Low-level canvas (nodes/edges only). Prefer `OsseDiagram` for Mermaid source. */
export { RegistryDiagram } from "./RegistryDiagram/index"

export {
  parseMermaid,
  serializeMermaid,
  extractFrontmatter,
  parseFrontmatterBlock,
  type ParsedGraph,
  type ParseDiagnostic,
  type ParseMermaidOptions,
  type GraphDirection,
  type SerializeMermaidOptions,
  type OsseFrontmatter,
  type FitMode,
  type FrontmatterParseResult,
} from "./mermaid"

export { downloadDiagramPng, type ExportScale } from "./exportPng"

export type {
  NodeData,
  EdgeData,
  NodeType,
  AnimationConfig,
  DiagramConfig,
  PathPulseConfig,
  PositionedNode,
  PositionedEdge,
  LayoutResult,
  EdgeOrthogonalStyle,
} from "./RegistryDiagram/types"

export type { LinkStyle } from "./RegistryDiagram/linkStyles"
export {
  DIAGRAM_PALETTE_BY_MODE,
  APP_CHROME_BY_MODE,
  DIAGRAM_FONTS,
  ENS_TOKENS,
  DEFAULT_PATH_PULSE_HIGHLIGHT,
  diagramExportBackground,
  protocolMainBackground,
  protocolMainBackgroundSize,
  type DiagramMode,
  type DiagramPalette,
  type AppChromeTheme,
  type DiagramTypography,
} from "./RegistryDiagram/theme"

export {
  ANIMATION_PRESET_OPTIONS,
  DEFAULT_ANIMATION_CONFIG,
  buildVariants,
  resolveAnimationConfig,
} from "./RegistryDiagram/animationConfig"

export {
  computeLayout,
  layoutNodeDimensions,
  type LayoutOptions,
} from "./RegistryDiagram/layout"
