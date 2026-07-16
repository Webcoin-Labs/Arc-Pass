import { logger } from "./logger";

const CACHE_TTL_MS = 30_000;
const REQUEST_TIMEOUT_MS = 8_000;

export interface ArcGasPrice {
  network: "Arc";
  gwei: number;
  source: "blockscout";
  updatedAt: string;
}

type BlockscoutStats = {
  gas_prices?: {
    average?: number | string;
  };
  static_gas_price?: number | string;
};

let cached: { value: ArcGasPrice; expiresAt: number } | null = null;
let pending: Promise<ArcGasPrice> | null = null;

export function buildBlockscoutStatsUrl(baseUrl: string, apiKey: string): string {
  const url = new URL(baseUrl);
  const path = url.pathname.replace(/\/$/, "");

  if (!path || path === "/api") {
    url.pathname = "/api/v2/stats";
  } else if (!path.endsWith("/api/v2/stats")) {
    url.pathname = `${path}/api/v2/stats`.replace(/\/+/g, "/");
  }

  url.searchParams.set("apikey", apiKey);
  return url.toString();
}

export function parseBlockscoutGasPrice(payload: BlockscoutStats): number {
  const raw = payload.gas_prices?.average ?? payload.static_gas_price;
  const gwei = typeof raw === "string" ? Number.parseFloat(raw) : raw;

  if (typeof gwei !== "number" || !Number.isFinite(gwei) || gwei < 0) {
    throw new Error("Blockscout returned an invalid gas price");
  }

  return gwei;
}

async function requestGasPrice(): Promise<ArcGasPrice> {
  const explorerUrl = process.env.EXPLORER_API_URL;
  const explorerKey = process.env.EXPLORER_API_KEY;
  if (!explorerUrl || !explorerKey) {
    throw new Error("Blockscout is not configured");
  }

  const response = await fetch(buildBlockscoutStatsUrl(explorerUrl, explorerKey), {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Blockscout gas request failed with status ${response.status}`);
  }

  const payload = await response.json() as BlockscoutStats;
  return {
    network: "Arc",
    gwei: parseBlockscoutGasPrice(payload),
    source: "blockscout",
    updatedAt: new Date().toISOString(),
  };
}

export async function getArcGasPrice(): Promise<ArcGasPrice> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.value;
  if (pending) return pending;

  pending = requestGasPrice()
    .then((value) => {
      cached = { value, expiresAt: Date.now() + CACHE_TTL_MS };
      return value;
    })
    .catch((error) => {
      logger.warn({ err: error }, "Unable to fetch Arc gas price from Blockscout");
      throw error;
    })
    .finally(() => {
      pending = null;
    });

  return pending;
}
