import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/session";
import { loadHabits } from "@/lib/queries/habits";
import { sortTasks, tasksQuery, type TaskRow } from "@/lib/queries/tasks";
import { addDays, dayStartUtc, startOfWeek } from "@/lib/domain/dates";
import { fmtShortDay } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { ReviewWizard } from "@/components/progress/review-wizard";

export const metadata = { title: "مراجعة الأسبوع" };

export default async function ReviewPage() {
  const s = await getSession();
  const t = await getTranslations();
  const ws = startOfWeek(s.today, s.weekStart);
  const nextWs = addDays(ws, 7);
  const [{ data: done }, { data: late }, { habits }, { data: ms }, { data: review }] = await Promise.all([
    tasksQuery(s).eq("status", "done").gte("completed_at", dayStartUtc(ws, s.tz).toISOString()).limit(300),
    tasksQuery(s).eq("status", "todo").lt("due_date", s.today).limit(300),
    loadHabits(s),
    s.supabase.from("milestones").select("id, title").gte("completed_at", dayStartUtc(ws, s.tz).toISOString()),
    s.supabase.from("weekly_reviews").select("focus, reflection").eq("week_start", nextWs).maybeSingle(),
  ]);
  return (
    <div>
      <PageHeader title={t("review.title")} subtitle={`${fmtShortDay(ws, s.numerals)} – ${fmtShortDay(addDays(ws, 6), s.numerals)}`} />
      <ReviewWizard
        nextWeekStart={nextWs}
        done={(done ?? []) as unknown as TaskRow[]}
        late={sortTasks((late ?? []) as unknown as TaskRow[])}
        milestones={ms ?? []}
        habits={habits.map((h) => ({ id: h.id, name: h.name, done: h.week.done, target: h.week.target }))}
        initial={{ focus: review?.focus ?? [], reflection: review?.reflection ?? "" }}
      />
    </div>
  );
}
