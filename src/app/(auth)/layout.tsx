export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-accent text-sm font-bold text-accent-foreground">
            S
          </div>
          <span className="text-lg font-semibold tracking-tight">StudyOS</span>
        </div>
        {children}
      </div>
    </div>
  );
}
