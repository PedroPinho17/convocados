import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { CreateGameInput, GroupDto, ParsedGameDraft } from "@convocados/shared";
import { ApiError, parseGameMessage } from "../lib/api";
import { radius, usePalette } from "../lib/theme";
import { GameForm } from "./game-form";
import { Button, Field, Muted, Notice } from "./ui";

type Mode = "manual" | "paste";

/**
 * Criar um jogo de uma de duas formas: preencher à mão, ou colar a mensagem do grupo
 * e a IA preenche. Depois da IA, volta ao formulário já preenchido, para rever e criar.
 */
type Props = {
  onCreate: (input: CreateGameInput) => Promise<void>;
  /** Grupos de que sou membro (para escolher onde fica o jogo). */
  groups?: GroupDto[];
  /** Jogo novo dentro de um grupo (ecrã do grupo): grupo fixo. */
  groupId?: string | null;
};

export function NewGame({ onCreate, groups = [], groupId }: Props) {
  const c = usePalette();
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

  const tab = (value: Mode, label: string) => {
    const selected = mode === value;
    return (
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected }}
        onPress={() => setMode(value)}
        style={{
          flex: 1,
          minHeight: 42,
          borderRadius: radius.sm,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: selected ? c.surface : "transparent",
          borderWidth: selected ? 1 : 0,
          borderColor: c.brand,
        }}
      >
        <Text style={{ fontWeight: "700", color: selected ? c.brandStrong : c.muted }}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={{ gap: 14 }}>
      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: "row",
          gap: 4,
          padding: 4,
          borderRadius: radius.md,
          backgroundColor: c.surface2,
          borderWidth: 1,
          borderColor: c.line,
        }}
      >
        {tab("manual", "Preencher à mão")}
        {tab("paste", "Colar mensagem")}
      </View>

      {mode === "paste" ? (
        <View style={{ gap: 12 }}>
          <Field
            label="Mensagem do grupo"
            multiline
            placeholder="Ex.: Jogo quinta 21h no Romariz, 10 jogadores, campo 30€"
            value={paste}
            onChangeText={setPaste}
          />
          <Muted>
            Cola a mensagem do WhatsApp ou SMS. A IA lê o dia, a hora, o local, as vagas e o preço, e
            preenche o formulário para reveres.
          </Muted>
          {error ? <Notice tone="danger" text={error} /> : null}
          <Button
            label="Preencher com IA"
            onPress={() => void onParse()}
            loading={aiPending}
            disabled={paste.trim().length < 10}
          />
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {aiInfo ? <Notice tone={aiInfo.tone} text={aiInfo.text} /> : null}
          <GameForm
            key={formKey}
            draft={draft}
            groups={groups}
            groupId={groupId}
            submitLabel="Criar jogo"
            onSubmit={create}
          />
        </View>
      )}
    </View>
  );
}
