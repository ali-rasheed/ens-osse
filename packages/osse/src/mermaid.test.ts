import { describe, expect, it } from "vitest"
import { parseMermaid, serializeMermaid } from "./mermaid"
import {
  ENSV2_ALIAS_SIBLINGS_MERMAID,
  ENSV2_DELEGATED_RECORDS_MERMAID,
  ENSV2_FLEXIBLE_REGISTRY_MERMAID,
} from "../../../src/lib/mermaidTemplates"

describe("parseMermaid — ENS v2 alias siblings", () => {
  it("parses chained parent edges and dotted alias links", () => {
    const { nodes, edges, error } = parseMermaid(ENSV2_ALIAS_SIBLINGS_MERMAID)
    expect(error).toBeUndefined()
    expect(edges).toHaveLength(5)

    const parentEdges = edges.filter((e) => e.linkStyle === "solid" || !e.linkStyle)
    expect(parentEdges).toHaveLength(3)
    expect(parentEdges.map((e) => e.to).sort()).toEqual(["dev", "prod", "staging"])

    const aliasEdges = edges.filter((e) => e.linkStyle === "dotted")
    expect(aliasEdges).toHaveLength(2)
    expect(aliasEdges.every((e) => e.label === "alias")).toBe(true)
    expect(aliasEdges.map((e) => e.from).sort()).toEqual(["dev", "staging"])
    expect(aliasEdges.every((e) => e.to === "prod")).toBe(true)

    const prod = nodes.find((n) => n.id === "prod")
    expect(prod?.bodyLines).toEqual(["addr: 0x...", "avatar: ipfs://..."])
    const workemon = nodes.find((n) => n.id === "workemon")
    expect(workemon?.bodyLines).toEqual(["owner: 0xAlice"])
  })
})

describe("parseMermaid — ENS v2 delegated records", () => {
  it("parses delegated body lines on subnames", () => {
    const { nodes, edges, error } = parseMermaid(ENSV2_DELEGATED_RECORDS_MERMAID)
    expect(error).toBeUndefined()
    expect(edges).toHaveLength(2)

    const app = nodes.find((n) => n.id === "app")
    expect(app?.bodyLines?.every((l) => l.includes("(delegated)"))).toBe(true)

    const brand = nodes.find((n) => n.id === "brand")
    expect(brand?.bodyLines).toHaveLength(2)
  })
})

describe("parseMermaid — caption directive", () => {
  it("extracts %% caption: prose", () => {
    const { caption, error } = parseMermaid(ENSV2_FLEXIBLE_REGISTRY_MERMAID)
    expect(error).toBeUndefined()
    expect(caption).toMatch(/Set your own rules/)
  })
})

describe("serializeMermaid round-trip", () => {
  it("emits dotted alias edges and multiline quoted labels", () => {
    const parsed = parseMermaid(ENSV2_ALIAS_SIBLINGS_MERMAID)
    const out = serializeMermaid(parsed.nodes, parsed.edges)
    expect(out).toContain("-. alias .->")
    expect(out).toContain("<br/>")
  })
})

describe("graph directions", () => {
  it.each(["TD", "TB", "LR", "RL", "BT"] as const)("parses graph %s", (dir) => {
    const { direction, error } = parseMermaid(`graph ${dir}\n  a[A] --> b[B]`)
    expect(error).toBeUndefined()
    expect(direction).toBe(dir)
  })

  it("round-trips direction through serializeMermaid", () => {
    const src = `graph LR
  a[A] --> b[B]`
    const parsed = parseMermaid(src)
    const out = serializeMermaid(parsed.nodes, parsed.edges, { direction: parsed.direction })
    expect(out.startsWith("graph LR")).toBe(true)
    const again = parseMermaid(out)
    expect(again.direction).toBe("LR")
    expect(again.error).toBeUndefined()
  })
})

