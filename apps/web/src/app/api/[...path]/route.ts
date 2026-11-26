import type { NextRequest } from "next/server";

/**
 * Proxy da web para a API: o browser só fala com a web (/api/...), por isso o cookie da
 * sessão fica no site da web. Sem isto, no Render a web e a API ficam em dois domínios
 * de *.onrender.com, que o browser trata como sites diferentes: o cookie da API seria
 * de terceiros e não era enviado (e o Safari bloqueia-o de qualquer forma).
 *
 * Variáveis (do servidor, lidas em runtime):
 * - API_URL: onde está a API (ex.: https://convocados-api.onrender.com)
 * - PROXY_SECRET: o mesmo da API; com ele, a API confia no IP do cliente que mandamos
 *   e o limite de tentativas de login continua por pessoa
 * - TRUST_PROXY: nº de proxies à frente da web (Render = 1), para saber o IP do cliente
 */
const API_URL = (
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001"
).replace(/\/$/, "");
const PROXY_SECRET = process.env.PROXY_SECRET;
const TRUSTED_HOPS = Number(process.env.TRUST_PROXY ?? 0);

/** Cabeçalhos do browser que a API precisa; os outros (host, origin…) ficam por aqui. */
const REQUEST_HEADERS = ["content-type", "cookie", "accept", "accept-language", "user-agent"];
const RESPONSE_HEADERS = ["content-type", "cache-control", "retry-after"];

/** O IP do cliente: o X-Forwarded-For é acrescentado da direita por cada proxy de confiança. */
function clientIp(req: NextRequest): string | undefined {
  const xff = req.headers.get("x-forwarded-for");
  if (!xff || TRUSTED_HOPS <= 0) return undefined;
  const hops = xff
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return hops[hops.length - TRUSTED_HOPS];
}

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const target = `${API_URL}/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;

  const headers = new Headers();
  for (const name of REQUEST_HEADERS) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (PROXY_SECRET) {
    headers.set("x-proxy-secret", PROXY_SECRET);
    const ip = clientIp(req);
    if (ip) headers.set("x-client-ip", ip);
  }

  let res: Response;
  try {
    res = await fetch(target, {
      method: req.method,
      headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer(),
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(90_000), // no Render gratuito, a API pode estar a acordar
    });
  } catch {
    return Response.json(
      { message: "A API não respondeu. Tenta daqui a um minuto (pode estar a acordar)." },
      { status: 502 },
    );
  }

  const out = new Headers();
  for (const name of RESPONSE_HEADERS) {
    const value = res.headers.get(name);
    if (value) out.set(name, value);
  }
  // O cookie da sessão: sem Domain, fica no site da web.
  for (const cookie of res.headers.getSetCookie()) out.append("set-cookie", cookie);

  const empty = res.status === 204 || res.status === 304;
  return new Response(empty ? null : res.body, { status: res.status, headers: out });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
