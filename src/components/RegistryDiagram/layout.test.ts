/**
 * Layout routing assertions — polyline shape per edge class and smoke tests for preset graphs.
 */
import { describe, expect, it } from "vitest"
import { parseMermaid } from "../../lib/mermaid"
import {
  CLASSIC_ENS_TREE_MERMAID,
  ENSV2_ALIAS_SIBLINGS_MERMAID,
  ENSV2_DELEGATED_RECORDS_MERMAID,
  NESTED_COLUMN_MERMAID,
} from "../../lib/mermaidTemplates"
import { mergeNestedColumnDemoNodes } from "../../lib/nestedColumnDemoData"
import {
  buildHierarchyEdgePolyline,
  computeLayout,
  isHierarchySolidEdge,
} from "./layout"
import type { PositionedNode } from "./types"

const EPS = 1.5

const defaultLayoutOptions = {
  ranksep: 70,
  nodesep: 50,
  cornerRadius: 10,
}

function expectBottomCenter(
  point: { x: number; y: number },
  node: PositionedNode,
  epsilon = EPS
) {
  expect(Math.abs(point.x - (node.x + node.width / 2))).toBeLessThan(epsilon)
  expect(Math.abs(point.y - (node.y + node.height))).toBeLessThan(epsilon)
}

function expectTopCenter(
  point: { x: number; y: number },
  node: PositionedNode,
  epsilon = EPS
) {
  expect(Math.abs(point.x - (node.x + node.width / 2))).toBeLessThan(epsilon)
  expect(Math.abs(point.y - node.y)).toBeLessThan(epsilon)
}

function edgeByKey(
  layout: ReturnType<typeof computeLayout>,
  from: string,
  to: string
) {
  const idx = layout.edges.findIndex((e) => e.from === from && e.to === to)
  expect(idx).toBeGreaterThanOrEqual(0)
  return layout.edges[idx]
}

describe("ENS v2 alias siblings — hierarchy and alias routing", () => {
  const { nodes, edges } = parseMermaid(ENSV2_ALIAS_SIBLINGS_MERMAID)
  const layout = computeLayout(nodes, edges, defaultLayoutOptions)
  const nodeById = new Map(layout.nodes.map((n) => [n.id, n]))

  it("classifies parent→child solid edges as hierarchy", () => {
    for (const child of ["prod", "dev", "staging"]) {
      const edge = edges.find((e) => e.from === "workemon" && e.to === child)!
      const from = nodeById.get("workemon")
      const to = nodeById.get(child)
      expect(isHierarchySolidEdge(edge, from, to)).toBe(true)
    }
  })

  it("routes workemon → children with bottom-center tail and vertical-first segment", () => {
    const workemon = nodeById.get("workemon")!
    for (const childId of ["prod", "dev", "staging"]) {
      const child = nodeById.get(childId)!
      const pe = edgeByKey(layout, "workemon", childId)
      expect(pe.points.length).toBeGreaterThanOrEqual(2)

      expectBottomCenter(pe.points[0], workemon)
      expectTopCenter(pe.points[pe.points.length - 1], child)

      if (pe.points.length >= 2) {
        const dx0 = Math.abs(pe.points[1].x - pe.points[0].x)
        const dy0 = Math.abs(pe.points[1].y - pe.points[0].y)
        expect(dx0 < EPS || dy0 < EPS).toBe(true)
        if (pe.points.length >= 3) {
          expect(Math.abs(pe.points[1].x - pe.points[0].x)).toBeLessThan(EPS)
        }
      }

      const expected = buildHierarchyEdgePolyline(workemon, child, "vhv")
      expect(pe.points[0]).toMatchObject({ x: expected[0].x, y: expected[0].y })
      expect(pe.points[pe.points.length - 1]).toMatchObject({
        x: expected[expected.length - 1].x,
        y: expected[expected.length - 1].y,
      })
    }
  })

  it("routes sibling alias edges into prod top-center via a lane below nodes", () => {
    const prod = nodeById.get("prod")!

    for (const sourceId of ["dev", "staging"]) {
      const source = nodeById.get(sourceId)!
      const pe = edgeByKey(layout, sourceId, "prod")
      const maxBottom = Math.max(source.y + source.height, prod.y + prod.height)

      expectBottomCenter(pe.points[0], source)
      expectTopCenter(pe.points[pe.points.length - 1], prod)

      const interiorMaxY = Math.max(...pe.points.slice(1, -1).map((p) => p.y), -Infinity)
      expect(interiorMaxY).toBeGreaterThan(maxBottom - EPS)
    }
  })
})

describe("classic ENS tree — slot-anchored smoke", () => {
  const { nodes, edges } = parseMermaid(CLASSIC_ENS_TREE_MERMAID)
  const layout = computeLayout(nodes, edges, defaultLayoutOptions)

  it("completes layout with slot-anchored edges and sane bbox", () => {
    expect(layout.width).toBeGreaterThan(0)
    expect(layout.height).toBeGreaterThan(0)
    expect(Number.isFinite(layout.width)).toBe(true)
    expect(Number.isFinite(layout.height)).toBe(true)

    const slotted = edges.filter((e) => e.fromSlotIndex !== undefined)
    expect(slotted.length).toBeGreaterThan(0)

    for (const edge of slotted) {
      const pe = layout.edges.find((e) => e.from === edge.from && e.to === edge.to)!
      expect(pe.points.length).toBeGreaterThanOrEqual(2)
      for (const p of pe.points) {
        expect(Number.isNaN(p.x)).toBe(false)
        expect(Number.isNaN(p.y)).toBe(false)
      }
    }

    for (const id of ["ethR", "workemon"]) {
      const touching = layout.edges.filter((e) => e.from === id || e.to === id)
      expect(touching.some((e) => e.points.length >= 2)).toBe(true)
    }
  })
})

describe("ENS v2 delegated records — hierarchy fan-out smoke", () => {
  const { nodes, edges } = parseMermaid(ENSV2_DELEGATED_RECORDS_MERMAID)
  const layout = computeLayout(nodes, edges, defaultLayoutOptions)
  const nodeById = new Map(layout.nodes.map((n) => [n.id, n]))
  const workemon = nodeById.get("workemon")!

  it("routes two solid edges from workemon to child top halves", () => {
    const childEdges = layout.edges.filter((e) => e.from === "workemon")
    expect(childEdges).toHaveLength(2)

    for (const pe of childEdges) {
      const child = nodeById.get(pe.to)!
      expectBottomCenter(pe.points[0], workemon)
      const head = pe.points[pe.points.length - 1]
      expect(head.y).toBeLessThanOrEqual(child.y + child.height / 2 + EPS)
      expectTopCenter(head, child)
    }
  })
})

describe("nested column — compound registry smoke", () => {
  const parsed = parseMermaid(NESTED_COLUMN_MERMAID)
  const nodes = mergeNestedColumnDemoNodes(parsed.nodes, NESTED_COLUMN_MERMAID)
  const layout = computeLayout(nodes, parsed.edges, defaultLayoutOptions)

  it("merges nested children and produces a valid compound layout", () => {
    const root = layout.nodes.find((n) => n.id === "registry-root")
    expect(root?.children?.length).toBeGreaterThan(0)
    expect(layout.width).toBeGreaterThan(0)
    expect(layout.height).toBeGreaterThan(0)
    expect(root!.width).toBeGreaterThan(0)
    expect(root!.height).toBeGreaterThan(0)

    for (const p of layout.edges.flatMap((e) => e.points)) {
      expect(Number.isNaN(p.x)).toBe(false)
      expect(Number.isNaN(p.y)).toBe(false)
    }
  })
})
