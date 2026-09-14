"use client";

import { useState, useTransition } from "react";
import { Key, Copy, Check } from "lucide-react";
import { regenerateApiKeyAction, revokeApiKeyAction } from "./actions";
import { Button } from "@/components/ui/button";

export function ApiKeySection({ hasKey, apiKeyId }: { hasKey: boolean; apiKeyId: string | null }) {
  const [pending, startTransition] = useTransition();
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <Key className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Chave de API (conector Anki)</h3>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Usada pelo StudyOS Local Connector para sincronizar sua atividade do Anki. Nunca
        compartilhe esta chave — ela dá acesso à sua conta.
      </p>

      {freshKey ? (
        <div className="mt-3 rounded-[var(--radius-sm)] border border-warning/40 bg-warning-soft p-3">
          <p className="mb-1.5 text-xs font-medium text-warning">
            Copie agora — ela não será mostrada de novo.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-surface px-2 py-1 text-xs text-foreground">
              {freshKey}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(freshKey).catch(() => {});
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="shrink-0 rounded-[var(--radius-sm)] border border-border p-1.5 text-muted-foreground hover:text-foreground"
              aria-label="Copiar chave"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      ) : hasKey ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Chave ativa: <code>sk_live_{apiKeyId}_••••••••</code>
        </p>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">Nenhuma chave gerada ainda.</p>
      )}

      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const key = await regenerateApiKeyAction();
              setFreshKey(key);
            })
          }
        >
          {hasKey ? "Gerar nova chave" : "Gerar chave"}
        </Button>
        {hasKey && (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await revokeApiKeyAction();
                setFreshKey(null);
              })
            }
          >
            Revogar
          </Button>
        )}
      </div>
    </div>
  );
}
