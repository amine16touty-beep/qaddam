"use client";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Target, Trash2 } from "lucide-react";
import { Card, CardHeader, Select } from "@/components/ui";
import { InlineAdd } from "@/components/ui/inline-add";
import { createGoal, deleteGoal, updateGoal } from "@/app/actions/goals";
import { cn } from "@/lib/utils";

type G = { id: string; title: string; status: "active" | "achieved" | "dropped"; target_date: string | null };

export function Goals({ goals, projects, habits }: { goals: G[]; projects: { goal_id: string | null }[]; habits: { goal_id: string | null }[] }) {
  const t = useTranslations();
  const [, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) toast.error(r.error);
    });
  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-1.5"><Target size={17} className="text-primary" /> {t("progress.goals")}</span>} />
      <div className="px-2 pb-2">
        {goals.length === 0 && <p className="px-2 pb-1 text-sm text-ink-muted">{t("goal.empty")}</p>}
        {goals.map((g) => (
          <div key={g.id} className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted/60">
            <div className="min-w-0 flex-1">
              <p className={cn("text-[15px]", g.status !== "active" && "text-ink-muted")}>{g.title}</p>
              <p className="text-xs text-ink-muted">
                {t("goal.linked", { projects: projects.filter((p) => p.goal_id === g.id).length, habits: habits.filter((h) => h.goal_id === g.id).length })}
              </p>
            </div>
            <Select defaultValue={g.status} aria-label={t("project.status")} onChange={(e) => run(() => updateGoal(g.id, { status: e.target.value as "active" }))} className="h-8 w-auto text-xs">
              <option value="active">{t("goal.active")}</option>
              <option value="achieved">{t("goal.achieved")}</option>
              <option value="dropped">{t("goal.dropped")}</option>
            </Select>
            <button aria-label={t("app.delete")} onClick={() => run(() => deleteGoal(g.id))} className="rounded p-1 text-ink-muted opacity-60 hover:text-danger lg:opacity-0 lg:group-hover:opacity-100">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <InlineAdd
          placeholder={t("goal.titlePlaceholder")}
          onAdd={async (title) => {
            const r = await createGoal({ title });
            return r;
          }}
        />
      </div>
    </Card>
  );
}
