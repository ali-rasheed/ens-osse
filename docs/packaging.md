# Packaging (npm library)

Roadmap for turning [`src/components/RegistryDiagram/`](../src/components/RegistryDiagram/) into a publishable package (workspaces, `tsup`, peer deps, subpath exports for mermaid + PNG helpers) lives in the maintainer’s Cursor plan file **package_registry_diagram_lib** (same content summarized below). This file is the contributor-facing pointer so we do not rely on `.cursor/` paths in git clones.

## Target shape

- Root `package.json` gains `workspaces: ["packages/*"]`.
- New `packages/registry-diagram` (name TBD, e.g. `@ens/registry-diagram`) holds moved sources; demo app depends on `workspace:*`.
- Build: ESM + `.d.ts`; peers: `react`, `react-dom`, `motion`; optional subpaths for `./mermaid` and `./export`.

## Before first publish

See [devrel.md](./devrel.md) and run `npm run devrel:revisit`. Confirm README live URL, embed docs, and any change to `ens-registry-diagram/v1` or parser behavior is noted for consumers.