describe("subgraph / nested registries", () => {
  const nestedSrc = `graph TD
  subgraph registry-root[Registry]
    nest-root[<root> # frame=single | owner: 0x0123...]
    subgraph nest-wallet[wallet.workemon.eth # frame=single]
      w-owner(owner: 0x0123...)
      w-res{resolver: 0x6789...}
    end
  end
  registry-root --> resolvers{Resolvers # stack=3}`

  it("maps subgraph blocks to registry children", () => {
    const { nodes, edges, error } = parseMermaid(nestedSrc)
    expect(error).toBeUndefined()
    const root = nodes.find((n) => n.id === "registry-root")
    expect(root?.children).toHaveLength(2)
    expect(root?.children?.[0]).toMatchObject({ id: "nest-root", type: "registry", registryFrame: "single" })
    const wallet = root?.children?.find((c) => c.id === "nest-wallet")
    expect(wallet?.children).toHaveLength(2)
    expect(wallet?.children?.map((c) => c.id)).toEqual(["w-owner", "w-res"])
    expect(edges).toHaveLength(1)
    expect(edges[0]).toMatchObject({ from: "registry-root", to: "resolvers" })
  })

  it("round-trips subgraph children and direction", () => {
    const parsed = parseMermaid(nestedSrc)
    const out = serializeMermaid(parsed.nodes, parsed.edges, { direction: parsed.direction })
    expect(out).toContain("subgraph registry-root[Registry]")
    expect(out).toContain("subgraph nest-wallet[wallet.workemon.eth # frame=single]")
    expect(out).toContain("w-owner(owner: 0x0123...)")
    const again = parseMermaid(out)
    expect(again.error).toBeUndefined()
    expect(again.direction).toBe("TD")
    const root = again.nodes.find((n) => n.id === "registry-root")
    expect(root?.children?.find((c) => c.id === "nest-wallet")?.children).toHaveLength(2)
  })

  it("auto-creates undeclared ids inside subgraph children", () => {
    const { nodes, diagnostics, error } = parseMermaid(`graph TD
  subgraph group[Group]
    a[A] --> ghost
  end`)
    expect(error).toBeUndefined()
    const group = nodes.find((n) => n.id === "group")
    expect(group?.children?.find((c) => c.id === "ghost")).toMatchObject({ type: "registry" })
    expect(diagnostics?.[0]?.severity).toBe("warning")
  })

  it("errors on unexpected end", () => {
    const { error } = parseMermaid(`graph TD
  end`)
    expect(error).toMatch(/Unexpected `end`/)
  })

  it("errors on unclosed subgraph", () => {
    const { error } = parseMermaid(`graph TD
  subgraph open[Open]
    a[A]`)
    expect(error).toMatch(/Unclosed `subgraph`/)
  })
})

describe("chained edges", () => {
  it("expands A --> B & C into two edges", () => {
    const { edges } = parseMermaid(`graph TD
  a[A]
  b[B]
  c[C]
  a --> b & c`)
    expect(edges).toHaveLength(2)
    expect(edges.map((e) => e.to).sort()).toEqual(["b", "c"])
  })
})

