"use client";
import { useTransition } from "react";
import { updateSpace } from "@/app/actions";

export function SpaceControls({ id, pinned, archived }: { id: string; pinned: boolean; archived: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex shrink-0 gap-3 pt-1">
      <button disabled={pending} onClick={() => start(async () => void (await updateSpace({ id, pinned: !pinned })))} className="label hover:text-text-2">
        {pinned ? "Desafixar" : "Fixar"}
      </button>
      <button
        disabled={pending}
        onClick={() => start(async () => void (await updateSpace({ id, status: archived ? "active" : "archived" })))}
        className="label hover:text-text-2"
      >
        {archived ? "Reativar" : "Arquivar"}
      </button>
    </div>
  );
}
