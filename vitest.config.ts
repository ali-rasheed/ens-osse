import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  test: {
    include: [
      "packages/osse/src/**/*.test.ts",
      "packages/osse/src/**/*.test.tsx",
    ],
  },
})
