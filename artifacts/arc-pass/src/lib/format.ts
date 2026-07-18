export function abbreviateAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

export function formatPassNumber(passNumber: number | null | undefined): string {
  if (passNumber === null || passNumber === undefined) return "Assigned after claim";
  return `#${String(passNumber).padStart(4, "0")}`;
}

export function formatNetworkLabel(network: string | null | undefined): string {
  if (!network) return "Not yet assigned";
  return network.charAt(0).toUpperCase() + network.slice(1);
}

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" });

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
}

export function explorerTxUrl(network: string | null | undefined, txHash: string | null | undefined): string | null {
  if (!txHash) return null;
  if (network === "base") return `https://basescan.org/tx/${txHash}`;
  return `https://explorer.arc.network/tx/${txHash}`;
}
