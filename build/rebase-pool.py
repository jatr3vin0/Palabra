#!/usr/bin/env python3
"""rebase-pool.py — the ONLY legal taught-pool counter (LEAD RULING R9a).

Chain order defines the pool. Reader rules:
  * src/content/unit-01.json  -> vocab[], identity = es (NO id field, es-as-id)
  * build/content-packs/a0-packs.json -> packs[].words[] NESTED (iterate the LIST,
    never a dict keyed by unitId: two packs share unitId "a0-u05")
  * every other pack -> words[]
Never reads exam files, waves, scripture, qna, examContribution or
newIdsMustLandInSharedPoolFirst as word sources — only vocab[] and words[].

Identity is the EXACT string: no lower/strip/accent-fold. `por qué` != `porque`,
`tu` != `tú`, `está` != `están`, `red` != `redes`, `vio` != `vió`.

Usage:  python3 build/rebase-pool.py [--root <repo-root>]
Exit 0 = chain reproduces the canonical total (399 pre-u08 / 416 post-u08).
"""

import json
import os
import subprocess
import sys

EXPECTED_PRE_U08 = 399
EXPECTED_POST_U08 = 416

A0 = ["a0-packs", "a0-verbs", "a0-u02", "a0-u06"]
A1 = ["a1-u01", "a1-u02", "a1-u03", "a1-u04", "a1-u05", "a1-u06", "a1-u07", "a1-u08"]

fails = []
warns = []


def die(msg):
    fails.append(msg)


def warn(msg):
    warns.append(msg)


