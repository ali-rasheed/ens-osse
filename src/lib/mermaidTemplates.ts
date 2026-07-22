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
 * ENS v2 nested-column preset — subgraph syntax maps to `registry-root.children`.
 */
export const NESTED_COLUMN_MERMAID = `graph TD
  subgraph registry-root[Registry]
    nest-root[<root> # frame=single | owner: 0x0123...]
    nest-eth[eth # frame=single | owner: 0x0123...]
    nest-workemon[workemon.eth # frame=single | owner: 0x0123...]
    subgraph nest-wallet[wallet.workemon.eth # frame=single]
      w-owner(owner: 0x0123...)
      w-res{resolver: 0x6789...}
    end
    subgraph nest-delegate[delegate.workemon.eth # frame=single]
      d-owner(owner: 0x0123...)
      d-res{resolver: 0x6789...}
    end
  end
  registry-root --> resolvers{Resolvers # stack=3}`

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

export const ENSV2_ALIAS_SIBLINGS_MERMAID = `flowchart TD
  workemon["workemon.eth<br/>owner: 0xAlice"]
  prod["prod.workemon.eth<br/>addr: 0x...<br/>avatar: ipfs://..."]
  dev[dev.workemon.eth]
  staging[staging.workemon.eth]
  workemon --> prod & dev & staging
  dev -. alias .-> prod
  staging -. alias .-> prod`

/**
 * ENS v2 per-record delegation on subnames (workemon.eth → app / brand).
 * Comment block mirrors the reference tree; Mermaid `<br/>` body lines render inside each subname.
 */
export const ENSV2_DELEGATED_RECORDS_MERMAID = `flowchart TD
  %% Diagram:
  %% workemon.eth (owner: 0xAlice)
  %% ├── app.workemon.eth
  %% │   ├── addr → 0xDev (delegated)
  %% │   └── text:url → 0xBot (delegated)
  %% └── brand.workemon.eth
  %%     ├── avatar → 0xDesigner (delegated)
  %%     └── text:description → 0xDesigner (delegated)
  workemon["workemon.eth<br/>owner: 0xAlice"]
  app["app.workemon.eth<br/>addr → 0xDev (delegated)<br/>text:url → 0xBot (delegated)"]
  brand["brand.workemon.eth<br/>avatar → 0xDesigner (delegated)<br/>text:description → 0xDesigner (delegated)"]
  workemon --> app & brand`

export const ENSV2_FLEXIBLE_REGISTRY_MERMAID = `%% caption: Set your own rules for how your names are managed with the autonomy to organize your digital presence exactly how you need. This shift to a flexible registry ensures your identity remains adaptable, allowing you to structure =
flowchart TD
  workemon["workemon.eth<br/>owner: 0xAlice"]
  app[app.workemon.eth]
  workemon --> app`

export const MERMAID_TEMPLATES: MermaidTemplate[] = [
  {
    id: "ensv2-delegated-records",
    title: "ENS v2 — workemon delegation tree",
    description:
      "workemon.eth → app / brand with per-record delegation (addr, text:url, avatar). (delegated) lines render as hatched pills.",
    source: ENSV2_DELEGATED_RECORDS_MERMAID,
  },
  {
    id: "ensv2-alias-siblings",
    title: "ENS v2 — alias to sibling",
    description:
      "Parent tree plus Mermaid dotted alias edges (dev/staging → prod). Records on prod via multiline <br/> labels.",
    source: ENSV2_ALIAS_SIBLINGS_MERMAID,
  },
  {
    id: "ensv2-flexible-registry",
    title: "ENS v2 — flexible registry",
    description: "Marketing caption via %% caption: directive below the diagram.",
    source: ENSV2_FLEXIBLE_REGISTRY_MERMAID,
  },
  {
    id: "nested-column",
    title: "ENS v2 registry column",
    description:
      "Registry shell with nested names (owner lines + resolver cards) and a stacked Resolvers node. Subgraph syntax maps to `registry-root.children`; JSON merge is a legacy fallback when children are absent.",
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
    .filter((l) => l.length > 0 && !/^%%\s*caption/i.test(l))
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
