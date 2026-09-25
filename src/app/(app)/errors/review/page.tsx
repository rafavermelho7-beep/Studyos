import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { listDueErrors } from "@/server/services/errors";
import { ErrorReview } from "./error-review";

export const metadata: Metadata = { title: "Revisar erros · StudyOS" };

export default async function ErrorReviewPage() {
  const user = await requireUser();
  const due = await listDueErrors(user.id);

  return (
    <div className="mx-auto max-w-xl px-4 py-6 md:px-6">
      <Link href="/errors" className="text-xs text-muted-foreground hover:text-foreground">
        ← Caderno de Erros
      </Link>
      <h1 className="mb-4 mt-1 text-xl font-semibold tracking-tight">Revisar erros</h1>
      {/* Always mounted (even when empty) so a mid-session revalidation keeps its state. */}
      <ErrorReview entries={due} />
    </div>
  );
}
