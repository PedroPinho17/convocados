import { Suspense } from "react";
import { InviteClient } from "./invite-client";

export default function InvitePage() {
  return (
    <Suspense fallback={<main className="p-8">A carregar…</main>}>
      <InviteClient />
    </Suspense>
  );
}