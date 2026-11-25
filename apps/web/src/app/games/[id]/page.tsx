import { Suspense } from "react";
import { GameDetailClient } from "./game-detail-client";

export default function GameDetailPage() {
  return (
    <Suspense fallback={<main className="p-8">A carregar…</main>}>
      <GameDetailClient />
    </Suspense>
  );
}
