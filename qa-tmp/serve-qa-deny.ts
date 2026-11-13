// QA mirror (denied-autoplay reproduce, owner condition): serves the built dist
// on :3207 and injects into EVERY HTML document (parent + /eldoria iframe)
// BEFORE any app bundle:
//   1. a genuine autoplay gate — HTMLMediaElement.play() rejects with
//      NotAllowedError until the gesture the owner's flow provides:
//      the parent document unlocks on (a) a forwarded 'palabra:gesture'
//      message or (b) a trusted pointerdown/keydown ON THE PARENT document.
//      A raw tap inside the iframe does NOT unlock the parent (the owner's
//      device: taps happen inside the world iframe; palabra:gesture forwards).
//      ?denyboot=1 keeps the gate closed through the FIRST forwarded gesture —
//      the owner's "denied at boot" condition (the intro speaks into a wall).
//   2. AudioContext.resume() held pending until the same gate.
//   3. a SILENT speechSynthesis stub (device TTS dead — clips are the only
//      voice; every device call is counted, never audible).
//   4. a per-element AUDIO EVENT TIMELINE recorder (playing/pause/ended/
//      seeked/timeupdate/error/...) with t, currentTime, src, paused — the
//      ground truth for contiguous playback.
// Startup semantics: imports dist/server/server.js at STARTUP — kill + relaunch
// after every rebuild (my QA-mirror rule).
import handler from "/home/team/shared/site/dist/server/server.js";

const PORT = 3207;
const HOST = "127.0.0.1";
const CLIENT_DIR = "/home/team/shared/site/dist/client";

const STUB = `<script>(function(){
  window.__palabraQA = true;
  window.__rigT0 = performance.now();
  window.__rigIsTop = (window === window.top);
  window.__audioEvents = [];
  window.__ttsCalls = 0;
  var q = location.search;
  window.__rigDenyBoot = /(?:^|[?&])denyboot=1/.test(q + (window !== window.top ? (window.parent.location.search) : ''));
  var log = function(ev, el, extra){
    if (window.__audioEvents.length > 6000) return;
    var src = '';
    try { src = String(el && (el.currentSrc || el.src) || '').replace(/^.*voice-clips\\//, 'vc/'); } catch(e){}
    var e = { t: Math.round(performance.now() - window.__rigT0), ev: ev, src: src,
              ct: el ? Math.round((el.currentTime || 0) * 100) / 100 : 0,
              paused: el ? (el.paused ? 1 : 0) : 1, id: el && el.__rigId || 0 };
    if (extra) for (var k in extra) e[k] = extra[k];
    window.__audioEvents.push(e);
  };
  // ── the gesture gate ──────────────────────────────────────────────────────
  var gate = { open: false, fwds: 0 };
  var openGate = function(why){ if (!gate.open) { gate.open = true; log('GATE-OPEN', null, { why: why }); } };
  window.addEventListener('message', function(e){
    var d = e.data;
    if (!d || String(d.source || '') !== 'palabra-world') return;
    log('MSG:' + d.type, null, { txt: String(d.text || '').slice(0, 48) });
    if (d.type === 'palabra:gesture') {
      gate.fwds++;
      if (!window.__rigDenyBoot || gate.fwds >= 2) openGate('fwd' + gate.fwds);
    }
  });
  if (window.__rigIsTop) {
    ['pointerdown', 'keydown'].forEach(function(ev){
      window.addEventListener(ev, function(){ openGate('parent-' + ev); }, { capture: true, passive: true });
    });
  } else {
    // the iframe logs its own trusted gestures (never opens the PARENT gate —
    // the owner's device unlocks through the forwarded message only)
    ['pointerdown', 'keydown'].forEach(function(ev){
      window.addEventListener(ev, function(){ log('IFRAME-' + ev, null, {}); }, { capture: true, passive: true });
    });
  }
  // ── deny play() until the gate opens ─────────────────────────────────────
  var pplay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function(){
    if (!gate.open) {
      log('play-DENIED', this, {});
      return Promise.reject(new DOMException(' rig: autoplay blocked until gesture', 'NotAllowedError'));
    }
    return pplay.apply(this, arguments);
  };
  // ── suspend the context until the gate opens ─────────────────────────────
  if (window.AudioContext) {
    var pres = AudioContext.prototype.resume;
    AudioContext.prototype.resume = function(){
      if (!gate.open) return new Promise(function(){});
      return pres.apply(this, arguments);
    };
    var pcreate = null;
    var OPC = window.OfflineAudioContext; // untouched
  }
  // ── silent TTS (device dead) ─────────────────────────────────────────────
  var stub = {
    speaking:false, pending:false, paused:false,
    getVoices:function(){ return []; },
    addEventListener:function(){}, removeEventListener:function(){},
    dispatchEvent:function(){ return false; },
    speak:function(u){ window.__ttsCalls++; try { u.onend && setTimeout(function(){ u.onend(); }, 0); } catch(e){} },
    cancel:function(){}, pause:function(){}, resume:function(){}
  };
  try { delete window.speechSynthesis; } catch(e){}
  try { Object.defineProperty(window, 'speechSynthesis', { value: stub, configurable: true, writable: true }); }
  catch(e){ window.speechSynthesis = stub; }
  // ── per-element timeline recorder ────────────────────────────────────────
  var rid = 0;
  function record(el){
    try { el.__rigId = ++rid; } catch(e){ return; }
    ['playing','pause','ended','seeked','error','waiting','abort','emptied','loadedmetadata','canplay','stalled','volumechange'].forEach(function(ev){
      el.addEventListener(ev, function(){ log(ev, el, {}); });
    });
  }
  var AO = window.Audio;
  function RigAudio(src){ var el = src ? new AO(src) : new AO(); record(el); log('constructed', el, {}); return el; }
  RigAudio.prototype = AO.prototype;
  try { Object.defineProperty(window, 'Audio', { value: RigAudio, configurable: true, writable: true }); }
  catch(e){ window.Audio = RigAudio; }
  var ce = document.createElement.bind(document);
  document.createElement = function(tag){
    var el = ce.apply(null, arguments);
    try { if (String(tag).toLowerCase() === 'audio' || String(tag).toLowerCase() === 'video') record(el); } catch(e){}
    return el;
  };
  // kill the SW in the mirror (a stale palabra-v2 cache would hide rebuilds)
  try { if (navigator.serviceWorker) { navigator.serviceWorker.register = function(){ return Promise.reject(new Error('rig: sw off')); }; } } catch(e){}
})();</script>`;

Bun.serve({
  port: PORT,
  hostname: HOST,
  idleTimeout: 255,
  async fetch(req) {
    const { pathname } = new URL(req.url);
    if (pathname !== "/" && pathname !== "/adventure") {
      const file = Bun.file(CLIENT_DIR + pathname);
      if (await file.exists()) return new Response(file);
    }
    const res = await handler.fetch(req);
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("text/html")) {
      let html = await res.text();
      html = html.replace("<head>", "<head>" + STUB);
      const headers = new Headers(res.headers);
      headers.delete("content-encoding");
      headers.set("content-length", String(new TextEncoder().encode(html).length));
      return new Response(html, { status: res.status, headers });
    }
    return res;
  },
});
console.log(`QA-DENY serving on http://${HOST}:${String(PORT)} (gate: fwd${"?"} / parent tap; denyboot via ?denyboot=1)`);
