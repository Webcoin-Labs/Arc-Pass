import { isAddress, getAddress } from "viem";

export interface AddressValidation {
  valid: boolean;
  checksummed?: string;
}

export function validateWalletAddress(address: string): AddressValidation {
  const trimmed = address.trim();
  if (!isAddress(trimmed)) return { valid: false };
  return { valid: true, checksummed: getAddress(trimmed) };
}
