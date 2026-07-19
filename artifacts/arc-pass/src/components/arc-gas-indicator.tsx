import { useEffect, useState } from "react";
import { Gauge, RotateCcw } from "lucide-react";

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
  const [retryToken, setRetryToken] = useState(0);

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
  }, [retryToken]);

  const label = gasPrice ? `${formatGwei(gasPrice.gwei)} Gwei` : unavailable ? "Retry" : "Loading";
  const baseClass = "flex h-11 shrink-0 items-center rounded-full border border-white/10 bg-white/[0.06] px-2 text-white shadow-sm backdrop-blur-md sm:gap-2 sm:px-3";
  const content = (
    <>
      <span className="relative hidden size-6 place-items-center rounded-full bg-[#4f63ff]/20 text-[#8da2ff] sm:grid" aria-hidden="true">
        {unavailable ? <RotateCcw className="size-3.5" /> : <><span className="absolute size-1.5 animate-pulse rounded-full bg-[#65f6b4] motion-reduce:animate-none" /><Gauge className="size-3.5 opacity-70" /></>}
      </span>
      <span className="leading-none">
        <span className="hidden items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/40 sm:flex"><img src="/logo/Arc_Logo_White.svg" alt="" className="h-2.5 w-auto shrink-0" /> gas</span>
        <span className="block whitespace-nowrap text-[9px] font-semibold tabular-nums text-white sm:mt-1 sm:text-xs">{label}</span>
      </span>
    </>
  );

  if (unavailable) {
    return (
      <button
        type="button"
        onClick={() => { setUnavailable(false); setGasPrice(null); setRetryToken((value) => value + 1); }}
        className={`${baseClass} cursor-pointer transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8da2ff]`}
        title="Arc gas unavailable. Retry"
        aria-label="Arc gas unavailable. Retry"
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={baseClass}
      title={gasPrice ? `Arc network average gas price · Updated ${new Date(gasPrice.updatedAt).toLocaleTimeString()}` : "Loading Arc network gas price"}
      aria-label={`Arc gas: ${label}`}
    >
      {content}
    </div>
  );
}
