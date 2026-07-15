import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FounderPassCard } from "@/components/founder-pass-card";
import { CompanyLogoUploader } from "@/components/company-logo-uploader";
import { useAdminListFounderTiers, useAdminUpdateFounderPass } from "@workspace/api-client-react";
import type { AdminFounderPass } from "@workspace/api-client-react";
import { toast } from "sonner";

export function FounderPassEditor({ pass, onSaved }: { pass: AdminFounderPass; onSaved: () => void }) {
  const { data: tiers = [] } = useAdminListFounderTiers();
  const updatePass = useAdminUpdateFounderPass();

  const [form, setForm] = useState({
    eligibilityStatus: pass.eligibilityStatus,
    variant: pass.variant,
    founderTierId: pass.founderTier?.id,
    founderTitle: pass.founderTitle ?? "",
    companyName: pass.companyName ?? "",
    companyIndustry: pass.companyIndustry ?? "",
    companyLogoUrl: pass.companyLogoUrl,
    companyWebsite: pass.companyWebsite ?? "",
    companyLocation: pass.companyLocation ?? "",
    startupStage: pass.startupStage ?? "",
    founderStatement: pass.founderStatement ?? "",
    companyDescription: pass.companyDescription ?? "",
    passNumber: pass.passNumber ?? undefined,
    adminNotes: pass.adminNotes ?? "",
  });

  useEffect(() => {
    setForm({
      eligibilityStatus: pass.eligibilityStatus,
      variant: pass.variant,
      founderTierId: pass.founderTier?.id,
      founderTitle: pass.founderTitle ?? "",
      companyName: pass.companyName ?? "",
      companyIndustry: pass.companyIndustry ?? "",
      companyLogoUrl: pass.companyLogoUrl,
      companyWebsite: pass.companyWebsite ?? "",
      companyLocation: pass.companyLocation ?? "",
      startupStage: pass.startupStage ?? "",
      founderStatement: pass.founderStatement ?? "",
      companyDescription: pass.companyDescription ?? "",
      passNumber: pass.passNumber ?? undefined,
      adminNotes: pass.adminNotes ?? "",
    });
  }, [pass.id]);

  const isLocked = !!pass.claimStatus && pass.claimStatus === "minted";
  const selectedTier = tiers.find((t) => t.id === form.founderTierId);

  const handleSave = () => {
    updatePass.mutate(
      {
        id: pass.id,
        data: {
          eligibilityStatus: form.eligibilityStatus,
          variant: form.variant,
          founderTierId: form.founderTierId,
          founderTitle: form.founderTitle || undefined,
          companyName: form.companyName || undefined,
          companyIndustry: form.companyIndustry || undefined,
          companyLogoUrl: form.companyLogoUrl ?? undefined,
          companyWebsite: form.companyWebsite || undefined,
          companyLocation: form.companyLocation || undefined,
          startupStage: form.startupStage || undefined,
          founderStatement: form.founderStatement || undefined,
          companyDescription: form.companyDescription || undefined,
          passNumber: form.passNumber,
          adminNotes: form.adminNotes || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success("Founder Pass updated");
          onSaved();
        },
        onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Update failed"),
      },
    );
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        {isLocked && (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertTitle>Permanently locked</AlertTitle>
            <AlertDescription>This Founder Pass has been minted. Variant and tier and identity are permanent and cannot change.</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Eligibility status</Label>
            <Select value={form.eligibilityStatus} onValueChange={(v) => setForm((f) => ({ ...f, eligibilityStatus: v as typeof f.eligibilityStatus }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eligible">Eligible</SelectItem>
                <SelectItem value="invite_required">Invite required</SelectItem>
                <SelectItem value="under_review">Under review</SelectItem>
                <SelectItem value="ineligible">Ineligible</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Variant</Label>
            <Select value={form.variant} onValueChange={(v) => setForm((f) => ({ ...f, variant: v as typeof f.variant }))} disabled={isLocked}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="premium_black">Premium Black</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Founder tier</Label>
          <Select
            value={form.founderTierId ? String(form.founderTierId) : undefined}
            onValueChange={(v) => setForm((f) => ({ ...f, founderTierId: Number(v) }))}
            disabled={isLocked}
          >
            <SelectTrigger>
              <SelectValue placeholder="No tier assigned" />
            </SelectTrigger>
            <SelectContent>
              {tiers.map((tier) => (
                <SelectItem key={tier.id} value={String(tier.id)}>
                  {tier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Founder title</Label>
            <Input value={form.founderTitle} onChange={(e) => setForm((f) => ({ ...f, founderTitle: e.target.value }))} placeholder="Founder & CEO" />
          </div>
          <div className="space-y-1.5">
            <Label>Pass number</Label>
            <Input
              type="number"
              value={form.passNumber ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, passNumber: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Company logo</Label>
          <CompanyLogoUploader value={form.companyLogoUrl} onChange={(url) => setForm((f) => ({ ...f, companyLogoUrl: url }))} name={form.companyName} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Company name</Label>
            <Input value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Company industry</Label>
            <Input value={form.companyIndustry} onChange={(e) => setForm((f) => ({ ...f, companyIndustry: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Company website</Label>
            <Input value={form.companyWebsite} onChange={(e) => setForm((f) => ({ ...f, companyWebsite: e.target.value }))} placeholder="https://" />
          </div>
          <div className="space-y-1.5">
            <Label>Company location</Label>
            <Input value={form.companyLocation} onChange={(e) => setForm((f) => ({ ...f, companyLocation: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Startup stage</Label>
            <Input value={form.startupStage} onChange={(e) => setForm((f) => ({ ...f, startupStage: e.target.value }))} placeholder="Seed, Series A…" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Company description</Label>
          <Textarea value={form.companyDescription} onChange={(e) => setForm((f) => ({ ...f, companyDescription: e.target.value }))} rows={2} />
        </div>
        <div className="space-y-1.5">
          <Label>Founder statement</Label>
          <Textarea value={form.founderStatement} onChange={(e) => setForm((f) => ({ ...f, founderStatement: e.target.value }))} rows={2} />
        </div>
        <div className="space-y-1.5">
          <Label>Internal admin notes</Label>
          <Textarea value={form.adminNotes} onChange={(e) => setForm((f) => ({ ...f, adminNotes: e.target.value }))} rows={2} />
        </div>

        <Button className="w-full" onClick={handleSave} disabled={updatePass.isPending}>
          {updatePass.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>

      <div className="lg:sticky lg:top-6">
        <p className="mb-3 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">Live Preview</p>
        <FounderPassCard
          interactive={false}
          data={{
            variant: form.variant,
            displayName: pass.displayName,
            username: pass.username,
            avatarUrl: pass.avatarUrl,
            founderTitle: form.founderTitle || null,
            companyName: form.companyName || null,
            companyIndustry: form.companyIndustry || null,
            companyLogoUrl: form.companyLogoUrl,
            founderTier: selectedTier ?? null,
            passNumber: form.passNumber ?? pass.passNumber,
            network: pass.network,
            issuedAt: pass.issuedAt,
            eligibilityStatus: form.eligibilityStatus,
            claimStatus: pass.claimStatus,
          }}
        />
      </div>
    </div>
  );
}
