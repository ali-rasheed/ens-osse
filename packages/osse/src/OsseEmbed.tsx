/**
 * Docs/MDX embed: Mermaid source + theme (+ optional caption). Schema: ens-osse/v1.
 */
import { forwardRef, useMemo } from "react"
import type { CSSProperties } from "react"
import { OsseDiagram } from "./OsseDiagram"
import { parseMermaid } from "./mermaid"
import type { DiagramMode } from "./RegistryDiagram/theme"
import type { AnimationConfig, DiagramConfig, PathPulseConfig } from "./RegistryDiagram/types"

export const OSSE_EMBED_SCHEMA = "ens-osse/v1" as const

export interface OsseEmbedPayload {
  schema: typeof OSSE_EMBED_SCHEMA
  mermaid: string
  mode: DiagramMode
  caption?: string
}

export interface OsseEmbedProps {
  mermaid: string
  mode?: DiagramMode
  caption?: string
  animation?: AnimationConfig
  config?: DiagramConfig
  pathPulse?: PathPulseConfig | null
  className?: string
  style?: CSSProperties
}

export const OsseEmbed = forwardRef<HTMLDivElement, OsseEmbedProps>(function OsseEmbed(
  { mermaid, mode = "light", caption, animation, config, pathPulse, className, style },
  ref
) {
  const parsedCaption = useMemo(() => {
    if (caption?.trim()) return caption.trim()
    return parseMermaid(mermaid).caption
  }, [mermaid, caption])

  return (
    <figure className={className} style={style}>
      <OsseDiagram
        ref={ref}
        source={mermaid}
        mode={mode}
        animation={animation}
        config={config}
        pathPulse={pathPulse}
      />
      {parsedCaption ? (
        <figcaption style={{ marginTop: 8, fontSize: 14, opacity: 0.75 }}>{parsedCaption}</figcaption>
      ) : null}
    </figure>
  )
})

OsseEmbed.displayName = "OsseEmbed"

/** Build a typed ens-osse/v1 payload for docs pipelines. */
export function buildOsseEmbedPayload(
  mermaid: string,
  mode: DiagramMode,
  caption?: string
): OsseEmbedPayload {
  return {
    schema: OSSE_EMBED_SCHEMA,
    mermaid,
    mode,
    ...(caption?.trim() ? { caption: caption.trim() } : {}),
  }
}
