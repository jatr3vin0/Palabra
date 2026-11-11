# Auditions — The Pilgrim's Progress cast (Phase 3)

**Listen first to the three reels.** They play the same script, same order, so characters A/B back to back:

- `AB-reel_conversational.ogg` — 7 characters × greeting line
- `AB-reel_emotional.ogg` — 7 characters × relief/gratitude line
- `AB-reel_dramatic.ogg` — 7 characters × warning line

Then go character by character below. Everything is mono ogg/vorbis, 24 kHz, ~32 kbps, no clipping (peaks −1 to −7 dBFS), loudness within ~2 dB across the cast so the comparison is fair.

## Index — character × delivery

| # | character | conversational | emotional | dramatic |
|---|---|---|---|---|
| 01 | Evangelist | `01_evangelist_conversational.ogg` (5.3 s) | `01_evangelist_emotional.ogg` (5.6 s) | `01_evangelist_dramatic.ogg` (5.3 s) |
| 02 | Christian | `02_christian_conversational.ogg` (5.1 s) | `02_christian_emotional.ogg` (5.5 s) | `02_christian_dramatic.ogg` (5.1 s) |
| 03 | Christiana | `03_christiana_conversational.ogg` (4.8 s) | `03_christiana_emotional.ogg` (5.4 s) | `03_christiana_dramatic.ogg` (4.7 s) |
| 04 | Apollyon | `04_apollyon_conversational.ogg` (5.5 s) | `04_apollyon_emotional.ogg` (5.9 s) | `04_apollyon_dramatic.ogg` (5.6 s) |
| 05 | Giant Despair | `05_giant_despair_conversational.ogg` (7.0 s) | `05_giant_despair_emotional.ogg` (7.6 s) | `05_giant_despair_dramatic.ogg` (6.6 s) |
| 06 | Narrator | `06_narrator_conversational.ogg` (5.0 s) | `06_narrator_emotional.ogg` (5.4 s) | `06_narrator_dramatic.ogg` (5.4 s) |
| 07 | Mercy | `07_mercy_conversational.ogg` (4.8 s) | `07_mercy_emotional.ogg` (4.9 s) | `07_mercy_dramatic.ogg` (4.7 s) |

21 clips, 111.6 s total, 2.0 MB for the whole `VOICE-casting/` folder.

## The audition script (identical for every character — Bunyan-narrative, no Scripture)

1. **conversational** — "Buenos días, peregrino. Yo también voy por el camino. ¿Quieres caminar conmigo un trecho?"
2. **emotional** — "Cuando dejé caer mi carga, sentí una alegría que no sabía explicar. ¡Gracias por esperarme!"
3. **dramatic** — "¡Detente! No cruces ese río. La feria de la vanidad no perdona a quien entra sin mirar."

Scripture is deliberately absent: verse text stays RV1909 verbatim on the dynamic kokoro path and is never auditioned or cloned.

## What produced these clips (read this before judging the timbre)

Chatterbox could not run here (see `../PHASE0-chatterbox-feasibility.md`: 3.2 GB of weights vs 2.3 GB free disk, ~0.4 GB RAM). These auditions were generated with the team's existing fallback engine, **kokoro-82M int8** (Apache-2.0), which is what the game will use for dynamic dialogue anyway. It has **three** Spanish voices (`ef_dora`, `em_alex`, `em_santa`), so the seven characters are built from those three plus per-character rate and pitch mapping:

| character | base voice | rate | pitch |
|---|---|---|---|
| Evangelist | `em_alex` | 0.92 | −6 % |
| Christian | `em_santa` | 1.00 | 0 |
| Christiana | `ef_dora` | 1.02 | +6 % |
| Apollyon | `em_santa` | 0.86 | −22 % |
| Giant Despair | `em_santa` | 0.76 | −30 % |
| Narrator | `em_alex` | 1.00 | −3 % |
| Mercy | `ef_dora` | 1.08 | +12 % |

**Be honest with yourself about this:** these clips show *casting intent, timing, register and the Spanish itself*. They do **not** demonstrate Chatterbox timbre or its cloning fidelity — Christian and Apollyon share a base voice here and would not in production. The permanent casting asset is the profile + reference clip in `../registry.md`; the Chatterbox pass re-records these same lines on the off-box batch host.

## Evaluation notes

Method: I have no ear on this machine. Every note below is either an **objective check** (duration, level, clipping, script-to-duration sanity, cross-character consistency) or a **"what to listen for"** cue for the owner. No listening impressions are invented.

**Pronunciation (all clips).** One shared script, one engine, so pronunciation differences are not the variable — rate and pitch are. Objective sanity check passed on all 21: none is grossly short for its text, which is how a mispronounced or swallowed phrase would show up. Two clips **were** truncated on first pass (`05_giant_despair_emotional` at 4.5 s and `07_mercy_dramatic` at 4.1 s) — kokoro hit an early end-of-speech; both were regenerated and are now 7.6 s and 4.7 s. **Anyone generating more lines with this engine must duration-check every clip against its script before shipping.** For the owner: listen for the "rr"/"j" and for final "s" (rioplatense/coastal readers sometimes aspirate it) — those are where a Spanish voice either sounds native or doesn't.

**Realism.** Kokoro is clean but flat: expect good vowels, slightly even prosody, little breath or laughter. It is a fair test of *whether a character reads* and a poor test of *whether a character moves you*. Judge realism on the reference clips in `refs/`, not on these.

**Character distinction.** Objective: within the cast the pitch/rate mapping spans ~40 % pitch and 0.76–1.08× rate, and the three base voices are used unevenly — Christian, Apollyon and Giant Despair are the same base voice at three pitches. If the owner cannot tell Apollyon from Giant Despair on the reel, that is a **casting** finding, not a bug: it means those two need dedicated deep references before the library pass (already flagged in the registry).

**Consistency.** Levels −22.5 to −24.1 dBFS RMS across all 21 clips (spread ≈ 1.6 dB), peaks −1.1 to −7.2 dBFS, no clipping anywhere. Rate is stable per character across all three deliveries, which is what keeps a character recognisable between a whisper line and a battle line.

**Emotion.** Honest limitation: kokoro has no emotion control. What changes between the three deliveries is the *text* (punctuation, exclamation) and the per-character rate — not a performance. Treat the emotional and dramatic clips as **script tests** ("does this line work for this character?"), not as emotional-range proof. That judgement needs the Chatterbox pass.

**Per character, what to listen for:**
- **01 Evangelist** — warmth without softness; the dramatic line must sound like a warning given in love.
- **02 Christian** — the clearest diction of the cast; he carries the most learner-facing dialogue, so intelligibility outranks personality.
- **03 Christiana** — steady, not sweet; check she does not drift into "storybook mother".
- **04 Apollyon** — check whether the −22 % pitch still sounds like a being rather than a processed voice; he argues, he does not shriek.
- **05 Giant Despair** — slowest and heaviest; check intelligibility on a phone speaker (this is where low pitch turns to mud).
- **06 Narrator** — should feel like a storyteller, not an announcer; the −3 % offset is deliberately subtle.
- **07 Mercy** — brightest of the cast; check it stays out of cartoon territory.

## Verdict needed from the owner

Per character: **keep / reject / redirect** (and for the two deep voices, whether to source dedicated references). Nothing goes to the full dialogue library until that call is made — that is the brief's hard gate, and the owner's play-test is the merge gate everywhere else in this project.
