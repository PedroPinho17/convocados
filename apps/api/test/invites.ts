/**
 * Só tem acesso a um jogo quem o organiza, já está nele, é do grupo ou traz o código do
 * convite (ver src/games/game-access.ts). Nos testes, os jogadores entram como na vida
 * real: pelo link do convite. Cada jogo criado guarda aqui o seu código.
 */
const codes = new Map<string, string>();

export function rememberInvite<T extends { id: string; inviteCode: string }>(
  game: T,
): T {
  codes.set(game.id, game.inviteCode);
  return game;
}

/** POST para confirmar, com o código do convite do jogo (se foi guardado). */
export function confirmPath(gameId: string): string {
  const code = codes.get(gameId);
  return code
    ? `/games/${gameId}/confirm?invite=${code}`
    : `/games/${gameId}/confirm`;
}
