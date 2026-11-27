"use client";

import { useSyncExternalStore } from "react";
import { hasSlowRequests, subscribeSlowRequests } from "@/lib/slow-requests";

export const SERVER_WAKING_TEXT = "A acordar o servidor… pode demorar até 1 minuto.";

/**
 * Aviso fixo no fundo do ecrã enquanto algum pedido à API está a demorar (servidor a acordar).
 * Só existe no ecrã enquanto é preciso: um `role="status"` vazio sempre presente competia
 * com os avisos da própria página (ex.: "jogo cancelado").
 */
export function ServerWaking() {
  const slow = useSyncExternalStore(subscribeSlowRequests, hasSlowRequests, () => false);
  if (!slow) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <p
        role="status"
        aria-live="polite"
        className="pointer-events-auto flex items-center gap-2 rounded-full border border-warn/30 bg-warn-soft px-4 py-2 text-sm font-medium text-warn shadow-sm"
      >
        <span
          aria-hidden
          className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
        {SERVER_WAKING_TEXT}
      </p>
    </div>
  );
}
