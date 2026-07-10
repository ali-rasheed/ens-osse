/**
 * Builds a copy-paste artifact for ENS docs (MDX): JSON payload + example stub.
 * Payload is Mermaid + theme (+ optional caption). The “ENS v2 registry column” (`nested-column`)
 * full layout in the demo app also applies `mergeNestedColumnDemoNodes` from `nestedColumnDemoData.ts`;
 * embed consumers must replicate that or pass `NodeData[]` if they need the same nested JSON.
 *
 * Schema and public names: `docs/naming.md`.
 */
import {
  OSSE_EMBED_SCHEMA,
  buildOsseEmbedPayload,
  type DiagramMode,
} from "@ensdomains/osse"

export { OSSE_EMBED_SCHEMA }

export interface DocsEmbedPayload {
  schema: typeof OSSE_EMBED_SCHEMA
  mermaid: string
  mode: DiagramMode
  /** Optional prose from `%% caption:` in Mermaid source. */
  caption?: string
}

export function buildDocsEmbedSnippet(
  mermaid: string,
  mode: DiagramMode,
  caption?: string
): string {
  const payload = buildOsseEmbedPayload(mermaid, mode, caption)
  const json = JSON.stringify(payload, null, 2)
  const mermaidOneLine = JSON.stringify(mermaid)

  const captionProp = caption?.trim()
    ? `\n  caption={${JSON.stringify(caption.trim())}}`
    : ""

  return [
    "{/* ENS Ossë — embed payload for docs (e.g. ensdomains/docs). */}",
    "",
    "Payload (JSON):",
    "",
    "```json",
    json,
    "```",
    "",
    "Example MDX (fence language `osse` + remark plugin `@ensdomains/osse/remark`):",
    "",
    "```mdx",
    "<OsseEmbed",
    `  mermaid={${mermaidOneLine}}`,
    `  mode="${mode}"${captionProp}`,
    "/>",
    "```",
    "",
    "Or write a fenced block:",
    "",
    "```osse",
    mermaid.trim(),
    "```",
  ].join("\n")
}
