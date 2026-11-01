// Os onze domínios da vida (DEC-001). Chaves estáveis: usadas no banco.
export const DOMAINS = [
  { key: "identidade", label: "Identidade", hue: 265 },
  { key: "espiritualidade", label: "Espiritualidade", hue: 285 },
  { key: "saude", label: "Saúde", hue: 150 },
  { key: "estudos", label: "Estudos", hue: 205 },
  { key: "carreira", label: "Carreira", hue: 225 },
  { key: "financas", label: "Finanças", hue: 95 },
  { key: "relacionamentos", label: "Relacionamentos", hue: 340 },
  { key: "ambiente", label: "Ambiente", hue: 175 },
  { key: "projetos", label: "Projetos", hue: 30 },
  { key: "conhecimento", label: "Conhecimento", hue: 190 },
  { key: "experiencias", label: "Experiências", hue: 50 },
] as const;

export type DomainKey = (typeof DOMAINS)[number]["key"];

export const DOMAIN_KEYS = DOMAINS.map((d) => d.key) as [DomainKey, ...DomainKey[]];

export function domainLabel(key: string | null | undefined): string {
  if (!key) return "Geral";
  return DOMAINS.find((d) => d.key === key)?.label ?? key;
}

export function isDomainKey(v: unknown): v is DomainKey {
  return typeof v === "string" && (DOMAIN_KEYS as string[]).includes(v);
}
