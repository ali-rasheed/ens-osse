/**
 * Layout routing assertions — polyline shape per edge class and smoke tests for preset graphs.
 */
import { describe, expect, it } from "vitest"
import { parseMermaid } from "../mermaid"
import {
  CLASSIC_ENS_TREE_MERMAID,
  ENSV2_ALIAS_SIBLINGS_MERMAID,
  ENSV2_DELEGATED_RECORDS_MERMAID,
  NESTED_COLUMN_MERMAID,
} from "../../../../src/lib/mermaidTemplates"
import { mergeNestedColumnDemoNodes } from "../../../../src/lib/nestedColumnDemoData"
import {
  buildHierarchyEdgePolyline,
  computeLayout,
  insertChamfer45,
  isHierarchySolidEdge,
  OCTILINEAR_CHAMFER,
  validateOctilinear,
} from "./layout"
import type { PositionedNode } from "./types"

const PRESETS: Array<[string, () => ReturnType<typeof computeLayout>]> = [
  [
    "ensv2-alias-siblings",
    () => {
      const { nodes, edges } = parseMermaid(ENSV2_ALIAS_SIBLINGS_MERMAID)
      return computeLayout(nodes, edges, defaultLayoutOptions)
    },
  ],
  [
    "classic-ens-tree",
    () => {
      const { nodes, edges } = parseMermaid(CLASSIC_ENS_TREE_MERMAID)
      return computeLayout(nodes, edges, defaultLayoutOptions)
    },
  ],
  [
    "ensv2-delegated-records",
    () => {
      const { nodes, edges } = parseMermaid(ENSV2_DELEGATED_RECORDS_MERMAID)
      return computeLayout(nodes, edges, defaultLayoutOptions)
    },
  ],
  [
    "nested-column",
    () => {
      const parsed = parseMermaid(NESTED_COLUMN_MERMAID)
      const nodes = mergeNestedColumnDemoNodes(parsed.nodes, NESTED_COLUMN_MERMAID)
      return computeLayout(nodes, parsed.edges, defaultLayoutOptions)
    },
  ],
]

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

  it("keeps prod/dev/staging on the same rank (alias edges excluded from dagre)", () => {
    const ranks = ["prod", "dev", "staging"].map((id) => nodeById.get(id)!.rank)
    expect(new Set(ranks).size).toBe(1)
  })

  it("routes sibling alias edges into prod bottom-center via a lane below nodes", () => {
    const prod = nodeById.get("prod")!

    for (const sourceId of ["dev", "staging"]) {
      const source = nodeById.get(sourceId)!
      const pe = edgeByKey(layout, sourceId, "prod")
      const maxBottom = Math.max(source.y + source.height, prod.y + prod.height)

      expectBottomCenter(pe.points[0], source)
      expectBottomCenter(pe.points[pe.points.length - 1], prod)

      const interiorMaxY = Math.max(...pe.points.slice(1, -1).map((p) => p.y), -Infinity)
      expect(interiorMaxY).toBeGreaterThan(maxBottom - EPS)

      // Interior vertices must stay outside the target frame (endpoint may sit on the bottom edge).
      for (const p of pe.points.slice(0, -1)) {
        const insideX = p.x > prod.x + EPS && p.x < prod.x + prod.width - EPS
        const insideY = p.y > prod.y + EPS && p.y < prod.y + prod.height - EPS
        expect(insideX && insideY).toBe(false)
      }
    }
  })

  it("does not route workemon→prod through the middle of a sibling node", () => {
    const pe = edgeByKey(layout, "workemon", "prod")
    for (const siblingId of ["dev", "staging"]) {
      const sibling = nodeById.get(siblingId)!
      for (const p of pe.points) {
        const insideX = p.x > sibling.x + EPS && p.x < sibling.x + sibling.width - EPS
        const insideY = p.y > sibling.y + EPS && p.y < sibling.y + sibling.height - EPS
        expect(insideX && insideY).toBe(false)
      }
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

describe("validateOctilinear — vocabulary invariant", () => {
  it("accepts trivial and pure axis-aligned paths", () => {
    expect(validateOctilinear([]).ok).toBe(true)
    expect(validateOctilinear([{ x: 0, y: 0 }]).ok).toBe(true)
    expect(validateOctilinear([{ x: 0, y: 0 }, { x: 0, y: 10 }]).ok).toBe(true)
    expect(
      validateOctilinear([
        { x: 0, y: 0 },
        { x: 0, y: 10 },
        { x: 20, y: 10 },
        { x: 20, y: 30 },
      ]).ok
    ).toBe(true)
  })

  it("accepts a 45° leg sandwiched by axis-aligned legs", () => {
    expect(
      validateOctilinear([
        { x: 0, y: 0 },
        { x: 0, y: 10 },
        { x: 10, y: 20 },
        { x: 30, y: 20 },
      ]).ok
    ).toBe(true)
  })

  it("rejects an off-grid (non-45°) diagonal", () => {
    const res = validateOctilinear([
      { x: 0, y: 0 },
      { x: 0, y: 10 },
      { x: 30, y: 20 },
      { x: 30, y: 40 },
    ])
    expect(res.ok).toBe(false)
    expect(res.reason).toMatch(/45/)
  })

  it("rejects a 45° leg as the first or last (port approach) leg", () => {
    expect(
      validateOctilinear([
        { x: 0, y: 0 },
        { x: 10, y: 10 },
        { x: 30, y: 10 },
      ]).ok
    ).toBe(false)
    expect(
      validateOctilinear([
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 30, y: 10 },
      ]).ok
    ).toBe(false)
  })

  it("rejects two consecutive 45° legs (must join an axis leg at both ends)", () => {
    const res = validateOctilinear([
      { x: 0, y: 0 },
      { x: 0, y: 10 },
      { x: 10, y: 20 },
      { x: 20, y: 30 },
      { x: 20, y: 40 },
    ])
    expect(res.ok).toBe(false)
    expect(res.reason).toMatch(/sandwiched/)
  })
})

describe("insertChamfer45 — chamfer helper", () => {
  it("is a no-op when chamfer <= 0 or too few points", () => {
    const l = [
      { x: 0, y: 0 },
      { x: 0, y: 20 },
      { x: 20, y: 20 },
    ]
    expect(insertChamfer45(l, 0)).toEqual(l)
    expect(insertChamfer45(l.slice(0, 2), 8)).toEqual(l.slice(0, 2))
  })

  it("replaces a 90° bend with a symmetric 45° leg and preserves endpoints", () => {
    const l = [
      { x: 0, y: 0 },
      { x: 0, y: 40 },
      { x: 40, y: 40 },
    ]
    const out = insertChamfer45(l, 8)
    expect(out[0]).toEqual(l[0])
    expect(out[out.length - 1]).toEqual(l[2])
    expect(out).toHaveLength(4)
    // The two chamfer points straddle the corner by an equal retreat → exactly 45°.
    expect(out[1]).toMatchObject({ x: 0, y: 32 })
    expect(out[2]).toMatchObject({ x: 8, y: 40 })
    expect(validateOctilinear(out).ok).toBe(true)
  })

  it("clamps the chamfer to half of each adjoining leg", () => {
    const l = [
      { x: 0, y: 0 },
      { x: 0, y: 10 },
      { x: 10, y: 10 },
    ]
    const out = insertChamfer45(l, 100)
    expect(out[1]).toMatchObject({ x: 0, y: 5 })
    expect(out[2]).toMatchObject({ x: 5, y: 10 })
    expect(validateOctilinear(out).ok).toBe(true)
  })

  it("chamfers the hierarchy vhv polyline into an octilinear path with intact ports", () => {
    const from: PositionedNode = {
      id: "a",
      title: "a",
      type: "registry",
      x: 0,
      y: 0,
      width: 80,
      height: 40,
      rank: 0,
    }
    const to: PositionedNode = {
      id: "b",
      title: "b",
      type: "registry",
      x: 120,
      y: 160,
      width: 80,
      height: 40,
      rank: 1,
    }
    const base = buildHierarchyEdgePolyline(from, to, "vhv")
    const chamfered = insertChamfer45(base, OCTILINEAR_CHAMFER)
    expect(chamfered[0]).toEqual(base[0])
    expect(chamfered[chamfered.length - 1]).toEqual(base[base.length - 1])
    expect(chamfered.length).toBeGreaterThan(base.length)
    expect(validateOctilinear(chamfered).ok).toBe(true)
    // A genuine 45° leg is present.
    const has45 = chamfered.slice(1).some((p, i) => {
      const a = chamfered[i]
      const adx = Math.abs(p.x - a.x)
      const ady = Math.abs(p.y - a.y)
      return adx > 1 && ady > 1 && Math.abs(adx - ady) < 1
    })
    expect(has45).toBe(true)
  })
})

describe("octilinear preset regression matrix", () => {
  for (const [name, build] of PRESETS) {
    it(`${name}: every default edge polyline is octilinear`, () => {
      const layout = build()
      for (const e of layout.edges) {
        const res = validateOctilinear(e.points)
        expect(res.ok, `${name} ${e.from}→${e.to}: ${res.reason ?? ""}`).toBe(true)
      }
    })
  }

  for (const [name] of PRESETS) {
    it(`${name}: chamfered layout stays octilinear with intact ports and finite points`, () => {
      const parsed =
        name === "nested-column"
          ? (() => {
              const p = parseMermaid(NESTED_COLUMN_MERMAID)
              return {
                nodes: mergeNestedColumnDemoNodes(p.nodes, NESTED_COLUMN_MERMAID),
                edges: p.edges,
              }
            })()
          : parseMermaid(
              name === "ensv2-alias-siblings"
                ? ENSV2_ALIAS_SIBLINGS_MERMAID
                : name === "classic-ens-tree"
                  ? CLASSIC_ENS_TREE_MERMAID
                  : ENSV2_DELEGATED_RECORDS_MERMAID
            )
      const plain = computeLayout(parsed.nodes, parsed.edges, defaultLayoutOptions)
      const chamfered = computeLayout(parsed.nodes, parsed.edges, {
        ...defaultLayoutOptions,
        chamfer: OCTILINEAR_CHAMFER,
      })

      expect(chamfered.edges).toHaveLength(plain.edges.length)
      for (let i = 0; i < chamfered.edges.length; i++) {
        const ce = chamfered.edges[i]
        const pe = plain.edges[i]
        const res = validateOctilinear(ce.points)
        expect(res.ok, `${name} ${ce.from}→${ce.to}: ${res.reason ?? ""}`).toBe(true)
        for (const p of ce.points) {
          expect(Number.isNaN(p.x)).toBe(false)
          expect(Number.isNaN(p.y)).toBe(false)
        }
        // Ports (endpoints) are unchanged by chamfering.
        expect(ce.points[0].x).toBeCloseTo(pe.points[0].x, 3)
        expect(ce.points[0].y).toBeCloseTo(pe.points[0].y, 3)
        expect(ce.points[ce.points.length - 1].x).toBeCloseTo(pe.points[pe.points.length - 1].x, 3)
        expect(ce.points[ce.points.length - 1].y).toBeCloseTo(pe.points[pe.points.length - 1].y, 3)
      }
    })
  }
})
