import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
  useAdminCreateFounderTier,
  useAdminUpdateFounderTier,
  useAdminListBuilderTiers,
  useAdminUpdateBuilderTier,
} from "@workspace/api-client-react";
import type { FounderTier, AdminBuilderTier } from "@workspace/api-client-react";

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
  const createTier = useAdminCreateFounderTier();
  const updateTier = useAdminUpdateFounderTier();
  const [editing, setEditing] = useState<FounderTier | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", accentColor: "", rank: 1, isActive: true });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/founder-tiers"] });

  const openEdit = (tier: FounderTier) => {
    setEditing(tier);
    setForm({ name: tier.name, description: tier.description ?? "", accentColor: tier.accentColor ?? "", rank: tier.rank, isActive: tier.isActive });
  };

  const openCreate = () => {
    setCreating(true);
    setForm({ name: "", description: "", accentColor: "", rank: (tiers?.length ?? 0) + 1, isActive: true });
  };

  const handleSave = () => {
    if (editing) {
      updateTier.mutate(
        { id: editing.id, data: form },
        { onSuccess: () => { toast.success("Tier updated"); invalidate(); setEditing(null); }, onError: () => toast.error("Update failed") },
      );
    } else {
      createTier.mutate(
        { data: form },
        { onSuccess: () => { toast.success("Tier created"); invalidate(); setCreating(false); }, onError: () => toast.error("Creation failed") },
      );
    }
  };

  if (isLoading) return <Skeleton className="h-48 w-full rounded-xl" />;

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" /> New Tier
        </Button>
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

      <Dialog
        open={!!editing || creating}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
            setCreating(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Founder Tier" : "New Founder Tier"}</DialogTitle>
          </DialogHeader>
          <TierForm form={form} setForm={setForm} onSave={handleSave} saving={updateTier.isPending || createTier.isPending} />
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
  const [form, setForm] = useState({ name: "", description: "", accentColor: "", transactionThreshold: 0, contractThreshold: 0, isActive: true });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/builder-tiers"] });

  const openEdit = (tier: AdminBuilderTier) => {
    setEditing(tier);
    setForm({
      name: tier.name,
      description: tier.description ?? "",
      accentColor: tier.accentColor ?? "",
      transactionThreshold: tier.transactionThreshold,
      contractThreshold: tier.contractThreshold,
      isActive: tier.isActive,
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
      <p className="mb-4 text-xs text-muted-foreground">Thresholds are internal — they're never shown to users. Editing them changes tier calculation immediately.</p>
      <ul className="space-y-2">
        {tiers?.map((tier) => (
          <li key={tier.id} className="flex cursor-pointer items-center justify-between rounded-xl border bg-card px-4 py-3" onClick={() => openEdit(tier)}>
            <div className="flex items-center gap-3">
              <TierEmblem tier={tier} />
              <div>
                <p className="text-sm font-medium">{tier.name}</p>
                <p className="text-xs text-muted-foreground">
                  {tier.transactionThreshold}+ tx OR {tier.contractThreshold}+ contracts
                </p>
              </div>
            </div>
            <span className={tier.isActive ? "text-xs text-success" : "text-xs text-muted-foreground"}>{tier.isActive ? "Active" : "Inactive"}</span>
          </li>
        ))}
      </ul>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Builder Tier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Transaction threshold</Label>
                <Input type="number" value={form.transactionThreshold} onChange={(e) => setForm((f) => ({ ...f, transactionThreshold: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Contract threshold</Label>
                <Input type="number" value={form.contractThreshold} onChange={(e) => setForm((f) => ({ ...f, contractThreshold: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Accent color</Label>
              <Input value={form.accentColor} onChange={(e) => setForm((f) => ({ ...f, accentColor: e.target.value }))} placeholder="#6366f1" />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <Label htmlFor="builder-tier-active">Active</Label>
              <Switch id="builder-tier-active" checked={form.isActive} onCheckedChange={(c) => setForm((f) => ({ ...f, isActive: c }))} />
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
      <div className="space-y-1.5">
        <Label>Name</Label>
        <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Accent color</Label>
          <Input value={form.accentColor} onChange={(e) => setForm((f) => ({ ...f, accentColor: e.target.value }))} placeholder="#6366f1" />
        </div>
        <div className="space-y-1.5">
          <Label>Rank</Label>
          <Input type="number" value={form.rank} onChange={(e) => setForm((f) => ({ ...f, rank: Number(e.target.value) }))} />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg border px-3 py-2">
        <Label htmlFor="founder-tier-active">Active</Label>
        <Switch id="founder-tier-active" checked={form.isActive} onCheckedChange={(c) => setForm((f) => ({ ...f, isActive: c }))} />
      </div>
      <Button className="w-full" onClick={onSave} disabled={saving || !form.name.trim()}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
