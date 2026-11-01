import { requireOwner } from "@/lib/auth";
import { loadBudget } from "@/lib/ai/engine";
import { AmbientShell } from "@/components/ambient-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, owner } = await requireOwner();
  const budget = await loadBudget(supabase, owner.timezone).catch(() => null);
  return <AmbientShell budgetMode={budget?.mode}>{children}</AmbientShell>;
}
