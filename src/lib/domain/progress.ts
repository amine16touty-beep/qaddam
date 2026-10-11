import { addDays, diffDays, type ISODate } from "./dates";

export interface ProgressResult {
  basis: "tasks" | "milestones" | "none";
  done: number;
  total: number;
  pct: number | null;
}

/**
 * Project progress is computed from real items only:
 *   tasks done ÷ (tasks − cancelled); if no tasks, milestones done ÷ milestones; otherwise no %.
 */
export function projectProgress(
  tasks: { status: string }[],
  milestones: { completed_at: string | null }[],
): ProgressResult {
  const counted = tasks.filter((t) => t.status !== "cancelled");
  if (counted.length) {
    const done = counted.filter((t) => t.status === "done").length;
    return { basis: "tasks", done, total: counted.length, pct: Math.round((done / counted.length) * 100) };
  }
  if (milestones.length) {
    const done = milestones.filter((m) => m.completed_at).length;
    return { basis: "milestones", done, total: milestones.length, pct: Math.round((done / milestones.length) * 100) };
  }
  return { basis: "none", done: 0, total: 0, pct: null };
}

export type AttentionReason =
  | { kind: "stale"; days: number }
  | { kind: "overdue"; count: number }
  | { kind: "deadline"; days: number; pct: number };

export const STALE_DAYS = 7;

export function attentionReasons(args: {
  status: string;
  lastActivityDay: ISODate;
  targetDate: ISODate | null;
  today: ISODate;
  overdueCount: number;
  progress: ProgressResult;
}): AttentionReason[] {
  if (args.status !== "active") return [];
  const out: AttentionReason[] = [];
  if (args.overdueCount > 0) out.push({ kind: "overdue", count: args.overdueCount });
  const idle = diffDays(args.today, args.lastActivityDay);
  if (idle >= STALE_DAYS) out.push({ kind: "stale", days: idle });
  if (args.targetDate) {
    const left = diffDays(args.targetDate, args.today);
    if (left >= 0 && left <= 7 && (args.progress.pct ?? 0) < 70) {
      out.push({ kind: "deadline", days: left, pct: args.progress.pct ?? 0 });
    }
  }
  return out;
}

export type Bucket = "overdue" | "today" | "soon" | "later" | "none";

/** Follow-ups: today / soon (next 7 days) / overdue. */
export function dueBucket(due: ISODate | null, today: ISODate): Bucket {
  if (!due) return "none";
  if (due < today) return "overdue";
  if (due === today) return "today";
  if (due <= addDays(today, 7)) return "soon";
  return "later";
}

export function pct(done: number, total: number): number | null {
  return total ? Math.round((done / total) * 100) : null;
}
