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
import { formatEuros, type CreateGameInput, type GameDetailDto } from "@convocados/shared";
import { ApiError, confirmGame, getGameDetail, getMe, leaveGame, updateGame } from "../../lib/api";
import { priceRangeText } from "../../lib/price";
import { GameForm } from "../../components/game-form";

const WEB_ORIGIN = process.env.EXPO_PUBLIC_WEB_ORIGIN ?? "http://localhost:3000";

export default function GameDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [game, setGame] = useState<GameDetailDto | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
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

      {mine ? (
        <Text>
          {mine.status === "confirmed"
            ? "Estás confirmado."
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
        confirmed.map((p, i) => <Text key={p.id}>{`${i + 1}. ${p.userName}`}</Text>)
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
  muted: { color: "#52525b" },
  error: { color: "#dc2626", padding: 16 },
});
