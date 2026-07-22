# Using ENS Ossë

Interactive editor for **ENS Diagram System** registry diagrams. You write Mermaid-like graph source; the app lays out nodes, routes arrows, and exports PNG or MDX embed snippets.

This guide is for **people using the app**. In the playground, open **Docs** (header or editor panel) for the rendered site at `#/docs`. Syntax details also live in [mermaid-patterns.md](./mermaid-patterns.md). Maintainers: see [devrel.md](./devrel.md).

---

## Quick start

```bash
npm install
npm run dev
```

Open the dev URL shown in the terminal (Portless: `http://ens-diagrams.localhost:1355` if configured).

---

## App layout

Three columns on desktop:

| Column | Contents |
|--------|----------|
| **Left — Layout & style** | Collapsible DialKit panel (registry cards, labels, resolver, edges, layout spacing, animation, path pulse) |
| **Center** | Live diagram + optional caption |
| **Right — Editor** | Theme mode, replay, PNG export, MDX embed snippet, Mermaid source + templates |

On narrow viewports the stack is: diagram → editor → controls.

Use the **‹ / ›** toggle on the left panel to collapse DialKit when you need more canvas space. Your preference is saved in the browser.

---

## Templates

Use the **Template** dropdown in the Mermaid panel to load a preset:

- **ENS v2 — alias to sibling** — parent tree + dotted alias edges between siblings
- **ENS v2 — workemon delegation tree** — delegated record body lines (hatched)
- **ENS v2 registry column** — nested registry inside one frame (demo merges JSON children)
- **ENS registry tree** — classic flat tree with slot delegation and resolver branch
- **Minimal** — two nodes, one edge

Start from a preset, then edit the source.

---

## Writing diagrams

Minimal example:

```text
graph TD
  root[myname.eth]
  sub[sub.myname.eth]
  root --> sub
```

Full grammar: **[mermaid-patterns.md](./mermaid-patterns.md)** (also in the in-app **Mermaid syntax reference**).

Common patterns:

- Multiline registry copy: `id["name.eth<br/>owner: 0x…"]`
- Alias between siblings: `dev -. alias .-> prod`
- Caption below diagram: `%% caption: Your prose here` above `graph TD`

---

## Theme modes

**Light**, **Dark**, and **Protocol** switch Figma-aligned palettes for the canvas, nodes, and chrome. Export PNG uses the active mode’s diagram background.

---

## DialKit tuning

Folders in the left panel map to visual and layout parameters:

| Folder | What it affects |
|--------|-----------------|
| **Registry cards** | Primary title, double frame padding/radius, owner pill typography |
| **Labels (pills)** | Hatched slot surface and stripe colors (dark mode) |
| **Resolver** | Dashed resolver frame, sockets, stack dash pattern |
| **Edges** | Stroke width, corner fillet radius, dot radius |
| **Layout → spacing** | `ranksep` (vertical gap between ranks), `nodesep` (horizontal sibling gap) |
| **Animation** | Entrance preset, stagger, spring |
| **Path pulse** | Looped highlight along a path between two node ids |

Changing card or label sizes affects Dagre node boxes and therefore overall layout.

---

## Layout & arrows

Arrows are routed automatically by relationship (parent→child, alias, slots). You can nudge spacing in **Layout** (left DialKit panel) and per-edge hints with `# route=vhv` — see [Automatic layout behavior](./mermaid-patterns.md#automatic-layout-behavior) for the full token list.

Alias edges (`-. alias .->`) always use the dedicated alias router; `route=` does not override them.

---

## Export

**Export PNG** in the right panel: choose **1× / 2× / 3×** scale, then **Download diagram PNG**. Only the diagram canvas is captured (not the side panels).

---

## Embed in docs

Copy the **Docs embed (MDX)** snippet from the right panel. Payload schema: `ens-osse/v1` (see [naming.md](./naming.md)) with `mermaid`, `mode`, and optional `caption`.

Use `<OsseEmbed mermaid={…} mode="…" />` from `@ensdomains/osse`, or fence source as ` ```osse ` with the remark plugin `@ensdomains/osse/remark`. Optional YAML frontmatter (`theme`, `animation`, `pulse`, `fit`, `strict`) is documented in [mermaid-patterns.md](./mermaid-patterns.md#yaml-frontmatter-document-config).

**Nested column caveat:** the live demo merges JSON `children` onto `registry-root` for the nested-column preset. Mermaid alone cannot express nested registries — docs consumers need the same merge or raw `NodeData[]`. See [mermaid-patterns.md § Nested registries](./mermaid-patterns.md#nested-registries).

---

## Limits & troubleshooting

| Symptom | Fix |
|---------|-----|
| **parse error** in Mermaid header | Check node ids, brackets, and link tokens against [mermaid-patterns.md](./mermaid-patterns.md); see the diagnostics list under the editor for the exact line/column |
| Unexpected plain registry node | Undeclared ids on edges become registries — declare nodes explicitly, or turn on **Strict** (editor checkbox or frontmatter `strict: true`) to make it a parse error — see [Strict mode & diagnostics](./mermaid-patterns.md#strict-mode--diagnostics) |
| Nested frame missing children | Use the nested-column template or supply `NodeData.children` in app data |
| `route=` has no effect on alias | By design — alias routing is automatic |

---

## Further reading

- In-app docs: `#/docs` (Guide), `#/docs/syntax`, `#/docs/naming`, `#/docs/packaging`
- [mermaid-patterns.md](./mermaid-patterns.md) — syntax and automatic layout appendix
- [devrel.md](./devrel.md) — release and embed checklist
- [packaging.md](./packaging.md) — npm library roadmap
- [CONTRIBUTING.md](../CONTRIBUTING.md) — parser and layout internals
