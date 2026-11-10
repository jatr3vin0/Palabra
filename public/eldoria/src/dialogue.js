// Dialogue engine half: registry + variant picker. Content fills DIALOGUE
// (npc id -> variant list, plus DIALOGUE.signs). Conditions are AND-ed; the
// first matching variant wins, so content orders specific -> general.
window.DIALOGUE = { signs: {} };

window.Dialogue = {
  matches(cond) {
    if (!cond) return true;
    if (cond.flagsAll && !cond.flagsAll.every((f) => Flags.get(f))) return false;
    if (cond.flagsNone && !cond.flagsNone.every((f) => !Flags.get(f))) return false;
    if (cond.shardsMin != null && GS.shards.length < cond.shardsMin) return false;
    if (cond.acornsMin != null && GS.acorns < cond.acornsMin) return false;
    if (cond.items && !cond.items.every((i) => !!GS.items[i])) return false;
    return true;
  },

  // -> { pages: [["line","line"],...], gloss, set, give, mission } or null
  pick(npcId) {
    const list = DIALOGUE[npcId];
    if (!Array.isArray(list) || !list.length) {
      return { pages: [['...']] };
    }
    for (const v of list) {
      if (this.matches(v.if)) {
        return {
          pages: v.lines || [['...']],
          gloss: v.gloss,
          set: v.set,
          give: v.give,
          mission: v.mission,   // Palabra mini-game handed off by this variant
        };
      }
    }
    return { pages: [['...']] };
  },

  sign(id) {
    const s = DIALOGUE.signs && DIALOGUE.signs[id];
    return { pages: [Array.isArray(s) && s.length ? s : ['(weathered writing)']] };
  },
};
