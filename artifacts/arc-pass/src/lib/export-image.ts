import { toBlob, toPng } from "html-to-image";

/** Exports a rendered DOM node (a pass card) to a downloaded PNG, entirely client-side. */
export async function downloadNodeAsPng(node: HTMLElement, filename: string): Promise<void> {
  const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: true });
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

function downloadBlob(blob: Blob, filename: string): void {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = href;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(href), 1_000);
}

/**
 * Attempts explicit X media authorization with a rendered pass image. If the
 * X app lacks posting permission (or the provider is unavailable), the image
 * is downloaded and a Web Intent is opened so the user can attach it manually.
 */
export async function shareNodeOnX(params: { node: HTMLElement; passType: "founder" | "builder"; passId: number; minted: boolean; returnTo?: string }): Promise<"direct" | "fallback"> {
  const popup = window.open("about:blank", "_blank");
  if (popup) popup.opener = null;
  const credential = params.passType === "founder" ? "Founder" : "Builder";
  const text = params.minted ? `I minted my Arc ${credential} Pass onchain.` : `I claimed my verified Arc ${credential} Pass.`;
  const shareUrl = `${window.location.origin}/api/share/${params.passType}/${params.passId}`;
  const intentUrl = `https://x.com/intent/post?${new URLSearchParams({ text, url: shareUrl }).toString()}`;
  const filename = `arc-pass-${params.passType}.png`;
  let blob: Blob | null = null;

  try {
    blob = await toBlob(params.node, { pixelRatio: 2, cacheBust: true });
    if (!blob) throw new Error("Pass image export failed");
    const form = new FormData();
    form.set("image", blob, filename);
    form.set("passType", params.passType);
    form.set("passId", String(params.passId));
    form.set("minted", String(params.minted));
    form.set("returnTo", params.returnTo ?? `${window.location.pathname}${window.location.search}`);
    const response = await fetch("/api/share/x/direct", { method: "POST", body: form, credentials: "include" });
    if (!response.ok) throw new Error("Direct X posting is unavailable");
    const payload = await response.json() as { authorizationUrl?: string };
    if (!payload.authorizationUrl) throw new Error("X authorization URL missing");
    if (popup) popup.location.href = payload.authorizationUrl;
    else window.location.assign(payload.authorizationUrl);
    return "direct";
  } catch {
    blob ??= await toBlob(params.node, { pixelRatio: 2, cacheBust: true });
    if (blob) downloadBlob(blob, filename);
    if (popup) popup.location.href = intentUrl;
    else window.open(intentUrl, "_blank", "noopener,noreferrer");
    return "fallback";
  }
}
