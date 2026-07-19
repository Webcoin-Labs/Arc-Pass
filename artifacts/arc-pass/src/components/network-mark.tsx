export function NetworkMark({ network, className }: { network?: string | null; className?: string }) {
  if (network?.toLowerCase() !== "arc") return null;
  return <img src="/logo/Arc_network-A.svg" alt="" className={className} />;
}
