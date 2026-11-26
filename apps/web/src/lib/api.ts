import type {
  CreateGameInput,
  GameDetailDto,
  GameDto,
  LoginInput,
  RegisterInput,
  UpdateGameInput,
  UserDto,
  RatingDto,
  UpsertRatingInput,
  GenerateTeamsInput,
  ParseGameMessageInput,
  ParseGameResultDto,
} from "@convocados/shared";

const API = process.env.NEXT_PUBLIC_API_URL;

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
  if (!API) throw new Error("NEXT_PUBLIC_API_URL não está definido em apps/web/.env.local");

  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { ...init, credentials: "include" });
  } catch (err) {
    if (init?.signal?.aborted) throw err;
    throw new ApiError("Não foi possível ligar à API. Está a correr?", 0);
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

/** Jogo + confirmados + lista de espera. */
export const getGameDetail = (id: string) => request<GameDetailDto>(`/games/${id}/detail`);

/** Público — não precisa de sessão. */
export const getInvite = (code: string) =>
  request<GameDetailDto>(`/invites/${encodeURIComponent(code)}`);

export const confirmGame = (gameId: string) =>
  request<GameDetailDto>(`/games/${gameId}/confirm`, { method: "POST" });

export const leaveGame = (gameId: string) =>
  request<GameDetailDto>(`/games/${gameId}/leave`, { method: "POST" });

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
