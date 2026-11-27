/**
 * Pedidos lentos: no Render gratuito a API adormece e demora ~50 s a acordar.
 * Cada pedido que passe dos SLOW_AFTER_MS conta como lento até acabar; enquanto houver
 * algum, a interface mostra o aviso "A acordar o servidor…".
 */
export const SLOW_AFTER_MS = 3_000;

let slowCount = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** Acompanha a promessa: se demorar mais do que `afterMs`, conta como lenta até acabar. */
export function trackSlow<T>(promise: Promise<T>, afterMs = SLOW_AFTER_MS): Promise<T> {
  let counted = false;
  const timer = setTimeout(() => {
    counted = true;
    slowCount += 1;
    emit();
  }, afterMs);

  return promise.finally(() => {
    clearTimeout(timer);
    if (counted) {
      slowCount -= 1;
      emit();
    }
  });
}

export const hasSlowRequests = () => slowCount > 0;

export function subscribeSlowRequests(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
