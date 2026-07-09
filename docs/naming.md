# ENS Ossë naming taxonomy

**Status:** Accepted (DES-86, pre–package extraction)  
**Decision:** Option A — Ossë-forward public surface with role-based node taxonomy.

No external npm consumers or published embed payloads exist yet, so all renames are clean breaks — no aliases, dual exports, or deprecation window.

## Product vs technical names

| Layer | Name | Notes |
|-------|------|--------|
| **Product / UI** | **ENS Ossë** | Playground heading, user guide (`docs/docs.md`), marketing copy. Humans say “Ossë”. |
| **GitHub repo** | `ens-osse` | Canonical remote (`ali-rasheed/ens-osse`). Local folder may still be `ens-diagrams` during transition. |
| **npm package** | `@ensdomains/osse` | Scoped publish target. Workspace folder: `packages/osse`. |
| **Primary React export** | `OsseDiagram` | Replaces working title `RegistryDiagram` at package extraction. |
| **Embed component** | `OsseEmbed` | MDX/docs consumer for fenced blocks + JSON payload. |
| **Embed schema** | `ens-osse/v1` | Replaces `ens-registry-diagram/v1`. Bump only with a documented breaking change. |
| **Docs fence** | `osse` | MDX fenced block language tag; remark plugin maps to embed. |
| **Demo app** | ENS Ossë playground | Private Vite app at repo root until workspace split; not published. |

### Principles

1. **One product name, many technical names** — “Ossë” in UI; packages and exports stay descriptive enough for npm search.
2. **Role over appearance** — `ResolverNode`, not `DashedNode`; `pill` + `hatched`, not `labelHatched`.
3. **Stable public surface first** — package name, primary export, schema, and fence freeze before cosmetic churn elsewhere.
4. **Don’t overfit “registry”** — the library draws registries, pills, resolvers, aliases, and will grow entity types and sequence diagrams.

### Rejected options (summary)

- **Option B (descriptive):** `@ensdomains/diagram`, `EnsDiagram`, `ens-diagram/v1` — self-explanatory but generic; Ossë becomes playground-only.
- **Option C (minimal):** keep `RegistryDiagram` / `@ensdomains/registry-diagram` — least churn but locks “registry” into the public API forever.

## Node taxonomy

Mermaid **shape syntax is unchanged** (`[…]`, `(…)`, `((…))`, `{…}`). Only internal types, components, and `NodeData` fields rename.

| Concept | `NodeType` | Component | Mermaid | DialKit folder |
|---------|------------|-----------|---------|----------------|
| Registry frame | `registry` | `RegistryNode` | `id[title]` | Registry cards |
| Solid pill | `pill` | `PillNode` | `id(title)` | Pills |
| Hatched pill | `pill` + `hatched: true` | `PillNode` | `id((title))` | Pills (hatch dials) |
| Resolver | `resolver` | `ResolverNode` | `id{title}` | Resolver |

### `NodeData` fields

- **`title`** — primary display string (was `label`; avoids collision with `EdgeData.label` and pill “label” styling).
- **`hatched?: boolean`** — modifier on `pill` only (was separate `labelHatched` type).
- **`labelFont?`** — typography on pills (`marist` | `semimono`); name kept (refers to pill copy style, not `title`).

### Unchanged (for now)

- **`EdgeData.label`** — mid-path edge chip text (`-. alias .->`, `-- text -->`).
- **`DiagramConfig` `label*` / `resolver*` keys** — theme tokens for pill and resolver paint; rename deferred to avoid a wide config churn.
- **Preset IDs** — kebab-case protocol names (`ensv2-alias-siblings`, `nested-column`, etc.).

## Folder layout (package extraction)

```
packages/osse/          # @ensdomains/osse
src/components/OsseDiagram/   # or keep RegistryDiagram/ until export rename lands
  RegistryNode.tsx
  PillNode.tsx
  ResolverNode.tsx
  …
```

## References to update when shipping

- `src/lib/docsEmbed.ts` — schema constant `ens-osse/v1`
- `docs/packaging.md`, `docs/devrel.md`, `docs/docs.md` — embed/schema examples
- `package.json` name → `@ensdomains/osse` (workspace)
- Remark plugin fence: `osse`
- DES-86 phase checklist — note schema ID if commenting on Linear
