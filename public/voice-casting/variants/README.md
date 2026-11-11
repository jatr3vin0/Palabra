# Variant grid — the three rejected characters (Giant Despair, Narrator, Mercy)

**Listen to `variants-reel.ogg` first (2:33).** It plays every variant, each one introduced by a spoken Spanish label in a neutral announcer voice (`em_santa`, no pitch shift — never one of the variants), so nothing has to be read while listening:

> intro → *Gigante Desesperación, variante uno, voz em santa, grave y lento* → **dramatic line** → **conversational line** → *variante dos…* → … → *Mercy, variante tres…*

Every variant renders the **same two lines** the rejected auditions used, so the only thing that changes is the voice config:

1. **dramatic** — "¡Detente! No cruces ese río. La feria de la vanidad no perdona a quien entra sin mirar."
2. **conversational** — "Buenos días, peregrino. Yo también voy por el camino. ¿Quieres caminar conmigo un trecho?"

## The grid — 3 characters × 3 variants

| character | variant | base voice | rate | pitch | intent |
|---|---|---|---|---|---|
| Giant Despair | v1 | `em_santa` | 0.80 | −24 % | the rejected direction, but 6 % less extreme: still heavy, no mud on phone speakers |
| Giant Despair | v2 | `em_alex` | 0.78 | −20 % | the other male voice — different timbre, slower, lighter low end |
| Giant Despair | v3 | `em_santa` | 0.72 | −30 % | the heaviest and slowest take: the rejected config pushed further, to test whether weight or intelligibility is what failed |
| Narrator | v1 | `em_alex` | 0.98 | −3 % | the rejected mapping, re-timed |
| Narrator | v2 | `em_santa` | 0.94 | −2 % | warmer male voice, unhurried — the "storyteller" alternative |
| Narrator | v3 | `em_alex` | 0.90 | −8 % | deeper and slower — more weight, still clear |
| Mercy | v1 | `ef_dora` | 1.00 | +2 % | warm and natural: the rejected +12 % brightness removed |
| Mercy | v2 | `ef_dora` | 0.92 | −4 % | the warmest and slowest: grounded, no sparkle |
| Mercy | v3 | `ef_dora` | 1.06 | +8 % | warm but livelier — midway between v1 and the rejected setting |

Files: `<prefix>_v<n>_<dramatic|conversational>.ogg`, prefix `05_giant_despair`, `06_narrator`, `07_mercy`. `variants.json` carries the same grid plus per-clip duration / level stats.

## Loudness matching

All 18 clips normalised to **−22.9 dBFS RMS**, peaks −1.4 to −5.1 dBFS, no clipping, mono 24 kHz ogg/vorbis q3 — the same treatment as the approved audition set, so a variant can be compared directly against the keepers on the first reel.

## What these clips prove and do not prove

Same engine as the auditions: **kokoro-82M int8** on this box. They refine **casting intent** — register, pace, weight — not final timbre. The Chatterbox pass still re-records the chosen config on the off-box host.

Two honest limits:

- **Mercy has no second female base voice.** kokoro ships one Spanish female voice (`ef_dora`), so her three variants differ by rate and pitch only. If none of them lands, the fix is a dedicated female reference for the Chatterbox pass, not another kokoro setting.
- **Early-EOS check ran and nothing tripped.** Every clip was duration-checked against its script on render (threshold 62 % of the expected length at its rate); all 18 passed on the first take, so there is no truncation in this set — the failure that hit `05_giant_despair_emotional` and `07_mercy_dramatic` in the first pass did not recur.

## What to listen for

- **Giant Despair** — does v1 (lighter than what was rejected) or v3 (heavier) actually read as *heavy*? v2 answers whether the problem was the voice itself rather than the settings.
- **Narrator** — v2 is the real alternative (different voice); v1 vs v3 is the same voice at two weights, so judge whether the rejection was about the voice or about the pace.
- **Mercy** — all three remove the +12 % brightness that read wrong; v2 is the most different from the rejected take. Judge whether "warmer" is enough or whether she needs a different actor entirely.

## Verdict needed

Per character, **one variant to keep** (or "none — needs a different reference"). The winner becomes that character's line in `../registry.md` and the config carried into the Chatterbox pass.
