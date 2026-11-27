# Convocados — app mobile (Expo)

The iOS and Android app of Convocados, built with Expo Router. It talks to the same NestJS API as the web app.

## Run it

From the repository root:

```bash
pnpm install
pnpm db:up                     # Postgres in Docker (port 5435)
pnpm --filter api start:dev    # API on http://localhost:3001
pnpm mobile                    # builds packages/* and starts Expo
```

`pnpm --filter mobile start:tunnel` starts Expo through a tunnel when the phone is not on the same Wi-Fi.

## Configuration

Copy `.env.example` to `.env` and set:

- `EXPO_PUBLIC_API_URL`: the API as seen from the phone (your PC's Wi-Fi IP in development, the Render URL in production).
- `EXPO_PUBLIC_WEB_ORIGIN`: the web app, used for the invite links and the privacy policy.

## Checks

```bash
pnpm --filter mobile lint
pnpm --filter mobile typecheck
pnpm --filter mobile test
```

Add native packages with `npx expo install <package>` so they match the Expo SDK.
