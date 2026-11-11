# PHASE 0 — Chatterbox feasibility gate (measured, 2026-11-11)

**Verdict: Chatterbox Multilingual V3 CANNOT run on this box. Licence is CLEAN (MIT). Do not retry on-box.**

## 1. Licence audit — PASS (clean, no requests needed)

| item | finding |
|---|---|
| repo `resemble-ai/chatterbox` | MIT. README states the code "stays public as an archive under the MIT license, no support, updates or paid tier". |
| weights `ResembleAI/chatterbox` (HF) | MIT (`cardData.license: mit`, tag `license:mit`). Weights and code are both free to use, modify and redistribute, including commercially, with the MIT notice. |
| Spanish support | `es` is a first-class language of the Multilingual family (23 languages); V3 checkpoint `t3_mtl23ls_v3` is the multilingual one. There is no separate "LatAm" checkpoint — Latin-American vs castizo character comes from the **reference clip** you clone, which is exactly why Phase 1 (reference sourcing) is the real casting work. |
| usage restrictions | none beyond MIT. The only hard rule is ours: cloning a person's voice needs that person's documented consent, so we use PD/CC0 references only. |
| maintenance risk | **repo is archived and unmaintained** (Resemble pivoted to deepfake detection). Pin a commit + pin `pyproject.toml` deps if it is ever used. |

## 2. Machine fit — FAIL (disk and RAM both short)

Weights needed for Spanish (Multilingual V3), exact bytes from the HF API:
- `t3_mtl23ls_v3.safetensors` — 2,143,989,928 B = **2.14 GB**
- `s3gen_v3.safetensors` — 1,056,381,804 B = **1.06 GB**
- `ve.safetensors` — 5,695,784 B ≈ **5.7 MB**
- **subtotal 3.20 GB**, plus torch CPU + transformers + librosa runtime ≈ **1.2–1.5 GB** → **≈ 4.5–4.7 GB on disk**.

Measured free space on this box at gate time: **665 MB** on `/home` + **1.6 GB** on `/` = **≈ 2.3 GB**. Short by **≈ 2.2 GB**. Nothing deletable of ours closes that gap (the workspace is 513 MB total, the site `node_modules` is the bulk of it and is in use).

RAM: **3,938 MB total, ~0.3–0.4 GB available** with the other sessions running (no swap). A 0.5 B autoregressive model + CFM decoder + torch will not fit; it OOMs long before a line is spoken. Evidence from this box: even the 82 M-parameter **kokoro fp32** model was OOM-killed (`Exit 137`) at 380 MB available; only its **int8** build (92 MB) ran.

Real generation speed: **not measurable** — the model could not be loaded without exceeding both budgets. Do not quote an invented number; from architecture (500 M AR + CFM decoder, CPU-only, 2 vCPU) a 6-second line is in the tens of seconds to minutes range, which is fine for *offline batch* generation and useless for *dynamic* dialogue either way.

## 3. Recommendation

1. **Never on-box.** Chatterbox is a batch/library generator, not a runtime engine — so its speed on our box is irrelevant *if* the batch runs somewhere else. That is the plan that fits the owner's rules (no per-player cost, nothing on player devices).
2. **Batch host = free-tier HF CPU Space** (2 vCPU, 16 GB RAM, 50 GB ephemeral disk) or any free GPU notebook: the 3.2 GB of weights fit, the MIT licence permits it, the output is a folder of `.wav`/`.ogg` committed to the repo, and there is no recurring cost. Blocker: it needs an account/token to create — that is an owner/lead decision, not a licence request.
3. **kokoro stays** as the dynamic/fallback engine (already in the plan) — it is Apache-2.0, 92 MB int8, and measured **RTF 0.50** on this box (5.0 s of audio in 2.5 s). It produced the auditions in `auditions/` today.
4. **Casting does not have to wait for the host decision.** The character work (registry + reference recordings + audition script) is engine-independent: Chatterbox clones whatever reference clip you give it, so the 10 profiles and the LatAm reference clips are the durable deliverable; the auditions here are the style/timbre preview.

**Nothing was pruned or deleted to make room; nothing was installed system-wide.**
