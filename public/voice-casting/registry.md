# Character voice registry — The Pilgrim's Progress (Palabra)

Phase 2 of `build/VOICE-casting-brief.md`. Ten profiles. Nothing here is approved until the owner has heard the auditions in `auditions/` (index + evaluation notes in `auditions/README.md`).

**Read `PHASE0-chatterbox-feasibility.md` first:** Chatterbox Multilingual V3 is licence-clean (MIT) but **cannot run on this box** (3.2 GB weights vs 2.3 GB free disk, ~0.4 GB RAM). The registry is engine-independent on purpose: Chatterbox clones a reference clip, so the profile + reference clip is the durable casting decision, and the engine is a hosting question (recommended: one-time batch run on a free CPU Space, output committed to the repo — no runtime dependency, no per-player cost).

## Reference-source ledger (Phase 1)

Hard rule applied: **public-domain / CC0 only, no identifiable real person cloned without documented consent.** Every clip below is a LibriVox recording; LibriVox volunteers record under an explicit release of their recordings into the **public domain**, which is the documented consent we require. No celebrity, no scraped personal audio, no licence requests.

| ref file | work | reader | licence / consent | source |
|---|---|---|---|---|
| `refs/ref_villarraza_odisea.ogg` | *La Odisea*, Homero (tr. Luis Segalá y Estalella) | Victor Villarraza | LibriVox public-domain release by the reader | archive.org/details/la_odisea_1501_librivox |
| `refs/ref_villarraza_isladeltesoro.ogg` | *La Isla del Tesoro*, R. L. Stevenson (tr. Manuel Caballero) | Victor Villarraza | LibriVox public-domain release | archive.org/details/isladeltesoro_1509_librivox |
| `refs/ref_savage_angelina.ogg` | *Angelina*, Rafael Delgado (Mexican novel) | Karen Savage | LibriVox public-domain release | archive.org/details/angelina_1109_librivox |
| `refs/ref_grimm_cuentos.ogg` | *Cuentos de Hadas*, Grimm | LibriVox group recording (per-track reader to be confirmed) | LibriVox public-domain release | archive.org/details/cuentos_grimm_01_1109_librivox |

Each ref is a 30 s excerpt, mono, 24 kHz, loudness-normalised to −18 LUFS, ogg/vorbis q3. These are **casting references**, not shipped assets.

**Accent confidence — read this before trusting the accent column.** I have no ear on this machine; accent labels come from documented reader identity and the catalogue's own description, not from listening. Every accent below is therefore marked `reported` and is **confirmed or rejected by the owner's ear in the audition pass**. Villarraza reads with a rioplatense (Argentine) timbre — the closest thing to a LatAm reference we have in PD; Savage is a US volunteer reading fluent Spanish, widely heard as neutral Latin-American-leaning rather than castizo. If the owner rejects either, the fix is a different reference clip, not a different engine.

## The ten profiles

### 1. Evangelist — `pal-es-evangelist`
- **reference:** `refs/ref_villarraza_odisea.ogg`
- **accent:** rioplatense, LatAm (reported)
- **personality:** kind authority; the man who knows the road and has watched many start it. Never hurried, never stern for its own sake.
- **range:** gentle instruction → solemn warning (the "flee from the wrath to come" register) → warm encouragement at the Cross.
- **auditions:** `01_evangelist_{conversational,emotional,dramatic}.ogg`
- **Chatterbox note:** exaggeration ≈ 0.5, cfg_weight ≈ 0.4 — keep him steady; he must never sound like a villain.

### 2. Christian — `pal-es-christian`
- **reference:** `refs/ref_villarraza_isladeltesoro.ogg`
- **accent:** rioplatense, LatAm (reported)
- **personality:** earnest, ordinary, brave in bursts. The player's own voice — the one line of dialogue a learner will hear most, so clarity beats character.
- **range:** fear and burden (Slough of Despond) → repentance → joy at the burden falling → resolve at the river.
- **auditions:** `02_christian_{conversational,emotional,dramatic}.ogg`
- **Chatterbox note:** the clearest diction of the cast; lowest exaggeration (≈0.4). This is the Spanish-acquisition anchor voice.

