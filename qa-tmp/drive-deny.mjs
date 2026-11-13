// Denied-autoplay drive (owner condition) — connects to the agent-browser
// Chrome via CDP and drives: title tap → intro pages → Pip dialogue → jet
// mission, with a realistic trusted tap stream, while the rig (serve-qa-deny)
// keeps play() denied until the forwarded gesture opens the gate.
// Usage: bun /tmp/drive-deny.mjs <capture-out.json> [denyboot]
import { writeFileSync } from "node:fs";

const CDP = process.argv[3] || "ws://127.0.0.1:52479/devtools/browser/7bccff47-3788-4fe6-8c29-1f74fd860e83";
const OUT = process.argv[2] || "/tmp/deny-capture.json";
const URLQ = "http://127.0.0.1:3207/adventure" + (process.argv[4] === "0" ? "" : "?denyboot=1");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let mid = 0;
const pending = new Map();

function send(ws, method, params = {}, sessionId) {
  const id = ++mid;
  const msg = { id, method, params };
  if (sessionId) msg.sessionId = sessionId;
  ws.send(JSON.stringify(msg));
  return new Promise((res, rej) => {
    const t = setTimeout(() => { pending.delete(id); rej(new Error("timeout " + method)); }, 20000);
    pending.set(id, { res, t });
  });
}

const ws = new WebSocket(CDP);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); clearTimeout(p.t); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
};

const log = (...a) => console.log(...a);

// find or create the adventure target
let { targetInfos: targets } = await send(ws, "Target.getTargets");
let page = targets.find((t) => t.type === "page" && t.url.includes("127.0.0.1:3207"));
if (!page) page = targets.find((t) => t.type === "page");
const targetId = page ? page.targetId : (await send(ws, "Target.createTarget", { url: "about:blank" })).targetId;
const { sessionId } = await send(ws, "Target.attachToTarget", { targetId, flatten: true });
const S = sessionId;
await send(ws, "Runtime.enable", {}, S);
await send(ws, "Page.enable", {}, S);

