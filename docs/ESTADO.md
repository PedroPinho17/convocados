# Convocados — estado (pós-Claude + Fase 6)

**Atualizado:** 26 Nov 2026  
**Repo:** https://github.com/PedroPinho17/convocados (`main`)

Este documento cobre o que foi fechado depois do Claude ter esgotado o limite, o deploy da Fase 6, e o que ainda falta nessa fase.

---

## 1. O que o Claude tinha começado (e ficou a meio)

O Claude já tinha no working tree (ainda sem commit final estável / incompleto no mobile):

- Homepage marketing multi-desporto (`apps/web/src/app/page.tsx`)
- Grupos como tenants (API `GroupsModule`, entidades `Group` / `GroupMember`, migração `GroupsSportsVenues`)
- Desporto por jogo (`sport` em shared + BD)
- Venue picker na web + `GET /venues`
- Layout web (nav, cards, `BackLink` melhorado)
- Páginas `/groups`, `/g/[code]`, formulário com desporto/grupo/local

**Faltava sobretudo:** fechar o mobile ao schema novo, polish, validar testes, commit/push, e depois a Fase 6.

---

## 2. O que foi terminado depois do Claude

### Produto / código

| Item | O quê |
|---|---|
| Mobile alinhado ao multi-desporto | Selector de desporto no `GameForm`, `sport`/`venueId` no submit |
| Venue picker no mobile | `apps/mobile/src/components/venue-picker.tsx` + `searchVenues` na API client |
| Lista / detalhe mobile | Mostra desporto (e grupo, se existir) |
| Convite web | Badge do desporto |
| Metadata | Descrição multi-desporto no `layout.tsx` |
| Date/time nativo (já em curso) | `@react-native-community/datetimepicker` no formulário mobile |
| Lint CI | Fix `react-hooks/set-state-in-effect` no venue-picker mobile |

### Commits (autor: Pedro Pinho)

| Commit | Mensagem |
|---|---|
| `774e4b9` | `feat: multi-sport groups, venue search, homepage and layout polish` |
| `b0a7d2d` | `fix(mobile): avoid setState in venue picker effect for lint` |

Ambos em `origin/main`. CI a verde após o fix de lint.

### O que passou a existir no produto (resumo)

- Plataforma **multi-desporto** (futebol, futsal, padel, ténis, basquetebol, voleibol, outro)
- **Grupos** (web): criar, convite `/g/:code`, membros, jogos do grupo
- **Campos** pesquisáveis (lista OSM) na criação de jogos (web + mobile)
- Homepage pública
- Layout / botão Voltar mais claros

---

## 3. Fase 6 — o que já está feito

**Objectivo mínimo:** API + Postgres + web na cloud, utilizáveis por link real.

### Produção (Render)

| Serviço | URL / nome |
|---|---|
| Web | https://convocados-web.onrender.com |
| API | https://convocados-api.onrender.com |
| Health | https://convocados-api.onrender.com/health → `{"status":"ok"}` |
| Postgres | `convocados-db` (Frankfurt, Free) |

### Validado manualmente

- Registo / login na web de produção
- Criar jogo
- Fluxo básico a funcionar com o proxy same-site (`PROXY_SECRET` partilhado)

### Build/start no Render (não esquecer)

Não usar `corepack enable` nem `npm i -g pnpm` (EROFS no Free).

**API**

- Build: `npx --yes pnpm@12.18.0 install --frozen-lockfile && npx --yes pnpm@12.18.0 turbo build --filter=api`
- Start: `npx --yes pnpm@12.18.0 --filter api start:prod`

**Web**

- Build: `npx --yes pnpm@12.18.0 install --frozen-lockfile && npx --yes pnpm@12.18.0 turbo build --filter=web`
- Start: `npx --yes pnpm@12.18.0 --filter web start`

### Env essenciais

- **API:** `NODE_ENV`, `DATABASE_URL` (Internal da BD), `DB_SYNCHRONIZE=false`, `TRUST_PROXY=1`, `PROXY_SECRET`, `WEB_ORIGIN` e `APP_URL` = URL da web, `ALLOW_REGISTRATION`
- **Web:** `API_URL` + `NEXT_PUBLIC_API_URL` = URL da API, mesmo `PROXY_SECRET`, `TRUST_PROXY=1`

Segredos só no Render (e nota privada) — nunca no Git.

---

## 4. Fase 6 — o que ainda falta

Isto **não** bloqueia o uso da web em produção; completa a fase “deploy + utilizadores / app”.

| Item | Estado | Notas |
|---|---|---|
| Mobile a falar com a API de produção | Em falta | `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_WEB_ORIGIN` a apontar para os URLs Render |
| EAS Build / `projectId` estável | Em falta | Push Expo fiável fora do Expo Go |
| App nas stores (ou build interno) | Em falta | Opcional; web já serve iPhone |
| Import de venues OSM na BD de produção | Em falta | `pnpm --filter api venues:import` contra a BD Render (ou script one-off) |
| Resend + domínio próprio | Em falta | Reset password em prod (sem key, em dev o link vai ao log) |
| Plano pago / sem sleep | Opcional | Free adormece ~50s+ após inactividade |
| Domínio custom (ex. convocados.app) | Opcional | DNS → Render |
| Grupos completos na app mobile | Em falta / parcial | Fluxo de grupos está sobretudo na web |
| Primeiros utilizadores reais + feedback | Em curso | Partilhar o link da web |

---

## 5. Em casa — arranque local

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

Push a `main` → redeploy no Render (se Auto-Deploy estiver ligado).

---

## 6. Fases 0–5 (contexto rápido)

Todas **fechadas** no código antes desta ronda: monorepo/CI, auth+jogos, convites/espera, realtime+push, pagos/ratings/equipas, IA parse-game.
