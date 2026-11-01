// Matriz de permissões do agente (SECURITY & GOVERNANCE §Matriz).
// Fonte única de verdade: o código consulta esta matriz antes de aplicar qualquer
// ação proposta pelo modelo. O modelo NUNCA executa ações diretamente — ele só
// produz texto e JSON que o servidor valida contra esta matriz.

export type Permission = "auto" | "confirm" | "forbidden";

export const AGENT_ACTIONS = {
  // Internas e reversíveis (DEC-015) — automáticas, sempre auditadas
  create_insight: "auto",
  save_stated_memory: "auto", // fato/preferência declarado pelo usuário, não sensível
  save_hypothesis: "auto", // marcado como hipótese, confiança limitada, revisável
  title_space: "auto",
  summarize_space: "auto",
  generate_synthesis: "auto",

  // Exigem confirmação explícita do usuário
  save_sensitive_memory: "confirm",
  create_goal: "confirm",
  create_project: "confirm",
  record_decision: "confirm",
  update_goal_status: "confirm",
  promote_hypothesis_to_fact: "confirm",
  write_calendar: "confirm", // futuro (PEN-01/02); não implementado na Fase 1

  // Proibidas ao agente (DEC-016, DEC-019, DEC-026)
  save_restricted_memory: "forbidden", // restrito: só o usuário registra manualmente
  delete_user_data: "forbidden", // exclusão é ação do usuário
  external_message: "forbidden",
  external_account_action: "forbidden",
  payment: "forbidden",
  modify_permissions: "forbidden",
  modify_budget: "forbidden",
  read_secrets: "forbidden",
  alter_audit_log: "forbidden",
  web_browse: "forbidden", // Fase 1: pesquisa externa desativada (custo + injeção); ver roadmap
} as const satisfies Record<string, Permission>;

export type AgentAction = keyof typeof AGENT_ACTIONS;

export function permissionFor(action: string): Permission {
  return (AGENT_ACTIONS as Record<string, Permission>)[action] ?? "forbidden"; // negação por padrão
}

export function isAllowedAutomatically(action: string): boolean {
  return permissionFor(action) === "auto";
}
