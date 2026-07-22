/**
 * Figma-style nested registry column used only when the editor matches the `nested-column`
 * preset (`findTemplateIdForSource` → ENS v2 registry column template).
 * Mermaid `subgraph` blocks now encode `children`; this module is a legacy fallback when the
 * parsed graph has no `children` on `registry-root`.
 */
import type { NodeData } from "@ensdomains/osse"
import { findTemplateIdForSource } from "./mermaidTemplates"

export const NESTED_COLUMN_ROOT_ID = "registry-root" as const

/** Full registry node including nested children (merged onto parsed Mermaid for the nested preset). */
export const NESTED_COLUMN_REGISTRY_ROOT: NodeData = {
  id: NESTED_COLUMN_ROOT_ID,
  title: "Registry",
  type: "registry",
  children: [
    {
      id: "nest-root",
      title: "<root>",
      type: "registry",
      registryFrame: "single",
      slots: ["owner: 0x0123..."],
    },
    {
      id: "nest-eth",
      title: "eth",
      type: "registry",
      registryFrame: "single",
      slots: ["owner: 0x0123..."],
    },
    {
      id: "nest-workemon",
      title: "workemon.eth",
      type: "registry",
      registryFrame: "single",
      slots: ["owner: 0x0123..."],
    },
    {
      id: "nest-wallet",
      title: "wallet.workemon.eth",
      type: "registry",
      registryFrame: "single",
      children: [
        { id: "w-owner", title: "owner: 0x0123...", type: "pill" },
        { id: "w-res", title: "resolver: 0x6789...", type: "resolver" },
      ],
    },
    {
      id: "nest-delegate",
      title: "delegate.workemon.eth",
      type: "registry",
      registryFrame: "single",
      children: [
        { id: "d-owner", title: "owner: 0x0123...", type: "pill" },
        { id: "d-res", title: "resolver: 0x6789...", type: "resolver" },
      ],
    },
  ],
}

export function isNestedColumnPresetSource(mermaid: string): boolean {
  return findTemplateIdForSource(mermaid) === "nested-column"
}

/** When the nested-column preset is active, attach bundled `children` to `registry-root` if it has none. */
export function mergeNestedColumnDemoNodes(nodes: NodeData[], mermaid: string): NodeData[] {
  if (!isNestedColumnPresetSource(mermaid)) return nodes
  return nodes.map((n) => {
    if (n.id !== NESTED_COLUMN_ROOT_ID || n.type !== "registry") return n
    if (n.children?.length) return n
    const children = NESTED_COLUMN_REGISTRY_ROOT.children
    return children ? { ...n, children } : n
  })
}
