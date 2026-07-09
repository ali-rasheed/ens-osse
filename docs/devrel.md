# Devrel checklist (ens-registry-diagram)

Use this before releases, big doc links, or grammar changes. Run **`npm run devrel:revisit`** for a short terminal reminder of these paths.

## Live demo URL

<!-- Set after deploy: https://YOUR-NETLIFY-OR-PRODUCTION-URL -->

After you have a stable production URL, add it to the **Live demo** line in the root [`README.md`](../README.md) so blog posts and internal docs can link to one canonical place.

## MDX / docs embed

Payload schema version: **`ens-registry-diagram/v1`**.

- Snippet builder (copy from the app UI): logic in [`src/lib/docsEmbed.ts`](../src/lib/docsEmbed.ts) (`buildDocsEmbedSnippet`, `DocsEmbedPayload`).
- **ENS v2 registry column (`nested-column`):** embed is Mermaid-only. The live demo also runs [`mergeNestedColumnDemoNodes`](../src/lib/nestedColumnDemoData.ts); docs consumers need that merge or raw `NodeData[]` to match the full nested layout.
- Until a shared `<RegistryDiagramEmbed />` exists in your docs app: store the JSON payload or pass `mermaid` + `mode` (+ optional `caption`) props to your own wrapper that renders this repo’s diagram component.

## Revisit checklist

- [ ] [`LICENSE`](../LICENSE) present and correct for your org (swap text if not MIT).
- [ ] [`README.md`](../README.md) lists **Live demo** URL when known.
- [ ] [`docs/docs.md`](docs.md) matches current app layout (left DialKit, right editor, three-column shell).
- [ ] [`docs/mermaid-patterns.md`](mermaid-patterns.md) matches [`src/lib/mermaid.ts`](../src/lib/mermaid.ts) behavior.
- [ ] `npm run build` succeeds (local and CI).
- [ ] Embed story still accurate for consumers ([`docsEmbed.ts`](../src/lib/docsEmbed.ts), this file).

## First npm publish (library)

When the workspace package ships, also confirm: README live URL, embed section above, run **`npm run devrel:revisit`**, and add a short changelog note if `ens-registry-diagram/v1` or parser output changes.
