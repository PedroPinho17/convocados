"use client";

import { useState } from "react";
import type { CreateGameInput, GroupDto, ParsedGameDraft } from "@convocados/shared";
import { ApiError, parseGameMessage } from "@/lib/api";
import { GameForm } from "@/components/game-form";
import { Button, Notice, cn, inputClass, labelClass } from "@/components/ui";

type Mode = "manual" | "paste";

type Props = {
  onCreate: (input: CreateGameInput) => Promise<void>;
  /** Grupos onde posso criar jogos. */
  groups?: GroupDto[];
  /** Grupo já escolhido (página do grupo). */
  groupId?: string | null;
};

/**
 * Criar um jogo de uma de duas formas: preencher à mão, ou colar a mensagem do grupo
 * e a IA preenche. Depois da IA, volta ao formulário já preenchido, para rever e criar.
 */
export function NewGame({ onCreate, groups, groupId }: Props) {
  const [mode, setMode] = useState<Mode>("manual");
  const [paste, setPaste] = useState("");
  const [draft, setDraft] = useState<ParsedGameDraft | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [aiPending, setAiPending] = useState(false);
  const [aiInfo, setAiInfo] = useState<{ tone: "ok" | "warn"; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onParse() {
    setAiInfo(null);
    setError(null);
    setAiPending(true);
    try {
      const result = await parseGameMessage({ message: paste });
      setDraft(result.draft);
      setFormKey((k) => k + 1);
      setMode("manual");
      setAiInfo(
        result.ok
          ? {
              tone: "ok",
              text: `A IA preencheu o formulário: revê e carrega em Criar jogo. Restam ${result.remainingToday} pedidos hoje.`,
            }
          : {
              tone: "warn",
              text: `A IA não conseguiu ler tudo: completa o formulário. Restam ${result.remainingToday} pedidos hoje.`,
            },
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao analisar a mensagem.");
    } finally {
      setAiPending(false);
    }
  }

  async function create(input: CreateGameInput) {
    await onCreate(input);
    setDraft(null);
    setPaste("");
    setAiInfo(null);
    setFormKey((k) => k + 1);
  }

  const tab = (value: Mode, label: string) => (
    <button
      type="button"
      role="tab"
      id={`new-game-tab-${value}`}
      aria-selected={mode === value}
      aria-controls={`new-game-panel-${value}`}
      onClick={() => setMode(value)}
      className={cn(
        "min-h-10 flex-1 rounded-lg px-3 text-sm font-semibold transition",
        mode === value
          ? "bg-surface text-brand-strong shadow-sm ring-1 ring-brand/40"
          : "text-muted hover:text-ink",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Como queres criar o jogo" className="flex gap-1 rounded-xl bg-surface-2 p-1 ring-1 ring-line">
        {tab("manual", "Preencher à mão")}
        {tab("paste", "Colar mensagem")}
      </div>

      {mode === "paste" ? (
        <div
          role="tabpanel"
          id="new-game-panel-paste"
          aria-labelledby="new-game-tab-paste"
          className="flex flex-col gap-3"
        >
          <label className={labelClass}>
            Mensagem do grupo
            <textarea
              className={cn(inputClass, "min-h-32 resize-y")}
              placeholder="Ex.: Jogo quinta 21h no Romariz, 10 jogadores, campo 30€"
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
            />
          </label>
          <p className="text-sm text-muted">
            Cola a mensagem do WhatsApp ou SMS. A IA lê o dia, a hora, o local, as vagas e o preço, e
            preenche o formulário para reveres.
          </p>
          {error ? (
            <Notice tone="danger" role="alert">
              {error}
            </Notice>
          ) : null}
          <Button disabled={aiPending || paste.trim().length < 10} onClick={() => void onParse()}>
            {aiPending ? "A analisar…" : "Preencher com IA"}
          </Button>
        </div>
      ) : (
        <div role="tabpanel" id="new-game-panel-manual" aria-labelledby="new-game-tab-manual" className="flex flex-col gap-4">
          {aiInfo ? (
            <Notice tone={aiInfo.tone} role="status">
              {aiInfo.text}
            </Notice>
          ) : null}
          <GameForm
            key={formKey}
            draft={draft}
            groups={groups}
            groupId={groupId}
            submitLabel="Criar jogo"
            onSubmit={create}
          />
        </div>
      )}
    </div>
  );
}
