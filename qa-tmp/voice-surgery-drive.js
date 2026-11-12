(() => {
  if (window.__voiceDriveRun) return "already";
  window.__voiceDriveRun = true;
  window.__voiceVerdict = { log: [], done: false };
  const V = window.__voiceVerdict;
  const log = (m) => V.log.push(String(m).slice(0, 220));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ── SPY PATCH (parent window = the app that owns speechSynthesis) ────────
  const synth = window.speechSynthesis;
  window.__spoken = [];
  window.__cancels = [];
  window.__speaksN = 0;
  window.__workerStarts = 0;
  window.__audioCtxStarts = 0;
  const OW = window.Worker;
  try {
    window.Worker = class extends OW {
      constructor(u, o) {
        window.__workerStarts++;
        log("WORKER-START:" + u);
        super(u, o);
      }
    };
  } catch (e) { log("worker-patch-skip"); }
  const OAC = window.AudioContext;
  try {
    window.AudioContext = class extends OAC {
      constructor(...a) {
        window.__audioCtxStarts++;
        super(...a);
      }
    };
  } catch (e) { log("ac-patch-skip"); }
  const oSpeak = synth.speak.bind(synth);
  synth.speak = (u) => {
    window.__speaksN++;
    window.__spoken.push({
      at: performance.now(),
      text: String(u.text || "").slice(0, 120),
      rate: u.rate, pitch: u.pitch, volume: u.volume,
      voice: u.voice && u.voice.name ? u.voice.name : null,
      lang: u.lang,
    });
    try { return oSpeak(u); } catch (e) { return; }
  };
  const oCancel = synth.cancel.bind(synth);
  synth.cancel = () => {
    const sp = window.__spoken.length ? window.__spoken[window.__spoken.length - 1] : null;
    const speakingNow = synth.speaking || synth.pending;
    window.__cancels.push({ at: performance.now(), speaking: speakingNow, lastText: sp ? sp.text : null });
    try { return oCancel(); } catch (e) { return; }
  };

  // ── helpers ──
  const spoken = () => window.__spoken;
  const key = (win, k, code) => {
    win.dispatchEvent(new KeyboardEvent("keydown", { key: k, keyCode: code, which: code, bubbles: true }));
    setTimeout(() => win.dispatchEvent(new KeyboardEvent("keyup", { key: k, keyCode: code, which: code, bubbles: true })), 60);
  };
  const scan = (list, re, depth = 0) => {
    for (const c of list || []) {
      try {
        const d = (typeof c.getData === "function" && (c.getData("npcId") || c.getData("id") || c.getData("npc"))) || null;
        if (d && re.test(String(d))) return c;
        if (c.texture && c.texture.key && re.test(String(c.texture.key))) return c;
        if (depth < 4) {
          if (c.list) { const f = scan(c.list, re, depth + 1); if (f) return f; }
          else if (typeof c.getChildren === "function") { const f = scan(c.getChildren(), re, depth + 1); if (f) return f; }
        }
      } catch (e) {}
    }
    return null;
  };

  (async () => {
    try {
      // ── wait for the world bridge ──
      const w0 = () => document.querySelector("iframe") && document.querySelector("iframe").contentWindow;
      let w = null;
      for (let i = 0; i < 60 && !(w0() && w0().GS && w0().Palabra && w0().PALABRA_MISSIONS); i++) await sleep(1000);
      w = w0();
      if (!w || !w.GS || !w.Palabra || !w.PALABRA_MISSIONS) { log("ABORT-no-bridge"); V.done = true; return; }
      log("bridge-ok");
      const gs = w.GS;
      const p = gs.player;
      if (!p) { log("ABORT-no-player"); V.done = true; return; }
      const put = (x, y) => { try { p.x = x; p.y = y; if (p.body && p.body.reset) p.body.reset(x, y); } catch (e) {} };

      // ── 1) SIGN speaks ──
      const sign = scan(gs.children && gs.children.list, /sign/i) || scan(gs.children, /sign/i);
      if (!sign) { log("ABORT-no-sign-sprite"); V.done = true; return; }
      const n0 = spoken().length;
      const tSign = performance.now();
      put(sign.x, sign.y + 12);
      p.facing = "up";
      await sleep(250);
      key(w, " ", 32);
      let spokeSign = false;
      for (let i = 0; i < 20 && !spokeSign; i++) { await sleep(250); spokeSign = spoken().length > n0; }
      const signEntry = spoken()[n0];
      V.sign = {
        ok: spokeSign,
        latency: signEntry ? signEntry.at - tSign : null,
        text: signEntry ? signEntry.text : null, voice: signEntry ? signEntry.voice : null,
        rate: signEntry ? signEntry.rate : null, pitch: signEntry ? signEntry.pitch : null,
      };
      log("sign:" + JSON.stringify(V.sign));
      // advance/close any dialogue box
      for (let i = 0; i < 4; i++) { key(w, " ", 32); await sleep(400); }

      // ── 2) PIP dialogue speaks ──
      const pip = scan(gs.children && gs.children.list, /pip|kid/i) || scan(gs.children, /pip|kid/i);
      if (!pip) { log("ABORT-no-pip"); V.done = true; return; }
      const n1 = spoken().length;
      const tPip = performance.now();
      put(pip.x + 16, pip.y);
      p.facing = "left";
      await sleep(250);
      key(w, " ", 32);
      await sleep(600);
      let pages = 0;
      for (let i = 0; i < 10; i++) {
        const before = spoken().length;
        key(w, " ", 32);
        await sleep(700);
        if (spoken().length > before) pages++;
      }
      V.pip = { ok: spoken().length > n1, pages, latency: (spoken()[n1] ? spoken()[n1].at - tPip : null), lines: spoken().slice(n1).map((s) => ({ text: s.text, voice: s.voice, rate: s.rate, pitch: s.pitch })) };
      log("pip:" + JSON.stringify(V.pip).slice(0, 400));

      // ── 3) MISSION HOWTO speaks (production handoff) ──
      const n2 = spoken().length;
      const tHow = performance.now();
      w.Palabra.openMission(w.PALABRA_MISSIONS.mission_pip_jet);
      let howtoOpen = false;
      for (let i = 0; i < 20 && !howtoOpen; i++) { await sleep(500); howtoOpen = !!window.__palabraGame_skywords || /¿Cómo se juega|Cómo jugar/i.test(document.body.innerText); }
      await sleep(1500);
      V.howto = { open: howtoOpen, ok: spoken().length > n2, latency: (spoken()[n2] ? spoken()[n2].at - tHow : null), lines: spoken().slice(n2).map((s) => ({ text: s.text, voice: s.voice, rate: s.rate, pitch: s.pitch })) };
      log("howto:" + JSON.stringify(V.howto).slice(0, 400));

      // ── 4) cancel integrity: a cancel while speaking MUST be followed by a
      // replacement speak within 60 ms (line-start), never silence ──
      let bad = 0;
      for (const c of window.__cancels) {
        if (!c.speaking) continue;
        const followed = window.__spoken.some((s) => s.at >= c.at - 20 && s.at <= c.at + 60);
        if (!followed) { bad++; log("CANCEL-SILENCE@" + Math.round(c.at) + " after:" + c.lastText); }
      }
      V.cancelIntegrity = { bad, total: window.__cancels.length };

      // ── 5) worker + audioctx ──
      V.engine = { workerStarts: window.__workerStarts, audioCtxStarts: window.__audioCtxStarts, speaks: window.__speaksN };

      // ── 6) network: CDNs unblocked — the page must never touch them ──
      const urls = performance.getEntriesByType("resource").map((r) => r.name);
      const badUrls = urls.filter((u) => /jsdelivr|huggingface|kokoro|onnx|\.bin(\?|$)/i.test(u));
      V.network = { requests: urls.length, badUrls: badUrls.slice(0, 5), workerish: urls.filter((u) => /worker/i.test(u)).slice(0, 5) };
      log("net:bad=" + badUrls.length + " of " + urls.length);

      // ── 7) pill text (boot self-test verdict, device-voice idle copy) ──
      V.pill = (document.body.innerText.match(/voz del dispositivo|voz natural|Voz no disponible|Descargando/) || ["none"])[0];
      V.done = true;
    } catch (e) {
      log("ERR:" + (e && e.message));
      V.done = true;
    }
  })();
  return "started";
})();
