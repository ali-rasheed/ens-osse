# Mermaid patterns (ENS Registry Diagram)

**Source of truth** for the diagram editor’s Mermaid-like syntax. The parser lives in [`src/lib/mermaid.ts`](../src/lib/mermaid.ts). Preset graphs live in [`src/lib/mermaidTemplates.ts`](../src/lib/mermaidTemplates.ts).

This is **not** full Mermaid: only the patterns below are supported. Lines are trimmed; `//` and `%%` comments are ignored. The first line may be `graph TD` or `flowchart TD` (case-insensitive).

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

```text
fromId --> toId
```

You may use **`->`** instead of **`-->`** (same meaning).

Endpoints may include inline node definitions (same shapes as above). A resolver or registry node may span **multiple lines** if `{ … }` braces are unbalanced on the first line (e.g. `# stack=3` on the next line inside `{…}`).

### Edge metadata (optional)

Append **space-hash-space** and tokens (space-separated) on the **same line**:

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
```

---

## Nested registries

Trees where a **registry contains child nodes inside one frame** (e.g. Figma nested column) are **not** expressible in this syntax. Define them in application data as `NodeData.children` on a `type: "registry"` node (see [`src/components/RegistryDiagram/types.ts`](../src/components/RegistryDiagram/types.ts)).

The demo app’s **Template → ENS v2 registry column** loads minimal Mermaid (`registry-root[Registry] --> resolvers{Resolvers # stack=3}`). Because Mermaid cannot carry `children`, the app **merges** bundled JSON from [`src/lib/nestedColumnDemoData.ts`](../src/lib/nestedColumnDemoData.ts) onto `registry-root` when that preset matches the editor source (`flowchart TD` on line one is treated like `graph TD` for matching). Other presets and custom sources do **not** get this merge. MDX embed payloads are still Mermaid-only — consumers who need the same nested column must replicate that merge or ship `NodeData` JSON.

---

## Templates

Built-in presets (sidebar **Template** dropdown) are defined in `mermaidTemplates.ts`, including:

- **ENS v2 registry column** (`nested-column`) — minimal `Registry → Resolvers # stack=3` Mermaid; reference thumbnail in `/public/templates/`; demo merges JSON children for `registry-root` (see Nested registries above).
- **ENS registry tree** — classic flat `<root> → eth → workemon.eth` layout with resolver branch (reference thumbnail in `/public/templates/`).
- **Minimal** — two nodes, one edge.

---

## Serialize / round-trip

[`serializeMermaid`](../src/lib/mermaid.ts) emits `graph TD`, registry brackets with optional ` # frame=single`, and edge lines with `# fromSlot=…` etc. Nested `children` are **not** written back to Mermaid.

---

## Changelog note

When adding or changing syntax, update **this file first**, then confirm the parser in `mermaid.ts` matches. The in-app reference panel imports this markdown at build time; the README should keep linking here and a short summary in sync.
