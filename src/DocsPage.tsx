/**
 * In-app docs site: rendered CommonMark from `docs/*.md` (single source of truth).
 * Hash routes: `#/docs`, `#/docs/guide`, `#/docs/syntax`, `#/docs/naming`, `#/docs/packaging`.
 */
import { useEffect, useMemo, useState } from "react"
import { EnsMarkLogo } from "./components/EnsMarkLogo"
import { APP_CHROME_BY_MODE } from "@ensdomains/osse"
import { extractToc, renderMarkdown } from "./lib/markdown"
import userGuideSource from "../docs/docs.md?raw"
import mermaidPatternsSource from "../docs/mermaid-patterns.md?raw"
import namingSource from "../docs/naming.md?raw"
import packagingSource from "../docs/packaging.md?raw"
import "./docs.css"

export type DocsSlug = "guide" | "syntax" | "naming" | "packaging"

const DOCS_PAGES: Record<
  DocsSlug,
  { title: string; description: string; source: string }
> = {
  guide: {
    title: "Using Ossë",
    description: "Playground layout, templates, export, and embed",
    source: userGuideSource,
  },
  syntax: {
    title: "Mermaid syntax",
    description: "Shapes, links, frontmatter, and layout patterns",
    source: mermaidPatternsSource,
  },
  naming: {
    title: "Naming",
    description: "Product, package, schema, and node taxonomy",
    source: namingSource,
  },
  packaging: {
    title: "Packaging",
    description: "@ensdomains/osse workspace and exports",
    source: packagingSource,
  },
}

const NAV: { slug: DocsSlug; label: string }[] = [
  { slug: "guide", label: "Guide" },
  { slug: "syntax", label: "Syntax" },
  { slug: "naming", label: "Naming" },
  { slug: "packaging", label: "Packaging" },
]

export function parseDocsSlug(hash: string): DocsSlug {
  const path = hash.replace(/^#\/?/, "").replace(/\/$/, "")
  const parts = path.split("/")
  // docs | docs/guide | docs/syntax …
  if (parts[0] !== "docs") return "guide"
  const slug = parts[1] as DocsSlug | undefined
  if (slug && slug in DOCS_PAGES) return slug
  return "guide"
}

/** Optional heading id from `#/docs/syntax/my-heading`. */
export function parseDocsHeadingId(hash: string): string | null {
  const path = hash.replace(/^#\/?/, "").replace(/\/$/, "")
  const parts = path.split("/")
  if (parts[0] !== "docs" || parts.length < 3) return null
  return parts.slice(2).join("/") || null
}

export function docsHref(slug: DocsSlug = "guide", headingId?: string): string {
  const base = slug === "guide" ? "#/docs" : `#/docs/${slug}`
  return headingId ? `${base}/${headingId}` : base
}

export function DocsPage({ slug }: { slug: DocsSlug }) {
  const chrome = APP_CHROME_BY_MODE.light
  const page = DOCS_PAGES[slug]
  const toc = useMemo(() => extractToc(page.source), [page.source])
  const html = useMemo(() => renderMarkdown(page.source), [page.source])
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    document.title = `${page.title} · ENS Ossë Docs`
    return () => {
      document.title = "ENS Ossë"
    }
  }, [page.title])

  useEffect(() => {
    const headingId = parseDocsHeadingId(window.location.hash)
    if (!headingId) return
    requestAnimationFrame(() => {
      document.getElementById(headingId)?.scrollIntoView({ behavior: "smooth" })
      setActiveId(headingId)
    })
  }, [slug, html])

  useEffect(() => {
    const headings = toc
      .map((t) => document.getElementById(t.id))
      .filter((el): el is HTMLElement => Boolean(el))
    if (!headings.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (a.boundingClientRect.top ?? 0) - (b.boundingClientRect.top ?? 0))
        if (visible[0]?.target?.id) setActiveId(visible[0].target.id)
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: [0, 1] }
    )
    for (const el of headings) observer.observe(el)
    return () => observer.disconnect()
  }, [toc, html])

  return (
    <div className="docs-shell" style={{ background: chrome.shellBg, color: chrome.text }}>
      <header className="docs-header" style={{ borderBottom: chrome.asideBorder }}>
        <a href="#/" className="docs-brand" style={{ color: chrome.text }}>
          <EnsMarkLogo size={24} />
          <span>ENS Ossë</span>
        </a>
        <nav className="docs-nav" aria-label="Docs sections">
          {NAV.map((item) => {
            const active = item.slug === slug
            return (
              <a
                key={item.slug}
                href={docsHref(item.slug)}
                className={active ? "docs-nav-link is-active" : "docs-nav-link"}
                style={{
                  color: active ? chrome.text : chrome.textMuted,
                  borderBottomColor: active ? chrome.text : "transparent",
                }}
              >
                {item.label}
              </a>
            )
          })}
        </nav>
        <a href="#/" className="docs-back" style={{ color: chrome.textMuted }}>
          ← Playground
        </a>
      </header>

      <div className="docs-body">
        <aside className="docs-toc" aria-label="On this page">
          <p className="docs-toc-label" style={{ color: chrome.textMuted }}>
            On this page
          </p>
          <ul>
            {toc.map((entry) => (
              <li key={entry.id} data-level={entry.level}>
                <a
                  href={`#${entry.id}`}
                  className={activeId === entry.id ? "is-active" : undefined}
                  style={{ color: activeId === entry.id ? chrome.text : chrome.textMuted }}
                  onClick={(e) => {
                    e.preventDefault()
                    document.getElementById(entry.id)?.scrollIntoView({ behavior: "smooth" })
                    setActiveId(entry.id)
                  }}
                >
                  {entry.text}
                </a>
              </li>
            ))}
          </ul>
        </aside>

        <article className="docs-article">
          <p className="docs-lede" style={{ color: chrome.textMuted }}>
            {page.description}
          </p>
          <div
            className="docs-prose"
            style={{ ["--docs-muted" as string]: chrome.textMuted }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </article>
      </div>
    </div>
  )
}