### 3. Christiana — `pal-es-christiana`
- **reference:** `refs/ref_savage_angelina.ogg`
- **accent:** neutral LatAm (reported)
- **personality:** warm, steady, protective; a mother on the road, not a damsel.
- **range:** tenderness with the children → quiet courage at the river → firm rebuke of Despair's wife.
- **auditions:** `03_christiana_{conversational,emotional,dramatic}.ogg`
- **Chatterbox note:** exaggeration ≈ 0.55; avoid breathiness — she must stay intelligible for A1 learners.

### 4. Apollyon — `pal-es-apollyon`
- **reference:** `refs/ref_villarraza_odisea.ogg` (pitched/timbre-shifted down for the audition; **needs a dedicated deep-voice PD reference** before production)
- **accent:** LatAm, low register (reported)
- **personality:** contemptuous, articulate, seductive-then-furious. Not a scream-monster: he argues.
- **range:** silky temptation → open rage at resistance → wounded fury at defeat.
- **auditions:** `04_apollyon_{conversational,emotional,dramatic}.ogg`
- **Chatterbox note:** highest exaggeration of the cast (≈0.8). Theology guard: he must terrify without gore and never mock Scripture — his lines never quote verses.

### 5. Giant Despair — `pal-es-giant-despair`
- **reference:** `refs/ref_villarraza_isladeltesoro.ogg` (shifted down for the audition; same dedicated deep-reference gap as Apollyon)
- **accent:** LatAm, very low and slow (reported)
- **personality:** heavy, patient, matter-of-fact cruelty. He does not rage; he waits. Slowest delivery in the cast.
- **range:** dull menace → grinding accusation → sullen defeat when the Key of Promise opens the cell.
- **auditions:** `05_giant_despair_{conversational,emotional,dramatic}.ogg` — **REJECTED by the owner (2026-11-11)**; re-audition in `variants/` (`05_giant_despair_v{1,2,3}_*`), see the variant grid below
- **Chatterbox note:** slowest speaking rate (audition ≈ 0.76×), exaggeration ≈ 0.7. Keep the low end out of the mud on phone speakers — high-pass around 70 Hz in the final library.

### 6. Worldly Wiseman — `pal-es-worldly-wiseman`
- **reference:** `refs/ref_grimm_cuentos.ogg`
- **accent:** LatAm (reported; reader to confirm)
- **personality:** plausible, avuncular, faintly smug. Sounds helpful; every sentence is a small trap. The most *likeable* voice in the cast — that is the point.
- **range:** oily reassurance → polite condescension → thin irritation when refused.
- **auditions:** none yet (registry-only; add in the approved-library pass)
- **Chatterbox note:** mid-high pitch, quick tempo (≈1.05×), small smile in the voice.

### 7. Mercy — `pal-es-mercy`
- **reference:** `refs/ref_savage_angelina.ogg`
- **accent:** neutral LatAm (reported)
- **personality:** young, bright, quick to laugh, quicker to hope. The cast's lightness.
- **range:** cheerful chatter → tears of relief → delighted wonder at the river.
- **auditions:** `07_mercy_{conversational,emotional,dramatic}.ogg` — **REJECTED by the owner (2026-11-11)**; re-audition in `variants/` (`07_mercy_v{1,2,3}_*`), see the variant grid below
- **Chatterbox note:** brightest of the female voices (audition ≈ +12 % pitch, 1.08× speed); keep it out of cartoon territory.

### 8. Great-heart — `pal-es-great-heart`
- **reference:** `refs/ref_villarraza_odisea.ogg`
- **accent:** rioplatense, LatAm (reported)
- **personality:** the guide and protector; calm competence, warm humour, no bluster. Speaks in short, certain sentences.
- **range:** briefing → battle command (the only cast member who raises his voice *and* stays in control) → gentle correction of the pilgrims.
- **auditions:** none yet (registry-only)
- **Chatterbox note:** mid-low, deliberate; the combat register must stay clean enough to be understood over music.

