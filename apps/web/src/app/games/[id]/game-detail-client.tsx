"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { GameDto } from "@convocados/shared";
import { ApiError, getGame } from "@/lib/api";

export function GameDetailClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [game, setGame] = useState<GameDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getGame(id)
      .then(setGame)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError(err instanceof ApiError ? err.message : "Erro");
      });
  }, [id, router]);

  if (error) return <main className="p-8 text-red-600">{error}</main>;
  if (!game) return <main className="p-8">A carregar…</main>;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-10">
      <Link href="/games" className="text-sm underline">
        ← Voltar
      </Link>
      <h1 className="text-2xl font-semibold">{game.title}</h1>
      <p>{game.location}</p>
      <p>{new Date(game.startsAt).toLocaleString("pt-PT")}</p>
      <p>
        {game.slots} vagas · {game.subs} suplentes ·{" "}
        {(game.priceCents / 100).toLocaleString("pt-PT", {
          style: "currency",
          currency: "EUR",
        })}{" "}
        / pessoa
      </p>
      <p>
        Código de convite: <strong>{game.inviteCode}</strong>
      </p>
      <p>Estado: {game.status}</p>
    </main>
  );
}
