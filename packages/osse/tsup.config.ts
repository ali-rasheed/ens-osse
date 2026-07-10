import { defineConfig } from "tsup"

export default defineConfig({
  entry: {
    index: "src/index.ts",
    mermaid: "src/mermaid.ts",
    export: "src/export.ts",
    remark: "src/remark.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "motion",
    "motion/react",
    "html-to-image",
    "unist-util-visit",
  ],
  esbuildOptions(options) {
    options.jsx = "automatic"
  },
})
