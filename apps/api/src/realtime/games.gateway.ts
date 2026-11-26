import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Request } from 'express';
import type { Server, Socket } from 'socket.io';
import type { GameDetailDto, UserDto } from '@convocados/shared';
import { AuthService, TOKEN_RE } from '../auth/auth.service.js';
import { Public } from '../auth/auth.decorators.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SocketData = { user?: UserDto };

/**
 * Cada jogo é uma sala (`game:<id>`): quem tem o ecrã do jogo aberto recebe `gameUpdated`.
 * O CORS é configurado no adaptador em main.ts, com o WEB_ORIGIN já validado.
 *
 * Nota: qualquer utilizador com sessão pode entrar na sala de qualquer jogo, tal como
 * GET /games/:id/detail. Os ids são UUIDs; rever quando houver grupos fechados.
 */
@Public()
@WebSocketGateway()
export class GamesGateway implements OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly auth: AuthService) {}

  /**
   * A sessão é validada num middleware, antes de a ligação ser aceite. Num
   * `handleConnection` assíncrono, o cliente recebia `connect` antes da validação acabar
   * e o `joinGame` enviado logo a seguir era recusado.
   */
  afterInit(server: Server) {
    server.use((client, next) => {
      const token = this.readToken(client);
      (token ? this.auth.validate(token) : Promise.resolve(null))
        .then((session) => {
          if (!session) return next(new Error('Sessão inválida ou expirada.'));
          (client.data as SocketData).user = session.user;
          next();
        })
        .catch(() => next(new Error('Erro ao validar a sessão.')));
    });
  }

  @SubscribeMessage('joinGame')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() gameId: unknown,
  ) {
    if (!(client.data as SocketData).user) return { ok: false };
    if (typeof gameId !== 'string' || !UUID_RE.test(gameId))
      return { ok: false };
    await client.join(`game:${gameId}`);
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

  /** Mobile manda o token em `auth.token`; a web manda o cookie de sessão. */
  private readToken(client: Socket): string | null {
    const fromAuth: unknown = client.handshake.auth?.token;
    if (typeof fromAuth === 'string')
      return TOKEN_RE.test(fromAuth) ? fromAuth : null;
    return this.auth.readToken({
      headers: client.handshake.headers,
    } as Request);
  }
}
