import { z } from 'zod';

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.url(),
    PORT: z.coerce.number().int().positive().default(3001),
    WEB_ORIGIN: z.string().default('http://localhost:3000'),
    DB_SYNCHRONIZE: z.stringbool().default(false),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && env.DB_SYNCHRONIZE) {
      ctx.addIssue({
        code: 'custom',
        message: 'DB_SYNCHRONIZE=true não é permitido em produção',
        path: ['DB_SYNCHRONIZE'],
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Configuração inválida no .env:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}