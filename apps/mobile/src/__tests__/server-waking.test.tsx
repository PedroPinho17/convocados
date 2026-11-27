import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, render, screen } from "@testing-library/react-native";
import { SERVER_WAKING_TEXT, ServerWaking } from "../components/server-waking";
import { hasSlowRequests, SLOW_AFTER_MS, trackSlow } from "../lib/slow-requests";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

/** Uma promessa que só acaba quando o teste quiser. */
function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

describe("trackSlow", () => {
  it("só conta como lento depois dos 3 s, e deixa de contar quando acaba (também com erro)", async () => {
    const d = deferred();
    const tracked = trackSlow(d.promise);
    jest.advanceTimersByTime(SLOW_AFTER_MS - 1);
    expect(hasSlowRequests()).toBe(false);
    jest.advanceTimersByTime(1);
    expect(hasSlowRequests()).toBe(true);

    d.reject(new Error("falhou"));
    await expect(tracked).rejects.toThrow("falhou");
    expect(hasSlowRequests()).toBe(false);
  });

  it("um pedido rápido nunca conta como lento", async () => {
    await trackSlow(Promise.resolve(1));
    jest.advanceTimersByTime(SLOW_AFTER_MS + 1);
    expect(hasSlowRequests()).toBe(false);
  });
});

describe("ServerWaking", () => {
  it("mostra o aviso só enquanto há um pedido lento", async () => {
    await render(<ServerWaking />);
    expect(screen.queryByText(SERVER_WAKING_TEXT)).toBeNull();

    const d = deferred();
    const tracked = trackSlow(d.promise);
    await act(async () => {
      jest.advanceTimersByTime(SLOW_AFTER_MS);
    });
    expect(screen.getByText(SERVER_WAKING_TEXT)).toBeTruthy();

    await act(async () => {
      d.resolve();
      await tracked;
    });
    expect(screen.queryByText(SERVER_WAKING_TEXT)).toBeNull();
  });
});
