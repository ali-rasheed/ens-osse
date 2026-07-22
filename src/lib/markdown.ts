/**
 * Lightweight markdown → HTML + TOC for the in-app docs site.
 * Same CommonMark sources as `docs/*.md` (invariant 7 — no content forks).
 */
import { marked } from "marked"

export interface TocEntry {
  id: string
  text: string
  level: 2 | 3
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
}

/** Extract h2/h3 headings for a sidebar TOC (ids match rendered anchors). */
export function extractToc(md: string): TocEntry[] {
  const toc: TocEntry[] = []
  const seen = new Map<string, number>()
  for (const line of md.split("\n")) {
    const m = /^(#{2,3})\s+(.+)$/.exec(line.trim())
    if (!m) continue
    const level = m[1].length as 2 | 3
    const text = m[2].replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/`([^`]+)`/g, "$1")
    let id = slugify(text)
    const n = seen.get(id) ?? 0
    seen.set(id, n + 1)
    if (n > 0) id = `${id}-${n}`
    toc.push({ id, text, level })
  }
  return toc
}

/** Render markdown to HTML with heading ids for TOC anchors. */
export function renderMarkdown(md: string): string {
  const seen = new Map<string, number>()
  const renderer = new marked.Renderer()
  renderer.heading = ({ text, depth }) => {
    const plain = text.replace(/<[^>]+>/g, "")
    let id = slugify(plain)
    const n = seen.get(id) ?? 0
    seen.set(id, n + 1)
    if (n > 0) id = `${id}-${n}`
    return `<h${depth} id="${id}">${text}</h${depth}>\n`
  }
  renderer.link = ({ href, title, text }) => {
    const mapped = mapDocsHref(href ?? "")
    const titleAttr = title ? ` title="${escapeAttr(title)}"` : ""
    return `<a href="${escapeAttr(mapped)}"${titleAttr}>${text}</a>`
  }
  return marked.parse(md, { renderer, async: false }) as string
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")
}

/** Map relative `docs/*.md` links to in-app hash routes. */
function mapDocsHref(href: string): string {
  const clean = href.replace(/^\.\//, "")
  const fileHash = clean.includes("#") ? clean.slice(clean.indexOf("#") + 1) : ""
  const file = clean.includes("#") ? clean.slice(0, clean.indexOf("#")) : clean

  if (file === "docs.md" || file.endsWith("/docs.md") || file === "../docs/docs.md") {
    return fileHash ? `#/docs/${fileHash}` : "#/docs"
  }
  if (file === "mermaid-patterns.md" || file.endsWith("mermaid-patterns.md")) {
    return fileHash ? `#/docs/syntax/${fileHash}` : "#/docs/syntax"
  }
  if (file === "naming.md" || file.endsWith("naming.md")) {
    return fileHash ? `#/docs/naming/${fileHash}` : "#/docs/naming"
  }
  if (file === "packaging.md" || file.endsWith("packaging.md")) {
    return fileHash ? `#/docs/packaging/${fileHash}` : "#/docs/packaging"
  }
  // Same-page anchors stay as-is (TOC / in-page links)
  if (href.startsWith("#") && !href.startsWith("#/")) return href
  return href
}
