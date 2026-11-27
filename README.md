# Convocados

**English** · [Português](README.pt.md)

Organise weekly pickup games with your group: football, futsal, padel, tennis, basketball and volleyball.
Create a game, share one link, and everyone confirms. Convocados handles the slots, the waiting list, balanced
teams and who has paid.

[![CI](https://github.com/PedroPinho17/convocados/actions/workflows/ci.yml/badge.svg)](https://github.com/PedroPinho17/convocados/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-monorepo-3178C6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-API-E0234E?logo=nestjs&logoColor=white)
![Expo](https://img.shields.io/badge/Expo-React%20Native-000020?logo=expo&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-real%20time-010101?logo=socketdotio&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-browser%20tests-2EAD33?logo=playwright&logoColor=white)

<p align="center">
  <img src="docs/media/demo.gif" alt="Demo of a padel game: on the right, a player opens the invite on a phone and takes the last of 4 slots; on the left, the organiser's list updates by itself to 4/4, the organiser makes two teams of two and marks the player as paid, and the phone shows 'paid' straight away" width="900">
</p>
<p align="center"><sub>A padel game: organiser on a computer (left) and a player on a phone (right), updating in real time ·
<a href="docs/media/demo.mp4">full-quality video (.mp4)</a> · all names are fictional; the interface is in Portuguese</sub></p>

## Try it

**[convocados-web.onrender.com](https://convocados-web.onrender.com)**

**[Download for Android](https://github.com/PedroPinho17/convocados/releases/latest/download/convocados.apk)** (Android 8+; iPhone users use the web app)

1. Create an account and a game.
2. Open the game's invite link in another browser (or on your phone) and confirm with a second account.
3. Watch both screens: the list, the teams and the payments update without refreshing.

API: [convocados-api.onrender.com/health](https://convocados-api.onrender.com/health).
Both run on Render's free plan, so the first request after a quiet period can take about a minute while the
servers wake up.

## Screenshots

| Light | Dark |
|---|---|
| ![My games: football, tennis, padel, basketball and volleyball, with the groups shortcut and the new game form](docs/media/games-desktop.png) | ![My games in dark mode](docs/media/games-desktop-dark.png) |
| ![A game with confirmed players, payments, invite QR code and teams](docs/media/game-desktop.png) | ![The same game in dark mode](docs/media/game-desktop-dark.png) |
| <img src="docs/media/games-mobile.png" alt="My games on a phone" width="300"> | <img src="docs/media/games-mobile-dark.png" alt="My games on a phone, dark mode" width="300"> |
| <img src="docs/media/game-mobile.png" alt="The game on a phone" width="300"> | <img src="docs/media/game-mobile-dark.png" alt="The game on a phone, dark mode" width="300"> |

![Homepage](docs/media/home.png)

## What it does

- **Invite by link or QR code.** The link opens the web app, so people without the app can still join.
- **Confirm and leave, with an automatic waiting list.** When someone leaves, the first person waiting moves up
  and gets a notification.
- **Live updates.** Every open screen shows the same list as soon as someone confirms or leaves.
- **Balanced teams in one click.** Players rate each other from 1 to 5 in private; teams always have the same
  size (at most one player apart) and the closest possible strength.
- **Payments.** The pitch cost is split between the confirmed players; the organiser marks who paid and sees
  what is missing.
- **Groups.** A group is the same people every week. Games in a group show up for every member, and a new game
  notifies them all.
- **Reminders and notifications** on Android (push for events, local notifications for reminders before the game).
- **Venue search** from OpenStreetMap data, or type the place by hand.
- **Paste the WhatsApp message** ("Thursday 9pm at the sports hall, 10 of us, 30€") and the form fills itself.
  If the AI is unavailable, the normal form is always there.
- **Account basics:** password reset by email, delete account, privacy page.
- **Player profile.** Preferred position and foot, city, bio, and stats from games already played
  (games played/organised, average rating after kick-off, last five games). Edit yours at `/profile`;
  open someone else’s from a game’s player list at `/players/[id]` (public-safe: no email).

### Profile

Each player has an optional profile on top of the existing account name: preferred pitch position
(GK / DEF / MID / FWD / ANY), preferred foot, city and a short bio. Stats are computed from
participations and ratings that already exist — no duplicated data. The public profile never
exposes email or other private fields.

Android app via Expo; iPhone users use the web app (no App Store fee).

## Technical highlights

- **No overbooking under concurrency.** Confirming locks the game row (`SELECT … FOR UPDATE`) inside a
  transaction, counts the confirmed players and decides between "confirmed" and "waiting". An end-to-end test
  fires 20 confirmations in parallel against a real Postgres and checks that the slots are never exceeded.
- **Waiting list order is preserved** after people leave (position is `MAX(position) + 1`, not a count), with
  a regression test.
- **Same-site cookies across two domains.** The web and the API run on different Render domains, so the web
  talks to the API through its own `/api/*` proxy and the session cookie stays first-party. The real-time socket
  connects directly with a short-lived signed token.
- **Rate limits per person behind the proxy.** Login and registration allow 10 attempts per minute per IP; the
  proxy forwards the client IP with a shared secret, so a spoofed header cannot bypass the limit.
- **Reminders as local notifications.** The free API host sleeps, so a server cron could miss the time;
  reminders are scheduled on the phone and rescheduled when the app opens. Server push is only for events.
- **AI that cannot break the app.** The pasted message goes to Groq with a Zod schema; each field is validated
  on its own, with a daily quota of 10 requests per user, a 15-second timeout and a manual form as fallback.
- **Tested in CI on every push:** lint, typecheck, unit and component tests (shared, API, web, mobile),
  API end-to-end tests against Postgres, a migrations-vs-entities check, and browser tests with Playwright
  running the web and the API on different sites, like production.

## Stack

| Part | Technology |
|---|---|
| Mobile | Expo, React Native, Expo Router, Expo Notifications |
| Web | Next.js 16, React 19, Tailwind CSS 4 |
| API and real time | NestJS, Socket.IO, TypeORM |
| Database | PostgreSQL |
| Shared | TypeScript types and Zod schemas (`packages/shared`), entities (`packages/db`) |
| AI | Groq (`llama-3.3-70b-versatile`) |
| Email | Resend |
| Monorepo and CI | pnpm, Turborepo, GitHub Actions |
| Tests | Vitest, Jest (mobile), Supertest, Playwright |
| Hosting | Render (web, API and Postgres) |

```
convocados/
├── apps/
│   ├── api/        NestJS API: REST, Socket.IO, AI, push
│   ├── web/        Next.js web app (invites, iPhone users)
│   └── mobile/     Expo app (Android and iOS)
├── packages/
│   ├── shared/     types, Zod schemas and shared logic (prices, sports)
│   └── db/         TypeORM entities
└── docker-compose.yml   local PostgreSQL
```

The web and the mobile app never talk to the database or the AI directly: everything goes through the API,
and the keys stay on the server.

## Run it locally

Requirements: Node.js 22+, pnpm 12, Docker.

```bash
pnpm install
cp .env.example .env                       # API settings (database, ports)
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env   # use your computer's local IP, not localhost
pnpm db:up                                 # PostgreSQL on port 5435
pnpm dev                                   # API on :3001 and web on :3000 (migrations run on start)
```

Mobile (Expo Go or a development build), in another terminal:

```bash
pnpm mobile
```

Optional: `GROQ_API_KEY` in `.env` enables the "paste a message" feature, `RESEND_API_KEY` sends password
reset emails (without it, the link is printed in the API log), and
`pnpm --filter api venues:import` loads venues from OpenStreetMap for an area.

## Tests

```bash
pnpm lint && pnpm typecheck
pnpm test             # unit and component tests
pnpm test:e2e         # API end-to-end tests (needs pnpm db:up)
pnpm test:browser     # Playwright: web + API + Postgres
```

## Status

The web app and the API are online and in use. Next: the Android APK on GitHub Releases and a few weeks of
use with a real group.

Venue data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright).
