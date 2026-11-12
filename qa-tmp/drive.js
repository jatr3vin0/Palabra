(() => {
  if (window.__rigRun) return "already";
  window.__rigRun = true;
  window.__rigLog = ["boot"];
  const log = (m) => { window.__rigLog.push(String(m).slice(0, 160)); };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const key = (key_, code, win) => {
    const t = win || window;
    t.dispatchEvent(new KeyboardEvent("keydown", { key: key_, keyCode: code, which: code, bubbles: true }));
    setTimeout(() => t.dispatchEvent(new KeyboardEvent("keyup", { key: key_, keyCode: code, which: code, bubbles: true })), 60);
  };
  (async () => {
    try {
      const w0 = () => document.querySelector("iframe") && document.querySelector("iframe").contentWindow;
      let w = null;
      for (let i = 0; i < 90 && !(w0() && w0().GS); i++) await sleep(1000);
      w = w0();
      if (!w || !w.GS) { log("ABORT-no-GS"); return; }
      const gs = w.GS;
      // ── locate Tomás defensively ──
      let tomas = null;
      const scan = (list) => {
        for (const c of list || []) {
          try {
            const d = (typeof c.getData === "function" && (c.getData("npcId") || c.getData("id") || c.getData("npc"))) || null;
            if (d && String(d).includes("tomas")) return c;
            if (c.list) { const f = scan(c.list); if (f) return f; }
          } catch (e) {}
        }
        return null;
      };
      tomas = scan(gs.npcs) || scan(gs.children && gs.children.list) || scan(gs.children);
      let px, py;
      if (tomas) { px = tomas.x; py = tomas.y; log("tomas@" + Math.round(px) + "," + Math.round(py)); }
      else { log("tomas-NOT-FOUND"); px = (gs.player && gs.player.x) || 400; py = (gs.player && gs.player.y) || 300; }
      // ── teleport next to Tomás and interact ──
      const p = gs.player;
      if (p) { p.x = px + 40; p.y = py + 10; if (p.body) { p.body && p.body.reset && p.body.reset(p.x, p.y); } }
      await sleep(400);
      let missionOpen = false;
      for (let i = 0; i < 26 && !missionOpen; i++) {
        key(" ", 32, w);
        await sleep(900);
        missionOpen = !!window.__palabraGame_roadcross;
        if (i % 4 === 3) { const q = gs.player; if (q) { q.x = px + 40; q.y = py + 10; } }
      }
      log("missionOpen:" + missionOpen);
      if (!missionOpen) { log("ABORT-no-mission"); return; }
      // ── greet: press ¡Jugar! ──
      for (let i = 0; i < 30; i++) {
        const btn = [...document.querySelectorAll("button")].find((b) => /Jugar/.test(b.textContent));
        if (btn) { btn.click(); log("jugar"); break; }
        await sleep(600);
      }
      await sleep(1500);
      // ── the crossing self-loop: movement is FREE; the win = the leap from the safe lane ──
      let leaps = 0;
      for (let guard = 0; guard < 900; guard++) {
        const h = window.__palabraGame_roadcross;
        const bd = h && h.boardData;
        if (!bd) { await sleep(400); continue; }
        const done = /Misión cumplida/.test(document.body.innerText);
        if (done) { log("WIN-OVERLAY"); break; }
        const over = /Sin corazones/.test(document.body.innerText);
        if (over) { log("GAMEOVER-unexpected"); break; }
        const safeRow = bd.lanes.findIndex((l) => l.safe) + 1;
        const pos = h.position;
        if (!pos) { await sleep(300); continue; }
        if (pos.row === 6) { key("ArrowUp", 38); await sleep(430); continue; }
        if (pos.row === safeRow) { key("ArrowUp", 38); leaps++; await sleep(820); continue; }
        if (pos.row >= 1 && pos.row < safeRow) { key("ArrowUp", 38); await sleep(430); continue; }
        if (pos.row > safeRow) { key("ArrowDown", 40); await sleep(430); continue; }
        await sleep(220);
      }
      log("leaps:" + leaps);
      log("END");
    } catch (e) {
      log("ERR " + e.message);
    }
  })();
  return "rig-started";
})()
