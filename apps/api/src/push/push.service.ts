import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, MoreThan, Repository } from 'typeorm';
import { Game, Participation, PushToken, User } from '@convocados/db';
import type {
  RegisterPushTokenInput,
  ReminderSettingsInput,
  RemindersDto,
} from '@convocados/shared';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
/** A Expo aceita no máximo 100 mensagens por pedido. */
const EXPO_BATCH = 100;

type ExpoTicket =
  | { status: 'ok'; id: string }
  | { status: 'error'; message: string; details?: { error?: string } };

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    @InjectRepository(PushToken) private readonly tokens: Repository<PushToken>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async register(userId: string, input: RegisterPushTokenInput): Promise<void> {
    // O mesmo telemóvel pode mudar de conta: o token passa para o utilizador atual.
    await this.tokens.upsert(
      { userId, token: input.token, platform: input.platform ?? null },
      { conflictPaths: ['token'] },
    );
  }

  /** Ao sair da conta: só apaga o token se for deste utilizador. */
  async unregister(userId: string, token: string): Promise<void> {
    await this.tokens.delete({ userId, token });
  }

  async getReminders(userId: string): Promise<RemindersDto> {
    const user = await this.dataSource.manager.findOneByOrFail(User, {
      id: userId,
    });
    const games = await this.dataSource.manager
      .createQueryBuilder(Game, 'g')
      .innerJoin(Participation, 'p', 'p."gameId" = g.id')
      .where('p."userId" = :userId', { userId })
      .andWhere(`p.status = 'confirmed'`)
      .andWhere(`g.status = 'open'`)
      .andWhere({ startsAt: MoreThan(new Date()) })
      .orderBy('g.startsAt', 'ASC')
      .getMany();
    return {
      reminderMinutes: user.reminderMinutes,
      games: games.map((g) => ({
        gameId: g.id,
        title: g.title,
        location: g.location,
        startsAt: g.startsAt.toISOString(),
      })),
    };
  }

  async setReminders(
    userId: string,
    input: ReminderSettingsInput,
  ): Promise<RemindersDto> {
    const sorted = [...input.reminderMinutes].sort((a, b) => b - a);
    await this.dataSource.manager.update(
      User,
      { id: userId },
      { reminderMinutes: sorted },
    );
    return this.getReminders(userId);
  }

  /**
   * Envia uma notificação a cada dispositivo destes utilizadores.
   * Nunca lança erro: é chamado depois de a ação já estar feita, e uma falha da Expo
   * (sem rede, Expo em baixo) não pode desfazer a ação nem derrubar a API.
   */
  async send(
    toUserIds: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    try {
      const tokens = await this.tokensForUsers(toUserIds);
      for (let i = 0; i < tokens.length; i += EXPO_BATCH) {
        const batch = tokens.slice(i, i + EXPO_BATCH);
        const res = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            batch.map((to) => ({
              to,
              sound: 'default',
              channelId: 'default',
              title,
              body,
              data,
            })),
          ),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) {
          this.logger.warn(`Expo Push respondeu ${res.status}`);
          continue;
        }
        const { data: tickets } = (await res.json()) as { data?: ExpoTicket[] };
        await this.removeDeadTokens(batch, tickets ?? []);
      }
    } catch (err) {
      this.logger.warn(
        `Falha ao enviar notificações: ${(err as Error).message}`,
      );
    }
  }

  private async tokensForUsers(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    const rows = await this.tokens.find({
      where: { userId: In(userIds) },
      select: { token: true },
    });
    return [...new Set(rows.map((r) => r.token))];
  }

  /** Os tickets vêm pela mesma ordem das mensagens. App desinstalada → apagar o token. */
  private async removeDeadTokens(batch: string[], tickets: ExpoTicket[]) {
    const dead = batch.filter((_, i) => {
      const t = tickets[i];
      return (
        t?.status === 'error' && t.details?.error === 'DeviceNotRegistered'
      );
    });
    if (dead.length > 0) await this.tokens.delete({ token: In(dead) });
  }
}