describe("YAML frontmatter", () => {
  it("parses theme, animation, stagger, pulse, and fit", () => {
    const src = `---
theme: protocol
animation: { preset: draw, stagger: 0.4 }
pulse: { from: root, to: resolver1 }
fit: clamp
---
graph TD
  root[eth] --> resolver1{Resolver}
`
    const { nodes, edges, frontmatter, error } = parseMermaid(src)
    expect(error).toBeUndefined()
    expect(nodes).toHaveLength(2)
    expect(edges).toHaveLength(1)
    expect(frontmatter?.theme).toBe("protocol")
    expect(frontmatter?.animation?.preset).toBe("draw")
    expect(frontmatter?.animation?.stagger).toBe(0.4)
    expect(frontmatter?.pulse?.from).toBe("root")
    expect(frontmatter?.pulse?.to).toBe("resolver1")
    expect(frontmatter?.fit).toBe("clamp")
  })

  it("maps theme docs to light", () => {
    const { frontmatter, error } = parseMermaid(`---
theme: docs
---
graph TD
  a[A]
`)
    expect(error).toBeUndefined()
    expect(frontmatter?.theme).toBe("light")
  })

  it("accepts top-level stagger into animation", () => {
    const { frontmatter, error } = parseMermaid(`---
animation: fade
stagger: 0.2
---
graph TD
  a[A]
`)
    expect(error).toBeUndefined()
    expect(frontmatter?.animation?.preset).toBe("fade")
    expect(frontmatter?.animation?.stagger).toBe(0.2)
  })

  it("reports frontmatter errors with a line number", () => {
    const { error, diagnostics } = parseMermaid(`---
theme: neon
---
graph TD
  a[A]
`)
    expect(error).toMatch(/^Line 2: /)
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics?.[0]).toMatchObject({ line: 2, severity: "error" })
  })

  it("parses strict: true", () => {
    const { frontmatter, error } = parseMermaid(`---
strict: true
---
graph TD
  a[A] --> b[B]
`)
    expect(error).toBeUndefined()
    expect(frontmatter?.strict).toBe(true)
  })
})

describe("strict mode & undeclared-id diagnostics", () => {
  it("auto-creates undeclared edge targets and warns (non-strict default)", () => {
    const { nodes, edges, error, diagnostics } = parseMermaid(`graph TD
  a[Registry A] --> b`)
    expect(error).toBeUndefined()
    expect(edges).toHaveLength(1)
    const b = nodes.find((n) => n.id === "b")
    expect(b).toMatchObject({ id: "b", title: "b", type: "registry" })
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics?.[0]).toMatchObject({ severity: "warning", line: 2 })
    expect(diagnostics?.[0].message).toMatch(/Undeclared node id "b"/)
  })

  it("hard-fails on undeclared edge targets in strict mode", () => {
    const { nodes, edges, error, diagnostics } = parseMermaid(
      `graph TD
  a[Registry A] --> b`,
      { strict: true }
    )
    expect(nodes).toHaveLength(0)
    expect(edges).toHaveLength(0)
    expect(error).toMatch(/Line 2/)
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics?.[0]).toMatchObject({ severity: "error", line: 2 })
    expect(diagnostics?.[0].message).toMatch(/Undeclared node id "b"/)
  })

  it("does not warn when the id is declared elsewhere in the source", () => {
    const { error, diagnostics } = parseMermaid(
      `graph TD
  a[Registry A] --> b
  b[Registry B]`,
      { strict: true }
    )
    expect(error).toBeUndefined()
    expect(diagnostics).toBeUndefined()
  })

  it("frontmatter strict: true is honored without an explicit option", () => {
    const { error } = parseMermaid(`---
strict: true
---
graph TD
  a[A] --> typo`)
    expect(error).toMatch(/Undeclared node id "typo"/)
  })

  it("an explicit strict option overrides frontmatter strict", () => {
    const { error } = parseMermaid(
      `---
strict: true
---
graph TD
  a[A] --> typo`,
      { strict: false }
    )
    expect(error).toBeUndefined()
  })
})

describe("line-level syntax diagnostics", () => {
  it("reports the failing line number for an unparseable node", () => {
    const { nodes, edges, error, diagnostics } = parseMermaid(`graph TD
  a[A]
  b[[Bad Shape]]`)
    expect(nodes).toHaveLength(0)
    expect(edges).toHaveLength(0)
    expect(error).toMatch(/^Line 3:\d+: /)
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics?.[0].severity).toBe("error")
    expect(diagnostics?.[0].line).toBe(3)
  })

  it("collects multiple line-level errors in one pass", () => {
    const { diagnostics } = parseMermaid(`graph TD
  a[[Bad One]]
  b[[Bad Two]]`)
    expect(diagnostics).toHaveLength(2)
    expect(diagnostics?.map((d) => d.line)).toEqual([2, 3])
  })
})
