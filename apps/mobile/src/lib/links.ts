/** Endereço da web (convites, política de privacidade). Em produção: o domínio da web. */
export const WEB_ORIGIN = (process.env.EXPO_PUBLIC_WEB_ORIGIN ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

export const PRIVACY_URL = `${WEB_ORIGIN}/privacidade`;
