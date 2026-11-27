import { Suspense } from "react";
import { PlayerProfileClient } from "./player-profile-client";

export default function PublicPlayerPage() {
  return (
    <Suspense fallback={<main className="p-8 text-muted">A carregar…</main>}>
      <PlayerProfileClient />
    </Suspense>
  );
}
