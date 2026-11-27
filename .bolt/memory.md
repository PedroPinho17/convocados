# Project memory

## Product intent & audience

- Gaming-focused web app with Portuguese UI (Início, Jogos, Detalhe do jogo, Perfil).
- Includes a `/design-preview` route serving as a design-system reference page (style guide with color hexes, fonts, component specs).

## Brand personality & voice

- Portuguese-language interface throughout.

## Visual design & UX direction

- `/design-preview` is self-contained: hardcoded mock data, own prefixed stylesheet, no API calls — loads independently of backend.
- Navigation via pill bar under header with sections: Início, Jogos, Detalhe do jogo, Perfil, Guia de estilo.
- Style guide section enumerates every color hex, font, and component spec for later manual application.

## Decisions, constraints & rationale

- Monorepo via pnpm workspaces: `web` app + `packages/shared`; build `packages/shared` first if needed.
- Dev server command: `pnpm --filter web dev`, bind to `0.0.0.0`, use preview-expected port.
- Next.js App Router; production build, type-check, and lint all pass.
- Sandbox cannot launch long-running dev servers directly; the preview window manages the dev server process.
- Home page depends on an API that may be unavailable during dev — acceptable; only `/design-preview` needs to load.

## Open questions & assumptions

- Exact preview port is assumed to be managed by the preview window, not hardcoded.
- API base URL / availability for full app functionality outside `/design-preview` is unspecified.