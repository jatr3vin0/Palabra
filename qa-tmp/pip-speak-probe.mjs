// Probe: is Pip's dialogue page speaking? Drive the live browser via CDP.
const CDP = process.argv[2];
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
let { targetInfos: targets } = await send(ws, "Target.getTargets");
let page = targets.find((t) => t.type === "page" && t.url.includes("127.0.0.1:3207"));
const { sessionId } = await send(ws, "Target.attachToTarget", { targetId: page.targetId, flatten: true });
const ev = async (expr) => {
  const r = await send(ws, "Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }, sessionId);
  return r.result?.value;
};
const count = () => ev(`(function(){try{var w=document.querySelector('iframe').contentWindow;var p=window;var s=(p.__palabraSpeak||[]);var d=w.game.scene.getScene('UI');return JSON.stringify({speaks:s.length,last:s.slice(-2),dlg:d&&d.dialogue?{page:d.dialogue.page,pages:d.dialogue.pages.length,text:(d.dialogue.pages[d.dialogue.page]||[]).join(' ')}:null})}catch(e){return 'ERR '+e.message}})()`);

console.log('before:', await count());
// advance/ensure dialogue: tap centre of dialogue box twice with pauses
const tap = () => ev(`(function(){var f=document.querySelector('iframe');var r=f.getBoundingClientRect();function pd(x,y){['pointerdown','pointerup'].forEach(function(t){f.dispatchEvent(new PointerEvent(t,{bubbles:true,clientX:x,clientY:y,pointerId:7,isPrimary:true,pointerType:'touch'}))})}pd(r.left+r.width*0.5,r.top+r.height*0.75);return 'tapped'})()`);
await tap(); await sleep(3500); console.log('after tap1:', await count());
await tap(); await sleep(3500); console.log('after tap2:', await count());
process.exit(0);
