import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPassNumber, formatDate, abbreviateAddress, explorerTxUrl } from "@/lib/format";
import { useAdminListMintRecords } from "@workspace/api-client-react";
import type { AdminListMintRecordsType } from "@workspace/api-client-react";
import { ExternalLink } from "lucide-react";

export function MintRecordsPanel() {
  const [type, setType] = useState<AdminListMintRecordsType | undefined>(undefined);
  const { data, isLoading } = useAdminListMintRecords({ type, limit: 50 });

  return (
    <div>
      <div className="mb-4">
        <Select value={type ?? "all"} onValueChange={(v) => setType(v === "all" ? undefined : (v as AdminListMintRecordsType))}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="founder">Founder</SelectItem>
            <SelectItem value="builder">Builder</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Identity</TableHead>
              <TableHead>Pass No.</TableHead>
              <TableHead>Network</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead className="text-right">Tx</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  No mints recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((record) => {
                const txUrl = explorerTxUrl(record.network, record.transactionHash);
                return (
                  <TableRow key={`${record.type}-${record.id}`}>
                    <TableCell className="capitalize">{record.type}</TableCell>
                    <TableCell className="font-medium">{record.displayName ?? "Name unavailable"}</TableCell>
                    <TableCell className="font-mono text-xs">{formatPassNumber(record.passNumber)}</TableCell>
                    <TableCell className="capitalize">{record.network ?? "Not minted"}</TableCell>
                    <TableCell className="font-mono text-xs">{record.destinationWallet ? abbreviateAddress(record.destinationWallet) : "Not minted"}</TableCell>
                    <TableCell className="text-xs">{formatDate(record.issuedAt)}</TableCell>
                    <TableCell className="text-right">
                      {txUrl && (
                        <a href={txUrl} target="_blank" rel="noreferrer" className="inline-flex text-primary hover:underline">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
