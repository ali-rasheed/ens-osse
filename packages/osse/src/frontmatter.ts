/**
 * Document-level config from YAML frontmatter (mermaid-conventional `---` block).
 * Spec: docs/mermaid-patterns.md § Frontmatter; plan §7A.
 */
import type { DiagramMode } from "./RegistryDiagram/theme"
import type { AnimationConfig, PathPulseConfig } from "./RegistryDiagram/types"

/** How the diagram should fit its container (responsive §6; applied by embed/host). */
export type FitMode = "none" | "width" | "clamp"

export interface OsseFrontmatter {
  /** Appearance mode; `docs` aliases `light`. */
  theme?: DiagramMode
  animation?: AnimationConfig
  /** Path pulse; `loop` is accepted in YAML and ignored (pulse always loops when set). */
  pulse?: PathPulseConfig
  fit?: FitMode
}

export interface FrontmatterParseResult {
  body: string
  frontmatter?: OsseFrontmatter
  error?: string
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

function stripQuotes(s: string): string {
  const t = s.trim()
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1)
  }
  return t
}

function parseScalar(raw: string): string | number | boolean {
  const s = stripQuotes(raw.trim())
  if (s === "true") return true
  if (s === "false") return false
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s)
  return s
}

/** Parse `{ key: value, key2: value2 }` (single-line object). */
function parseInlineObject(raw: string): Record<string, string | number | boolean> {
  const inner = raw.trim().replace(/^\{/, "").replace(/\}$/, "").trim()
  const out: Record<string, string | number | boolean> = {}
  if (!inner) return out
  for (const part of inner.split(",")) {
    const colon = part.indexOf(":")
    if (colon < 0) continue
    const key = part.slice(0, colon).trim()
    const val = parseScalar(part.slice(colon + 1))
    if (key) out[key] = val
  }
  return out
}

function asString(v: unknown): string | undefined {
  if (typeof v === "string") return v
  if (typeof v === "number" || typeof v === "boolean") return String(v)
  return undefined
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v)) return Number(v)
  return undefined
}

function normalizeTheme(raw: string): DiagramMode | undefined {
  const t = raw.trim().toLowerCase()
  if (t === "docs") return "light"
  if (t === "light" || t === "dark" || t === "protocol") return t
  return undefined
}

function normalizeFit(raw: string): FitMode | undefined {
  const t = raw.trim().toLowerCase()
  if (t === "none" || t === "width" || t === "clamp") return t
  if (t === "fit-width" || t === "fit_to_width") return "width"
  return undefined
}

function animationFromObj(obj: Record<string, string | number | boolean>): AnimationConfig {
  const anim: AnimationConfig = {}
  const preset = asString(obj.preset)
  if (preset === "draw" || preset === "fade" || preset === "pop" || preset === "none") {
    anim.preset = preset
  }
  const stagger = asNumber(obj.stagger)
  if (stagger !== undefined) anim.stagger = stagger
  const duration = asNumber(obj.duration)
  if (duration !== undefined) anim.duration = duration
  return anim
}

function pulseFromObj(obj: Record<string, string | number | boolean>): PathPulseConfig | undefined {
  const from = asString(obj.from)
  const to = asString(obj.to)
  if (!from || !to) return undefined
  const stagger = asNumber(obj.stagger) ?? 0.15
  const segmentDuration = asNumber(obj.segmentDuration) ?? asNumber(obj.duration) ?? 0.35
  const hold = asNumber(obj.hold)
  const highlightColor = asString(obj.highlightColor) ?? asString(obj.color)
  const includeEdges =
    typeof obj.includeEdges === "boolean"
      ? obj.includeEdges
      : obj.includeEdges === "false"
        ? false
        : undefined
  return {
    from,
    to,
    stagger,
    segmentDuration,
    ...(hold !== undefined ? { hold } : {}),
    ...(highlightColor ? { highlightColor } : {}),
    ...(includeEdges !== undefined ? { includeEdges } : {}),
  }
}

/**
 * Parse a YAML-ish frontmatter block into `OsseFrontmatter`.
 * Supports flat `key: value` and single-line `{ nested: objects }`.
 */
export function parseFrontmatterBlock(yaml: string): { config: OsseFrontmatter; error?: string } {
  const config: OsseFrontmatter = {}
  const lines = yaml.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const colon = trimmed.indexOf(":")
    if (colon < 0) continue
    const key = trimmed.slice(0, colon).trim()
    const rest = trimmed.slice(colon + 1).trim()
    if (key === "theme") {
      const theme = normalizeTheme(asString(parseScalar(rest)) ?? "")
      if (theme) config.theme = theme
      else return { config, error: `Unknown theme "${rest}" (use light|dark|protocol|docs)` }
    } else if (key === "fit") {
      const fit = normalizeFit(asString(parseScalar(rest)) ?? "")
      if (fit) config.fit = fit
      else return { config, error: `Unknown fit "${rest}" (use none|width|clamp)` }
    } else if (key === "animation") {
      if (rest.startsWith("{")) {
        config.animation = animationFromObj(parseInlineObject(rest))
      } else {
        const preset = asString(parseScalar(rest))
        if (preset === "draw" || preset === "fade" || preset === "pop" || preset === "none") {
          config.animation = { preset }
        }
      }
    } else if (key === "pulse") {
      if (rest.startsWith("{")) {
        const pulse = pulseFromObj(parseInlineObject(rest))
        if (pulse) config.pulse = pulse
        else return { config, error: "pulse requires from and to" }
      }
    } else if (key === "stagger") {
      const n = asNumber(parseScalar(rest))
      if (n !== undefined) {
        config.animation = { ...config.animation, stagger: n }
      }
    }
  }
  return { config }
}

/** Strip leading `---` YAML frontmatter and return body + parsed config. */
export function extractFrontmatter(src: string): FrontmatterParseResult {
  const m = FRONTMATTER_RE.exec(src)
  if (!m) return { body: src }
  const { config, error } = parseFrontmatterBlock(m[1])
  return {
    body: src.slice(m[0].length),
    frontmatter: config,
    ...(error ? { error } : {}),
  }
}
