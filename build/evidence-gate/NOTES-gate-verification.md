# Gate verification status — feat/eldoria-gate (continuation session)

Run on the dev site (https://3704f599821a6c1a9ea31cf73d7b28a2-dev.cto.site/adventure), 1280×800, agent-browser + real input (synthetic KeyboardEvents on the iframe window for keys, CDP mouse taps for taps). Pre-mission state recorded live from the world: player x=187, y=136, room "4,3", gems 0, localStorage `palabra.progress.v1` = null (fresh).

## PASS (verified live, screenshots in this folder)

- **Boot + world** — Palabra-branded title (00-boot.png), Spanish intro (01-start.png), village room 4,3 boots (02-after-intro.png). Slot 1 start via tap.
- **Pip greeting** — walked the hero right (168→187 px, real arrow-key input), talked to Pip: Spanish greeting pages with gloss, taps advance dialogue, dialogue closed cleanly, `npc_pip_met` flow observed (03-pip-dialogue.png).
- **Pip handoff → openMission** — second talk shows the handoff variant "¡Mi amigo es Capitán Rico!…" (04-pip-handoff.png); on dialogue end the bridge fired `openMission` and the app opened the mission overlay over the still-mounted world: Capitán Rico greet, Niño tier preselected from `mission.difficulty=child` (05-mission-open.png; a11y snapshot listed the overlay over the iframe).
- **Mission session playable** — ¡JUGAR! starts the Phaser shooter inside the overlay: Onda 1/5, Aciertos 0/2, round "Rico saluda: hola"; live scene inspected — target enemy `hola` has `isTarget: true`, decoys `adiós`/`gracias`, canvas→screen coordinate mapping computed and confirmed (06-shooter-play.png).

## NOT YET VERIFIED (stopped by automation environment, not by app code)

- **Win → record → exact return (item 1)** — the win loop was interrupted mid-wave-1 each attempt by the browser daemon wedging (headless SwiftShader WebGL under two Phaser canvases; `eval`/`navigate` start failing with "Resource temporarily unavailable" ~1 min into the shooter; `agent-browser close --all` recovers it every time). No app defect observed up to that point; the code path (FrameGame.handleWin → completeLesson/storage.ts `palabra.progress.v1` → onWin → `palabra:missionResult` → flag `mission_pip_jet_done` + 15 gems + unfreeze + refocus) was code-reviewed and wired, but the win has not been clicked through. **No fix made — nothing found broken to fix.**
- **Ana leg (item 2)** — not started. Ana at tile (6,8) same room; greeting → handoff → `casa-rosa-verse` (React scripture frame, no Phaser — should be lighter on the daemon).
- **375px mobile pass (item 3)** — not started. Touch overlay ids for the run: `#pj-pad`/`#pj-thumb` (joystick), `#pb-action` (ACCIÓN), `#pb-item`, `#pb-cycle`; dialogue advances on any canvas tap (UIScene pointerdown); touch controls show on narrow/coarse pointers via CSS in `public/eldoria/index.html`.

## Resume recipe (exact, from this session)

1. `agent-browser set viewport 1280 800 && agent-browser open https://3704f599821a6c1a9ea31cf73d7b28a2-dev.cto.site/adventure`
2. Tap Casilla 1 (~640,412), tap through intro (~5 taps at 640,400). Throttle early to keep the daemon alive: `frames[0].game.loop.actualFps = 12`, and after ¡JUGAR! also `__palabraSky.loop.actualFps = 12`.
3. Walk right: dispatch keydown/keyup ArrowRight (keyCode 39) ~300 ms → player lands x≈187, y=136. SPACE (keyCode 32) to talk; tap (640,400) advances pages.
4. Pip: talk #1 = greeting (sets npc_pip_met), talk #2 = handoff → overlay opens automatically.
5. Win loop (wave count 5, Niño threshold 2): read `window.__palabraSky.scene.getScene('sky')`, find `enemies.find(e => !e.dead && e.isTarget)`, map to screen: `canvas.getBoundingClientRect()`; `s = min(w/720, h/960)`; `sx = r.left + (r.w−720·s)/2 + e.x·s` (same for y with 960); mouse-down+up there; wait ~1.9 s; repeat until body text shows "Volver a la aventura". Then check `localStorage['palabra.progress.v1']` (xp/coins/completed['plaza-rico-shooter']/misses), `GS.flags.mission_pip_jet_done`, `GS.gems` = 15, player back at x=187, y=136 in room "4,3"; screenshot; click "Volver a la aventura ▶".
6. Ana leg at tile (6,8), then 375×812 viewport for the touch pass.

## Continuation session 2 (local vite :3100 — dev sandbox down, see below)

- Dev preview sandbox was unreachable (503, nothing on :3000) → served the same working tree with a temporary local `vite dev --port 3100`; platform servers untouched.
- Re-verified live on :3100: boot → slot 1 → intro → village 4,3 → walk to x=186,y=136 → Pip greeting (npc_pip_met) → handoff ("¡Mi amigo es Capitán Rico!") → openMission overlay → ¡JUGAR! → shooter round 1. Evidence: 10–14-*.png.
- **Win loop (item 1) — PARTIAL, blocked by a real voice bug.** Round 1 completed (HUD "ONDA 1/5 ACIERTOS 2/2"), `onMiss` flows into `palabra.progress.v1` (misses.hola.n=15, game=plaza-rico-shooter) — bridge→store proven live. But the round→round transition stalls: React speaks round.say and waits for onEnd before `ctrl.playRound(next)`. Root cause found: `speakFallback` (`src/lib/voice.ts`) relies on `utter.onend`, which headless Chrome never fires; the kokoro-worker path has the same hole (no reply → nothing fires). This is also the real cause of the "daemon wedge" blamed on WebGL in session 1: the page stops progressing and the automation dies around it. **Fix applied (committed): watchdogs in voice.ts fire the onEnd callback after 4–6 s if onend/onerror/worker never respond — speech is a bonus, never a blocker.** After the fix the session still stalled once (page was reloaded before… needs one more clean pass), but round-1 completion + misses persistence were captured live (15-win-blocked-state.png). Resume: reload → replay recipe above → win loop2 (/tmp/win-loop2.sh, synthetic canvas taps at exact enemy coords) → expect Volver a la aventura → verify XP/coins/completed[plaza-rico-shooter]/flag mission_pip_jet_done/gems 15/return to exact x,y.
- Item 2 (Ana leg) and item 3 (375px touch pass) not reached in this session — same recipe applies; Ana at tile (6,8) same room.
