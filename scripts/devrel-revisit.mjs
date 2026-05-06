#!/usr/bin/env node
/**
 * Prints a one-screen reminder for devrel / release hygiene. See docs/devrel.md.
 */
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")

const lines = [
  "ens-registry-diagram — devrel revisit",
  "",
  "Open and walk through:",
  `  ${join(root, "docs", "devrel.md")}`,
  "",
  "Related:",
  `  ${join(root, "docs", "mermaid-patterns.md")}`,
  `  ${join(root, "CONTRIBUTING.md")}`,
  "",
  "Then: npm run build",
  "",
]

process.stdout.write(lines.join("\n"))
