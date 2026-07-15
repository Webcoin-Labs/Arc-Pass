import { isAddress, getAddress } from "viem";

interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
}

export function isInjectedWalletAvailable(): boolean {
  return typeof window !== "undefined" && !!(window as Window & { ethereum?: Eip1193Provider }).ethereum;
}

/** Connects to whatever EVM wallet extension is injected (MetaMask, Rabby, Coinbase Wallet, etc). */
export async function connectInjectedWallet(): Promise<string> {
  const ethereum = (window as Window & { ethereum?: Eip1193Provider }).ethereum;
  if (!ethereum) {
    throw new Error("No wallet extension found. Install an EVM-compatible wallet like MetaMask to connect.");
  }
  const accounts = (await ethereum.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts[0]) {
    throw new Error("No account was returned by the wallet.");
  }
  return getAddress(accounts[0]);
}

export interface AddressValidation {
  valid: boolean;
  checksummed?: string;
}

export function validateWalletAddress(address: string): AddressValidation {
  const trimmed = address.trim();
  if (!isAddress(trimmed)) return { valid: false };
  return { valid: true, checksummed: getAddress(trimmed) };
}
