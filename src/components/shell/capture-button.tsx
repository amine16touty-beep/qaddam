"use client";
import { Plus } from "lucide-react";
import { useShell, type CapturePreset } from "./shell-context";

export function CaptureButton({ preset, label }: { preset: CapturePreset; label: string }) {
  const { openCapture } = useShell();
  return (
    <button type="button" onClick={() => openCapture(preset)} className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-sm text-primary hover:bg-primary-soft">
      <Plus size={16} /> {label}
    </button>
  );
}
