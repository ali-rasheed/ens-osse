import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "node:path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Dev: resolve workspace package to source (skip waiting on dist).
      "@ensdomains/osse": path.resolve(__dirname, "packages/osse/src/index.ts"),
      "@ensdomains/osse/mermaid": path.resolve(__dirname, "packages/osse/src/mermaid.ts"),
      "@ensdomains/osse/export": path.resolve(__dirname, "packages/osse/src/export.ts"),
      "@ensdomains/osse/remark": path.resolve(__dirname, "packages/osse/src/remark.ts"),
    },
  },
})
