import { createHash, randomBytes } from 'node:crypto';
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

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    config: ConfigService<Env, true>,
  ) {
    this.ttlMs = config.get('SESSION_TTL_DAYS', { infer: true }) * 86_400_000;
    this.secure = config.get('COOKIE_SECURE', { infer: true })!;
    this.allowRegistration = config.get('ALLOW_REGISTRATION', { infer: true });
    this.cookieName = this.secure ? '__Host-sid' : 'sid';
  }

  async register({ email, password, name }: RegisterInput): Promise<User> {
    if (!this.allowRegistration) {
      throw new ForbiddenException('O registo de novas contas está desativado.');
    }
    const passwordHash = await hashPassword(password);
    try {
      return await this.users.save(this.users.create({ email, name, passwordHash }));
    } catch (err) {
      if (err instanceof QueryFailedError && (err.driverError as { code?: string }).code === '23505') {
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
    const ok = await verifyPassword(password, user?.passwordHash ?? (await dummyPasswordHash()));
    if (!user || !ok) throw new UnauthorizedException('Email ou password incorretos.');
    return user;
  }

  async startSession(user: User, res: Response): Promise<UserDto> {
    await this.sessions.delete({ expiresAt: LessThan(new Date()) });
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.ttlMs);
    await this.sessions.insert({ tokenHash: sha256(token), userId: user.id, expiresAt });
    res.cookie(this.cookieName, token, { ...this.cookieOptions(), expires: expiresAt });
    return toDto(user);
  }

  async startTokenSession(user: User): Promise<{ user: UserDto; token: string }> {
    await this.sessions.delete({ expiresAt: LessThan(new Date()) });
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.ttlMs);
    await this.sessions.insert({ tokenHash: sha256(token), userId: user.id, expiresAt });
    return { user: toDto(user), token };
  }

  async endSession(tokenHash: string | undefined, res: Response) {
    if (tokenHash) await this.sessions.delete({ tokenHash });
    res.clearCookie(this.cookieName, this.cookieOptions());
  }

  async validate(token: string): Promise<{ user: UserDto; tokenHash: string } | null> {
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