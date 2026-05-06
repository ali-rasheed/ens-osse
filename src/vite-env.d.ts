/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Host the same .woff2 filenames as public/fonts/ under this URL (no trailing slash). */
  readonly VITE_FONT_ASSET_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module "*.md?raw" {
  const src: string
  export default src
}
