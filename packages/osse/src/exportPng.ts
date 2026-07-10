/**
 * Rasterize a DOM subtree (diagram root) to PNG via html-to-image.
 * Call after layout/fonts settle; `pixelRatio` maps to 1x/2x/3x output dimensions.
 */
import { toPng } from "html-to-image"

export type ExportScale = 1 | 2 | 3

export async function downloadDiagramPng(
  element: HTMLElement,
  options: {
    scale: ExportScale
    fileName: string
    /** Solid fill behind transparent diagram areas */
    backgroundColor?: string
  }
): Promise<void> {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready
  }
  // Let motion/layout settle; double rAF reduces foreignObject vs border mis-snap.
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  )

  const rect = element.getBoundingClientRect()
  const width = Math.max(1, Math.round(rect.width))
  const height = Math.max(1, Math.round(rect.height))

  const dataUrl = await toPng(element, {
    pixelRatio: options.scale,
    width,
    height,
    canvasWidth: width,
    canvasHeight: height,
    cacheBust: true,
    backgroundColor: options.backgroundColor ?? "#ffffff",
    // Clone receives this on the root only; strips any residual motion transform on the capture box.
    style: { transform: "none" } as Partial<CSSStyleDeclaration>,
  })
  const a = document.createElement("a")
  a.href = dataUrl
  a.download = options.fileName
  a.rel = "noopener"
  a.click()
}
