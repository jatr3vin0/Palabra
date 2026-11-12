(() => {
  if (window.__rigRun4) return "already";
  window.__rigRun4 = true;
  window.__rigLog = ["boot4"];
  window.__verdicts = {};
  const log = (m) => { window.__rigLog.push(String(m).slice(0, 160)); };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const key = (key_, code, win) => {
    const t = win || window;
    t.dispatchEvent(new KeyboardEvent("keydown", { key: key_, keyCode: code, which: code, bubbles: true }));
    setTimeout(() => t.dispatchEvent(new KeyboardEvent("keyup", { key: key_, keyCode: code, which: code, bubbles: true })), 60);
  };
  const gems = () => { try { return document.querySelector("iframe").contentWindow.GS.gems; } catch (e) { return null; } };
  const store = () => window.localStorage.getItem("palabra.game.camino-road-cross.v1");
  const spoken = () => (window.__spoken || []).slice();
  const btn = (re) => [...document.querySelectorAll("button")].find((b) => re.test(b.textContent));
  (async () => {
    try {
      const w0 = () => document.querySelector("iframe") && document.querySelector("iframe").contentWindow;
      let w = null;
      for (let i = 0; i < 20 && !(w0() && w0().Palabra && w0().PALABRA_MISSIONS); i++) await sleep(1000);
      w = w0();
      if (!w || !w.Palabra || !w.PALABRA_MISSIONS) { log("ABORT-no-bridge"); return; }
      const pre = { gems: gems(), store: store(), spokenN: spoken().length };
      window.__verdicts.pre = pre;
      log("pre:" + JSON.stringify(pre));
      // ── production handoff: dialogue -> openMission(mission) ──
      w.Palabra.openMission(w.PALABRA_MISSIONS.mission_tomas_calle);
      log("openMission-posted");
      let open = false;
      for (let i = 0; i < 40 && !open; i++) { await sleep(500); open = !!window.__palabraGame_roadcross; }
      log("hook:" + open);
      if (!open) { log("ABORT-no-hook"); return; }
      for (let i = 0; i < 30; i++) { const b = btn(/Jugar/); if (b) { b.click(); log("jugar"); break; } await sleep(600); }
      await sleep(1500);
      const cross = async () => {
        let leaps = 0;
        for (let g = 0; g < 400; g++) {
          const h = window.__palabraGame_roadcross;
          const bd = h && h.boardData;
          if (!bd) { await sleep(400); continue; }
          if (/Misión cumplida/.test(document.body.innerText)) { log("WIN"); return true; }
          if (/Sin corazones/.test(document.body.innerText)) { log("GAMEOVER"); return false; }
          const safeRow = bd.lanes.findIndex((l) => l.safe) + 1;
          const pos = h.position;
          if (!pos) { await sleep(300); continue; }
          if (pos.row === 6) { key("ArrowUp", 38); await sleep(430); continue; }
          if (pos.row === safeRow) { key("ArrowUp", 38); leaps++; await sleep(820); continue; }
          if (pos.row >= 1 && pos.row < safeRow) { key("ArrowUp", 38); await sleep(430); continue; }
          if (pos.row > safeRow) { key("ArrowDown", 40); await sleep(430); continue; }
          await sleep(220);
        }
        log("TIMEOUT-crossing");
        return false;
      };
      // ── win #1 ──
      if (!await cross()) { log("ABORT-win1"); return; }
      await sleep(8000); // let farewell -> reward -> achievement chain enqueue
      window.__verdicts.win1 = {
        gems: gems(), store: JSON.parse(store() || "null"),
        spoken: spoken().slice(pre.spokenN),
      };
      log("win1:" + JSON.stringify({ gems: window.__verdicts.win1.gems, wins: window.__verdicts.win1.store && window.__verdicts.win1.store.wins, spoken: window.__verdicts.win1.spoken.length }));
      // ── win-overlay replay: Otra vez 🔁 ──
      const rb = btn(/Otra vez/);
      if (!rb) { log("ABORT-no-replay-btn"); return; }
      rb.click();
      log("replay-clicked");
      await sleep(3000);
      if (!await cross()) { log("ABORT-win2"); return; }
      await sleep(5000);
      window.__verdicts.win2 = { gems: gems(), store: JSON.parse(store() || "null") };
      log("win2:" + JSON.stringify(window.__verdicts.win2));
      log("END");
    } catch (e) {
      log("ERR " + e.message);
    }
  })();
  return "rig4-started";
})()
