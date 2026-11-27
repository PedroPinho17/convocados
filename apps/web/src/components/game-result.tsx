"use client";

import { useState } from "react";
import type { GameDetailDto, UserDto } from "@convocados/shared";
import { ApiError, generateMatchSummary, setGameResult } from "@/lib/api";
import { Button, Card, CardTitle, Notice, inputClass, labelClass } from "@/components/ui";

type Props = {
  game: GameDetailDto;
  me: UserDto | null;
  onChange: (game: GameDetailDto) => void;
};

function whatsappUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Resultado A–B e crónica IA (organizador regista; todos veem). */
export function GameResult({ game, me, onChange }: Props) {
  const isOrganizer = me?.id === game.organizerId;
  const [openedAt] = useState(() => Date.now());
  const started = new Date(game.startsAt).getTime() <= openedAt;
  const cancelled = game.status === "cancelled";
  const hasResult = game.scoreA != null && game.scoreB != null;

  const [scoreA, setScoreA] = useState(String(game.scoreA ?? ""));
  const [scoreB, setScoreB] = useState(String(game.scoreB ?? ""));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  if (cancelled) return null;
  if (!isOrganizer && !hasResult && !game.summary) return null;
  if (!isOrganizer && !started && !hasResult) return null;

  async function saveResult(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const a = Number(scoreA);
    const b = Number(scoreB);
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) {
      setError("Indica o resultado com números inteiros ≥ 0.");
      return;
    }
    setPending(true);
    try {
      onChange(await setGameResult(game.id, { scoreA: a, scoreB: b }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível guardar o resultado.");
    } finally {
      setPending(false);
    }
  }

  async function onSummary(again: boolean) {
    setError(null);
    setSummaryBusy(true);
    try {
      const res = await generateMatchSummary(game.id);
      if (res.ok) {
        onChange({ ...game, summary: res.summary });
      } else {
        setError(res.summary);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível gerar a crónica.");
    } finally {
      setSummaryBusy(false);
    }
    void again;
  }

  async function copySummary() {
    if (!game.summary) return;
    try {
      await navigator.clipboard.writeText(game.summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Não foi possível copiar.");
    }
  }

  return (
    <Card>
      <CardTitle>Resultado</CardTitle>
      {hasResult ? (
        <p className="text-2xl font-bold tracking-tight">
          {game.scoreA} – {game.scoreB}
          <span className="ml-2 text-sm font-normal text-muted">Equipa A · Equipa B</span>
        </p>
      ) : isOrganizer && started ? (
        <p className="text-sm text-muted">Regista o marcador das equipas A e B.</p>
      ) : null}

      {isOrganizer && started ? (
        <form onSubmit={saveResult} className="mt-3 flex flex-wrap items-end gap-3">
          <label className={labelClass}>
            Equipa A
            <input
              className={`${inputClass} w-20`}
              inputMode="numeric"
              value={scoreA}
              onChange={(e) => setScoreA(e.target.value)}
              required
            />
          </label>
          <label className={labelClass}>
            Equipa B
            <input
              className={`${inputClass} w-20`}
              inputMode="numeric"
              value={scoreB}
              onChange={(e) => setScoreB(e.target.value)}
              required
            />
          </label>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "A guardar…" : hasResult ? "Atualizar resultado" : "Guardar resultado"}
          </Button>
        </form>
      ) : null}

      {error ? (
        <Notice tone="danger" role="alert">
          {error}
        </Notice>
      ) : null}

      {hasResult ? (
        <div className="mt-4 flex flex-col gap-3">
          <h3 className="text-sm font-semibold">Crónica do jogo</h3>
          {game.summary ? (
            <p className="whitespace-pre-wrap rounded-xl bg-surface-2 px-4 py-3 text-sm">{game.summary}</p>
          ) : (
            <p className="text-sm text-muted">Ainda sem crónica.</p>
          )}
          {isOrganizer ? (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={summaryBusy}
                onClick={() => void onSummary(!!game.summary)}
              >
                {summaryBusy
                  ? "A gerar…"
                  : game.summary
                    ? "Gerar outra vez"
                    : "Gerar crónica (IA)"}
              </Button>
              {game.summary ? (
                <>
                  <Button size="sm" variant="ghost" onClick={() => void copySummary()}>
                    {copied ? "Copiado" : "Copiar"}
                  </Button>
                  <a
                    href={whatsappUrl(game.summary)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-9 items-center rounded-xl px-3 text-sm font-semibold text-brand-strong hover:underline"
                  >
                    Partilhar no WhatsApp
                  </a>
                </>
              ) : null}
            </div>
          ) : game.summary ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" onClick={() => void copySummary()}>
                {copied ? "Copiado" : "Copiar"}
              </Button>
              <a
                href={whatsappUrl(game.summary)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-9 items-center rounded-xl px-3 text-sm font-semibold text-brand-strong hover:underline"
              >
                Partilhar no WhatsApp
              </a>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
