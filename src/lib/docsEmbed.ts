/**
 * Builds a copy-paste artifact for ENS docs (MDX): JSON payload + example stub.
 * Payload is Mermaid + theme only. The “ENS v2 registry column” (`nested-column`) full layout in the demo app
 * also applies `mergeNestedColumnDemoNodes` from `nestedColumnDemoData.ts`; embed consumers must
 * replicate that or pass `NodeData[]` if they need the same nested JSON.
 */
import type { DiagramMode } from "../components/RegistryDiagram/theme"

export const ENS_REGISTRY_DIAGRAM_SCHEMA = "ens-registry-diagram/v1" as const

export interface DocsEmbedPayload {
  schema: typeof ENS_REGISTRY_DIAGRAM_SCHEMA
  mermaid: string
  mode: DiagramMode
}

export function buildDocsEmbedSnippet(mermaid: string, mode: DiagramMode): string {
  const payload: DocsEmbedPayload = {
    schema: ENS_REGISTRY_DIAGRAM_SCHEMA,
    mermaid,
    mode,
  }
  const json = JSON.stringify(payload, null, 2)
  const mermaidOneLine = JSON.stringify(mermaid)

  return [
    "{/* ENS Registry Diagram — embed payload for docs (e.g. ensdomains/docs). */}",
    "",
    "Payload (JSON):",
    "",
    "```json",
    json,
    "```",
    "",
    "Example MDX once an embed component exists in the docs app:",
    "",
    "```mdx",
    "<RegistryDiagramEmbed",
    `  mermaid={${mermaidOneLine}}`,
    `  mode="${mode}"`,
    "/>",
    "```",
    "",
    "Until then: store the JSON in your page bundle or pass `mermaid` + `mode` props to your diagram wrapper.",
  ].join("\n")
}
