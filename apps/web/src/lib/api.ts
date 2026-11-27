import type {
  CreateGameInput,
  GameDetailDto,
  GameDto,
  GameInviteDto,
  LoginInput,
  RegisterInput,
  UpdateGameInput,
  UserDto,
  RatingDto,
  UpsertRatingInput,
  GenerateTeamsInput,
  ParseGameMessageInput,
  ParseGameResultDto,
  ForgotPasswordInput,
  ResetPasswordInput,
  DeleteAccountInput,
  SocketTokenDto,
  CreateGroupInput,
  GroupDetailDto,
  GroupDto,
  GroupInviteDto,
  VenueDto,
  VenueSearchInput,
  CreateVenueInput,
  PlayerProfileDto,
  UpdateProfileInput,
  SetGameResultInput,
  MatchSummaryDto,
  AttendanceForecastDto,
} from "@convocados/shared";
import { trackSlow } from "./slow-requests";

/**
 * A web fala com a API pelo proxy em /api (mesmo site: o cookie da sessão funciona em
 * produção). Ver src/app/api/[...path]/route.ts.
 */
const API = "/api";

export const UNAUTHORIZED_EVENT = "api:unauthorized";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    // Se demorar (API a acordar no Render), aparece o aviso: ver components/server-waking.tsx.
    res = await trackSlow(fetch(`${API}${path}`, { ...init, credentials: "include" }));
  } catch (err) {
    if (init?.signal?.aborted) throw err;
    throw new ApiError("Sem ligação. Confirma a internet e tenta outra vez.", 0);
  }

  if (res.status === 401 && !path.startsWith("/auth/")) {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = Array.isArray(body?.message)
      ? body.message.join(", ")
      : body?.message;
    throw new ApiError(message ?? `Pedido falhou (${res.status})`, res.status);
  }

  return (res.status === 204 ? undefined : await res.json()) as T;
}

const json = (body: unknown, method = "POST"): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const getMe = () => request<UserDto>("/auth/me");
export const login = (input: LoginInput) =>
  request<UserDto>("/auth/login", json(input));
export const register = (input: RegisterInput) =>
  request<UserDto>("/auth/register", json(input));
export const logout = () => request<void>("/auth/logout", { method: "POST" });

export const listGames = () => request<GameDto[]>("/games");
export const getGame = (id: string) => request<GameDto>(`/games/${id}`);
export const createGame = (input: CreateGameInput) =>
  request<GameDto>("/games", json(input));
export const updateGame = (id: string, input: UpdateGameInput) =>
  request<GameDto>(`/games/${id}`, json(input, "PATCH"));

/**
 * Quem chega pelo link do convite ainda não está no jogo: manda o código para ter acesso.
 * Sem ele, a API só deixa entrar o organizador, quem já está no jogo e os membros do grupo.
 */
const withInvite = (path: string, inviteCode?: string) =>
  inviteCode ? `${path}?invite=${encodeURIComponent(inviteCode)}` : path;

/** Jogo + confirmados + lista de espera. */
export const getGameDetail = (id: string, inviteCode?: string) =>
  request<GameDetailDto>(withInvite(`/games/${id}/detail`, inviteCode));

/** Público — não precisa de sessão. Só o essencial (sem pagamentos). */
export const getInvite = (code: string) =>
  request<GameInviteDto>(`/invites/${encodeURIComponent(code)}`);

export const confirmGame = (gameId: string, inviteCode?: string) =>
  request<GameDetailDto>(withInvite(`/games/${gameId}/confirm`, inviteCode), { method: "POST" });

export const leaveGame = (gameId: string, inviteCode?: string) =>
  request<GameDetailDto>(withInvite(`/games/${gameId}/leave`, inviteCode), { method: "POST" });

export const setPaid = (gameId: string, userId: string, paid: boolean) =>
  request<GameDetailDto>(
    `/games/${gameId}/participations/${userId}/paid`,
    json({ paid }, "PATCH"),
  );

/** Só as avaliações que eu dei (são privadas). */
export const listMyRatings = (gameId: string) =>
  request<RatingDto[]>(`/games/${gameId}/ratings`);

export const upsertRating = (gameId: string, input: UpsertRatingInput) =>
  request<RatingDto>(`/games/${gameId}/ratings`, json(input));

/** Só o organizador: gera e guarda as equipas; devolve o jogo com elas. */
export const generateTeams = (gameId: string, input: GenerateTeamsInput = {}) =>
  request<GameDetailDto>(`/games/${gameId}/teams`, json(input));

export const parseGameMessage = (input: ParseGameMessageInput) =>
  request<ParseGameResultDto>("/ai/parse-game", json(input));

export const forgotPassword = (input: ForgotPasswordInput) =>
  request<void>("/auth/password/forgot", json(input));
export const resetPassword = (input: ResetPasswordInput) =>
  request<void>("/auth/password/reset", json(input));
/** Token curto para o socket (que liga direto à API, onde o cookie não chega). */
export const getSocketToken = () => request<SocketTokenDto>("/auth/socket-token");
export const deleteAccount = (input: DeleteAccountInput) =>
  request<void>("/account", json(input, "DELETE"));
/** Só o organizador. */
export const cancelGame = (gameId: string) =>
  request<GameDetailDto>(`/games/${gameId}/cancel`, { method: "POST" });

export const setGameResult = (gameId: string, input: SetGameResultInput) =>
  request<GameDetailDto>(`/games/${gameId}/result`, json(input, "PATCH"));
export const generateMatchSummary = (gameId: string) =>
  request<MatchSummaryDto>(`/games/${gameId}/summary`, { method: "POST" });
export const getAttendanceForecast = (gameId: string) =>
  request<AttendanceForecastDto>(`/games/${gameId}/attendance-forecast`);

// Grupos
export const listGroups = () => request<GroupDto[]>("/groups");
export const createGroup = (input: CreateGroupInput) => request<GroupDto>("/groups", json(input));
export const getGroup = (id: string) => request<GroupDetailDto>(`/groups/${id}`);
export const leaveGroup = (id: string) => request<void>(`/groups/${id}/leave`, { method: "POST" });
export const removeGroupMember = (id: string, userId: string) =>
  request<void>(`/groups/${id}/members/${userId}`, { method: "DELETE" });
/** Público: o que se vê antes de entrar no grupo. */
export const getGroupInvite = (code: string) =>
  request<GroupInviteDto>(`/group-invites/${encodeURIComponent(code)}`);
export const joinGroup = (code: string) =>
  request<GroupDto>(`/group-invites/${encodeURIComponent(code)}/join`, { method: "POST" });

// Campos
/** Guarda um campo escrito à mão (devolve o existente se já houver um com o mesmo nome). */
export const createVenue = (input: CreateVenueInput) => request<VenueDto>("/venues", json(input));

export function searchVenues(input: VenueSearchInput, signal?: AbortSignal) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  }
  return request<VenueDto[]>(`/venues?${params}`, { signal });
}

// Perfil
export const getMyProfile = () => request<PlayerProfileDto>("/me/profile");
export const updateMyProfile = (input: UpdateProfileInput) =>
  request<PlayerProfileDto>("/me/profile", json(input, "PATCH"));
export const getPlayerProfile = (id: string) =>
  request<PlayerProfileDto>(`/users/${id}/profile`);
