import { Suspense } from "react";
import { ProfileClient } from "./profile-client";

export default function ProfilePage() {
  return (
    <Suspense fallback={<main className="p-8 text-muted">A carregar…</main>}>
      <ProfileClient />
    </Suspense>
  );
}
