# Palabra — a free immersive Spanish acquisition game

Palabra is a free, family-friendly Spanish-learning GAME: a virtual village a child can
explore — villagers to meet, spoken mini-game frames to play, scripture woven through the
story — where Spanish is understood through context (Comprehensible Input + Immersion + TPR
+ AI conversations), with English fading as the learner grows. Founded on conservative
Christian values. No ads, no subscriptions, no pay-to-win, ever.

## Status

Early milestone: playable village with two mini-games, natural Spanish neural voice,
progression and PWA install. The full design (Pilgrim's Progress journey, Armor-of-God
avatar progression, 70 mini-game template mandate) is tracked in the team workspace.

## Run it

```bash
bun install
bun run dev      # http://localhost:3000
bun run build    # production build (must stay green)
```

## Architecture

- **TanStack Start + React 19 + Tailwind 4 + Bun** — one server, no backend dependencies.
- **Frame engine** — villager-opens-frame loop: each mini-game is a parameterized template
  (`mechanic, contentBinding, speed, difficulty, masteryThreshold`); content JSON feeds any
  template, so the same game serves beginners and advanced learners.
- **Voice** — kokoro-js (Apache-2.0) neural Spanish voice, lazy-loaded in a Web Worker with
  a one-time cached download, browser speechSynthesis as instant fallback.
- **Progress** — XP, coins, hearts, streak, immersion level (englishLevel 0–3), missed-word
  adaptive replay; persisted behind `src/lib/storage.ts` (swappable for a database later).
- **PWA** — installable to home screen, offline shell.

## Content & attribution

- Spanish scripture: **Reina-Valera 1909** (public domain).
- English scripture: **NKJV** — "Scripture taken from the New King James Version®.
  Copyright © 1982 by Thomas Nelson. Used by permission. All rights reserved."
- Open-source code used under its own licence; see in-file headers.
