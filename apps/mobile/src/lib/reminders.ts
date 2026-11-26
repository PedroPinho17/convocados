import * as Notifications from "expo-notifications";
import { SchedulableTriggerInputTypes } from "expo-notifications";
import { planReminders } from "@convocados/shared";
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

    // O que agendar é decidido por uma função pura do shared (com testes); aqui só se agenda.
    for (const r of planReminders(games, reminderMinutes, Date.now())) {
      await Notifications.scheduleNotificationAsync({
        content: { title: r.title, body: r.body, data: { kind: KIND, gameId: r.gameId } },
        trigger: { type: SchedulableTriggerInputTypes.DATE, date: r.at, channelId: "default" },
      });
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
