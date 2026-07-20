import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { TierEmblem } from "@/components/tier-badge";
import {
  useAdminListFounderTiers,
  useAdminUpdateFounderTier,
  useAdminListBuilderTiers,
  useAdminUpdateBuilderTier,
} from "@workspace/api-client-react";
import type { FounderTier, AdminBuilderTier } from "@workspace/api-client-react";

const GITHUB_TIER_LABELS: Record<string, string> = {
  Bronze: "10+ contributions / 180d account",
  Silver: "250+ contributions / 1y account",
  Gold: "750+ contributions / 2y account",
  Platinum: "1,500+ contributions / 3y account",
  Diamond: "3,000+ contributions / 4y account",
};

export function TierConfigPanel() {
  return (
    <Tabs defaultValue="founder">
      <TabsList>
        <TabsTrigger value="founder">Founder Tiers</TabsTrigger>
        <TabsTrigger value="builder">Builder Tiers</TabsTrigger>
      </TabsList>
      <TabsContent value="founder" className="mt-6">
        <FounderTiersTab />
      </TabsContent>
      <TabsContent value="builder" className="mt-6">
        <BuilderTiersTab />
      </TabsContent>
    </Tabs>
  );
}

function FounderTiersTab() {
  const queryClient = useQueryClient();
  const { data: tiers, isLoading } = useAdminListFounderTiers();
  const updateTier = useAdminUpdateFounderTier();
  const [editing, setEditing] = useState<FounderTier | null>(null);
  const [form, setForm] = useState({ name: "", description: "", accentColor: "", rank: 1, isActive: true });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/founder-tiers"] });

  const openEdit = (tier: FounderTier) => {
    setEditing(tier);
    setForm({ name: tier.name, description: tier.description ?? "", accentColor: tier.accentColor ?? "", rank: tier.rank, isActive: tier.isActive });
  };

  const handleSave = () => {
    if (!editing) return;
    updateTier.mutate(
      { id: editing.id, data: form },
      { onSuccess: () => { toast.success("Tier presentation updated"); invalidate(); setEditing(null); }, onError: () => toast.error("Update failed") },
    );
  };

  if (isLoading) return <Skeleton className="h-48 w-full rounded-xl" />;

  return (
    <div>
      <div className="mb-4 rounded-xl border border-primary/20 bg-primary/[0.05] px-4 py-3">
        <p className="text-sm font-medium">Fixed Founder catalog</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Founder Pass has exactly two tiers: Emerging Founder and Premier Founder. Their names, order, and active status are locked.
        </p>
      </div>
      <ul className="space-y-2">
        {tiers?.map((tier) => (
          <li key={tier.id} className="flex cursor-pointer items-center justify-between rounded-xl border bg-card px-4 py-3" onClick={() => openEdit(tier)}>
            <div className="flex items-center gap-3">
              <TierEmblem tier={tier} />
              <div>
                <p className="text-sm font-medium">{tier.name}</p>
                <p className="text-xs text-muted-foreground">{tier.description}</p>
              </div>
            </div>
            <span className={tier.isActive ? "text-xs text-success" : "text-xs text-muted-foreground"}>{tier.isActive ? "Active" : "Inactive"}</span>
          </li>
        ))}
      </ul>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customize Founder Tier</DialogTitle>
          </DialogHeader>
          <TierForm form={form} setForm={setForm} onSave={handleSave} saving={updateTier.isPending} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BuilderTiersTab() {
  const queryClient = useQueryClient();
  const { data: tiers, isLoading } = useAdminListBuilderTiers();
  const updateTier = useAdminUpdateBuilderTier();
  const [editing, setEditing] = useState<AdminBuilderTier | null>(null);
  const [form, setForm] = useState({ description: "", accentColor: "" });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/builder-tiers"] });

  const openEdit = (tier: AdminBuilderTier) => {
    setEditing(tier);
    setForm({
      description: tier.description ?? "",
      accentColor: tier.accentColor ?? "",
    });
  };

  const handleSave = () => {
    if (!editing) return;
    updateTier.mutate(
      { id: editing.id, data: form },
      { onSuccess: () => { toast.success("Tier updated"); invalidate(); setEditing(null); }, onError: () => toast.error("Update failed") },
    );
  };

  if (isLoading) return <Skeleton className="h-48 w-full rounded-xl" />;

  return (
    <div>
      <p className="mb-4 text-xs text-muted-foreground">Tier names and verification thresholds are fixed product rules. A builder qualifies through the Arc path or the age-qualified GitHub path. Edit only the presentation below.</p>
      <ul className="space-y-2">
        {tiers?.map((tier) => (
          <li key={tier.id} className="flex cursor-pointer items-center justify-between rounded-xl border bg-card px-4 py-3" onClick={() => openEdit(tier)}>
            <div className="flex items-center gap-3">
              <TierEmblem tier={tier} />
              <div>
                <p className="text-sm font-medium">{tier.name}</p>
                <p className="text-xs text-muted-foreground">
                  {tier.transactionThreshold}+ Arc tx OR {GITHUB_TIER_LABELS[tier.name] ?? "verified GitHub history"}
                </p>
              </div>
            </div>
            <span className="text-xs text-success">Active</span>
          </li>
        ))}
      </ul>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Builder Tier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 rounded-xl border bg-muted/30 p-4 text-sm">
              <div><p className="text-xs text-muted-foreground">Tier</p><p className="mt-1 font-semibold">{editing?.name}</p></div>
              <div><p className="text-xs text-muted-foreground">Threshold</p><p className="mt-1 font-semibold">{editing?.transactionThreshold}+ Arc tx OR {editing ? GITHUB_TIER_LABELS[editing.name] : "GitHub rule"}</p></div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Accent color</Label>
              <Input value={form.accentColor} onChange={(e) => setForm((f) => ({ ...f, accentColor: e.target.value }))} placeholder="#6366f1" />
            </div>
            <Button className="w-full" onClick={handleSave} disabled={updateTier.isPending}>
              {updateTier.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TierFormState {
  name: string;
  description: string;
  accentColor: string;
  rank: number;
  isActive: boolean;
}

function TierForm({ form, setForm, onSave, saving }: { form: TierFormState; setForm: (updater: (f: TierFormState) => TierFormState) => void; onSave: () => void; saving: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex min-h-16 items-center justify-between gap-4 rounded-xl border bg-muted/35 px-4 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Tier {String(form.rank).padStart(2, "0")}</p>
          <p className="mt-1 font-medium">{form.name}</p>
        </div>
        <span className="rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">Active · fixed</span>
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
      </div>
      <div className="space-y-1.5">
        <Label>Accent color</Label>
        <Input value={form.accentColor} onChange={(e) => setForm((f) => ({ ...f, accentColor: e.target.value }))} placeholder="#6366f1" />
      </div>
      <Button className="min-h-11 w-full" onClick={onSave} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
