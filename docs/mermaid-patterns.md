# Mermaid patterns (ENS Ossë)

**Source of truth** for the diagram editor’s Mermaid-like syntax. The parser lives in [`packages/osse/src/mermaid.ts`](../packages/osse/src/mermaid.ts). Preset graphs live in [`src/lib/mermaidTemplates.ts`](../src/lib/mermaidTemplates.ts). Naming: [`docs/naming.md`](./naming.md).

This is **not** full Mermaid: only the patterns below are supported. Lines are trimmed; `//` and `%%` comments are ignored. The first line may be `graph TD` or `flowchart TD` (case-insensitive).

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

Consumed by `parseMermaid` → `ParsedGraph.frontmatter` and by `<OsseDiagram source={…} />`.

Docs authors can fence the same source as ` ```osse ` (remark plugin `@ensdomains/osse/remark`).

---

## Graph declaration

Optional first line:

```text
graph TD
```

or `flowchart TD`. Other graph types and directions are not implemented.

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

If an edge mentions an id that never appears on its own line or as an inline node, the parser **creates** that node as a **registry** whose label is the same as its id. This keeps small graphs terse but can **hide typos**; if something looks wrong, declare nodes explicitly.

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
| Same-rank or sibling alias | Source bottom-center | Target top-center (lane below nodes) |
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

## Nested registries

Trees where a **registry contains child nodes inside one frame** (e.g. Figma nested column) are **not** expressible in this syntax. Define them in application data as `NodeData.children` on a `type: "registry"` node (see [`src/components/RegistryDiagram/types.ts`](../src/components/RegistryDiagram/types.ts)).

The demo app’s **Template → ENS v2 registry column** loads minimal Mermaid (`registry-root[Registry] --> resolvers{Resolvers # stack=3}`). Because Mermaid cannot carry `children`, the app **merges** bundled JSON from [`src/lib/nestedColumnDemoData.ts`](../src/lib/nestedColumnDemoData.ts) onto `registry-root` when that preset matches the editor source (`flowchart TD` on line one is treated like `graph TD` for matching). Other presets and custom sources do **not** get this merge. MDX embed payloads are still Mermaid-only — consumers who need the same nested column must replicate that merge or ship `NodeData` JSON.

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

[`serializeMermaid`](../src/lib/mermaid.ts) emits `graph TD`, optional `%% caption:`, multiline quoted registry labels with `<br/>`, Mermaid link tokens (`-. label .->` for dotted), and ENS edge metadata `# fromSlot=…` etc. Nested `children` are **not** written back to Mermaid.

---

## Changelog note

When adding or changing syntax, update **this file first**, then confirm the parser in `mermaid.ts` matches. The in-app reference panel imports this markdown at build time; the README should keep linking here and a short summary in sync.
