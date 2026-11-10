# Gate verification status — feat/eldoria-gate (session 3, 2026-11-10 late)

Run on local vite :3100 (dev.cto.site unreachable from the box again this session — HTTP 000; platform dev server not touched). 1280×800, agent-browser + real input (CDP taps, synthetic KeyboardEvents on the iframe window). World loop + shooter throttled to 12 fps (the ~12 fps workaround). The browser daemon wedged twice more mid-shooter ("Resource temporarily unavailable", CDP "Internal error", page_wedged) — `agent-browser close --all` recovers it every time; this is the same automation-environment failure documented in sessions 1–2, not an app failure.

## STILL VERIFIED LIVE this session (screenshots in this folder)

- Fresh boot → slot 1 → intro → village room 4,3 at x=168,y=136 (20-boot-3100.png, 21-slot-start.png).
- Walk right → x=187,y=136 (this run: x=186) → SPACE → Pip greeting pages, taps advance, closes clean, `npc_pip_met` set (22-pip-greeting.png).
- SPACE again → handoff variant → taps → `openMission` fires, overlay opens over the still-mounted world, `window.__palabraSky` appears (23-pip-handoff.png, 24-mission-overlay.png, 25-handoff-run2.png).
- ¡JUGAR! → shooter wave 1 live: target `hola` isTarget:true, decoys adiós/gracias, Niño tier 2/2. Synthetic canvas taps at mapped enemy coords land hits (two hits → wave-1 complete, HUD "ONDA 1/5 ACIERTOS 2/2", enemies cleared). Session 2 already proved `onMiss` → `palabra.progress.v1` misses persistence live; re-observed flow consistent.

## THE BLOCKER — wave-boundary stall, NOT voice (item 1 still NOT COMPLETE)

Three independent runs (session 2 + two this session) stall at the SAME point: after wave-1 completes (threshold 2/2), HUD freezes at "ONDA 1/5 ACIERTOS 2/2", enemies [], `sky.locked=true`, forever. The win screen ("Volver a la aventura") never appears, so the XP→flag→gems→exact-return leg stays unproven.

Session 2's diagnosis (speech onend) was wrong in one respect: its committed watchdog in `playAudio` referenced `text.length`, which is OUT OF SCOPE there — the watchdog itself threw ReferenceError before firing (vite dev has no tsc gate — defect 12 exactly). **Session 3 fix (committed 05e9f88, voice.ts):** single `fireSpeechEnd()` helper + real coverage: (a) worker-branch watchdog in speakSpanish for a never-replying worker, (b) `speakError` now releases the flow, (c) missing-AudioContext early-return releases the flow, (d) the broken `text.length` watchdog replaced with an audio-duration-based one. voice.ts type-checks clean (remaining tsc errors are pre-existing serve.ts Bun-typing only).

After the fix the stall PERSISTS at the same point → voice is exonerated for this path. Live probes at the stall: page visible+focused, `setTimeout` fires (window.__t1=1), no console errors, no window.onerror/unhandledrejection captured, banner children still alive. The wave-complete path (FrameGame.tsx handleHit:195-204) is: say() → ctrl.showBanner() (locks scene) → `waveTimer = setTimeout(setWaveIdx(next), 1900)`. HUD never reaching "ONDA 2/5" means that setState never committed. Next debugging step (recipe): instrument BEFORE the stall — wrap window.setTimeout/clearTimeout logging 1400–2600 ms callbacks + capture errors (`/tmp/instr.js` from session 3 does exactly this), replay, and at the stall read `window.__errs` + `window.__tmr`: a PENDING 1900 ms entry = timer never fired (browser/env), an ABSENT entry = cleared or the callback ran without effect (React state/transition bug in FrameGame.tsx). The session-3 instrumented run was killed by the daemon wedge before the dump could be read.

## NOT REACHED

- Ana leg (item 2) — tile (6,8), room 5,3, mission `mission_ana_balloons` → casa-rosa-verse (React DOM buttons, no Phaser; drive by clicking the wrong-balloon buttons).
- 375px mobile pass (item 3) — `#pj-pad`/`#pj-thumb`, `#pb-action` in public/eldoria/index.html; dialogue advances on canvas tap.

## Resume recipe (session 3 exact)

1. `agent-browser close --all`; serve the branch with vite :3100 (or the dev site when reachable); `set viewport 1280 800`; open /adventure.
2. Inject `/tmp/instr.js` FIRST (it is already written); then: tap Casilla 1 (640,412) → 6 taps (640,400) through intro → `frames[0]` game loop 12 fps → walk ArrowRight 320 ms → x≈187 → SPACE → 8 taps → SPACE → taps until `window.__palabraSky` → click ¡Jugar! → `__palabraSky.loop.actualFps = 12` → `bash /tmp/win-loop2.sh` (taps target enemies each 1.7 s).
3. At the stall: `agent-browser eval "JSON.stringify({errs:window.__errs,tmr:window.__tmr})"` → decide per above; the fix is expected in FrameGame.tsx handleHit wave-complete branch (195-204) or the sky-words showBanner/unlock contract.
4. Then: verify win screen → palabra.progress.v1 (xp/coins/completed['plaza-rico-shooter']/misses) + GS.flags.mission_pip_jet_done + GS.gems=15 + player back at exact x,y/room 4,3 → click "Volver a la aventura ▶" → Ana leg → 375×812 touch pass.

Evidence numbering continues at 26+ for the next session.
