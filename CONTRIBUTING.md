# Contributing

## Setup

```bash
npm install
npm run build
```

Use `npm run dev` for local development.

## Changing Mermaid syntax

1. Update the canonical doc first: [`docs/mermaid-patterns.md`](docs/mermaid-patterns.md).
2. Update the parser and presets: [`src/lib/mermaid.ts`](src/lib/mermaid.ts), [`src/lib/mermaidTemplates.ts`](src/lib/mermaidTemplates.ts).
3. Run **`npm run devrel:revisit`** and walk through [`docs/devrel.md`](docs/devrel.md) before opening a PR.

The in-app “Mermaid syntax reference” is built from `mermaid-patterns.md`; keep it accurate.

## Packaging roadmap

Library extraction (npm workspace, publishable package) is summarized in [`docs/packaging.md`](docs/packaging.md). Maintainers may also use the Cursor plan **package_registry_diagram_lib** for step-by-step todos. The devrel checklist is the gate for docs and shareability; packaging is the gate for npm consumers.

## License

By contributing, you agree your contributions are licensed under the [MIT License](LICENSE).
