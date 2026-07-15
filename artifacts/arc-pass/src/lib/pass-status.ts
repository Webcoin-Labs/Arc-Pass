import { CheckCircle2, Clock, ShieldAlert, Lock, RefreshCw, TrendingUp, Ban, ShieldOff } from "lucide-react";
import type { BuilderPass, FounderPass } from "@workspace/api-client-react";

export type BadgeVariant = "success" | "warning" | "info" | "neutral" | "destructive";

export interface StatusMeta {
  label: string;
  variant: BadgeVariant;
  icon: typeof CheckCircle2;
}

export function founderEligibilityMeta(status: string): StatusMeta {
  switch (status) {
    case "eligible":
      return { label: "Eligible to claim", variant: "success", icon: CheckCircle2 };
    case "invite_required":
      return { label: "Invite required", variant: "neutral", icon: Lock };
    case "under_review":
      return { label: "Under review", variant: "warning", icon: Clock };
    default:
      return { label: "Currently ineligible", variant: "neutral", icon: ShieldAlert };
  }
}

export function founderClaimMeta(status: string): StatusMeta {
  switch (status) {
    case "minted":
      return { label: "Permanent credential", variant: "success", icon: CheckCircle2 };
    case "claimed":
      return { label: "Claimed", variant: "info", icon: CheckCircle2 };
    default:
      return { label: "Locked", variant: "neutral", icon: Lock };
  }
}

export function builderEligibilityMeta(status: string): StatusMeta {
  switch (status) {
    case "eligible":
      return { label: "Eligible to claim", variant: "success", icon: CheckCircle2 };
    case "analysis_in_progress":
      return { label: "Analysis in progress", variant: "info", icon: RefreshCw };
    case "ineligible":
      return { label: "Currently ineligible", variant: "neutral", icon: ShieldAlert };
    default:
      return { label: "Verification required", variant: "neutral", icon: Lock };
  }
}

export function builderClaimMeta(status: string): StatusMeta {
  switch (status) {
    case "minted":
      return { label: "Minted", variant: "success", icon: CheckCircle2 };
    case "claimed":
      return { label: "Claimed", variant: "info", icon: CheckCircle2 };
    default:
      return { label: "Locked", variant: "neutral", icon: Lock };
  }
}

/** Single authoritative status for a Builder Pass, considering suspension/revocation/upgrade state together. */
export function builderOverallStatusMeta(pass: Pick<BuilderPass, "isRevoked" | "isSuspended" | "claimStatus" | "eligibilityStatus" | "upgradeAvailable">): StatusMeta {
  if (pass.isRevoked) return { label: "Revoked", variant: "destructive", icon: Ban };
  if (pass.isSuspended) return { label: "Suspended", variant: "destructive", icon: ShieldOff };
  if (pass.upgradeAvailable) return { label: "Tier upgrade available", variant: "info", icon: TrendingUp };
  if (pass.claimStatus === "locked") return builderEligibilityMeta(pass.eligibilityStatus);
  return builderClaimMeta(pass.claimStatus);
}

export function founderOverallStatusMeta(pass: Pick<FounderPass, "claimStatus" | "eligibilityStatus">): StatusMeta {
  if (pass.claimStatus === "locked") return founderEligibilityMeta(pass.eligibilityStatus);
  return founderClaimMeta(pass.claimStatus);
}
