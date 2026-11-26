import type { GameDetailDto, ParticipationDto, UserDto } from "@convocados/shared";

/** Dados de teste: um jogo futuro de 30 € com 4 vagas e 2 suplentes, sem ninguém. */
export const ORGANIZER: UserDto = { id: "u-org", name: "Organizador", email: "org@teste.local" };
export const PLAYER: UserDto = { id: "u-ana", name: "Ana", email: "ana@teste.local" };

export function player(
  userId: string,
  userName: string,
  status: ParticipationDto["status"] = "confirmed",
  extra: Partial<ParticipationDto> = {},
): ParticipationDto {
  return {
    id: `p-${userId}`,
    gameId: "g1",
    userId,
    userName,
    status,
    position: 1,
    paid: false,
    joinedAt: "2030-01-01T10:00:00.000Z",
    ...extra,
  };
}

export function game(overrides: Partial<GameDetailDto> = {}): GameDetailDto {
  const participations = overrides.participations ?? [];
  return {
    id: "g1",
    organizerId: ORGANIZER.id,
    title: "Futebolada",
    location: "Pavilhão",
    startsAt: "2030-01-10T21:00:00.000Z",
    slots: 4,
    subs: 2,
    totalPriceCents: 3000,
    inviteCode: "abcdef123456",
    status: "open",
    createdAt: "2030-01-01T10:00:00.000Z",
    confirmedCount: participations.filter((p) => p.status === "confirmed").length,
    waitingCount: participations.filter((p) => p.status === "waiting").length,
    teams: [],
    sport: "football",
    venueId: null,
    groupId: null,
    groupName: null,
    ...overrides,
    participations,
  };
}
