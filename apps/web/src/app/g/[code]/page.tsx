import { Suspense } from "react";
import { GroupInviteClient } from "./group-invite-client";

export default function GroupInvitePage() {
  return (
    <Suspense fallback={<main className="p-8 text-muted">A carregar…</main>}>
      <GroupInviteClient />
    </Suspense>
  );
}
