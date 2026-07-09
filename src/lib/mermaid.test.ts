import { describe, expect, it } from "vitest"
import { parseMermaid, serializeMermaid } from "./mermaid"
import {
  ENSV2_ALIAS_SIBLINGS_MERMAID,
  ENSV2_DELEGATED_RECORDS_MERMAID,
  ENSV2_FLEXIBLE_REGISTRY_MERMAID,
} from "./mermaidTemplates"

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
