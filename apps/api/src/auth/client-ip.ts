import { timingSafeEqual } from 'node:crypto';
import { Injectable, type ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

/** Cabeçalhos que o proxy da web (apps/web/src/app/api/[...path]/route.ts) envia. */
export const PROXY_SECRET_HEADER = 'x-proxy-secret';
export const CLIENT_IP_HEADER = 'x-client-ip';

function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const header = (req: Request, name: string) => {
  const v = req.headers[name];
  return Array.isArray(v) ? v[0] : v;
};

/**
 * O IP de quem fez o pedido. Os pedidos da web passam pelo proxy do Next.js, por isso
 * chegam todos do IP do proxy; nesse caso o proxy manda o IP verdadeiro em X-Client-IP.
 * Só se confia nesse cabeçalho com o segredo certo: sem ele, qualquer um escolhia o IP
 * e fugia ao limite de tentativas de login.
 */
export function clientIp(
  req: Request,
  secret = process.env.PROXY_SECRET,
): string {
  const sent = header(req, PROXY_SECRET_HEADER);
  const ip = header(req, CLIENT_IP_HEADER);
  if (secret && sent && ip && sameSecret(sent, secret)) return ip.slice(0, 64);
  return req.ip ?? 'desconhecido';
}

/** Limite de pedidos por pessoa, também para quem vem pela web (através do proxy). */
@Injectable()
export class ClientIpThrottlerGuard extends ThrottlerGuard {
  /**
   * Os guards globais também correm nas mensagens do socket, onde não há pedido HTTP
   * (nem cabeçalhos nem IP). O socket já exige uma sessão válida para ligar; o limite
   * é para os pedidos HTTP (login, registo, convites).
   */
  override canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return Promise.resolve(true);
    return super.canActivate(context);
  }

  protected override getTracker(req: Record<string, unknown>): Promise<string> {
    return Promise.resolve(clientIp(req as unknown as Request));
  }
}
