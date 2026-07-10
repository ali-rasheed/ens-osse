/**
 * Shortest directed path via BFS. Neighbor order is sorted by `to` id for deterministic ties.
 */
import type { EdgeData } from "./types"

export interface DirectedPathResult {
  nodeIds: string[]
  /** `edgeIndices[k]` is the index in the caller’s `edges` array for `nodeIds[k] → nodeIds[k+1]`. */
  edgeIndices: number[]
}

export function findDirectedPath(
  edges: EdgeData[],
  from: string,
  to: string
): DirectedPathResult | null {
  if (from === to) {
    return { nodeIds: [from], edgeIndices: [] }
  }

  type Step = { to: string; edgeIndex: number }
  const adj = new Map<string, Step[]>()

  edges.forEach((e, edgeIndex) => {
    let list = adj.get(e.from)
    if (!list) {
      list = []
      adj.set(e.from, list)
    }
    list.push({ to: e.to, edgeIndex })
  })

  for (const list of adj.values()) {
    list.sort((a, b) => a.to.localeCompare(b.to))
  }

  const queue: string[] = [from]
  const prevNode = new Map<string, string | null>()
  const prevEdge = new Map<string, number>()
  prevNode.set(from, null)

  while (queue.length > 0) {
    const u = queue.shift()!
    if (u === to) break
    for (const { to: v, edgeIndex } of adj.get(u) ?? []) {
      if (!prevNode.has(v)) {
        prevNode.set(v, u)
        prevEdge.set(v, edgeIndex)
        queue.push(v)
      }
    }
  }

  if (!prevNode.has(to)) {
    if (import.meta.env.DEV) {
      console.warn(`[RegistryDiagram] pathPulse: no directed path from "${from}" to "${to}"`)
    }
    return null
  }

  const nodeIds: string[] = []
  const edgeIndices: number[] = []
  let cur: string | null = to
  while (cur !== null) {
    nodeIds.push(cur)
    const parent: string | null | undefined = prevNode.get(cur)
    if (parent === undefined || parent === null) break
    const eIdx = prevEdge.get(cur)
    if (eIdx !== undefined) edgeIndices.push(eIdx)
    cur = parent
  }

  nodeIds.reverse()
  edgeIndices.reverse()
  return { nodeIds, edgeIndices }
}
