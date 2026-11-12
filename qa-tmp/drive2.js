(() => {
  if (window.__rigRun2) return "already";
  window.__rigRun2 = true;
  window.__rigLog = ["boot2"];
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
      for (let i = 0; i < 30 && !(w0() && w0().GS && w0().game); i++) await sleep(1000);
      w = w0();
      if (!w || !w.GS || !w.game) { log("ABORT-no-world"); return; }
      const sc = w.game.scene.getScene("Game");
      if (!sc || !sc.loadRoom) { log("ABORT-no-scene"); return; }
      // ── room 4,2 (North Road): Tomás at tile (12,2); player lands (12,3) ──
      sc.loadRoom("overworld", "4,2", 12, 3);
      await sleep(900);
      const tomas = (sc.npcsLive || []).find((n) => n.def && n.def.id === "guard_tomas");
      log("tomas:" + (tomas ? Math.round(tomas.sprite.x) + "," + Math.round(tomas.sprite.y) : "NOT-FOUND"));
      if (!tomas) { log("ABORT-no-tomas"); return; }
      // ── stand next to Tomás and talk until the mission overlay opens ──
      const p = sc.player;
      if (p) { p.x = tomas.sprite.x; p.y = tomas.sprite.y + 24; if (p.body && p.body.reset) p.body.reset(p.x, p.y); }
      let missionOpen = false;
      for (let i = 0; i < 26 && !missionOpen; i++) {
        key(" ", 32, w);
        await sleep(900);
        missionOpen = !!window.__palabraGame_roadcross;
        const btn = [...document.querySelectorAll("button")].find((b) => /Jugar/.test(b.textContent));
        if (btn) btn.click();
        if (i % 4 === 3 && p) { p.x = tomas.sprite.x; p.y = tomas.sprite.y + 24; }
      }
      log("missionOpen:" + missionOpen);
      if (!missionOpen) { log("ABORT-no-mission"); return; }
      // ── greet: press ¡Jugar! if the overlay needs it ──
      for (let i = 0; i < 30; i++) {
        const btn = [...document.querySelectorAll("button")].find((b) => /Jugar/.test(b.textContent));
        if (btn) { btn.click(); log("jugar"); break; }
        await sleep(600);
      }
      await sleep(1500);
      // ── the crossing self-loop: movement FREE; the win = leap from safe lane ──
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
  return "rig2-started";
})()