### 9. Narrator — `pal-es-narrator`
- **reference:** `refs/ref_villarraza_odisea.ogg`
- **accent:** rioplatense, LatAm (reported)
- **personality:** storyteller, not announcer. Measured, unhurried, a touch of wonder.
- **range:** scene-setting → tension → quiet resolution.
- **auditions:** `06_narrator_{conversational,emotional,dramatic}.ogg` — **REJECTED by the owner (2026-11-11)**; re-audition in `variants/` (`06_narrator_v{1,2,3}_*`), see the variant grid below
- **Chatterbox note:** the audition set runs at 1.0× speed with a −3 % pitch offset; the first take at 0.95× came out truncated (kokoro early-EOS), so **always duration-check generated lines against the script** before shipping.

### 10. Villagers — `pal-es-villager-a` (man), `pal-es-villager-b` (woman), `pal-es-villager-c` (elder)
- **reference:** `refs/ref_grimm_cuentos.ogg` (a/b), `refs/ref_savage_angelina.ogg` (b), `refs/ref_villarraza_odisea.ogg` (c)
- **accent:** LatAm (reported)
- **personality:** ordinary townsfolk of the Fair and the villages — curious, chatty, easily swayed. Function first: they carry shop, market and instruction lines.
- **range:** friendly greeting → haggling → gossip → fright when the sky darkens.
- **auditions:** none yet (registry-only)
- **Chatterbox note:** three rotating voices so the market never sounds like one actor. Cheapest place to widen variety later.

## Variant grid — the three rejected characters (2026-11-11)

The owner kept Evangelist, Christian, Christiana and Apollyon from the dramatic reel and rejected Giant Despair, Narrator and Mercy. These nine variants re-audition those three: same two lines as the audition set (dramatic + conversational), same engine (kokoro-82M int8), loudness-matched to −22.9 dBFS RMS. Reel: `variants/variants-reel.ogg` (2:33, every variant announced by a spoken Spanish label). Details: `variants/README.md`, config + levels: `variants/variants.json`.

| character | variant | base voice | rate | pitch | clip prefix | intent |
|---|---|---|---|---|---|---|
| Giant Despair | v1 | `em_santa` | 0.80 | −24 % | `variants/05_giant_despair_v1_*` | rejected direction, 6 % less extreme — heavy without mud |
| Giant Despair | v2 | `em_alex` | 0.78 | −20 % | `variants/05_giant_despair_v2_*` | other male voice, slower, lighter low end |
| Giant Despair | v3 | `em_santa` | 0.72 | −30 % | `variants/05_giant_despair_v3_*` | heaviest + slowest: rejected config pushed further |
| Narrator | v1 | `em_alex` | 0.98 | −3 % | `variants/06_narrator_v1_*` | rejected mapping, re-timed |
| Narrator | v2 | `em_santa` | 0.94 | −2 % | `variants/06_narrator_v2_*` | warmer male voice, unhurried |
| Narrator | v3 | `em_alex` | 0.90 | −8 % | `variants/06_narrator_v3_*` | deeper, slower, more weight |
| Mercy | v1 | `ef_dora` | 1.00 | +2 % | `variants/07_mercy_v1_*` | warm and natural, brightness removed |
| Mercy | v2 | `ef_dora` | 0.92 | −4 % | `variants/07_mercy_v2_*` | warmest and slowest, grounded |
| Mercy | v3 | `ef_dora` | 1.06 | +8 % | `variants/07_mercy_v3_*` | warm but livelier |

Each variant renders `_dramatic` and `_conversational` (18 clips). **Pending: owner picks one variant per character** (or "needs a different reference"). Mercy is limited by kokoro having a single Spanish female voice — if none of the three lands, she needs a dedicated female reference for the Chatterbox pass.

## What is NOT cast here
- **Scripture lines.** Verse text stays RV1909 verbatim on the dynamic kokoro path and is never voice-cloned or auditioned (brief rule, and the owner's quality bar: scripture is heard and read before any verse question).
- **Kokoro's role is unchanged:** dynamic/fallback dialogue and anything that must exist offline.

## Next step (needs the owner)
1. Owner listens to `auditions/` (start with the three `AB-reel_*.ogg` files — same script, seven characters, back to back).
2. Owner picks, rejects or redirects per character; accent verdicts come from that listen.
3. Only then: dedicated deep references for Apollyon / Giant Despair, Worldly Wiseman / Great-heart / villager auditions, and the full dialogue library — batch-generated on the off-box host agreed with the lead.
