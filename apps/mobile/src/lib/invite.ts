/**
 * Do texto colado ("https://…/g/abc123def456", "…/g/abc123def456?x" ou só o código)
 * tira o código do convite do grupo. null se não houver um código válido (12 hex).
 */
export function inviteCodeFrom(text: string): string | null {
  const m = text.trim().toLowerCase().match(/(?:^|\/g\/)([0-9a-f]{12})(?=$|[/?#\s])/);
  return m ? m[1]! : null;
}
