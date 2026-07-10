/**
 * Remark plugin: turn fenced `osse` (or `ens-osse`) code blocks into MDX `<OsseEmbed />`.
 *
 * Usage (MDX pipeline):
 *   import remarkOsse from '@ensdomains/osse/remark'
 *   remarkPlugins: [remarkOsse]
 *
 * Fence:
 *   ```osse
 *   ---
 *   theme: protocol
 *   ---
 *   graph TD
 *     a[eth] --> b{Resolver}
 *   ```
 */
import type { Code, Root } from "mdast"
import { visit } from "unist-util-visit"

export const OSSE_FENCE_LANGS = ["osse", "ens-osse"] as const

export interface RemarkOsseOptions {
  /** MDX component name. Default `OsseEmbed`. */
  component?: string
  /** Extra fence language tags to treat as Ossë. */
  languages?: string[]
  /** Default `mode` prop when frontmatter has no theme. */
  defaultMode?: string
}

function isOsseFence(lang: string | null | undefined, languages: string[]): boolean {
  if (!lang) return false
  const base = lang.split(/\s+/)[0]?.toLowerCase() ?? ""
  return languages.includes(base)
}

function escapeJsxAttribute(value: string): string {
  return JSON.stringify(value)
}

/**
 * remark plugin factory. Returns a transformer that replaces matching code fences
 * with an MDX JSX element node (`mdxJsxFlowElement`) when the host supports it,
 * otherwise a raw HTML-like paragraph fallback is not used — MDX hosts should
 * enable `remark-mdx` so `mdxJsxFlowElement` is valid.
 */
export function remarkOsse(options: RemarkOsseOptions = {}) {
  const component = options.component ?? "OsseEmbed"
  const languages = (options.languages ?? [...OSSE_FENCE_LANGS]).map((l) => l.toLowerCase())
  const defaultMode = options.defaultMode ?? "light"

  return function remarkOsseTransformer(tree: Root) {
    visit(tree, "code", (node: Code, index, parent) => {
      if (index == null || parent == null) return
      if (!isOsseFence(node.lang, languages)) return

      const mermaid = node.value
      const jsx = {
        type: "mdxJsxFlowElement",
        name: component,
        attributes: [
          {
            type: "mdxJsxAttribute",
            name: "mermaid",
            value: mermaid,
          },
          {
            type: "mdxJsxAttribute",
            name: "mode",
            value: defaultMode,
          },
        ],
        children: [],
        data: {
          _mdxExplicitJsx: true,
        },
      }

      // Prefer structured JSX; also stash a string form for debug / non-MDX hosts.
      ;(jsx as { value?: string }).value = `<${component} mermaid={${escapeJsxAttribute(mermaid)}} mode="${defaultMode}" />`

      parent.children.splice(index, 1, jsx as unknown as Code)
    })
  }
}

export default remarkOsse
