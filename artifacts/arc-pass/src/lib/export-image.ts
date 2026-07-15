import { toPng } from "html-to-image";

/** Exports a rendered DOM node (a pass card) to a downloaded PNG, entirely client-side. */
export async function downloadNodeAsPng(node: HTMLElement, filename: string): Promise<void> {
  const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: true });
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
