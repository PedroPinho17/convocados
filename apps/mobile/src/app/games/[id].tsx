import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Share, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import {
  formatEuros,
  sharePerPlayerCents,
  sportLabel,
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
  cancelGame,
  listMyRatings,
  setPaid,
  updateGame,
  upsertRating,
} from "../../lib/api";
import { priceRangeText } from "../../lib/price";
import { GameForm } from "../../components/game-form";
import { InviteQr } from "../../components/invite-qr";
import { subscribeGame } from "../../lib/socket";
import { syncReminders } from "../../lib/reminders";
import { WEB_ORIGIN } from "../../lib/links";
import { Badge, Button, Card, CardTitle, Columns, Muted, Notice, Screen } from "../../components/ui";
import { radius, usePalette, useThemedStyles, type Palette } from "../../lib/theme";

const TEAM_COLORS = ["#16a34a", "#0ea5e9", "#f59e0b", "#d946ef"];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

function formatWhen(iso: string) {
  const d = new Date(iso);
  const day = d.toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" });
  const time = d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  return `${day} · ${time}`;
}

export default function GameDetailScreen() {
  const s = useThemedStyles(styles);
  const c = usePalette();
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

  // Confirmei, desisti, subi da lista de espera, o jogo mudou de hora ou foi cancelado:
  // reagendar lembretes.
  const myStatus = game?.participations.find((p) => p.userId === meId)?.status;
  const startsAt = game?.startsAt;
  const gameStatus = game?.status;
  useEffect(() => {
    if (startsAt) void syncReminders();
  }, [myStatus, startsAt, gameStatus]);

  useEffect(() => {
    // Sem poder avaliar a secção não aparece, por isso não é preciso limpar a lista.
    // Só se avalia depois de o jogo começar (a API recusa antes).
    const hasStarted = !!startsAt && new Date(startsAt).getTime() <= openedAt;
    if (!id || !meId || myStatus !== "confirmed" || !hasStarted) return;
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
  }, [id, meId, myStatus, startsAt, openedAt, game?.confirmedCount]);

  if (error) {
    return (
      <Screen>
        <Notice tone="danger" text={error} />
      </Screen>
    );
  }
  if (!game) {
    return (
      <View style={[s.center, { backgroundColor: c.canvas }]}>
        <ActivityIndicator color={c.brand} />
      </View>
    );
  }

  const isOrganizer = meId === game.organizerId;
  const inviteUrl = `${WEB_ORIGIN}/i/${game.inviteCode}`;
  const confirmed = game.participations.filter((p) => p.status === "confirmed");
  const waiting = game.participations.filter((p) => p.status === "waiting");
  const mine = game.participations.find((p) => p.userId === meId);
  const myQueuePlace = mine?.status === "waiting" ? waiting.findIndex((p) => p.id === mine.id) + 1 : 0;
  const slotsFull = game.confirmedCount >= game.slots;
  const full = slotsFull && game.waitingCount >= game.subs;
  const started = new Date(game.startsAt).getTime() <= openedAt;
  const cancelled = game.status === "cancelled";
  const fill = Math.min(1, game.confirmedCount / Math.max(1, game.slots));

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

  function onCancelGame() {
    const people = game?.participations.length ?? 0;
    Alert.alert(
      "Cancelar jogo?",
      people > 0
        ? `${people === 1 ? "A pessoa inscrita vai" : `As ${people} pessoas inscritas vão`} receber uma notificação.`
        : "Ninguém está inscrito ainda.",
      [
        { text: "Não", style: "cancel" },
        {
          text: "Cancelar jogo",
          style: "destructive",
          onPress: () => void run(cancelGame, "Não foi possível cancelar o jogo."),
        },
      ],
    );
  }

  async function onShare() {
    await Share.share({ message: `Entra no jogo "${game?.title}": ${inviteUrl}`, url: inviteUrl });
  }

  if (editing) {
    return (
      <Screen>
        <View style={{ width: "100%", maxWidth: 640, alignSelf: "center" }}>
          <Card>
            <CardTitle>Editar jogo</CardTitle>
            <GameForm game={game} submitLabel="Guardar" onSubmit={onSave} onCancel={() => setEditing(false)} />
          </Card>
        </View>
      </Screen>
    );
  }

  const confirmLabel = cancelled
    ? "Jogo cancelado"
    : started
      ? "Jogo já começou"
      : full
        ? "Jogo cheio"
        : slotsFull
          ? "Entrar na lista de espera"
          : "Confirmar";

  const header = (
    <Card>
      <View style={s.titleRow}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={s.title} accessibilityRole="header">
            {game.title}
          </Text>
          {cancelled ? <Badge label="Cancelado" tone="danger" /> : null}
          <Text style={s.when}>{formatWhen(game.startsAt)}</Text>
          <Text style={s.meta}>{sportLabel(game.sport)}</Text>
        </View>
        {isOrganizer && !cancelled ? (
          <Button label="Editar" size="sm" variant="secondary" onPress={() => setEditing(true)} />
        ) : null}
      </View>
      <Text style={s.meta}>📍 {game.location}</Text>
      <Text style={s.meta}>💶 total {formatEuros(game.totalPriceCents)}</Text>
      {cancelled ? <Notice tone="danger" text="Este jogo foi cancelado pelo organizador." /> : null}
    </Card>
  );

  const participation = (
    <Card>
      <View style={s.countRow}>
        <Text style={s.count}>
          <Text style={s.countBig}>
            {game.confirmedCount}/{game.slots}
          </Text>{" "}
          confirmados
        </Text>
        {game.subs > 0 ? (
          <Muted>
            {game.waitingCount}/{game.subs} em espera
          </Muted>
        ) : null}
      </View>
      <View
        style={s.progress}
        accessibilityRole="progressbar"
        accessibilityLabel="Vagas preenchidas"
        accessibilityValue={{ min: 0, max: game.slots, now: game.confirmedCount }}
      >
        <View style={[s.progressFill, { width: `${Math.round(fill * 100)}%` }]} />
      </View>
      <Muted>{priceRangeText(game, game.confirmedCount)}</Muted>
      {game.totalPriceCents > 0 && confirmed.length > 0 ? (
        <Muted>
          Pagamentos: {confirmed.length - unpaidCount}/{confirmed.length} · falta {formatEuros(outstandingCents)}
        </Muted>
      ) : null}

      {mine ? (
        <View style={s.mine}>
          <Text style={s.mineText}>
            {mine.status === "confirmed"
              ? `Estás confirmado${
                  game.totalPriceCents > 0 ? (mine.paid ? " · pago." : " · pagamento em falta.") : "."
                }`
              : `Estás em lista de espera (${myQueuePlace}.º). Entras se alguém desistir.`}
          </Text>
        </View>
      ) : null}

      {mine ? (
        <Button
          key="leave"
          label="Desistir"
          variant="secondary"
          disabled={pending}
          onPress={() => run(leaveGame, "Não foi possível desistir.")}
        />
      ) : (
        <Button
          key="confirm"
          label={confirmLabel}
          loading={pending}
          disabled={full || started || cancelled}
          onPress={() => run(confirmGame, "Não foi possível confirmar.")}
        />
      )}
      {actionError ? <Notice tone="danger" text={actionError} /> : null}
    </Card>
  );

  const lists = (
    <Card>
      <CardTitle>Confirmados</CardTitle>
      {confirmed.length === 0 ? (
        <Muted>Ainda ninguém.</Muted>
      ) : (
        confirmed.map((p, i) => (
          <View key={p.id} style={[s.person, i > 0 ? s.personBorder : null]}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials(p.userName)}</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={s.personName}>
                {`${i + 1}. ${p.userName}`}
              </Text>
              {game.totalPriceCents > 0 ? (
                <Badge
                  tone={p.paid ? "ok" : "warn"}
                  label={`${p.paid ? "pago" : "em falta"}${shareCents > 0 ? ` (${formatEuros(shareCents)})` : ""}`}
                />
              ) : null}
            </View>
            {isOrganizer && game.totalPriceCents > 0 ? (
              <Button
                size="sm"
                variant={p.paid ? "ghost" : "secondary"}
                label={p.paid ? "Em falta" : "Pago"}
                accessibilityLabel={p.paid ? `Marcar ${p.userName} em falta` : `Marcar ${p.userName} como pago`}
                disabled={pending}
                onPress={() => togglePaid(p.userId, !p.paid)}
              />
            ) : null}
          </View>
        ))
      )}

      {game.subs > 0 ? (
        <View style={s.waitingBlock}>
          <Text style={s.subTitle}>Lista de espera</Text>
          {waiting.length === 0 ? (
            <Muted>Vazia.</Muted>
          ) : (
            waiting.map((p, i) => (
              <View key={p.id} style={s.waitingRow}>
                <View style={s.waitingNumber}>
                  <Text style={s.waitingNumberText}>{i + 1}</Text>
                </View>
                <Text style={s.personName}>{p.userName}</Text>
              </View>
            ))
          )}
        </View>
      ) : null}
    </Card>
  );

  const invite =
    isOrganizer && game.status === "open" ? (
      <Card>
        <CardTitle>Convite</CardTitle>
        <InviteQr url={inviteUrl} />
        <Text style={s.link} selectable>
          {inviteUrl}
        </Text>
        <Button label="Partilhar convite" onPress={onShare} />
        <Muted>Código: {game.inviteCode}</Muted>
      </Card>
    ) : null;

  const teams =
    !cancelled && (hasTeams || isOrganizer) ? (
      <Card>
        <CardTitle
          aside={
            isOrganizer ? (
              <Button
                size="sm"
                variant="secondary"
                label={hasTeams ? "Atualizar equipas" : "Fazer equipas"}
                disabled={pending || game.confirmedCount < 2}
                onPress={() => void onGenerateTeams()}
              />
            ) : null
          }
        >
          Equipas
        </CardTitle>
        {isOrganizer && game.confirmedCount < 2 ? <Muted>Precisas de pelo menos 2 confirmados.</Muted> : null}
        {game.teams.map((team, i) => (
          <View key={team.name} style={s.team}>
            <View style={s.teamTitleRow}>
              <View style={[s.teamDot, { backgroundColor: TEAM_COLORS[i % TEAM_COLORS.length] }]} />
              <Text style={s.subTitle}>
                Equipa {team.name} · {team.players.length} jogadores
              </Text>
            </View>
            {team.players.map((p) => (
              <Text key={p.userId} style={s.teamPlayer}>
                {p.name}
              </Text>
            ))}
          </View>
        ))}
        {hasTeams && withoutTeam.length > 0 ? (
          <Notice
            tone="warn"
            text={`Sem equipa: ${withoutTeam.map((p) => p.userName).join(", ")}.${isOrganizer ? " Atualiza as equipas para os incluir." : ""}`}
          />
        ) : null}
      </Card>
    ) : null;

  const ratings =
    !cancelled && started && mine?.status === "confirmed" && confirmed.some((p) => p.userId !== meId) ? (
      <Card>
        <CardTitle>Avaliar jogadores (1–5)</CardTitle>
        <Muted>Ajuda a equilibrar as equipas. Só tu vês as notas que dás.</Muted>
        {confirmed
          .filter((p) => p.userId !== meId)
          .map((p) => {
            const current = myRatings.find((r) => r.toUserId === p.userId)?.score;
            return (
              <View key={p.userId} style={{ gap: 8 }}>
                <Text style={s.personName}>{p.userName}</Text>
                <View style={s.scores} accessibilityLabel={`Nota para ${p.userName}`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable
                      key={n}
                      accessibilityRole="button"
                      accessibilityLabel={`${n}`}
                      accessibilityState={{ selected: current === n, disabled: pending }}
                      disabled={pending}
                      onPress={() => rate(p.userId, n)}
                      style={[s.scoreBtn, current === n ? s.scoreBtnActive : null]}
                    >
                      <Text style={current === n ? s.scoreTextActive : s.scoreText}>{n}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            );
          })}
      </Card>
    ) : null;

  const danger =
    isOrganizer && game.status === "open" ? (
      <Card style={{ borderColor: c.danger }}>
        <Text style={s.subTitle}>Zona de perigo</Text>
        <Muted>Cancela o jogo (ex.: chuva). Quem está inscrito recebe uma notificação.</Muted>
        <Button label="Cancelar jogo" variant="danger" disabled={pending} onPress={onCancelGame} />
      </Card>
    ) : null;

  return (
    <Screen>
      {header}
      <Columns
        main={
          <>
            {participation}
            {lists}
          </>
        }
        side={
          <>
            {invite}
            {teams}
            {ratings}
            {danger}
          </>
        }
      />
    </Screen>
  );
}

