const BROWSER_EXTENSION_SOURCE = /(?:chrome|moz|safari-web)-extension:\/\//i;

/**
 * Browser wallet extensions inject providers into the page and can throw while
 * competing for `window.ethereum`. Those failures belong to the extension, not
 * the application, and should remain in DevTools without taking over Vite's UI.
 */
export function shouldShowRuntimeError(error: Error): boolean {
  const source = `${error.message ?? ""}\n${error.stack ?? ""}`;
  return !BROWSER_EXTENSION_SOURCE.test(source);
}
