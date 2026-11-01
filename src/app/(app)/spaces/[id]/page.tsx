import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { domainLabel } from "@/lib/domains";
import { getSpace, listMessages } from "@/lib/services/spaces";
import { Conversation, type Msg } from "@/components/conversation";
import { PresenceOrb } from "@/components/presence";
import { SpaceControls } from "./space-controls";

export default async function SpacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireOwner();
  const space = await getSpace(supabase, id);
  if (!space || space.kind === "ambient") notFound();
  const messages = await listMessages(supabase, id, 80);

  return (
    <div className="mx-auto max-w-3xl pt-6">
      <div className="mb-8 flex items-start gap-4">
        <div className="pt-1">
          <PresenceOrb size={44} />
        </div>
        <div className="min-w-0 flex-1">
          <Link href="/spaces" className="label hover:text-text-2">
            ← Espaços {space.domain ? `· ${domainLabel(space.domain)}` : ""}
          </Link>
          <h1 className="mt-1.5 text-[24px] font-light leading-tight tracking-tight">{space.title}</h1>
          {space.purpose && <p className="mt-1.5 text-[14px] text-text-3">{space.purpose}</p>}
        </div>
        <SpaceControls id={space.id} pinned={space.pinned} archived={space.status === "archived"} />
      </div>
      {space.summary && (
        <details className="glass mb-6 rounded-2xl px-5 py-4" open={messages.length > 12}>
          <summary className="label cursor-pointer hover:text-text-2">Onde paramos</summary>
          <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-text-2">{space.summary}</p>
        </details>
      )}
      <Conversation spaceId={space.id} initialMessages={messages as Msg[]} placeholder="Continue a investigação…" />
    </div>
  );
}
