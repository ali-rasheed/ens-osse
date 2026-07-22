/**
 * Hash router: `#/` playground, `#/docs…` docs site.
 * Keeps a single SPA without react-router.
 */
import { StrictMode, useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import App from "./App"
import { DocsPage, parseDocsSlug, type DocsSlug } from "./DocsPage"
import "./ens-font-faces.css"
import "./index.css"

type Route =
  | { kind: "playground" }
  | { kind: "docs"; slug: DocsSlug }

function routeFromHash(hash: string): Route {
  const raw = hash.replace(/^#/, "") || "/"
  if (raw === "/" || raw === "") return { kind: "playground" }
  if (raw === "/docs" || raw.startsWith("/docs/") || raw === "docs" || raw.startsWith("docs/")) {
    return { kind: "docs", slug: parseDocsSlug(hash) }
  }
  return { kind: "playground" }
}

function Root() {
  const [route, setRoute] = useState<Route>(() => routeFromHash(window.location.hash))

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash(window.location.hash))
    window.addEventListener("hashchange", onHash)
    return () => window.removeEventListener("hashchange", onHash)
  }, [])

  if (route.kind === "docs") return <DocsPage slug={route.slug} />
  return <App />
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>
)
