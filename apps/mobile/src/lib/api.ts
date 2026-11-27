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
  CreateGroupInput,
  GroupDetailDto,
  GroupDto,
  GameInviteDto,
  GroupInviteDto,
  PlayerProfileDto,
  UpdateProfileInput,
} from "@convocados/shared";

import { trackSlow } from "./slow-requests";

const API = process.env.EXPO_PUBLIC_API_URL;
const TOKEN_KEY = "session_token";

const withInvite = (path: string, inviteCode?: string) =>
  inviteCode ? `${path}?invite=${encodeURIComponent(inviteCode)}` : path;

export const REQUEST_TIMEOUT_MS = 90_000;
export const TIMEOUT_MESSAGE =
  "O servidor demorou demasiado a responder. Tenta outra vez daqui a um minuto.";
export const OFFLINE_MESSAGE =
  "Não foi possível ligar ao servidor. Confirma a ligação à internet e tenta outra vez.";

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

  // Timeout: sem ele o pedido pode ficar preso para sempre (rede má). Tem de chegar para a
  // API acordar no Render gratuito (~50 s). O signal de quem chama (ex.: pesquisa de campos)
  // também cancela o pedido.
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  const callerSignal = init?.signal;
  const abortFromCaller = () => controller.abort();
  if (callerSignal?.aborted) controller.abort();
  else callerSignal?.addEventListener("abort", abortFromCaller);

  let res: Response;
  try {
    // Se demorar (API a acordar), aparece o aviso: ver components/server-waking.tsx.
    res = await trackSlow(
      fetch(`${API}${path}`, { ...init, headers, signal: controller.signal }),
    );
  } catch (err) {
    if (callerSignal?.aborted) throw err;
    throw new ApiError(timedOut ? TIMEOUT_MESSAGE : OFFLINE_MESSAGE, 0);
  } finally {
    clearTimeout(timer);
    callerSignal?.removeEventListener("abort", abortFromCaller);
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

/** Jogo + confirmados + lista de espera. O código do convite dá acesso a quem ainda não está no jogo. */
export const getGameDetail = (id: string, inviteCode?: string) =>
  request<GameDetailDto>(withInvite(`/games/${id}/detail`, inviteCode));
export const confirmGame = (id: string, inviteCode?: string) =>
  request<GameDetailDto>(withInvite(`/games/${id}/confirm`, inviteCode), { method: "POST" });
export const leaveGame = (id: string, inviteCode?: string) =>
  request<GameDetailDto>(withInvite(`/games/${id}/leave`, inviteCode), { method: "POST" });
/** Público: resumo do jogo a partir do link /i/<código>. */
export const getInvite = (code: string) =>
  request<GameInviteDto>(`/invites/${encodeURIComponent(code)}`);
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

// Grupos (iguais aos da web)
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

// Perfil
export const getMyProfile = () => request<PlayerProfileDto>("/me/profile");
export const updateMyProfile = (input: UpdateProfileInput) =>
  request<PlayerProfileDto>("/me/profile", json(input, "PATCH"));
export const getPlayerProfile = (id: string) =>
  request<PlayerProfileDto>(`/users/${id}/profile`);