const styles = (c: Palette) => ({
  center: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
  titleRow: { flexDirection: "row" as const, gap: 12, alignItems: "flex-start" as const },
  title: { fontSize: 24, fontWeight: "800" as const, color: c.ink },
  when: { fontSize: 15, fontWeight: "600" as const, color: c.brandStrong },
  meta: { fontSize: 15, color: c.ink },
  countRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "baseline" as const,
    flexWrap: "wrap" as const,
    gap: 8,
  },
  count: { fontSize: 16, color: c.ink },
  countBig: { fontSize: 26, fontWeight: "800" as const },
  progress: {
    height: 10,
    borderRadius: 999,
    backgroundColor: c.surface2,
    borderWidth: 1,
    borderColor: c.line,
    overflow: "hidden" as const,
  },
  progressFill: { height: "100%" as const, backgroundColor: c.brand, borderRadius: 999 },
  mine: { backgroundColor: c.surface2, borderRadius: radius.md, padding: 12 },
  mineText: { color: c.ink, fontSize: 15 },
  person: { flexDirection: "row" as const, alignItems: "center" as const, gap: 12, paddingVertical: 10 },
  personBorder: { borderTopWidth: 1, borderTopColor: c.line },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: c.brandSoft,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  avatarText: { color: c.brandStrong, fontWeight: "800" as const },
  personName: { color: c.ink, fontSize: 15, fontWeight: "600" as const },
  waitingBlock: { borderTopWidth: 1, borderTopColor: c.line, paddingTop: 12, gap: 8 },
  subTitle: { color: c.ink, fontSize: 16, fontWeight: "700" as const },
  waitingRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10 },
  waitingNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: c.surface2,
    borderWidth: 1,
    borderColor: c.line,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  waitingNumberText: { color: c.muted, fontSize: 12, fontWeight: "700" as const },
  link: { color: c.brandStrong, textDecorationLine: "underline" as const },
  team: { backgroundColor: c.surface2, borderRadius: radius.md, padding: 12, gap: 4, borderWidth: 1, borderColor: c.line },
  teamTitleRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8 },
  teamDot: { width: 12, height: 12, borderRadius: 6 },
  teamPlayer: { color: c.ink, fontSize: 15 },
  scores: { flexDirection: "row" as const, gap: 8, flexWrap: "wrap" as const },
  scoreBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.surface,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  scoreBtnActive: { backgroundColor: c.brand, borderColor: c.brand },
  scoreText: { color: c.ink, fontWeight: "700" as const },
  scoreTextActive: { color: c.brandInk, fontWeight: "800" as const },
});
