import { useEffect, useState } from "react";
import { Gauge } from "lucide-react";

type GasPriceResponse = {
  network: "Arc";
  gwei: number;
  source: "blockscout";
  updatedAt: string;
};

function formatGwei(value: number): string {
  if (value === 0) return "0";
  if (value < 0.001) return "<0.001";
  if (value < 1) return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  if (value < 100) return value.toFixed(1).replace(/\.0$/, "");
  return Math.round(value).toLocaleString("en-US");
}

export function ArcGasIndicator() {
  const [gasPrice, setGasPrice] = useState<GasPriceResponse | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let controller: AbortController | null = null;

    const load = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetch("/api/network/gas-price", { signal: controller.signal });
        if (!response.ok) throw new Error("Gas price unavailable");
        const payload = await response.json() as GasPriceResponse;
        if (!Number.isFinite(payload.gwei) || payload.gwei < 0) throw new Error("Invalid gas price");
        setGasPrice(payload);
        setUnavailable(false);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setUnavailable(true);
      }
    };

    void load();
    const interval = window.setInterval(load, 60_000);
    return () => {
      controller?.abort();
      window.clearInterval(interval);
    };
  }, []);

  const label = gasPrice ? `${formatGwei(gasPrice.gwei)} Gwei` : unavailable ? "Unavailable" : "Loading";

  return (
    <div
      className="flex h-9 shrink-0 items-center rounded-full border border-white/10 bg-white/[0.06] px-2 text-white shadow-sm backdrop-blur-md sm:h-11 sm:gap-2 sm:px-3"
      title={gasPrice ? `Arc network average gas price · Updated ${new Date(gasPrice.updatedAt).toLocaleTimeString()}` : "Arc network gas price"}
      aria-label={`Arc gas: ${label}`}
    >
      <span className="relative hidden size-6 place-items-center rounded-full bg-[#4f63ff]/20 text-[#8da2ff] sm:grid" aria-hidden="true">
        <span className="absolute size-1.5 animate-pulse rounded-full bg-[#65f6b4]" />
        <Gauge className="size-3.5 opacity-70" />
      </span>
      <span className="leading-none">
        <span className="hidden text-[9px] font-semibold uppercase tracking-[0.16em] text-white/40 sm:block">Arc gas</span>
        <span className="block whitespace-nowrap text-[9px] font-semibold tabular-nums text-white sm:mt-1 sm:text-xs">{label}</span>
      </span>
    </div>
  );
}
