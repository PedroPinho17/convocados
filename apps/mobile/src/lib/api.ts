import * as SecureStore from "expo-secure-store";
import type {
  CreateGameInput,
  GameDetailDto,
  GameDto,
  LoginInput,
  RegisterInput,
  UpdateGameInput,
  UserDto,
  RegisterPushTokenInput,
  ReminderSettingsInput,
  RemindersDto,
  UnregisterPushTokenInput,
  RatingDto,
  UpsertRatingInput,
  GenerateTeamsInput,
  ParseGameMessageInput,
  ParseGameResultDto,
  ForgotPasswordInput,
  DeleteAccountInput,
  VenueDto,
  VenueSearchInput,
  CreateVenueInput,
} from "@convocados/shared";

const API = process.env.EXPO_PUBLIC_API_URL;
const TOKEN_KEY = "session_token";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string | null) {
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API) throw new Error("EXPO_PUBLIC_API_URL não está definido");

  const token = await getToken();
  const headers = new Headers(init?.headers);
  headers.set("X-Client", "mobile");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let res: Response;
  try {
    // Timeout: no iPhone o pedido pode ficar preso (firewall / Wi‑Fi) sem nunca falhar.
    res = await fetch(`${API}${path}`, {
      ...init,
      headers,
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    throw new ApiError(
      `Não foi possível ligar à API (${API}). PC e telemóvel na mesma Wi‑Fi? API a correr na porta 3001?`,
      0,
    );
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
  body: JSON.stringify(body),
});

export async function login(input: LoginInput) {
  const data = await request<{ user: UserDto; token: string }>(
    "/auth/mobile/login",
    json(input),
  );
  await setToken(data.token);
  return data.user;
}

export async function register(input: RegisterInput) {
  const data = await request<{ user: UserDto; token: string }>(
    "/auth/mobile/register",
    json(input),
  );
  await setToken(data.token);
  return data.user;
}

export async function logout() {
  await request<void>("/auth/logout", { method: "POST" }).catch(() => undefined);
  await setToken(null);
}

export const getMe = () => request<UserDto>("/auth/me");
export const listGames = () => request<GameDto[]>("/games");
export const getGame = (id: string) => request<GameDto>(`/games/${id}`);
export const createGame = (input: CreateGameInput) =>
  request<GameDto>("/games", json(input));
export const updateGame = (id: string, input: UpdateGameInput) =>
  request<GameDto>(`/games/${id}`, json(input, "PATCH"));

/** Jogo + confirmados + lista de espera. */
export const getGameDetail = (id: string) => request<GameDetailDto>(`/games/${id}/detail`);
export const confirmGame = (id: string) =>
  request<GameDetailDto>(`/games/${id}/confirm`, { method: "POST" });
export const leaveGame = (id: string) =>
  request<GameDetailDto>(`/games/${id}/leave`, { method: "POST" });
export const setPaid = (gameId: string, userId: string, paid: boolean) =>
  request<GameDetailDto>(
    `/games/${gameId}/participations/${userId}/paid`,
    json({ paid }, "PATCH"),
  );
export const registerPushToken = (input: RegisterPushTokenInput) =>
  request<void>("/push/register", json(input));
export const unregisterPushToken = (input: UnregisterPushTokenInput) =>
  request<void>("/push/unregister", json(input));

/** Definições dos lembretes + jogos confirmados (para agendar os lembretes locais). */
export const getReminders = () => request<RemindersDto>("/push/reminders");
export const setReminders = (input: ReminderSettingsInput) =>
  request<RemindersDto>("/push/reminders", json(input, "PUT"));

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
export const deleteAccount = (input: DeleteAccountInput) =>
  request<void>("/account", json(input, "DELETE"));
/** Só o organizador. */
export const cancelGame = (gameId: string) =>
  request<GameDetailDto>(`/games/${gameId}/cancel`, { method: "POST" });

/** Pesquisa de campos (OpenStreetMap importados + acrescentados). */
/** Guarda um campo escrito à mão (devolve o existente se já houver um com o mesmo nome). */
export const createVenue = (input: CreateVenueInput) => request<VenueDto>("/venues", json(input));

export function searchVenues(input: VenueSearchInput, signal?: AbortSignal) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  }
  return request<VenueDto[]>(`/venues?${params}`, { signal });
}
