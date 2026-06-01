"use client";

import * as React from "react";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  label: string;
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  uploadLabel: string;
}

/** Téléverse une image en data URL (base64) — reste côté client en V1. */
export function ImageUpload({ label, value, onChange, uploadLabel }: ImageUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {value ? (
        <div className="relative inline-flex">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={label}
            className="h-24 w-auto max-w-[200px] rounded-md border border-border bg-white object-contain p-2"
          />
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="absolute -end-2 -top-2 rounded-full bg-danger p-1 text-white shadow"
            aria-label="Retirer"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex h-24 w-full max-w-[240px] flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-muted/30 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary",
          )}
        >
          <Upload className="h-5 w-5" />
          <span className="text-xs font-medium">{uploadLabel}</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
