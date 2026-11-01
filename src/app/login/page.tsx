import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar · LIFE ENGINE" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  return (
    <>
      <div className="ambient-field" aria-hidden />
      <main className="relative z-10 flex min-h-dvh items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex flex-col items-center">
            <div className="presence" data-state="standby" style={{ ["--size" as string]: "84px" }}>
              <span className="ring" />
              <span className="ring r2" />
              <span className="core" />
            </div>
            <div className="mt-6 font-mono text-[11px] tracking-[0.36em] text-text-2">LIFE ENGINE</div>
            <p className="mt-2 text-[13px] text-text-3">Ambiente privado.</p>
          </div>
          {e === "forbidden" && (
            <p role="alert" className="mb-4 rounded-2xl border border-danger/25 bg-danger/5 px-4 py-3 text-[13px] text-danger">
              Esta conta não tem acesso a este sistema.
            </p>
          )}
          <LoginForm />
        </div>
      </main>
    </>
  );
}
