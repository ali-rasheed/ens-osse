# Packaging (npm library)

Roadmap for turning [`src/components/RegistryDiagram/`](../src/components/RegistryDiagram/) into a publishable package (workspaces, `tsup`, peer deps, subpath exports for mermaid + PNG helpers) lives in the maintainer’s Cursor plan file **package_registry_diagram_lib** (same content summarized below). This file is the contributor-facing pointer so we do not rely on `.cursor/` paths in git clones.

## Target shape

Naming decision (product, package, schema, fence): [naming.md](./naming.md). Target package **`@ensdomains/osse`**.

- Root `package.json` gains `workspaces: ["packages/*"]`.
- New `packages/osse` holds moved sources; demo app depends on `workspace:*`.
- Build: ESM + `.d.ts`; peers: `react`, `react-dom`, `motion`; optional subpaths for `./mermaid` and `./export`.

## Before first publish

See [devrel.md](./devrel.md) and run `npm run devrel:revisit`. Confirm README live URL, embed docs, and any change to `ens-osse/v1` (see [naming.md](./naming.md)) or parser behavior is noted for consumers.
