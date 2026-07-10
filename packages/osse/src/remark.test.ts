/**
 * Smoke test for remarkOsse fence → MDX JSX transform.
 */
import { describe, expect, it } from "vitest"
import { remarkOsse, OSSE_FENCE_LANGS } from "./remark"

describe("remarkOsse", () => {
  it("exposes osse fence langs", () => {
    expect(OSSE_FENCE_LANGS).toContain("osse")
    expect(OSSE_FENCE_LANGS).toContain("ens-osse")
  })

  it("replaces osse fences with OsseEmbed JSX nodes", () => {
    const tree = {
      type: "root" as const,
      children: [
        {
          type: "code" as const,
          lang: "osse",
          value: "graph TD\n  a[A] --> b{B}",
        },
        {
          type: "code" as const,
          lang: "js",
          value: "const x = 1",
        },
      ],
    }
    remarkOsse()(tree)
    expect(tree.children[0]).toMatchObject({
      type: "mdxJsxFlowElement",
      name: "OsseEmbed",
    })
    const attrs = (
      tree.children[0] as unknown as { attributes: Array<{ name: string; value: string }> }
    ).attributes
    expect(attrs.find((a) => a.name === "mermaid")?.value).toContain("graph TD")
    expect(tree.children[1]).toMatchObject({ type: "code", lang: "js" })
  })
})
