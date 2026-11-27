import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hasSlowRequests, SLOW_AFTER_MS, trackSlow } from "@/lib/slow-requests";
import { SERVER_WAKING_TEXT, ServerWaking } from "./server-waking";

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

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("trackSlow", () => {
  it("um pedido rápido nunca conta como lento", async () => {
    const d = deferred<number>();
    const tracked = trackSlow(d.promise);
    d.resolve(1);
    await expect(tracked).resolves.toBe(1);
    vi.advanceTimersByTime(SLOW_AFTER_MS + 1);
    expect(hasSlowRequests()).toBe(false);
  });

  it("conta como lento depois dos 3 s e deixa de contar quando acaba (também com erro)", async () => {
    const d = deferred();
    const tracked = trackSlow(d.promise);
    vi.advanceTimersByTime(SLOW_AFTER_MS - 1);
    expect(hasSlowRequests()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(hasSlowRequests()).toBe(true);

    d.reject(new Error("falhou"));
    await expect(tracked).rejects.toThrow("falhou");
    expect(hasSlowRequests()).toBe(false);
  });

  it("com dois pedidos lentos, o aviso só sai quando os dois acabam", async () => {
    const a = deferred();
    const b = deferred();
    const ta = trackSlow(a.promise);
    const tb = trackSlow(b.promise);
    vi.advanceTimersByTime(SLOW_AFTER_MS);

    a.resolve();
    await ta;
    expect(hasSlowRequests()).toBe(true);
    b.resolve();
    await tb;
    expect(hasSlowRequests()).toBe(false);
  });
});

describe("ServerWaking", () => {
  it("mostra o aviso só enquanto há um pedido lento", async () => {
    render(<ServerWaking />);
    expect(screen.queryByText(SERVER_WAKING_TEXT)).not.toBeInTheDocument();

    const d = deferred();
    const tracked = trackSlow(d.promise);
    act(() => {
      vi.advanceTimersByTime(SLOW_AFTER_MS);
    });
    expect(screen.getByRole("status")).toHaveTextContent(SERVER_WAKING_TEXT);

    await act(async () => {
      d.resolve();
      await tracked;
    });
    expect(screen.queryByText(SERVER_WAKING_TEXT)).not.toBeInTheDocument();
  });
});
