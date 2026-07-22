# Mermaid patterns (ENS Ossë)

**Source of truth** for the diagram editor’s Mermaid-like syntax. The parser lives in [`packages/osse/src/mermaid.ts`](../packages/osse/src/mermaid.ts). Preset graphs live in [`src/lib/mermaidTemplates.ts`](../src/lib/mermaidTemplates.ts). Naming: [`docs/naming.md`](./naming.md).

This is **not** full Mermaid: only the patterns below are supported. Lines are trimmed; `//` and `%%` comments are ignored. The first line may be `graph TD` / `flowchart TD` (or `TB`, `LR`, `RL`, `BT`; case-insensitive).

---

## YAML frontmatter (document config)

Optional leading block (mermaid-conventional). Sets theme, animation, path pulse, and fit mode for the whole diagram:

```text
---
theme: protocol
animation: { preset: draw, stagger: 0.4 }
pulse: { from: root, to: resolver1 }
fit: clamp
---
graph TD
  root[eth] --> resolver1{Resolver}
```

| Key | Values | Notes |
|-----|--------|-------|
| `theme` | `light` \| `dark` \| `protocol` \| `docs` | `docs` aliases `light` |
| `animation` | preset name or `{ preset, stagger, duration }` | Entrance preset |
| `stagger` | number (seconds) | Merged into `animation.stagger` |
| `pulse` | `{ from, to, stagger?, segmentDuration?, hold? }` | Path pulse between node ids |
| `fit` | `none` \| `width` \| `clamp` | Hint for responsive hosts |
| `strict` | `true` \| `false` | Hard-fail on undeclared edge ids instead of warning — see [Strict mode & diagnostics](#strict-mode--diagnostics) |

Consumed by `parseMermaid` → `ParsedGraph.frontmatter` and by `<OsseDiagram source={…} />`.

Docs authors can fence the same source as ` ```osse ` (remark plugin `@ensdomains/osse/remark`).

---

## Graph declaration

Optional first line declares graph type and **direction**:

```text
graph TD
```

or `flowchart TD`. Supported directions: **`TD`**, **`TB`** (top-down, equivalent), **`LR`** (left-right), **`RL`** (right-left), **`BT`** (bottom-top). Parsed into `ParsedGraph.direction` and round-tripped by `serializeMermaid`.

**Layout note:** Dagre receives the parsed direction, but hierarchy/alias routers are tuned for top-down (`TD`/`TB`). `LR` / `RL` / `BT` sources parse and serialize correctly; edge routing for those directions is best-effort until a later layout pass.

---

## Node IDs

- Use **letters, numbers, underscore, hyphen**: `id`, `eth-r`, `node_1`.
- Declare a node inline on an edge, or on its own line.

---

## Node shapes

| Shape | Syntax | Maps to |
|-------|--------|---------|
| Registry | `id[label]` | Double-bordered registry frame by default. |
| Registry + slots | `id[label\|slot1\|slot2]` | Mono header + **hatched** slot row (Diagram System compound node). |
| Registry, single border | `id[label # frame=single]` or `id[label\|a\|b # frame=single]` | One stroke + inner padding. Alias: `# border=single`. Meta is separated from the label/slots by **space-hash-space**: ` # `. |
| Label (pill) | `id(label)` | Solid / plain label node. |
| Label (hatched) | `id((label))` | Cross-hatch label. |
| Resolver | `id{label}` | Dashed frame with corner sockets. |
| Resolver stack | `id{label # stack=N}` | Same frame repeated **N** times (2–24), offset down-right; only the front shows **label**. Meta after ` # ` like registry `frame=single`. |

**Registry bracket body**

- Split **slots** with `|`; first segment is the main label, rest are slot labels.
- Optional **trailing meta** after ` # `: `frame=single` or `border=single` (space-separated tokens).

**Resolver brace body**

- Optional **trailing meta** after ` # `: `stack=N` (integer 2–24) for a diagonal stack of **N** frames.

**Examples**

```text
root[<root>|eth]
leaf[Only label]
compact[eth|x # frame=single]
r1{Resolver 1}
stacked{Resolvers # stack=3}
```

---

## Referenced-but-undeclared nodes

If an edge mentions an id that never appears on its own line or as an inline node, the parser **creates** that node as a **registry** whose label is the same as its id. This keeps small graphs terse but can **hide typos**; if something looks wrong, declare nodes explicitly, or turn on [strict mode](#strict-mode--diagnostics) so it's a parse error instead.

---

## Strict mode & diagnostics

`parseMermaid` returns `ParsedGraph.diagnostics`: every parse issue found in **one pass**, each with `{ message, line, column?, severity }` (`line`/`column` are 1-based, `line` counts frontmatter lines too). `ParsedGraph.error` stays a plain string for existing callers — `Line N[:C]: message`, joined by newline when there are several — and is only set when at least one diagnostic is `"error"` severity, in which case `nodes`/`edges` come back **empty** (same contract as any other parse failure).

Two families of diagnostic:

| Diagnostic | Default (non-strict) | Strict mode |
|------------|----------------------|--------------|
| Line-level syntax error (unparseable node/edge) | `error` — always fails the parse | same |
| [Referenced-but-undeclared](#referenced-but-undeclared-nodes) edge id | `warning` — node is auto-created, graph still renders | `error` — fails the parse, closing the typo trap |

**Enabling strict mode** — either works, and an explicit option always wins over frontmatter:

```text
---
strict: true
---
graph TD
  a[Registry A] --> b
```

```ts
import { parseMermaid } from "@ensdomains/osse/mermaid"

const { error, diagnostics } = parseMermaid(source, { strict: true })
```

`<OsseDiagram source={…} strict />` passes the option through. The demo app's **Strict mode** checkbox (Mermaid editor panel) does the same and lists every diagnostic under the textarea.

---

## Edges

Mermaid-compatible **link tokens** (ENS node shapes unchanged):

| Syntax | Style | Arrow |
|--------|-------|-------|
| `A --> B` or `A -> B` | solid | yes |
| `A --- B` | open | no |
| `A -.-> B` | dotted | yes |
| `A ==> B` | thick | yes |
| `A -- text --> B` | solid + label | yes |
| `A -. text .-> B` | dotted + label | yes |
| `A --> \|text\| B` | solid + label | yes |

Dotted edges with label `alias` use dedicated alias routing (see [Automatic layout behavior](#automatic-layout-behavior)).

**Chained edges:** `A --> B & C & D` expands to multiple edges from `A`.

You may use **`->`** instead of **`-->`** on solid links.

Endpoints may include inline node definitions (same shapes as above). A resolver or registry node may span **multiple lines** if `{ … }` braces are unbalanced on the first line (e.g. `# stack=3` on the next line inside `{…}`).

Optional Mermaid edge id prefix (ignored): `e1@-.->`.

### Edge metadata (ENS extension)

Append **space-hash-space** and tokens (space-separated) on the **same line** after the target node:

| Token | Meaning |
|-------|---------|
| `fromSlot=N` | Attach tail to **bottom center** of hatched slot `N` (0-based) on the **source** registry. Only applies if that node has a slot row (no `children` in JSON). |
| `toSlot=N` | Attach head to slot `N` on the **target** registry. |
| `route=hv` | Orthogonal style: horizontal then vertical. |
| `route=vhv` | Vertical, horizontal, vertical (mid-Y jog). If `fromSlot` is set and `route` is omitted, routing defaults toward `vhv`. |

**Example**

```text
ethR --> workemon # fromSlot=0
workemon --> walletR # fromSlot=1 route=vhv
dev -. alias .-> prod # route=hv
```

---

## Automatic layout behavior

Dagre assigns node ranks and rough edge paths; ENS post-processes polylines before render.

### Edge classes and default routers

| Class | Router | When it applies |
|-------|--------|-----------------|
| **Hierarchy solid** | `buildHierarchyEdgePolyline` | Solid `-->` parent → child (target rank below source), no `fromSlot` / `toSlot` |
| **Alias / dotted lateral** | `buildAliasEdgePolyline` | `-.->` or edge label `alias` |
| **Slot-anchored** | `applySlotAnchors` + orthogonal pass | `fromSlot=N` / `toSlot=N` on a registry with a hatched slot row |
| **Default** | Dagre points + `orthogonalizePolyline` | Everything else |

### Default attachment ports

| Relationship | Tail | Head |
|--------------|------|------|
| Parent → child (hierarchy router) | Source bottom-center | Target top-center |
| Same-rank or sibling alias | Source bottom-center | Target bottom-center (lane below nodes; avoids cutting through the target or the hierarchy fan-out) |
| Cross-rank alias | Source bottom-center | Target side-center (dedicated lane) |
| Slot delegation | Slot bottom-center | Per target semantics |

Hierarchy paths use **vertical-first (`vhv`)** fan-out: drop from the parent, jog horizontally at mid-Y, drop into each child. Same-rank alias edges ignore `route=` and always use the alias router.

### Token overrides

| Token | Honored by | Notes |
|-------|------------|-------|
| `fromSlot` / `toSlot` | Slot anchors | Bypasses hierarchy router on that end |
| `route=hv` | Hierarchy + default orthogonal pass | Horizontal-first elbow |
| `route=vhv` | Hierarchy + default orthogonal pass | Vertical → horizontal → vertical |
| `route=*` on alias edges | **Ignored** | Alias router always wins |

### Octilinear routing (H / V / 45°)

Edge polylines follow an **octilinear vocabulary** (layout invariant 2): every segment is
horizontal, vertical, or exactly 45°. Rules enforced by `validateOctilinear(points)` in
[`layout.ts`](../packages/osse/src/RegistryDiagram/layout.ts):

- Each 45° leg must join an axis-aligned (H/V) leg at **both** ends — no off-grid diagonals, and no two 45° legs back-to-back.
- The **first and last** legs (port approach) are always axis-aligned, so arrowheads meet the node frame on-axis.

By default routers emit pure orthogonal (H/V) paths. The `chamfer` layout option (or, later, the
`# route=chamfer` edge token) softens the hierarchy/alias routers' 90° bends into 45° legs via
`insertChamfer45(points, chamfer)`: it retreats an equal distance along each leg of a bend so the
connecting leg is exactly 45°, clamped to half of each adjoining leg and preserving the ports.
`pointsToPath` serializes the resulting diagonal legs as straight `L` runs (bends still filleted by
`cornerRadius`).

### Spacing knobs (UI)

**Layout → ranksep / nodesep** in the left DialKit panel control Dagre rank and sibling spacing. **Edges → cornerRadius** fillets 90° bends. See the [user guide](./docs.md) for a full app tour.

---

## Multiline labels (Mermaid `<br/>`)

Registry (and label) text may span lines using Mermaid line breaks:

```text
prod["prod.workemon.eth<br/>addr: 0x...<br/>avatar: ipfs://..."]
workemon["workemon.eth<br/>owner: 0xAlice"]
```

- First line → Semi-Mono **title** (registry name).
- Subsequent lines → Marist **body** stack below the title.
- Lines containing `(delegated)` render as **hatched** pills (see [`linkStyles.ts`](../src/components/RegistryDiagram/linkStyles.ts)).
- Lines starting with `owner:` use Semi-Mono in the body stack.

Quoted bracket bodies are supported when labels contain `|` or `<br/>`.

---

## Caption (prose below diagram)

```text
%% caption: Set your own rules for how your names are managed…
flowchart TD
  …
```

Extracted into `ParsedGraph.caption` and shown below the diagram in the demo app. Included in docs embed JSON when present.

---

## Visual tuning

Link stroke patterns, delegation marker, and edge label chip sizing: [`src/components/RegistryDiagram/linkStyles.ts`](../src/components/RegistryDiagram/linkStyles.ts).

**Note:** Node shapes in this tool are **ENS-specific** (`{…}` = resolver, not Mermaid diamond). Pasting sources into [Mermaid Live Editor](https://mermaid.live) will not render identically.

---

## Nested registries (`subgraph` / `end`)

A **`subgraph` … `end`** block maps to a **registry** node whose inner declarations become `NodeData.children` (vertical stack inside one frame — Figma nested column). Nested `subgraph` blocks become nested registry `children`.

```text
graph TD
  subgraph registry-root[Registry]
    nest-root[<root> # frame=single | owner: 0x0123...]
    nest-eth[eth # frame=single | owner: 0x0123...]
    subgraph nest-wallet[wallet.workemon.eth # frame=single]
      w-owner(owner: 0x0123...)
      w-res{resolver: 0x6789...}
    end
  end
  registry-root --> resolvers{Resolvers # stack=3}
```

| Syntax | Maps to |
|--------|---------|
| `subgraph id` | Registry `id` with `title: id` |
| `subgraph id[label]` | Registry with bracket body (slots, `# frame=single`, `<br/>` body lines — same rules as `id[label]`) |
| Lines inside the block | Child nodes (`registry`, `pill`, `resolver` shapes) in source order |
| Nested `subgraph` | Child registry with its own `children` |
| `end` | Closes the current block (case-insensitive) |

Edges may reference subgraph ids or child ids (`registry-root --> resolvers`, or `w-owner --> w-res` inside a block). Undeclared ids inside a subgraph are auto-created in that block’s children (or hard-fail in strict mode).

`serializeMermaid` emits `subgraph` / `end` for registries with `children` and preserves `direction`. JSON-only `children` (no subgraph in source) still round-trip when serialized.

The demo **ENS v2 registry column** preset uses subgraph syntax; [`nestedColumnDemoData.ts`](../src/lib/nestedColumnDemoData.ts) merges only when the parsed graph has no `children` on `registry-root` (legacy comment-only sources).

---

## Templates

Built-in presets (sidebar **Template** dropdown) are defined in `mermaidTemplates.ts`, including:

- **ENS v2 — alias to sibling** — parent tree + `-. alias .->` dotted edges; records via `<br/>`.
- **ENS v2 — workemon delegation tree** — `workemon.eth` → `app` / `brand` with per-record `(delegated)` body lines (hatched).
- **ENS v2 — flexible registry** — `%% caption:` marketing prose below the diagram.
- **ENS v2 registry column** (`nested-column`) — minimal `Registry → Resolvers # stack=3` Mermaid; reference thumbnail in `/public/templates/`; demo merges JSON children for `registry-root` (see Nested registries above).
- **ENS registry tree** — classic flat `<root> → eth → workemon.eth` layout with resolver branch (reference thumbnail in `/public/templates/`).
- **Minimal** — two nodes, one edge.

---

## Serialize / round-trip

[`serializeMermaid`](../packages/osse/src/mermaid.ts) emits the parsed **`direction`** (default `graph TD`), optional `%% caption:`, `subgraph` / `end` blocks for registries with `children`, multiline quoted registry labels with `<br/>`, Mermaid link tokens (`-. label .->` for dotted), and ENS edge metadata `# fromSlot=…` etc. `parseMermaid` → `serializeMermaid` → `parseMermaid` preserves direction, nested children, nodes, and edges.

---

## Changelog note

When adding or changing syntax, update **this file first**, then confirm the parser in `mermaid.ts` matches. The in-app reference panel imports this markdown at build time; the README should keep linking here and a short summary in sync.
