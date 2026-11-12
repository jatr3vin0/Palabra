(() => {
  if (window.__rigRun6) return "already";
  window.__rigRun6 = true;
  window.__rigLog = ["boot6"];
  window.__verdicts = {};
  const log = (m) => { window.__rigLog.push(String(m).slice(0, 160)); };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const key = (key_, code, win) => {
    const t = win || window;
    t.dispatchEvent(new KeyboardEvent("keydown", { key: key_, keyCode: code, which: code, bubbles: true }));
    setTimeout(() => t.dispatchEvent(new KeyboardEvent("keyup", { key: key_, keyCode: code, which: code, bubbles: true })), 60);
  };
  const gems = () => { try {
    const fis = [...document.querySelectorAll("iframe")];
    for (const f of fis) {
      const w = f.contentWindow; if (!w || !w.GS) continue;
      if (typeof w.GS.gems === "number") return w.GS.gems;
      const r = w.GS.registry;
      if (r) { const g = (r.data && r.data.gems) ?? r.gems; if (typeof g === "number") return g; }
    }
    return null;
  } catch (e) { return null; } };
  const store = () => window.localStorage.getItem("palabra.game.camino-road-cross.v1");
  const spoken = () => (window.__spoken || []).slice();
  const btn = (re) => [...document.querySelectorAll("button")].find((b) => re.test(b.textContent));
  const cross = async () => {
    for (let g = 0; g < 2400; g++) {
      const h = window.__palabraGame_roadcross;
      const bd = h && h.boardData;
      if (!bd) { await sleep(400); continue; }
      if (/Misión cumplida/.test(document.body.innerText)) { log("WIN"); return true; }
      if (/Sin corazones/.test(document.body.innerText)) { log("HEARTS-OUT"); return false; }
      const pos = h.position;
      if (!pos) { await sleep(250); continue; }
      // leap ONLY when the hook says the win attempt is armed (on the safe lane)
      const safeRowG = bd.lanes.findIndex((l) => l.safe) + 1; if (h.missArmed === true && pos.row === safeRowG) { key("ArrowUp", 38); await sleep(900); continue; }
      const safeRow = safeRowG;
      if (pos.row === 6) { key("ArrowUp", 38); await sleep(520); continue; }
      if (pos.row > safeRow) { key("ArrowDown", 40); await sleep(520); continue; }
      if (pos.row >= 1 && pos.row < safeRow) { key("ArrowUp", 38); await sleep(520); continue; }
      await sleep(250);
    }
    log("TIMEOUT-crossing");
    return false;
  };
  (async () => {
    try {
      const w0 = () => document.querySelector("iframe") && document.querySelector("iframe").contentWindow;
      let w = null;
      for (let i = 0; i < 20 && !(w0() && w0().Palabra && w0().PALABRA_MISSIONS); i++) await sleep(1000);
      w = w0();
      if (!w || !w.Palabra || !w.PALABRA_MISSIONS) { log("ABORT-no-bridge"); return; }
      const pre = { gems: gems(), store: store(), spokenN: spoken().length };
      window.__verdicts.pre = pre;
      w.Palabra.openMission(w.PALABRA_MISSIONS.mission_tomas_calle);
      let open = false;
      for (let i = 0; i < 40 && !open; i++) { await sleep(500); open = !!window.__palabraGame_roadcross; }
      log("hook:" + open);
      if (!open) { log("ABORT-no-hook"); return; }
      for (let i = 0; i < 30; i++) { const b = btn(/Jugar/); if (b) { b.click(); log("jugar"); break; } await sleep(600); }
      await sleep(1500);
      // ── session: win; auto-retry the SAME round on game-over (retry pays nothing) ──
      let won = false;
      for (let tries = 0; tries < 12 && !won; tries++) {
        won = await cross();
        if (!won) {
          const rb = btn(/Otra vez/);
          if (rb) { rb.click(); log("retry"); await sleep(2500); }
          else { log("ABORT-no-retry"); return; }
        }
      }
      if (!won) { log("ABORT-win1"); return; }
      await sleep(7000); // farewell -> reward -> achievement chain
      window.__verdicts.win1 = { gems: gems(), store: JSON.parse(store() || "null"), spoken: spoken().slice(pre.spokenN) };
      log("win1-gems:" + window.__verdicts.win1.gems + " wins:" + (window.__verdicts.win1.store && window.__verdicts.win1.store.wins));
      // ── win-overlay replay: Otra vez 🔁 must pay 0 world gems ──
      const rb = btn(/Otra vez/);
      if (!rb) { log("ABORT-no-replay-btn"); return; }
      rb.click();
      log("replay-clicked");
      await sleep(3000);
      let won2 = false;
      for (let tries = 0; tries < 12 && !won2; tries++) {
        won2 = await cross();
        if (!won2) { const r2 = btn(/Otra vez/); if (r2) { r2.click(); await sleep(2500); } }
      }
      if (!won2) { log("ABORT-win2"); return; }
      await sleep(5000);
      window.__verdicts.win2 = { gems: gems(), store: JSON.parse(store() || "null") };
      log("win2-gems:" + window.__verdicts.win2.gems + " wins:" + (window.__verdicts.win2.store && window.__verdicts.win2.store.wins));
      log("END");
    } catch (e) {
      log("ERR " + e.message);
    }
  })();
  return "rig6-started";
})()