def load(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def ids_of(path):
    d = load(path)
    if "vocab" in d:                                   # unit-01.json: es-as-id
        return [e["es"] for e in d["vocab"]]
    if "packs" in d:                                   # a0-packs.json: NESTED
        return [w["es"] for p in d["packs"] for w in p["words"]]
    if "words" in d:                                   # every other pack
        out = []
        for w in d["words"]:
            es = w.get("es") or w.get("id")
            if not es:
                die(f"{path}: word with neither es nor id")
                continue
            if "id" in w and "es" in w and w["id"] != w["es"]:
                die(f"{path}: id != es ({w['id']!r} vs {w['es']!r})")
            out.append(es)
        return out
    die(f"{path}: no reader (no vocab/words/packs key)")
    return []


def first_seen_dupes(ids):
    seen, dupes = set(), []
    for i in ids:
        if i in seen and i not in dupes:
            dupes.append(i)
        seen.add(i)
    return dupes


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if "--root" in sys.argv:
        root = sys.argv[sys.argv.index("--root") + 1]
    packs_dir = os.path.join(root, "build", "content-packs")

    unit01 = os.path.join(root, "src", "content", "unit-01.json")
    if not os.path.exists(unit01):                     # shared-layout fallback
        alt = os.path.join(os.path.dirname(os.path.dirname(root)), "content", "unit-01.json")
        if os.path.exists(alt):
            unit01 = alt
            warn(f"unit-01 read from {alt} (shared layout; repo copy absent)")

    chain = [("unit-01.json", unit01)]
    for name in A0 + A1:
        p = os.path.join(packs_dir, name + ".json")
        if not os.path.exists(p):
            if name == "a1-u08":
                warn("a1-u08.json ABSENT — chain checked against the pre-u08 total 399")
                continue
            die(f"{p}: MISSING input")
            continue
        chain.append((name + ".json", p))

    # a0-packs.json byte-identity: repo copy vs build copy
    repo_a0 = os.path.join(root, "src", "content", "packs", "a0-packs.json")
    build_a0 = os.path.join(packs_dir, "a0-packs.json")
    a = b = None
    if os.path.exists(repo_a0):
        with open(repo_a0, "rb") as fh:
            a = fh.read()
    else:
        # the app copy may live on a feature branch only — read the newest blob
        # in git history instead of checking the branch out (shared worktree).
        try:
            sha = subprocess.run(
                ["git", "-C", root, "log", "--all", "-1", "--format=%H", "--",
                 "src/content/packs/a0-packs.json"],
                capture_output=True, text=True, check=True).stdout.strip()
            if sha:
                a = subprocess.run(
                    ["git", "-C", root, "show", f"{sha}:src/content/packs/a0-packs.json"],
                    capture_output=True, check=True).stdout
                warn(f"repo a0-packs.json absent from the working tree — compared the "
                     f"git blob {sha[:8]} instead")
        except Exception as exc:  # noqa: BLE001
            warn(f"repo a0-packs.json unavailable in the tree and in git ({exc})")
    if os.path.exists(build_a0):
        with open(build_a0, "rb") as fh:
            b = fh.read()
    if a is not None and b is not None:
        if a != b:
            die(f"a0-packs.json differs: repo copy ({len(a)}B) vs {build_a0} ({len(b)}B) — "
                "read one, assert the other")
    else:
        warn("a0-packs.json byte-identity check skipped (a copy is missing)")

    union = {}          # id -> file that introduced it
    rows = []
    for fname, path in chain:
        ids = ids_of(path)
        dupes = first_seen_dupes(ids)
        if dupes:
            die(f"{fname}: duplicate id(s) inside one file: {dupes}")
        distinct = list(dict.fromkeys(ids))
        new, repass = [], []
        for i in distinct:
            if i in union:
                repass.append((i, union[i]))
            else:
                new.append(i)
        for i in new:
            union[i] = fname
        total = len(union)
        rows.append((fname, len(ids), len(distinct), new, repass, total))

        # A1 per-pack consistency checks
        if fname.startswith("a1-"):
            d = load(path)
            declared = d.get("newIdsMustLandInSharedPoolFirst")
            new_true = [w["es"] for w in d.get("words", []) if w.get("new") is True]
            new_false = [w["es"] for w in d.get("words", []) if w.get("new") is False]
            if declared is None:
                die(f"{fname}: no newIdsMustLandInSharedPoolFirst")
            else:
                if len(declared) != len(new_true):
                    die(f"{fname}: newIdsMustLandInSharedPoolFirst {len(declared)} != new:true entries {len(new_true)}")
                if [x for x in new_true if x not in declared]:
                    die(f"{fname}: new:true ids missing from newIdsMustLandInSharedPoolFirst: "
                        f"{[x for x in new_true if x not in declared]}")
            for i in new_true:
                if i in union and union[i] != fname:
                    die(f"{fname}: new:true collision — {i!r} already in union from {union[i]}")
            for i in new_false:
                if i not in union:
                    die(f"{fname}: new:false re-pass {i!r} is NOT in the union (not a re-pass)")
            prov = d.get("provenance", {})
            if prov.get("newIds") is not None and prov["newIds"] != len(new_true):
                die(f"{fname}: provenance.newIds {prov['newIds']} != new:true entries {len(new_true)}")
            if prov.get("newIds") is None and fname != "a1-u01.json":
                warn(f"{fname}: provenance.newIds absent")
            before = prov.get("taughtPoolBefore")
            after = prov.get("taughtPoolAfter")
            computed_before = total - len(new)
            if before is not None and before != computed_before:
                die(f"{fname}: provenance.taughtPoolBefore {before} != computed {computed_before}")
            if after is not None and after != total:
                die(f"{fname}: provenance.taughtPoolAfter {after} != computed {total}")
            if before is None and after is None and fname != "a1-u01.json":
                warn(f"{fname}: provenance.taughtPoolBefore/After absent")

    # ---- report ----
    print(f"{'file':<22}{'entries':>8}{'distinct':>10}{'+new':>6}{'re-pass':>9}{'total':>8}")
    print("-" * 63)
    for fname, entries, distinct, new, repass, total in rows:
        print(f"{fname:<22}{entries:>8}{distinct:>10}{len(new):>6}{len(repass):>9}{total:>8}")
        if repass and fname.startswith("a1-"):
            origins = {}
            for _, src in repass:
                origins[src] = origins.get(src, 0) + 1
            detail = ", ".join(f"{k} {v}" for k, v in sorted(origins.items()))
            print(f"{'':<22}re-pass from: {detail}")
    total = len(union)
    u08 = any(f == "a1-u08.json" for f, *_ in rows)
    expected = EXPECTED_POST_U08 if u08 else EXPECTED_PRE_U08
    print("-" * 63)
    print(f"WHOLE-POOL TOTAL (distinct union): {total}   expected: {expected}")
    a0_new = sum(len(n) for f, _, _, n, _, _ in rows if f == "unit-01.json" or f.startswith("a0-"))
    a1_new = sum(len(n) for f, _, _, n, _, _ in rows if f.startswith("a1-"))
    print(f"second way: A0 new {a0_new} + A1 new {a1_new} = {a0_new + a1_new}")
    if total != expected:
        die(f"final total {total} != expected {expected}")
    if a0_new + a1_new != total:
        die(f"reconciliation mismatch: A0 {a0_new} + A1 {a1_new} != {total}")

    # duplicateCheck text per A1 pack
    for fname, path in chain:
        if not fname.startswith("a1-"):
            continue
        dc = load(path).get("qna", {}).get("duplicateCheck")
        print(f"\n[{fname}] duplicateCheck:\n  {dc if dc else '(absent)'}")

    if warns:
        print("\nWARNINGS:")
        for w in warns:
            print("  ! " + w)
    if fails:
        print("\nHARD FAILURES:")
        for f in fails:
            print("  x " + f)
        return 1
    print("\nOK — chain reproduces the canonical total.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
