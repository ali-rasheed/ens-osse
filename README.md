# ENS Registry Diagram

Interactive **ENS / Diagram System** registry diagrams: React + Dagre layout, theme modes (light / dark / protocol), DialKit tuning, Mermaid-like graph source, PNG export, and MDX embed snippet.

**License:** [MIT](LICENSE). **Contributing:** [CONTRIBUTING.md](./CONTRIBUTING.md). **Using Ossë:** [docs/docs.md](./docs/docs.md). **Devrel / embed / release checklist:** [docs/devrel.md](./docs/devrel.md). **Live demo:** _TBD — set in README after deploy (see devrel doc)._

## Mermaid syntax (source of truth)

Full grammar, edge metadata, registry frames, and limits are documented in:

**[docs/mermaid-patterns.md](./docs/mermaid-patterns.md)**

The sidebar editor’s expandable reference under the graph input is generated from that file at build time—edit the doc once when patterns change.

Summary:

- **Registry** `id[label]` (double border default), optional hatched slots `id[a|b|c]`, optional ` # frame=single` inside brackets.
- **Multiline** `id["name<br/>owner: 0x…"]` — title + body lines; `(delegated)` lines render hatched.
- **Label** `id(label)`, hatched `id((label))`, **resolver** `id{label}`.
- **Links (Mermaid):** `-->`, `---`, `-.->`, `==>`, `-- text -->`, `-. text .->`, chained `A --> B & C`.
- **Caption:** `%% caption: …` above `graph TD`.
- **ENS edge meta:** `# fromSlot=0 route=vhv` after the target node.
- **Nested registries** (frame-with-children) are **JSON / `NodeData.children` only**, not Mermaid.
- **Visual tuning:** [`src/components/RegistryDiagram/linkStyles.ts`](src/components/RegistryDiagram/linkStyles.ts).

## Scripts

```bash
npm install
npm run dev
npm run build
npm run preview
npm run devrel:revisit   # reminder: open docs/devrel.md
```

## Repo layout (high level)

| Path | Role |
|------|------|
| `docs/docs.md` | User guide — app tour, DialKit, export, embed |
| `docs/devrel.md` | Devrel checklist, embed notes, live URL reminder |
| `docs/packaging.md` | Contributor-facing npm library roadmap summary |
| `docs/mermaid-patterns.md` | Canonical Mermaid subset documentation |
| `src/lib/nestedColumnDemoData.ts` | JSON merge for nested-column preset (Mermaid cannot express children) |
| `src/lib/mermaid.ts` | Parse / serialize |
| `src/lib/mermaidTemplates.ts` | Template dropdown presets |
| `src/components/RegistryDiagram/` | Diagram layout, nodes, edges, theme |
