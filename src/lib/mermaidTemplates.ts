/**
 * Preset Mermaid sources for the sidebar editor. Thumbnails live under /public/templates/.
 */

export interface MermaidTemplate {
  id: string
  title: string
  description?: string
  /** Path served from site root, e.g. /templates/foo.png */
  thumbnailSrc?: string
  source: string
}

/**
 * ENS v2 nested-column preset.
 * Top-level Mermaid edge remains canonical; comment lines mirror the injected nested `children` tree
 * so the editor source reflects the rendered diagram structure.
 */
export const NESTED_COLUMN_MERMAID = `graph TD
  registry-root[Registry] --> resolvers{Resolvers # stack=3}
  %% nested children rendered inside registry-root:
  %% <root> # frame=single | owner: 0x0123...
  %% eth # frame=single | owner: 0x0123...
  %% workemon.eth # frame=single | owner: 0x0123...
  %% wallet.workemon.eth # frame=single
  %%   - owner: 0x0123...
  %%   - resolver: 0x6789... # dashed
  %% delegate.workemon.eth # frame=single
  %%   - owner: 0x0123...
  %%   - resolver: 0x6789... # dashed`

/**
 * Classic flat ENS-style registry tree: &lt;root&gt; → eth → workemon.eth with hatched slots,
 * resolver branch, and subdomain leaves (reference layout).
 */
export const CLASSIC_ENS_TREE_MERMAID = `graph TD
  root[<root>|eth]
  ethR[eth|workemon]
  workemon[workemon.eth|delegate|wallet]
  resolver1{Resolver 1}
  delegateR[delegate.workemon.eth]
  walletR[wallet.workemon.eth]
  root --> ethR # fromSlot=0
  ethR --> workemon # fromSlot=0
  ethR --> resolver1 # fromSlot=0
  workemon --> delegateR # fromSlot=0
  workemon --> walletR # fromSlot=1`

export const MERMAID_TEMPLATES: MermaidTemplate[] = [
  {
    id: "nested-column",
    title: "ENS v2 registry column",
    description:
      "Registry shell with nested names (owner lines + resolver cards) and a stacked Resolvers node. Mermaid includes a commented hierarchy map; runtime still merges JSON children onto registry-root (see nestedColumnDemoData).",
    thumbnailSrc: "/templates/nested-registry-ens-v2-reference.png",
    source: NESTED_COLUMN_MERMAID,
  },
  {
    id: "classic-ens-tree",
    title: "ENS registry tree",
    description:
      "Flat tree: <root> → eth → workemon.eth with hatched slots, resolver branch, and leaves (see thumbnail).",
    thumbnailSrc: "/templates/ens-registry-tree-reference.png",
    source: CLASSIC_ENS_TREE_MERMAID,
  },
  {
    id: "minimal",
    title: "Minimal",
    description: "Two registry-style nodes and one edge — no presets or JSON merge.",
    source: `graph TD
  a[A]
  b[B]
  a --> b`,
  },
]

export const MERMAID_TEMPLATE_CUSTOM = "custom"

export function normalizeMermaid(src: string): string {
  return src
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join("\n")
}

/**
 * Normalize Mermaid for preset identity (sidebar selection + `nested-column` JSON merge).
 * First-line `flowchart TD` is treated like `graph TD` so pasted Mermaid still matches.
 */
export function canonicalPresetMermaid(src: string): string {
  const lines = normalizeMermaid(src).split("\n")
  if (lines.length > 0 && /^flowchart\b/i.test(lines[0])) {
    lines[0] = lines[0].replace(/^flowchart/i, "graph")
  }
  return lines.join("\n")
}

export function findTemplateIdForSource(src: string): string | undefined {
  const n = canonicalPresetMermaid(src)
  for (const t of MERMAID_TEMPLATES) {
    if (canonicalPresetMermaid(t.source) === n) return t.id
  }
  return undefined
}
