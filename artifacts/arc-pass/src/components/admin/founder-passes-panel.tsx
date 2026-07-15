import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { FounderPassVariantBadge } from "@/components/founder-pass-variant-badge";
import { PassStatusBadge } from "@/components/pass-status-badge";
import { founderEligibilityMeta } from "@/lib/pass-status";
import { formatPassNumber } from "@/lib/format";
import { FounderPassEditor } from "@/components/admin/founder-pass-editor";
import { CompanyLogoUploader } from "@/components/company-logo-uploader";
import { useAdminListFounderPasses, useAdminListFounderTiers, useAdminCreateFounderInvite } from "@workspace/api-client-react";
import type { AdminFounderPass, AdminFounderInviteInputInvitePlatform, AdminFounderInviteInputVariant } from "@workspace/api-client-react";

export function FounderPassesPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<AdminFounderPass | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  const { data, isLoading } = useAdminListFounderPasses({ search: search || undefined, status: status as never });
  const { data: tiers = [] } = useAdminListFounderTiers();
  const createInvite = useAdminCreateFounderInvite();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/founder-passes"] });

  const [inviteForm, setInviteForm] = useState({
    invitePlatform: "x" as AdminFounderInviteInputInvitePlatform,
    inviteHandle: "",
    variant: "normal" as AdminFounderInviteInputVariant,
    founderTierId: undefined as number | undefined,
    companyName: "",
    companyLogoUrl: null as string | null,
  });

  const handleCreate = () => {
    if (!inviteForm.inviteHandle.trim() || !inviteForm.companyName.trim() || logoUploading) return;
    createInvite.mutate(
      {
        data: {
          invitePlatform: inviteForm.invitePlatform,
          inviteHandle: inviteForm.inviteHandle.trim(),
          variant: inviteForm.variant,
          founderTierId: inviteForm.founderTierId,
          companyName: inviteForm.companyName.trim(),
          companyLogoUrl: inviteForm.companyLogoUrl ?? undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success("Invitation created");
          setCreateOpen(false);
          setInviteForm({ invitePlatform: "x", inviteHandle: "", variant: "normal", founderTierId: undefined, companyName: "", companyLogoUrl: null });
          setLogoUploading(false);
          invalidate();
        },
        onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Couldn't create invitation"),
      },
    );
  };

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by name, handle, company…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={status ?? "all"} onValueChange={(v) => setStatus(v === "all" ? undefined : v)}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="eligible">Eligible</SelectItem>
              <SelectItem value="invite_required">Invite required</SelectItem>
              <SelectItem value="under_review">Under review</SelectItem>
              <SelectItem value="ineligible">Ineligible</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Invitation
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Identity</TableHead>
              <TableHead>Variant</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Pass No.</TableHead>
              <TableHead className="text-right">Claim</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  No Founder Passes found.
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((pass) => (
                <TableRow key={pass.id} className="cursor-pointer" onClick={() => setSelected(pass)}>
                  <TableCell>
                    <div className="font-medium">{pass.displayName || pass.inviteHandle || "Unlinked invite"}</div>
                    <div className="text-xs text-muted-foreground">{pass.username ? `@${pass.username}` : pass.invitePlatform}</div>
                  </TableCell>
                  <TableCell>
                    <FounderPassVariantBadge variant={pass.variant} />
                  </TableCell>
                  <TableCell>
                    <PassStatusBadge meta={founderEligibilityMeta(pass.eligibilityStatus)} />
                  </TableCell>
                  <TableCell className="text-sm">{pass.companyName || "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{formatPassNumber(pass.passNumber)}</TableCell>
                  <TableCell className="text-right text-sm capitalize">{pass.claimStatus}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader className="mb-6">
            <SheetTitle>Edit Founder Pass</SheetTitle>
          </SheetHeader>
          {selected && <FounderPassEditor pass={selected} onSaved={() => { invalidate(); setSelected(null); }} />}
        </SheetContent>
      </Sheet>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Founder Invitation</DialogTitle>
            <DialogDescription>This grants Founder Pass eligibility. It becomes permanent once the founder mints.</DialogDescription>
          </DialogHeader>
          <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); handleCreate(); }}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Platform</Label>
                <Select value={inviteForm.invitePlatform} onValueChange={(v) => setInviteForm((f) => ({ ...f, invitePlatform: v as AdminFounderInviteInputInvitePlatform }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="x">X</SelectItem>
                    <SelectItem value="discord">Discord</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="founder-invite-handle">Username</Label>
                <Input id="founder-invite-handle" required value={inviteForm.inviteHandle} onChange={(e) => setInviteForm((f) => ({ ...f, inviteHandle: e.target.value }))} placeholder="username" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Variant</Label>
                <Select value={inviteForm.variant} onValueChange={(v) => setInviteForm((f) => ({ ...f, variant: v as AdminFounderInviteInputVariant }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="premium_black">Premium Black</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Founder tier</Label>
                <Select value={inviteForm.founderTierId ? String(inviteForm.founderTierId) : undefined} onValueChange={(v) => setInviteForm((f) => ({ ...f, founderTierId: Number(v) }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiers.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="founder-company-name">Company name <span className="text-destructive" aria-hidden="true">*</span></Label>
              <Input id="founder-company-name" required maxLength={120} value={inviteForm.companyName} onChange={(e) => setInviteForm((f) => ({ ...f, companyName: e.target.value }))} placeholder="Acme Labs" />
              <p className="text-xs text-muted-foreground">Required. This name appears on the Founder Pass.</p>
            </div>
            <div className="space-y-2">
              <Label>Company logo</Label>
              <CompanyLogoUploader
                value={inviteForm.companyLogoUrl}
                onChange={(url) => setInviteForm((f) => ({ ...f, companyLogoUrl: url }))}
                onUploadingChange={setLogoUploading}
                name={inviteForm.companyName}
              />
              <p className="text-xs text-muted-foreground">Optional. Add a square logo with a transparent background for the cleanest pass artwork.</p>
            </div>
            <Button type="submit" className="w-full" disabled={!inviteForm.inviteHandle.trim() || !inviteForm.companyName.trim() || logoUploading || createInvite.isPending}>
              {logoUploading ? "Uploading logo…" : createInvite.isPending ? "Creating…" : "Create Invitation"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
