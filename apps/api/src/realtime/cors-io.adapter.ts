import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { Server, ServerOptions } from 'socket.io';

/** Adaptador Socket.IO com o mesmo CORS do HTTP (origens do WEB_ORIGIN). */
export class CorsIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly origins: string[],
  ) {
    super(app);
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    const withCors = {
      ...options,
      cors: { origin: this.origins, credentials: true },
    };
    return super.createIOServer(port, withCors as ServerOptions) as Server;
  }
}