const ev = async (expr) => {
  const r = await send(ws, "Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }, S);
  if (r.exceptionDetails) throw new Error("eval: " + (r.exceptionDetails.exception?.description || expr.slice(0, 80)));
  return r.result?.value;
};

const tap = async (x, y) => {
  await send(ws, "Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "none" }, S);
  await send(ws, "Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 }, S);
  await sleep(60);
  await send(ws, "Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 }, S);
};

const keyTap = async (keyName, code) => {
  await send(ws, "Input.dispatchKeyEvent", { type: "keyDown", key: keyName, code: keyName, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code, text: keyName === " " ? " " : undefined, unmodifiedText: keyName === " " ? " " : undefined }, S);
  await sleep(60);
  await send(ws, "Input.dispatchKeyEvent", { type: "keyUp", key: keyName, code: keyName, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code }, S);
};

// ── Phaser input-coordinate calibration: two mouse-move probes, solve the
// affine map viewport→game (Phaser's basis differs from the canvas rect).
let MAPX = { a: 320 / 472, b: -4 * (320 / 472) };
let MAPY = { a: 208 / 308, b: -105 * (208 / 308) };
const calibrate = async () => {
  const read = () => ev(`(function(){try{var t=document.querySelector('iframe').contentWindow.game.scene.getScene(document.querySelector('iframe').contentWindow.game.scene.scenes.some(function(s){return s.scene.isActive()&&s.scene.key==='Game'})?'Game':'Title');var p=t.input.activePointer;return {x:p.x,y:p.y}}catch(e){var t2=document.querySelector('iframe').contentWindow.game.scene.getScene('Intro');var p2=t2.input.activePointer;return {x:p2.x,y:p2.y}}})()`);
  await send(ws, "Input.dispatchMouseEvent", { type: "mouseMoved", x: 240, y: 200 }, S);
  await sleep(300);
  const p1 = await read();
  await send(ws, "Input.dispatchMouseEvent", { type: "mouseMoved", x: 240, y: 400 }, S);
  await sleep(300);
  const p2 = await read();
  MAPY = { a: (p2.y - p1.y) / 200, b: p1.y - 200 * ((p2.y - p1.y) / 200) };
  await send(ws, "Input.dispatchMouseEvent", { type: "mouseMoved", x: 120, y: 300 }, S);
  await sleep(300);
  const p3 = await read();
  MAPX = { a: (p3.x - p2.x) / (120 - 240), b: p2.x - 240 * ((p3.x - p2.x) / (120 - 240)) };
  log("calibrated: gameY=" + MAPY.a.toFixed(4) + "*vy+" + MAPY.b.toFixed(2) + " gameX=" + MAPX.a.toFixed(4) + "*vx+" + MAPX.b.toFixed(2));
};
const vy = (gy) => (gy - MAPY.b) / MAPY.a;
const vx = (gx) => (gx - MAPX.b) / MAPX.a;
const tapAt = async (gx, gy) => { const x = Math.round(vx(gx)), y = Math.round(vy(gy)); log("tap at game(" + gx + "," + gy + ") → viewport(" + x + "," + y + ")"); await tap(x, y); };

// ── boot ─────────────────────────────────────────────────────────────────────
await ev(`try{localStorage.clear()}catch(e){}`);
await send(ws, "Page.navigate", { url: URLQ }, S);
await sleep(2500);
// wait for the world canvas + Title scene
let booted = false;
for (let i = 0; i < 30; i++) {
  try {
    booted = await ev(`(function(){try{var f=document.querySelector('iframe');if(!f)return false;var w=f.contentWindow;if(!w.game)return false;return w.game.scene.scenes.some(function(s){return s.scene.isActive()&&s.scene.key==='Title'})}catch(e){return false}})()`);
  } catch (e) { booted = false; }
  if (booted) break;
  await sleep(1000);
}
if (!booted) { log("ABORT: world never booted"); process.exit(1); }
log("booted (Title)");
await calibrate();
const scene = () => ev(`(function(){try{return document.querySelector('iframe').contentWindow.game.scene.scenes.filter(function(s){return s.scene.isActive()}).map(function(s){return s.scene.key})}catch(e){return ['ERR']}})()`);
const dlg = () => ev(`(function(){try{var u=document.querySelector('iframe').contentWindow.game.scene.getScene('UI');return u.dialogue?{page:u.dialogue.page,pages:u.dialogue.pages.length}:null}catch(e){return null}})()`);
const playerPos = () => ev(`(function(){try{var g=document.querySelector('iframe').contentWindow.game.scene.getScene('Game');var p=g.player;return p?{x:p.x,y:p.y}:null}catch(e){return null}})()`);
const npcPos = (id) => ev(`(function(){try{var g=document.querySelector('iframe').contentWindow.game.scene.getScene('Game');var n=(g.npcs||[]).filter(function(n){return n.npcId==='${id}'||n.id==='${id}'})[0];return n?{x:n.x,y:n.y}:null}catch(e){return null}})()`);

// ── TAP 1: title slot row (select+start → Intro; welcome line denied at boot)
await tapAt(160, 123); // slot row 0 center
await sleep(1800); // welcome denied+stash; fwd#1 replay denied (denyboot); P0 speaks (denied, stash)

// ── TAP 2..6: intro advance taps with realistic reading gaps
for (let p = 0; p < 5; p++) {
  await calibrate();
  await tapAt(160, 104);
  await sleep(2400); // the owner reads/listens; lines get cut mid-play here
}

// intro's last tap enters the Game scene
await sleep(2000);
log("scene after intro:", JSON.stringify(await scene()));

// ── walk to Pip (trusted arrow taps), then talk
const pip = await npcPos("kid_pip");
log("pip:", JSON.stringify(pip), "player:", JSON.stringify(await playerPos()));
if (pip) {
  for (let step = 0; step < 40; step++) {
    const me = await playerPos();
    if (!me) break;
    const dx = pip.x - me.x, dy = pip.y - me.y;
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) break;
    if (Math.abs(dx) > Math.abs(dy)) await keyTap(dx > 0 ? "ArrowRight" : "ArrowLeft", dx > 0 ? 39 : 37);
    else await keyTap(dy > 0 ? "ArrowDown" : "ArrowUp", dy > 0 ? 40 : 38);
    await sleep(520);
  }
  // talk: action (SPACE) near Pip — opens the dialogue, page 1 speaks
  await sleep(400);
  await keyTap(" ", 32);
  await sleep(2200);
  // Pip's dialogue pages: advance with SPACE at realistic gaps (2.2s)
  for (let p = 0; p < 10; p++) {
    const d = await dlg();
    if (!d) break;
    log("pip page " + d.page + "/" + d.pages);
    await keyTap(" ", 32);
    await sleep(2200);
  }
  await sleep(2500); // mission handoff → overlay opens (parent speaks)
}

// ── mission overlay (parent DOM): ¡Jugar!
let overlayBtn = null;
for (let i = 0; i < 20 && !overlayBtn; i++) {
  overlayBtn = await ev(`(function(){var el=[].filter.call(document.querySelectorAll('button'),function(b){return /Jugar/.test(b.textContent)})[0];if(!el)return null;var r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,t:el.textContent.trim()}})()`);
  if (!overlayBtn) await sleep(1000);
}
if (overlayBtn) {
  log("overlay:", overlayBtn.t, "→ tap ¡Jugar!");
  await tap(overlayBtn.x, overlayBtn.y);
  await sleep(3000); // instructions + first balloons speak
  // jet rounds: tap the correct word balloon (2 rounds)
  for (let round = 0; round < 2; round++) {
    const target = await ev(`(function(){try{var f=document.querySelector('iframe');var d=f?f.contentDocument:document;var prompt=d.body.innerText.match(/toca la palabra\\s+([^\\n.]+)/i)||d.body.innerText.match(/palabra:\\s*([^\\n.]+)/i);var want=prompt?prompt[1].trim():null;var els=[].slice.call(d.querySelectorAll('button,[class*=balloon],[class*=word],[class*=bal]'));var hit=want?els.filter(function(e){return e.textContent.trim()===want})[0]:els.filter(function(e){return /casa|mesa|silla|sol|luna/.test(e.textContent)})[0];if(!hit)return null;var r=hit.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,want:want,t:hit.textContent.trim()}}catch(e){return null}})()`);
    if (!target) { log("round " + round + ": no balloon found, skipping"); break; }
    log("round " + round + ": tap", target.t, "want", target.want);
    await tap(target.x, target.y);
    await sleep(2800);
  }
  // exit the mission (Salir / Continuar / X) — explicit stop path
  const exitBtn = await ev(`(function(){var el=[].filter.call(document.querySelectorAll('button'),function(b){return /Salir|Continuar|Cerrar/.test(b.textContent)})[0];if(!el)return null;var r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,t:el.textContent.trim()}})()`);
  if (exitBtn) { log("exit:", exitBtn.t); await tap(exitBtn.x, exitBtn.y); await sleep(1500); }
} else {
  log("no mission overlay appeared");
}

await sleep(2000); // let the last lines finish/flush
const dump = await ev(`(function(){try{return window.__R&&window.__R.snap?window.__R.snap():JSON.stringify({parent:window.__audioEvents||[],qaSpeak:window.__palabraSpeak||[],qaAudio:window.__palabraAudio||[],tts:window.__ttsCalls||0,clips:window.__palabraClips||{}})}catch(e){return JSON.stringify({err:e.message})}})()`);
writeFileSync(OUT, dump);
log("capture written:", OUT, "bytes:", dump.length);
log("scenes now:", JSON.stringify(await scene()));
ws.close();
process.exit(0);
