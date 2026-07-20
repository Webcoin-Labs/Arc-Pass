import { toBlob, toPng } from "html-to-image";

/** Exports a rendered DOM node to a downloaded image, with an optional server artwork fallback. */
export async function downloadNodeAsPng(node: HTMLElement, filename: string, fallbackUrl?: string): Promise<void> {
  try {
    const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: true });
    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrl;
    link.click();
    return;
  } catch (error) {
    if (!fallbackUrl) throw error;
    const response = await fetch(fallbackUrl, { credentials: "include" });
    if (!response.ok) throw error;
    const blob = await response.blob();
    downloadBlob(blob, filename.replace(/\.png$/i, ".webp"));
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = href;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(href), 1_000);
}

function navigateSharePopup(popup: Window | null, url: string): void {
  if (popup && !popup.closed) {
    popup.location.replace(url);
    return;
  }
  window.location.assign(url);
}

/**
 * Attempts explicit X media authorization with a rendered pass image. If the
 * X app lacks posting permission (or the provider is unavailable), the image
 * is downloaded and a Web Intent is opened so the user can attach it manually.
 */
export async function shareNodeOnX(params: { node: HTMLElement; passType: "founder" | "builder"; passId: number; minted: boolean; returnTo?: string }): Promise<"direct" | "fallback"> {
  const popup = window.open("about:blank", "_blank");
  if (popup) popup.opener = null;
  const publicBase = window.location.hostname === "arc.webcoinlabs.com" ? window.location.origin : "https://arc.webcoinlabs.com";
  const shareUrl = `${publicBase}/api/share/${params.passType}/${params.passId}`;
  const applyUrl = publicBase;
  const text = params.passType === "founder"
    ? `${params.minted ? "Just minted my Arc Founder Pass onchain." : "I claimed my verified Arc Founder Pass."}\n\nBuilt for verified founders building across the Arc ecosystem, powered by @webcoinlabs.\n\nFounders can check their eligibility: ${shareUrl} or apply at: ${applyUrl}`
    : `${params.minted ? "Just minted my Arc Builder Pass onchain." : "I claimed my verified Arc Builder Pass."}\n\nBuilt by verified builders contributing across the Arc ecosystem, powered by @webcoinlabs.\n\nBuilders can check their verified activity: ${shareUrl} or apply at: ${applyUrl}`;
  const intentUrl = `https://x.com/intent/post?${new URLSearchParams({ text }).toString()}`;
  const filename = `arc-pass-${params.passType}.png`;
  let blob: Blob | null = null;

  try {
    blob = await toBlob(params.node, { pixelRatio: 2, cacheBust: true });
    if (!blob) throw new Error("Pass image export failed");
  } catch {
    // External profile images can make a browser reject DOM-to-image export.
    // The X intent must still open; never retry the same failed export while a
    // user-visible popup is left parked on about:blank.
    navigateSharePopup(popup, intentUrl);
    return "fallback";
  }

  try {
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
    if (popup && !popup.closed) popup.location.replace(payload.authorizationUrl);
    else window.location.assign(payload.authorizationUrl);
    return "direct";
  } catch {
    downloadBlob(blob, filename);
    navigateSharePopup(popup, intentUrl);
    return "fallback";
  }
}
