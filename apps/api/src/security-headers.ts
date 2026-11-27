import type { INestApplication } from '@nestjs/common';
import helmet from 'helmet';

/**
 * Cabeçalhos de segurança da API (helmet). A API só devolve JSON, por isso a CSP pode
 * ser a mais fechada possível: nada carrega, nada a mete numa iframe.
 * - Não afeta o Socket.IO: o engine.io responde em /socket.io antes do Express.
 * - Não afeta o CORS (app.enableCors) nem o proxy da web, que chama a API do servidor.
 * Usado em main.ts e nos testes e2e (os mesmos cabeçalhos que em produção).
 */
export function applySecurityHeaders(app: INestApplication): void {
  const http = app.getHttpAdapter().getInstance() as {
    disable?: (setting: string) => void;
  };
  http.disable?.('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'none'"],
        },
      },
      // A app mobile e a web (noutro domínio *.onrender.com) leem as respostas por CORS;
      // o CORP só trava pedidos sem CORS (ex.: <img>), mas não há razão para os bloquear.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
}
