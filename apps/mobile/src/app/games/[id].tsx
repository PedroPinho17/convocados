import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import {
  formatEuros,
  sharePerPlayerCents,
  type CreateGameInput,
  type GameDetailDto,
  type RatingDto,
} from "@convocados/shared";
import {
  ApiError,
  confirmGame,
  getGameDetail,
  getMe,
  generateTeams,
  leaveGame,
  listMyRatings,
  setPaid,
  updateGame,
  upsertRating,
} from "../../lib/api";
import { priceRangeText } from "../../lib/price";
import { GameForm } from "../../components/game-form";
import { subscribeGame } from "../../lib/socket";
import { syncReminders } from "../../lib/reminders";

const WEB_ORIGIN = process.env.EXPO_PUBLIC_WEB_ORIGIN ?? "http://localhost:3000";

export default function GameDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [game, setGame] = useState<GameDetailDto | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [myRatings, setMyRatings] = useState<RatingDto[]>([]);
  // Hora fixada ao abrir o ecrã (o render tem de ser puro); a API valida de novo ao confirmar.
  const [openedAt] = useState(() => Date.now());

  useEffect(() => {
    Promise.all([getGameDetail(id), getMe()])
      .then(([g, me]) => {
        setGame(g);
        setMeId(me.id);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError(err instanceof ApiError ? err.message : "Erro");
      });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    void subscribeGame(id, (detail) => {
      if (detail.id === id) setGame(detail);
    })
      .then((unsub) => {
        if (cancelled) unsub();
        else unsubscribe = unsub;
      })
      .catch(() => {
        // Sem sessão / API offline: o ecrã já trata via HTTP.
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [id]);

  // Confirmei, desisti, subi da lista de espera ou o jogo mudou de hora: reagendar lembretes.
  const myStatus = game?.participations.find((p) => p.userId === meId)?.status;
  const startsAt = game?.startsAt;
  useEffect(() => {
    if (startsAt) void syncReminders();
  }, [myStatus, startsAt]);

  useEffect(() => {
    // Sem poder avaliar a secção não aparece, por isso não é preciso limpar a lista.
    if (!id || !meId || myStatus !== "confirmed") return;
    let cancelled = false;
    listMyRatings(id)
      .then((rows) => {
        if (!cancelled) setMyRatings(rows);
      })
      .catch(() => {
        if (!cancelled) setMyRatings([]);
      });
    return () => {
      cancelled = true;
    };
  }, [id, meId, myStatus, game?.confirmedCount]);

  if (error) return <Text style={styles.error}>{error}</Text>;
  if (!game) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const isOrganizer = meId === game.organizerId;
  const inviteUrl = `${WEB_ORIGIN.replace(/\/$/, "")}/i/${game.inviteCode}`;
  const confirmed = game.participations.filter((p) => p.status === "confirmed");
  const waiting = game.participations.filter((p) => p.status === "waiting");
  const mine = game.participations.find((p) => p.userId === meId);
  const myQueuePlace = mine?.status === "waiting" ? waiting.findIndex((p) => p.id === mine.id) + 1 : 0;
  const slotsFull = game.confirmedCount >= game.slots;
  const full = slotsFull && game.waitingCount >= game.subs;
  const started = new Date(game.startsAt).getTime() <= openedAt;

  const shareCents =
    game.totalPriceCents > 0 && confirmed.length > 0
      ? sharePerPlayerCents(game.totalPriceCents, confirmed.length)
      : 0;
  const unpaidCount = confirmed.filter((p) => !p.paid).length;
  const outstandingCents = shareCents * unpaidCount;

  // Equipas guardadas pelo organizador (chegam pelo socket); sem avaliações à vista.
  const hasTeams = game.teams.length > 0;
  const inTeams = new Set(game.teams.flatMap((t) => t.players.map((p) => p.userId)));
  const withoutTeam = confirmed.filter((p) => !inTeams.has(p.userId));

  async function onSave(input: CreateGameInput) {
    await updateGame(id, input);
    // Mudar vagas pode promover quem está em espera: recarregar as listas.
    setGame(await getGameDetail(id));
    setEditing(false);
  }

  async function run(action: (gameId: string) => Promise<GameDetailDto>, fallback: string) {
    setActionError(null);
    setPending(true);
    try {
      setGame(await action(id));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : fallback);
    } finally {
      setPending(false);
    }
  }

  async function togglePaid(userId: string, paid: boolean) {
    setActionError(null);
    setPending(true);
    try {
      setGame(await setPaid(id, userId, paid));
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Não foi possível atualizar o pagamento.",
      );
    } finally {
      setPending(false);
    }
  }

  async function rate(toUserId: string, score: number) {
    setActionError(null);
    setPending(true);
    try {
      const saved = await upsertRating(id, { toUserId, score });
      setMyRatings((prev) => {
        const rest = prev.filter((r) => r.toUserId !== toUserId);
        return [...rest, saved];
      });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Não foi possível avaliar.");
    } finally {
      setPending(false);
    }
  }

  async function onGenerateTeams() {
    setActionError(null);
    setPending(true);
    try {
      setGame(await generateTeams(id, { teamCount: 2 }));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Não foi possível fazer as equipas.");
    } finally {
      setPending(false);
    }
  }

  async function onShare() {
    await Share.share({ message: `Entra no jogo "${game?.title}": ${inviteUrl}`, url: inviteUrl });
  }

  if (editing) {
    return (
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Editar jogo</Text>
        <GameForm game={game} submitLabel="Guardar" onSubmit={onSave} onCancel={() => setEditing(false)} />
      </ScrollView>
    );
  }

  const confirmLabel = started
    ? "Jogo já começou"
    : full
      ? "Jogo cheio"
      : slotsFull
        ? "Entrar na lista de espera"
        : "Confirmar";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{game.title}</Text>
        {isOrganizer && (
          <Pressable style={styles.secondaryButton} onPress={() => setEditing(true)}>
            <Text>Editar</Text>
          </Pressable>
        )}
      </View>
      <Text>{game.location}</Text>
      <Text>
        {new Date(game.startsAt).toLocaleString("pt-PT")} · total {formatEuros(game.totalPriceCents)}
      </Text>
      <Text style={styles.bold}>
        {game.confirmedCount}/{game.slots} confirmados
        {game.subs > 0 ? ` · ${game.waitingCount}/${game.subs} em espera` : ""}
      </Text>
      <Text style={styles.muted}>{priceRangeText(game, game.confirmedCount)}</Text>
      {game.totalPriceCents > 0 && confirmed.length > 0 ? (
        <Text style={styles.muted}>
          Pagamentos: {confirmed.length - unpaidCount}/{confirmed.length} · falta{" "}
          {formatEuros(outstandingCents)}
        </Text>
      ) : null}

      {mine ? (
        <Text>
          {mine.status === "confirmed"
            ? `Estás confirmado${
                game.totalPriceCents > 0 ? (mine.paid ? " · pago." : " · pagamento em falta.") : "."
              }`
            : `Estás em lista de espera (${myQueuePlace}.º). Entras se alguém desistir.`}
        </Text>
      ) : null}

      {mine ? (
        <Pressable
          style={styles.secondaryButton}
          disabled={pending}
          onPress={() => run(leaveGame, "Não foi possível desistir.")}
        >
          <Text style={styles.center}>Desistir</Text>
        </Pressable>
      ) : (
        <Pressable
          style={[styles.button, (pending || full || started) && styles.disabled]}
          disabled={pending || full || started}
          onPress={() => run(confirmGame, "Não foi possível confirmar.")}
        >
          {pending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{confirmLabel}</Text>}
        </Pressable>
      )}
      {actionError ? <Text style={styles.error}>{actionError}</Text> : null}

      <Text style={styles.section}>Confirmados</Text>
      {confirmed.length === 0 ? (
        <Text style={styles.muted}>Ainda ninguém.</Text>
      ) : (
        confirmed.map((p, i) => (
          <View key={p.id} style={styles.row}>
            <Text style={{ flex: 1 }}>
              {`${i + 1}. ${p.userName}`}
              {game.totalPriceCents > 0
                ? ` · ${p.paid ? "pago" : "em falta"}${
                    shareCents > 0 ? ` (${formatEuros(shareCents)})` : ""
                  }`
                : ""}
            </Text>
            {isOrganizer && game.totalPriceCents > 0 ? (
              <Pressable
                style={styles.secondaryButton}
                disabled={pending}
                onPress={() => togglePaid(p.userId, !p.paid)}
              >
                <Text>{p.paid ? "Em falta" : "Pago"}</Text>
              </Pressable>
            ) : null}
          </View>
        ))
      )}

      {game.subs > 0 ? (
        <>
          <Text style={styles.section}>Lista de espera</Text>
          {waiting.length === 0 ? (
            <Text style={styles.muted}>Vazia.</Text>
          ) : (
            waiting.map((p, i) => <Text key={p.id}>{`${i + 1}. ${p.userName}`}</Text>)
          )}
        </>
      ) : null}

      {mine?.status === "confirmed" && confirmed.some((p) => p.userId !== meId) ? (
        <>
          <Text style={styles.section}>Avaliar jogadores (1–5)</Text>
          <Text style={styles.muted}>Ajuda a equilibrar as equipas.</Text>
          {confirmed
            .filter((p) => p.userId !== meId)
            .map((p) => {
              const current = myRatings.find((r) => r.toUserId === p.userId)?.score;
              return (
                <View key={p.userId} style={{ gap: 6 }}>
                  <Text>{p.userName}</Text>
                  <View style={styles.row}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Pressable
                        key={n}
                        disabled={pending}
                        onPress={() => rate(p.userId, n)}
                        style={[styles.scoreBtn, current === n && styles.scoreBtnActive]}
                      >
                        <Text style={current === n ? styles.scoreBtnTextActive : undefined}>{n}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              );
            })}
        </>
      ) : null}

      {hasTeams || isOrganizer ? <Text style={styles.section}>Equipas</Text> : null}
      {isOrganizer ? (
        <Pressable
          style={[styles.secondaryButton, (pending || game.confirmedCount < 2) && styles.disabled]}
          disabled={pending || game.confirmedCount < 2}
          onPress={() => void onGenerateTeams()}
        >
          <Text>{hasTeams ? "Atualizar equipas" : "Fazer equipas"}</Text>
        </Pressable>
      ) : null}
      {isOrganizer && game.confirmedCount < 2 ? (
        <Text style={styles.muted}>Precisas de pelo menos 2 confirmados.</Text>
      ) : null}
      {game.teams.map((team) => (
        <View key={team.name} style={{ gap: 4, marginTop: 4 }}>
          <Text style={styles.bold}>
            Equipa {team.name} · {team.players.length} jogadores
          </Text>
          {team.players.map((p) => (
            <Text key={p.userId}>{p.name}</Text>
          ))}
        </View>
      ))}
      {hasTeams && withoutTeam.length > 0 ? (
        <Text style={styles.warning}>
          Sem equipa: {withoutTeam.map((p) => p.userName).join(", ")}.
          {isOrganizer ? " Atualiza as equipas para os incluir." : ""}
        </Text>
      ) : null}

      {isOrganizer ? (
        <>
          <Text style={styles.section}>Convite</Text>
          <Text style={styles.muted}>{inviteUrl}</Text>
          <Pressable style={styles.button} onPress={onShare}>
            <Text style={styles.buttonText}>Partilhar convite</Text>
          </Pressable>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16, gap: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", textAlign: "center" },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  title: { fontSize: 24, fontWeight: "600", flexShrink: 1 },
  section: { fontWeight: "600", marginTop: 12 },
  bold: { fontWeight: "600" },
  button: {
    marginTop: 4,
    backgroundColor: "#18181b",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  disabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontWeight: "600" },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scoreBtn: {
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 8,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreBtnActive: {
    backgroundColor: "#18181b",
    borderColor: "#18181b",
  },
  scoreBtnTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  muted: { color: "#52525b" },
  warning: { color: "#b45309" },
  error: { color: "#dc2626", padding: 16 },
});
