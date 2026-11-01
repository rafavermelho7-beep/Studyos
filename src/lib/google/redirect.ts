// URL de retorno do OAuth. Preferir APP_URL fixo (evita depender de cabeçalhos do request).
export function googleRedirectUri(req: Request): string {
  const base = process.env.APP_URL?.replace(/\/$/, "") || new URL(req.url).origin;
  return `${base}/api/integrations/google/callback`;
}
