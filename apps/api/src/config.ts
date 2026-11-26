import { z } from 'zod';

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    DATABASE_URL: z.url(),
    PORT: z.coerce.number().int().positive().default(3001),
    /** Origens do web autorizadas (CORS), separadas por vírgula. */
    WEB_ORIGIN: z
      .string()
      .default('http://localhost:3000')
      .transform((s) =>
        s
          .split(',')
          .map((o) => o.trim().replace(/\/$/, ''))
          .filter(Boolean),
      ),
    DB_SYNCHRONIZE: z.stringbool().default(false),
    SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
    COOKIE_SECURE: z.stringbool().optional(),
    ALLOW_REGISTRATION: z.stringbool().default(true),
    /** Pedidos por minuto e por IP em todas as rotas (login e convites têm limites próprios, mais baixos). */
    RATE_LIMIT_PER_MIN: z.coerce.number().int().min(1).default(120),
    /** Só para testes: desliga o limite de pedidos. Proibido em produção. */
    RATE_LIMIT_DISABLED: z.stringbool().default(false),
    /** Nº de proxies à frente da API (Render = 1). Sem isto, todos os pedidos parecem vir do mesmo IP. */
    TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
    /** Groq (OpenAI-compatible). Vazio = IA desligada; o parse devolve ok:false. */
    GROQ_API_KEY: z.string().optional().default(''),
    /** Modelo do Groq (tem de suportar respostas em JSON). */
    GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),
    /** Máx. pedidos POST /ai/parse-game por utilizador e por dia (UTC). */
    AI_DAILY_LIMIT: z.coerce.number().int().min(1).max(100).default(10),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && env.DB_SYNCHRONIZE) {
      ctx.addIssue({
        code: 'custom',
        message: 'DB_SYNCHRONIZE=true não é permitido em produção',
        path: ['DB_SYNCHRONIZE'],
      });
    }
    if (env.NODE_ENV === 'production' && env.RATE_LIMIT_DISABLED) {
      ctx.addIssue({
        code: 'custom',
        message: 'RATE_LIMIT_DISABLED=true não é permitido em produção',
        path: ['RATE_LIMIT_DISABLED'],
      });
    }
  })
  .transform((env) => ({
    ...env,
    COOKIE_SECURE: env.COOKIE_SECURE ?? env.NODE_ENV === 'production',
  }));

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(
      `Configuração inválida no .env:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}
