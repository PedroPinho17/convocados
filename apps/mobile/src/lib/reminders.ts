import * as Notifications from "expo-notifications";
import { SchedulableTriggerInputTypes } from "expo-notifications";
import { formatReminder } from "@convocados/shared";
import { getReminders, getToken } from "./api";

/**
 * Lembretes antes do jogo: notificações LOCAIS, agendadas no telemóvel.
 * Não dependem da API estar acordada (o Render gratuito adormece) nem de haver rede.
 *
 * Em cada sincronização apagam-se os lembretes agendados e voltam-se a agendar a partir
 * da API: assim apanham-se jogos confirmados na web, subidas da lista de espera,
 * desistências e mudanças de hora.
 */
const KIND = "game-reminder";

async function cancelScheduled(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.content.data?.kind === KIND)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

async function doSync(): Promise<void> {
  try {
    if (!(await getToken())) return;
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;

    const { reminderMinutes, games } = await getReminders();
    await cancelScheduled();

    const now = Date.now();
    for (const game of games) {
      const startsAt = new Date(game.startsAt);
      const time = startsAt.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
      for (const minutes of reminderMinutes) {
        const at = startsAt.getTime() - minutes * 60_000;
        if (at <= now) continue;
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `${game.title} daqui a ${formatReminder(minutes)}`,
            body: `${game.location}, às ${time}.`,
            data: { kind: KIND, gameId: game.gameId },
          },
          trigger: { type: SchedulableTriggerInputTypes.DATE, date: at, channelId: "default" },
        });
      }
    }
  } catch {
    // Sem rede / API a dormir: mantêm-se os lembretes já agendados.
  }
}

let queue: Promise<void> = Promise.resolve();

/** Volta a agendar os lembretes. Chamadas seguidas correm uma de cada vez (sem duplicados). */
export function syncReminders(): Promise<void> {
  queue = queue.then(doSync);
  return queue;
}

/** Ao sair da conta. */
export async function clearReminders(): Promise<void> {
  try {
    await cancelScheduled();
  } catch {
    // nada a fazer
  }
}
