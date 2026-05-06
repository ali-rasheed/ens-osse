/**
 * Figma-style nested registry column used only when the editor matches the `nested-column`
 * preset (`findTemplateIdForSource` → ENS v2 registry column template).
 * Mermaid still cannot encode runtime `children`; the template now includes a comment hierarchy, while
 * this module provides the authoritative NodeData JSON merged onto `registry-root`.
 */
import type { NodeData } from "../components/RegistryDiagram/types"
import { findTemplateIdForSource } from "./mermaidTemplates"

export const NESTED_COLUMN_ROOT_ID = "registry-root" as const

/** Full registry node including nested children (merged onto parsed Mermaid for the nested preset). */
export const NESTED_COLUMN_REGISTRY_ROOT: NodeData = {
  id: NESTED_COLUMN_ROOT_ID,
  label: "Registry",
  type: "registry",
  children: [
    {
      id: "nest-root",
      label: "<root>",
      type: "registry",
      registryFrame: "single",
      slots: ["owner: 0x0123..."],
    },
    {
      id: "nest-eth",
      label: "eth",
      type: "registry",
      registryFrame: "single",
      slots: ["owner: 0x0123..."],
    },
    {
      id: "nest-workemon",
      label: "workemon.eth",
      type: "registry",
      registryFrame: "single",
      slots: ["owner: 0x0123..."],
    },
    {
      id: "nest-wallet",
      label: "wallet.workemon.eth",
      type: "registry",
      registryFrame: "single",
      children: [
        { id: "w-owner", label: "owner: 0x0123...", type: "label" },
        { id: "w-res", label: "resolver: 0x6789...", type: "dashed" },
      ],
    },
    {
      id: "nest-delegate",
      label: "delegate.workemon.eth",
      type: "registry",
      registryFrame: "single",
      children: [
        { id: "d-owner", label: "owner: 0x0123...", type: "label" },
        { id: "d-res", label: "resolver: 0x6789...", type: "dashed" },
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
