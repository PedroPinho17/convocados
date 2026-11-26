import { Suspense } from "react";
import { GroupDetailClient } from "./group-detail-client";

export default function GroupDetailPage() {
  return (
    <Suspense fallback={<main className="p-8 text-muted">A carregar…</main>}>
      <GroupDetailClient />
    </Suspense>
  );
}
