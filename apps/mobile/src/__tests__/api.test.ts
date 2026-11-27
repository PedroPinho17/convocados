import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

type ApiModule = typeof import("../lib/api");

/** O URL da API é lido quando o módulo carrega: definir antes de o importar. */
async function loadApi(): Promise<ApiModule> {
  process.env.EXPO_PUBLIC_API_URL = "https://api.teste.local";
  let mod!: ApiModule;
  jest.isolateModules(() => {
    // O jest-expo não suporta import() dinâmico: require dentro do isolateModules.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require("../lib/api") as ApiModule;
  });
  return mod;
}

/** Um fetch que nunca responde, mas falha quando o pedido é cancelado (como o verdadeiro). */
function hangingFetch() {
  return jest.fn((_url: string, init?: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      const fail = () => {
        const err = new Error("Aborted");
        err.name = "AbortError";
        reject(err);
      };
      if (init?.signal?.aborted) fail();
      else init?.signal?.addEventListener("abort", fail);
    });
  });
}

const originalFetch = globalThis.fetch;

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
  globalThis.fetch = originalFetch;
});

describe("pedidos à API (mobile)", () => {
  it("espera até 90 s (API a acordar) e depois mostra uma mensagem clara", async () => {
    const api = await loadApi();
    globalThis.fetch = hangingFetch() as unknown as typeof fetch;

    const result = api.listGames();
    const settled = expect(result).rejects.toMatchObject({
      message: api.TIMEOUT_MESSAGE,
      status: 0,
    });
    // Aos 60 s ainda está à espera (o Render gratuito demora ~50 s a acordar).
    await jest.advanceTimersByTimeAsync(60_000);
    await jest.advanceTimersByTimeAsync(api.REQUEST_TIMEOUT_MS - 60_000);
    await settled;
    expect(api.REQUEST_TIMEOUT_MS).toBe(90_000);
  });

  it("sem rede, a mensagem não fala de Wi‑Fi nem de portas", async () => {
    const api = await loadApi();
    globalThis.fetch = jest.fn(async () => {
      throw new TypeError("Network request failed");
    }) as unknown as typeof fetch;

    const err = await api.listGames().catch((e: unknown) => e);
    expect(err).toMatchObject({ message: api.OFFLINE_MESSAGE, status: 0 });
    expect((err as Error).message).not.toMatch(/3001|Wi/);
  });

  it("quem chama pode cancelar o pedido (ex.: pesquisa de campos)", async () => {
    const api = await loadApi();
    globalThis.fetch = hangingFetch() as unknown as typeof fetch;
    const controller = new AbortController();

    const result = api.searchVenues({ q: "pav" }, controller.signal);
    controller.abort();
    await expect(result).rejects.toMatchObject({ name: "AbortError" });
  });
});
