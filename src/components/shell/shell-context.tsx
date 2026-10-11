"use client";
import { createContext, useContext } from "react";

export type CaptureType = "task" | "habit" | "project" | "meeting" | "note" | "idea";
export interface CapturePreset {
  type?: CaptureType;
  project_id?: string;
  milestone_id?: string;
  due_date?: string | null;
  starts_at_day?: string;
}

export interface ShellData {
  today: string;
  tz: string;
  weekStart: number;
  numerals: "latn" | "arab";
  contexts: { id: string; name: string; color: string }[];
  projects: { id: string; name: string; context_id: string | null }[];
  contextFilter: string | null;
}

export const ShellCtx = createContext<{
  data: ShellData;
  openCapture: (p?: CapturePreset) => void;
  openSearch: () => void;
} | null>(null);

export function useShell() {
  const v = useContext(ShellCtx);
  if (!v) throw new Error("useShell outside AppShell");
  return v;
}
