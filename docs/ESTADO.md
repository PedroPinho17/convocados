# Convocados — estado atual

**Atualizado:** 27 Nov 2026  
**Repo:** https://github.com/PedroPinho17/convocados (`main`)

Resumo do que está feito, do que está em produção e do que falta. As fases 0–5 (monorepo/CI, auth + jogos, convites/espera, tempo real + push, pagamentos/avaliações/equipas, IA) estão fechadas; a Fase 6 (deploy) está quase fechada; a próxima é a app instalável (EAS/APK).

---

## 1. Em produção (Render, Frankfurt, plano gratuito)

| Serviço | Onde |
|---|---|
| Web | https://convocados-web.onrender.com |
| API | https://convocados-api.onrender.com |
| Health (com base de dados) | https://convocados-api.onrender.com/health → `{"status":"ok"}` |
| Health (só a API, para o ping) | https://convocados-api.onrender.com/health/live |
| Postgres | `convocados-db` (Render Postgres, Frankfurt, Free) |

- A configuração dos dois serviços está descrita em [`render.yaml`](../render.yaml) (Blueprint), sem valores secretos.
- **Manter acordado:** `.github/workflows/keep-alive.yml` faz ping à API (`/health/live`) e à web a cada 10 min, das 17:00 às 22:50 UTC (~360 h/mês, dentro das 750 h grátis da conta).
- **Arranque a frio:** fora dessas horas o Render adormece os serviços (~50 s a acordar). A web e o mobile esperam até 90 s e mostram "A acordar o servidor… pode demorar até 1 minuto" quando um pedido passa dos 3 s.

### Build/start no Render (não esquecer)

Não usar `corepack enable` nem `npm i -g pnpm` (EROFS no Free).

**API**

- Build: `npx --yes pnpm@12.18.0 install --frozen-lockfile && npx --yes pnpm@12.18.0 turbo build --filter=api`
- Start: `npx --yes pnpm@12.18.0 --filter api start:prod`

**Web**

- Build: `npx --yes pnpm@12.18.0 install --frozen-lockfile && npx --yes pnpm@12.18.0 turbo build --filter=web`
- Start: `npx --yes pnpm@12.18.0 --filter web start`

### Variáveis de ambiente

- **API:** `NODE_ENV=production`, `DATABASE_URL` (Internal Database URL), `DB_SYNCHRONIZE=false`, `TRUST_PROXY=1`, `PROXY_SECRET`, `WEB_ORIGIN` e `APP_URL` (= URL da web), `ALLOW_REGISTRATION`. Opcionais: `SOCKET_TOKEN_SECRET`, `RESEND_API_KEY` + `EMAIL_FROM` (recuperar password), `GROQ_API_KEY` (IA).
- **Web:** `API_URL` e `NEXT_PUBLIC_API_URL` (= URL da API), o mesmo `PROXY_SECRET`, `TRUST_PROXY=1`. Opcional: `NEXT_PUBLIC_CONTACT_EMAIL`.
- `RATE_LIMIT_DISABLED` é só para testes: com `NODE_ENV=production` a API não arranca se estiver a `true`.

Segredos só no Render (e numa nota privada), nunca no Git. Ver `.env.example` (raiz e `apps/web`).

---

## 2. O que está feito

### Produto

- **Multi-desporto:** futebol, futsal, padel, ténis, basquetebol, voleibol e outro.
- **Jogos:** criar (à mão ou a partir de uma mensagem colada, com IA), convite por link e QR, confirmar, lista de espera com ordem de chegada, cancelar com aviso por push, lembretes.
- **Pagamentos, avaliações e equipas:** o organizador marca quem pagou; os confirmados avaliam-se (1–5, privado) só depois de o jogo começar; equipas equilibradas pelas avaliações.
- **Grupos — web e mobile:** criar, convite `/g/:code` (no mobile também colando o link), membros (o admin remove), jogos do grupo, sair do grupo.
- **Campos (venues):**
  - importação do OpenStreetMap de **todo o Portugal** (continente, Madeira, Açores): `pnpm --filter api venues:import --portugal`, retoma onde parou se o Overpass falhar, e `--save` guarda o resultado num ficheiro para correr em produção sem depender do Overpass;
  - `POST /venues`: guardar um campo escrito à mão (sem coordenadas); o mesmo nome e localidade devolve o existente;
  - pesquisa de campos na web e no mobile, com botão para guardar o que foi escrito quando não há resultados.
- **Mobile:** grupos, cartões de jogo, QR do convite no ecrã do organizador, aviso de servidor a acordar.
- **Web:** homepage, favicon e ícones, layout sem scroll horizontal no telemóvel.

### Segurança (revisão de 27 Nov 2026)

- **Acesso aos jogos:** detalhe, `GET /games/:id`, confirmar, desistir e a sala do Socket.IO só para o organizador, confirmados, lista de espera, membros do grupo do jogo ou quem traz o código do convite (`?invite=<código>`). Os outros recebem 404, como se o jogo não existisse.
- **Convite público** (`GET /invites/:code`): só o resumo do jogo, sem pagamentos, ids de utilizadores nem o código.
- **Quota de IA:** depois de 10 pedidos por dia o contador deixa de subir e o pedido é recusado (429).
- **Cabeçalhos HTTP:** helmet na API (CSP fechada para JSON, nosniff, HSTS), sem `X-Powered-By`.
- Cookie de sessão httpOnly + SameSite=Lax via proxy same-site, `PROXY_SECRET` obrigatório em produção, limite de pedidos por IP.

### Qualidade

CI a verde em cada push: lint, typecheck, testes unitários (shared, API, web, mobile), e2e da API com Postgres real e testes no browser (Playwright).

---

## 3. O que falta

| Item | Estado | Notas |
|---|---|---|
| App instalável (EAS Build / APK, `eas.json`, package Android, `projectId`) | **Próximo passo** | Inclui o `slug`/`scheme`/package em `app.json` (o nome visível já é "Convocados"). Push fiável fora do Expo Go. |
| Mobile a apontar para produção | Por confirmar | `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_WEB_ORIGIN` com os URLs do Render no build. |
| Importar os campos na BD de produção | Em falta | `venues:import --portugal` contra a BD do Render (é upsert, pode repetir-se). |
| Recuperar password em produção | Por confirmar | `RESEND_API_KEY` e `EMAIL_FROM` no Render; testar o email de reset. Domínio próprio no Resend para enviar a qualquer pessoa. |
| Validade do Postgres gratuito do Render | Por confirmar | Confirmar no dashboard se a BD gratuita tem data de expiração e planear o upgrade ou um backup antes dela. |
| Cabeçalhos de segurança na web | Opcional | O proxy não reencaminha os do helmet; seriam configurados no `next.config`. |
| Editar/cancelar jogo alheio dá 403 | Opcional | Revela que o jogo existe; poderia passar a 404 como o resto. |
| Domínio próprio | Opcional | DNS → Render. |
| Plano pago (sem adormecer) | Opcional | Hoje: keep-alive nas horas de jogo + aviso de "a acordar". |
| Primeiros utilizadores reais + feedback | Em curso | Partilhar o link da web. |

---

## 4. Arranque local

```powershell
cd "C:\Users\Pedro Pinho\Documents\My Projects\convocados"
pnpm db:up
pnpm --filter api start:dev
pnpm --filter web dev
pnpm --filter mobile start:tunnel
```

- Postgres Docker: porta **5435**
- API: http://localhost:3001
- Web: http://localhost:3000

Verificações antes de um commit: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` (com Docker) e `pnpm test:browser`.

Push a `main` → redeploy no Render (Auto-Deploy).
