"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { startReviewAction } from "../../review/actions";
import { Button } from "@/components/ui/button";

export function StartReviewButton({ topicId }: { topicId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await startReviewAction(topicId);
          router.refresh();
        })
      }
    >
      {pending ? "Adicionando..." : "Iniciar revisão espaçada"}
    </Button>
  );
}
