# Packaging (npm library)

Workspace package **`@ensdomains/osse`** lives in [`packages/osse/`](../packages/osse/). Naming: [naming.md](./naming.md).

## Shape

- Root `package.json`: `"workspaces": ["packages/*"]`.
- Library build: `tsup` → ESM + `.d.ts` (`npm run lib:build`).
- Peers: `react`, `react-dom`, `motion`.
- Exports:
  - `.` — `OsseDiagram`, `OsseEmbed`, types, theme, layout
  - `./mermaid` — `parseMermaid` / `serializeMermaid` / frontmatter
  - `./export` — PNG helper (`html-to-image` optional)
  - `./remark` — remark/MDX plugin for fenced `osse` blocks

## Demo app

Depends on `"@ensdomains/osse": "*"`. Vite + `tsconfig` path aliases point at package source for local iteration; production `npm run build` runs `lib:build` first.

## Before first publish

See [devrel.md](./devrel.md) and run `npm run devrel:revisit`. Confirm README live URL, embed docs, and any change to `ens-osse/v1` or parser behavior is noted for consumers.
