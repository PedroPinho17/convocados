import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import type { CookieOptions, Request, Response } from 'express';
import { LessThan, MoreThan, QueryFailedError, Repository } from 'typeorm';
import { Session, User } from '@convocados/db';
import type { LoginInput, RegisterInput, UserDto } from '@convocados/shared';
import type { Env } from '../config.js';
import { dummyPasswordHash, hashPassword, verifyPassword } from './password.js';

export const MOBILE_CLIENT_HEADER = 'x-client';
export const MOBILE_CLIENT_VALUE = 'mobile';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const toDto = (u: Pick<User, 'id' | 'name' | 'email'>): UserDto => ({
  id: u.id,
  name: u.name,
  email: u.email,
});
/** Token de sessão: 32 bytes em base64url. */
export const TOKEN_RE = /^[\w-]{43}$/;
/** Token curto do socket da web: <userId>.<expira em ms>.<assinatura HMAC>. */
const SOCKET_TOKEN_RE = /^([0-9a-f-]{36})\.(\d{13})\.([\w-]{43})$/;
export const SOCKET_TOKEN_TTL_MS = 10 * 60_000;

export function isMobileClient(req: Request): boolean {
  const value = req.headers[MOBILE_CLIENT_HEADER];
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.toLowerCase() === MOBILE_CLIENT_VALUE;
}

@Injectable()
export class AuthService {
  private readonly ttlMs: number;
  private readonly secure: boolean;
  private readonly allowRegistration: boolean;
  readonly cookieName: string;
  private readonly socketSecret: string;

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    config: ConfigService<Env, true>,
  ) {
    this.ttlMs = config.get('SESSION_TTL_DAYS', { infer: true }) * 86_400_000;
    this.secure = config.get('COOKIE_SECURE', { infer: true })!;
    this.allowRegistration = config.get('ALLOW_REGISTRATION', { infer: true });
    this.cookieName = this.secure ? '__Host-sid' : 'sid';
    this.socketSecret =
      config.get('SOCKET_TOKEN_SECRET', { infer: true }) ??
      randomBytes(32).toString('hex');
  }

  /**
   * Token curto para o socket da web. A web fala com a API pelo proxy do Next.js
   * (cookie no mesmo site), mas o socket liga direto à API, onde o cookie não chega.
   * Vale 10 minutos e só serve para abrir o socket.
   */
  issueSocketToken(userId: string): { token: string; expiresAt: string } {
    const exp = Date.now() + SOCKET_TOKEN_TTL_MS;
    return {
      token: `${userId}.${exp}.${this.signSocket(`${userId}.${exp}`)}`,
      expiresAt: new Date(exp).toISOString(),
    };
  }

  async userFromSocketToken(token: string): Promise<UserDto | null> {
    const m = SOCKET_TOKEN_RE.exec(token);
    if (!m) return null;
    const [, userId, exp, sig] = m as unknown as [
      string,
      string,
      string,
      string,
    ];
    const expected = Buffer.from(this.signSocket(`${userId}.${exp}`));
    const given = Buffer.from(sig);
    if (given.length !== expected.length || !timingSafeEqual(given, expected))
      return null;
    if (Number(exp) < Date.now()) return null;
    // A conta pode ter sido apagada entretanto.
    const user = await this.users.findOneBy({ id: userId });
    return user ? toDto(user) : null;
  }

  private signSocket(payload: string): string {
    return createHmac('sha256', this.socketSecret)
      .update(payload)
      .digest('base64url');
  }

  /** Nova password: grava e termina todas as sessões (quem a roubou fica de fora). */
  async setPassword(userId: string, password: string): Promise<void> {
    await this.users.update(
      { id: userId },
      { passwordHash: await hashPassword(password) },
    );
    await this.sessions.delete({ userId });
  }

  /** Confirma a password de quem já tem sessão (ex.: antes de apagar a conta). */
  async checkPassword(userId: string, password: string): Promise<boolean> {
    const user = await this.users.findOne({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });
    return Boolean(user && (await verifyPassword(password, user.passwordHash)));
  }

  async register({ email, password, name }: RegisterInput): Promise<User> {
    if (!this.allowRegistration) {
      throw new ForbiddenException(
        'O registo de novas contas está desativado.',
      );
    }
    const passwordHash = await hashPassword(password);
    try {
      return await this.users.save(
        this.users.create({ email, name, passwordHash }),
      );
    } catch (err) {
      if (
        err instanceof QueryFailedError &&
        (err.driverError as { code?: string }).code === '23505'
      ) {
        throw new ConflictException('Já existe uma conta com este email.');
      }
      throw err;
    }
  }

  async login({ email, password }: LoginInput): Promise<User> {
    const user = await this.users.findOne({
      where: { email },
      select: { id: true, name: true, email: true, passwordHash: true },
    });
    const ok = await verifyPassword(
      password,
      user?.passwordHash ?? (await dummyPasswordHash()),
    );
    if (!user || !ok)
      throw new UnauthorizedException('Email ou password incorretos.');
    return user;
  }

  async startSession(user: User, res: Response): Promise<UserDto> {
    await this.sessions.delete({ expiresAt: LessThan(new Date()) });
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.ttlMs);
    await this.sessions.insert({
      tokenHash: sha256(token),
      userId: user.id,
      expiresAt,
    });
    res.cookie(this.cookieName, token, {
      ...this.cookieOptions(),
      expires: expiresAt,
    });
    return toDto(user);
  }

  async startTokenSession(
    user: User,
  ): Promise<{ user: UserDto; token: string }> {
    await this.sessions.delete({ expiresAt: LessThan(new Date()) });
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.ttlMs);
    await this.sessions.insert({
      tokenHash: sha256(token),
      userId: user.id,
      expiresAt,
    });
    return { user: toDto(user), token };
  }

  async endSession(tokenHash: string | undefined, res: Response) {
    if (tokenHash) await this.sessions.delete({ tokenHash });
    res.clearCookie(this.cookieName, this.cookieOptions());
  }

  async validate(
    token: string,
  ): Promise<{ user: UserDto; tokenHash: string } | null> {
    const tokenHash = sha256(token);
    const session = await this.sessions.findOne({
      where: { tokenHash, expiresAt: MoreThan(new Date()) },
      relations: { user: true },
    });
    return session ? { user: toDto(session.user), tokenHash } : null;
  }

  readToken(req: Request): string | null {
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      const value = auth.slice(7).trim();
      return TOKEN_RE.test(value) ? value : null;
    }
    for (const part of (req.headers.cookie ?? '').split(';')) {
      const i = part.indexOf('=');
      if (i > 0 && part.slice(0, i).trim() === this.cookieName) {
        const value = part.slice(i + 1).trim();
        return TOKEN_RE.test(value) ? value : null;
      }
    }
    return null;
  }

  private cookieOptions(): CookieOptions {
    return { httpOnly: true, secure: this.secure, sameSite: 'lax', path: '/' };
  }
}
