import { useRef, useState } from "react";
import { UploadCloud, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompanyLogo } from "@/components/company-logo";
import { ImageCropDialog } from "@/components/image-crop-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/admin/uploads/image", { method: "POST", body: formData, credentials: "include" });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Upload failed");
  }
  const data = (await res.json()) as { url: string };
  return data.url;
}

export function CompanyLogoUploader({
  value,
  onChange,
  onUploadingChange,
  name,
  className,
}: {
  value?: string | null;
  onChange: (url: string | null) => void;
  onUploadingChange?: (uploading: boolean) => void;
  name?: string | null;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [cropSource, setCropSource] = useState<string | null>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5MB or smaller");
      return;
    }
    if (!["image/png", "image/webp", "image/jpeg"].includes(file.type)) {
      toast.error("Use a PNG, WebP, or JPEG image");
      return;
    }
    setCropSource(URL.createObjectURL(file));
  };

  const closeCrop = () => {
    if (cropSource) URL.revokeObjectURL(cropSource);
    setCropSource(null);
  };

  const handleCropConfirm = async (blob: Blob) => {
    closeCrop();
    setUploading(true);
    onUploadingChange?.(true);
    try {
      const file = new File([blob], "logo.png", { type: "image/png" });
      const url = await uploadImage(file);
      onChange(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-4">
        <CompanyLogo logoUrl={value} name={name} size="lg" />
        <div className="flex-1">
          <button
            type="button"
            disabled={uploading}
            aria-label={value ? "Replace company logo" : "Upload company logo"}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFile(e.dataTransfer.files[0]);
            }}
            className={cn(
              "flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors disabled:cursor-wait disabled:opacity-70",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
            )}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <UploadCloud className="h-5 w-5 text-muted-foreground" />}
            <p className="text-xs font-medium">{uploading ? "Uploading logo…" : value ? "Replace company logo" : "Drag and drop, or click to upload"}</p>
            <p className="text-[11px] text-muted-foreground">PNG, WebP, or JPEG · up to 5MB · transparent backgrounds supported</p>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/webp,image/jpeg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.currentTarget.value = "";
              handleFile(file);
            }}
          />
        </div>
        {value && (
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange(null)} aria-label="Remove logo">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ImageCropDialog
        open={!!cropSource}
        imageSrc={cropSource}
        onCancel={closeCrop}
        onConfirm={(blob) => void handleCropConfirm(blob)}
      />
    </div>
  );
}
