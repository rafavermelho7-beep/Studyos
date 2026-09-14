import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { listAnkiDeckLinks } from "@/server/services/anki-links";
import { listSubjects } from "@/server/services/subjects";
import { listTopicsForUser } from "@/server/services/topics";
import { ApiKeySection } from "./api-key-section";
import { AnkiLinksSection } from "./anki-links-section";

export const metadata: Metadata = { title: "Configurações · StudyOS" };

export default async function SettingsPage() {
  const user = await requireUser();
  const [links, subjects, topics] = await Promise.all([
    listAnkiDeckLinks(user.id),
    listSubjects(user.id),
    listTopicsForUser(user.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <h1 className="mb-4 text-xl font-semibold tracking-tight">Configurações</h1>

      <div className="space-y-4">
        <ApiKeySection hasKey={!!user.apiKeyId} apiKeyId={user.apiKeyId} />
        <AnkiLinksSection
          links={links}
          subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
          topics={topics.map((t) => ({ id: t.id, name: t.name, subjectId: t.subjectId }))}
        />
      </div>
    </div>
  );
}
