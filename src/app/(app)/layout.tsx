import { requireUser } from "@/lib/auth/session";
import { SidebarNavLinks } from "@/components/layout/sidebar-nav";
import { BottomNav } from "@/components/layout/bottom-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { PageTransition } from "@/components/layout/page-transition";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-surface p-3 md:flex">
        <div className="mb-4 flex items-center gap-2 px-1 py-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-br from-accent to-accent-2 text-xs font-bold text-accent-foreground shadow-[var(--shadow-accent)]">
            S
          </div>
          <span className="text-sm font-semibold tracking-tight">StudyOS</span>
        </div>
        <SidebarNavLinks />
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-end border-b border-border bg-surface/80 px-4 backdrop-blur-md md:px-6">
          <UserMenu name={user.name} email={user.email} />
        </header>
        <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
