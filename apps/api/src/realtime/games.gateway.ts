import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { InjectDataSource } from '@nestjs/typeorm';
import type { Request } from 'express';
import type { Server, Socket } from 'socket.io';
import { DataSource } from 'typeorm';
import type { GameDetailDto, UserDto } from '@convocados/shared';
import { AuthService, TOKEN_RE } from '../auth/auth.service.js';
import { Public } from '../auth/auth.decorators.js';
import { canAccessGame, normalizeInviteCode } from '../games/game-access.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SocketData = { user?: UserDto };

/** `joinGame` aceita o id do jogo, ou { gameId, inviteCode } para quem vem do convite. */
function parseJoin(
  body: unknown,
): { gameId: string; inviteCode: string | null } | null {
  if (typeof body === 'string') return { gameId: body, inviteCode: null };
  if (body && typeof body === 'object') {
    const { gameId, inviteCode } = body as Record<string, unknown>;
    if (typeof gameId === 'string')
      return { gameId, inviteCode: normalizeInviteCode(inviteCode) };
  }
  return null;
}

/**
 * Cada jogo é uma sala (`game:<id>`): quem tem o ecrã do jogo aberto recebe `gameUpdated`.
 * O CORS é configurado no adaptador em main.ts, com o WEB_ORIGIN já validado.
 *
 * Só entra na sala quem tem acesso ao jogo, com a mesma regra de GET /games/:id/detail
 * (ver games/game-access.ts): os `gameUpdated` trazem as listas e os pagamentos.
 */
@Public()
@WebSocketGateway()
export class GamesGateway implements OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly auth: AuthService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * A sessão é validada num middleware, antes de a ligação ser aceite. Num
   * `handleConnection` assíncrono, o cliente recebia `connect` antes da validação acabar
   * e o `joinGame` enviado logo a seguir era recusado.
   */
  afterInit(server: Server) {
    server.use((client, next) => {
      this.userOf(client)
        .then((user) => {
          if (!user) return next(new Error('Sessão inválida ou expirada.'));
          (client.data as SocketData).user = user;
          next();
        })
        .catch(() => next(new Error('Erro ao validar a sessão.')));
    });
  }

  /**
   * Quem está a ligar:
   * - app mobile: o token da sessão em `auth.token`;
   * - web: um token curto do socket (GET /auth/socket-token, pelo proxy da web);
   * - web no mesmo site que a API (só em dev): o cookie da sessão.
   */
  private async userOf(client: Socket): Promise<UserDto | null> {
    const fromAuth: unknown = client.handshake.auth?.token;
    if (typeof fromAuth === 'string') {
      if (TOKEN_RE.test(fromAuth))
        return (await this.auth.validate(fromAuth))?.user ?? null;
      return this.auth.userFromSocketToken(fromAuth);
    }
    const cookie = this.auth.readToken({
      headers: client.handshake.headers,
    } as Request);
    return cookie ? ((await this.auth.validate(cookie))?.user ?? null) : null;
  }

  @SubscribeMessage('joinGame')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
  ) {
    const user = (client.data as SocketData).user;
    if (!user) return { ok: false };
    const join = parseJoin(body);
    if (!join || !UUID_RE.test(join.gameId)) return { ok: false };
    const allowed = await canAccessGame(
      this.dataSource.manager,
      join.gameId,
      user.id,
      join.inviteCode,
    );
    // A mesma resposta para "não existe" e "sem acesso".
    if (!allowed) return { ok: false };
    await client.join(`game:${join.gameId}`);
    return { ok: true };
  }

  @SubscribeMessage('leaveGame')
  async handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() gameId: unknown,
  ) {
    if (typeof gameId !== 'string' || !UUID_RE.test(gameId))
      return { ok: false };
    await client.leave(`game:${gameId}`);
    return { ok: true };
  }

  emitGameUpdated(gameId: string, detail: GameDetailDto) {
    this.server.to(`game:${gameId}`).emit('gameUpdated', detail);
  }
}
