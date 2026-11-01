import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOwner } from "@/lib/env";
import { needsMfa } from "@/lib/auth";
import { signOut } from "@/app/actions";
import { MfaForm } from "./mfa-form";

export const metadata = { title: "Verificação · LIFE ENGINE" };

export default async function MfaPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user || !isOwner(data.user.email)) redirect("/login");
  if (!(await needsMfa(supabase))) redirect("/");
  return (
    <>
      <div className="ambient-field" aria-hidden />
      <main className="relative z-10 flex min-h-dvh items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="font-mono text-[11px] tracking-[0.36em] text-text-2">LIFE ENGINE</div>
            <h1 className="mt-4 text-[22px] font-light">Segundo fator</h1>
            <p className="mt-2 text-[13px] text-text-3">Digite o código de 6 dígitos do seu app autenticador.</p>
          </div>
          <MfaForm />
          <form action={signOut} className="mt-6 text-center">
            <button className="label hover:text-text-2">Sair</button>
          </form>
        </div>
      </main>
    </>
  );
}
