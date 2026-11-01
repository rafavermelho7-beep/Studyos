export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { setupIssues } from "@/lib/env";

export const metadata = { title: "Configuração · LIFE ENGINE" };

// Exibida quando variáveis essenciais faltam. Não revela valores, só nomes.
export default function SetupPage() {
  const issues = setupIssues();
  if (!issues.length) redirect("/login");
  return (
    <main className="mx-auto max-w-lg px-6 py-20">
      <div className="label mb-2">LIFE ENGINE · configuração pendente</div>
      <h1 className="text-2xl font-light">Faltam variáveis de ambiente</h1>
      <ul className="mt-6 space-y-2 text-[14px] text-text-2">
        {issues.map((i) => (
          <li key={i} className="rounded-xl border border-line px-4 py-3 font-mono text-[12.5px]">
            {i}
          </li>
        ))}
      </ul>
      <p className="mt-6 text-[14px] leading-relaxed text-text-3">
        Configure-as na Vercel (Project → Settings → Environment Variables) ou em <code>.env.local</code>. Veja
        <code> docs/IMPLEMENTATION-HANDOFF.md</code>.
      </p>
    </main>
  );
}
