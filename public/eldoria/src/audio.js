// WebAudio chiptune engine: a tiny note sequencer for songs + a param synth for
// sound effects. Content registers via registerSong/registerSfx (formats in
// docs/ARCHITECTURE.md). Everything is defensive: unknown keys are silent no-ops.
window.AUDIO = {
  songs: {}, sfxDefs: {},
  // Real-music loader (feat/eldoria-audio): files maps song key -> URL (see
  // music_files.js); once decoded the buffer loops through songGain. A track
  // whose fetch/decode fails falls back to its registered synth def FOREVER
  // (per-track), so a missing file can never silence the game.
  files: {}, buffers: {}, fileFailed: {}, _loading: {},
  _fileSource: null,
  // Volume settings (0..1) — driven by the audio settings panel (app header +
  // pause menu) and persisted per profile/world save. Voices live app-side
  // (kokoro gain in voice.ts); the world mirrors voiceVol for its pause panel.
  musicVol: 0.9, sfxVol: 1, voiceVol: 1,
  ctx: null, master: null, songGain: null, sfxGain: null, jingleGain: null,
  songMute: null, jingleMute: null,
  muted: false, musicMuted: false, currentSong: null, _timer: null, _tracks: [],

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { console.error('no webaudio', e); return; }
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;   // honor a pre-init mute
    this.master.connect(this.ctx.destination);
    // Parent mute control (quality bar): mutes MUSIC + jingles ONLY — voices
    // (app pipeline) and sound effects stay audible. Dedicated mute buses keep
    // this independent of master mute and the duck() ramps.
    this.songMute = this.ctx.createGain();
    this.songMute.gain.value = this.musicMuted ? 0 : 1;
    this.songMute.connect(this.master);
    this.jingleMute = this.ctx.createGain();
    this.jingleMute.gain.value = this.musicMuted ? 0 : 1;
    this.jingleMute.connect(this.master);
    this.songGain = this.ctx.createGain();
    this.songGain.connect(this.songMute);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.connect(this.master);
    this.jingleGain = this.ctx.createGain();
    this.jingleGain.connect(this.jingleMute);
    this._applyVolumes();
    if (this._pendingSong) { const s = this._pendingSong; this._pendingSong = null; this.playSong(s); }
  },

  // ---- audio settings panel (music / voices / effects) ---------------------
  // Voices are metered app-side (voice.ts gain); the world mirrors voiceVol so
  // the pause panel can show and change it through the bridge.
  setVolumes(vols) {
    const clamp = (v) => Math.max(0, Math.min(1, +v || 0));
    if (vols && vols.music != null) this.musicVol = clamp(vols.music);
    if (vols && vols.sfx != null) this.sfxVol = clamp(vols.sfx);
    if (vols && vols.voice != null) this.voiceVol = clamp(vols.voice);
    this._applyVolumes();
    if (window.GS) {
      GS.musicVol = this.musicVol; GS.sfxVol = this.sfxVol; GS.voiceVol = this.voiceVol;
    }
  },

  _applyVolumes() {
    if (!this.ctx) return;
    this._applySongGain();
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxVol;
    // jingles ride the music volume (they are music, just short)
    if (this.jingleGain) this.jingleGain.gain.value = this.musicVol;
  },

  // songGain = musicVol, scaled by ducking (voices/mission overlay hold it down)
  _applySongGain() {
    if (!this.ctx || !this.songGain) return;
    const target = this._duckHeld > 0 ? 0.08 * this.musicVol : this.musicVol;
    const g = this.songGain.gain;
    const now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(Math.max(target, 0.0001), now);
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  },

  // Music-only mute. Persists into the world save (GS.musicMuted, default
  // false) and echoes the new state to the app so the header button agrees.
  setMusicMuted(on) {
    this.musicMuted = !!on;
    if (this.songMute) this.songMute.gain.value = this.musicMuted ? 0 : 1;
    if (this.jingleMute) this.jingleMute.gain.value = this.musicMuted ? 0 : 1;
    if (window.GS) GS.musicMuted = this.musicMuted;
    if (window.Palabra) {
      try { window.Palabra.post({ type: 'palabra:musicState', muted: this.musicMuted }); } catch (e) { /* not attached */ }
    }
    return this.musicMuted;
  },

  // Duck the chiptune while the kokoro voice speaks (or while a mini-game
  // overlay covers the world). musicDuck>0 means "something else is talking".
  duck(on) {
    if (on) this._duckHeld = (this._duckHeld || 0) + 1;
    else if (this._duckHeld > 0) this._duckHeld--;
    const target = this._duckHeld > 0 ? 0.08 * this.musicVol : this.musicVol;
    if (this.ctx && this.songGain) {
      const g = this.songGain.gain;
      const now = this.ctx.currentTime;
      g.cancelScheduledValues(now);
      g.setValueAtTime(Math.max(g.value, 0.0001), now);
      g.linearRampToValueAtTime(Math.max(target, 0.0001), now + 0.18);
    }
    this._duckTarget = target;
  },

  noteFreq(name) {
    const m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(name);
    if (!m) return null;
    const semis = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    let s = semis[m[1].toUpperCase()];
    if (m[2] === '#') s += 1;
    if (m[2] === 'b') s -= 1;
    const midi = 12 * (parseInt(m[3], 10) + 1) + s;
    return 440 * Math.pow(2, (midi - 69) / 12);
  },

  parseTrack(track) {
    const events = [];
    let beat = 0;
    for (const tok of String(track.notes || '').trim().split(/\s+/)) {
      if (!tok) continue;
      const parts = tok.split(':');
      const beats = parts.length > 1 ? parseFloat(parts[1]) || 1 : 1;
      events.push({ start: beat, beats, name: parts[0] });
      beat += beats;
    }
    return { events, len: Math.max(beat, 0.001) };
  },

  playSong(key) {
    if (!this.ctx) { this._pendingSong = key; return; }
    if (this.currentSong === key && (this._timer || this._fileSource)) return;
    this.stopSong();
    const def = this.songs[key];
    if (!def) return;
    this.currentSong = key;
    // Real-file path (feat/eldoria-audio): decoded buffers play straight into
    // songGain (mute buses + ducking + music slider all still apply). While the
    // first fetch/decode runs, the registered synth def covers the gap so the
    // key never goes silent; on decode it swaps over. A failed load pins the
    // per-track synth fallback (fileFailed) for the rest of the session.
    const url = this.files[key];
    if (url && !this.fileFailed[key]) {
      if (this.buffers[key]) { this._startFileSong(key, def); return; }
      this._loadFileSong(key, url);
    }
    this._startSynthSong(key, def);
  },

  _startSynthSong(key, def) {
    const beatSec = 60 / (def.bpm || 110);
    const start = this.ctx.currentTime + 0.08;
    this._tracks = (def.tracks || []).map((t) => {
      const parsed = this.parseTrack(t);
      return { def: t, events: parsed.events, len: parsed.len, idx: 0, cycle: start, done: false };
    });
    const loop = def.loop !== false;
    this._timer = setInterval(() => {
      if (!this.ctx) return;
      const horizon = this.ctx.currentTime + 0.18;
      for (const tr of this._tracks) {
        if (tr.done || !tr.events.length) continue;
        let guard = 0;
        while (guard++ < 200) {
          const ev = tr.events[tr.idx];
          const t = tr.cycle + ev.start * beatSec;
          if (t >= horizon) break;
          if (ev.name !== '-') this.note(this.songGain, tr.def, ev, t, beatSec);
          tr.idx++;
          if (tr.idx >= tr.events.length) {
            tr.idx = 0;
            tr.cycle += tr.len * beatSec;
            if (!loop) { tr.done = true; break; }
          }
        }
      }
      if (!loop && this._tracks.every((t) => t.done || !t.events.length)) this.stopSong(true);
    }, 60);
  },

  _startFileSong(key, def) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffers[key];
    src.loop = def.loop !== false;
    src.connect(this.songGain);
    src.onended = () => {
      if (this._fileSource === src) { this._fileSource = null; }
    };
    this._fileSource = src;
    try { src.start(); } catch (e) {
      this.fileFailed[key] = true;
      this._fileSource = null;
      if (this.currentSong === key && !this._timer) this._startSynthSong(key, def);
    }
  },

  _loadFileSong(key, url) {
    if (this._loading[key]) return;
    this._loading[key] = true;
    fetch(url)
      .then((r) => { if (!r.ok) throw new Error('http ' + r.status); return r.arrayBuffer(); })
      .then((ab) => this.ctx.decodeAudioData(ab))
      .then((buf) => {
        this._loading[key] = false;
        this.buffers[key] = buf;
        // Swap the synth out only if this key is still the one playing
        if (this.currentSong === key) {
          this.stopSong(true);
          this._startFileSong(key, this.songs[key]);
        }
      })
      .catch((e) => {
        this._loading[key] = false;
        this.fileFailed[key] = true;
        console.warn('MUSIC file failed, synth fallback keeps playing:', key, e);
      });
  },

  stopSong(keepName) {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    if (this._fileSource) {
      try { this._fileSource.onended = null; this._fileSource.stop(); } catch (e) { /* already stopped */ }
      this._fileSource = null;
    }
    if (!keepName) this.currentSong = null;
    if (this.ctx && this.songGain) {
      // hard-cut anything scheduled by swapping the song bus (back through the
      // music-mute bus so a parent's mute survives every song change)
      this.songGain.disconnect();
      this.songGain = this.ctx.createGain();
      this.songGain.connect(this.songMute || this.master);
      this._applySongGain();
    }
  },

  playJingle(key) {
    if (!this.ctx) return;
    const def = this.songs[key];
    if (!def) return;
    const beatSec = 60 / (def.bpm || 140);
    const start = this.ctx.currentTime + 0.03;
    let total = 0;
    for (const t of def.tracks || []) {
      const parsed = this.parseTrack(t);
      total = Math.max(total, parsed.len * beatSec);
      for (const ev of parsed.events) {
        if (ev.name !== '-') this.note(this.jingleGain, t, ev, start + ev.start * beatSec, beatSec);
      }
    }
    // duck the music under the jingle
    if (this.songGain) {
      const g = this.songGain.gain;
      g.cancelScheduledValues(start);
      g.setValueAtTime(0.25 * this.musicVol, start);
      g.setValueAtTime(0.25 * this.musicVol, start + total);
      g.linearRampToValueAtTime(Math.max(this.musicVol, 0.0001), start + total + 0.4);
    }
  },

  note(bus, trackDef, ev, when, beatSec) {
    const ctx = this.ctx;
    const vol = Math.min(trackDef.volume != null ? trackDef.volume : 0.2, 0.4);
    const dur = Math.max(ev.beats * beatSec * 0.92, 0.04);
    const wave = trackDef.wave || 'square';
    if (wave === 'noiseHat' || wave === 'noiseSnare') {
      if (ev.name !== 'x') return;
      const len = wave === 'noiseHat' ? 0.04 : 0.12;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer(len);
      const flt = ctx.createBiquadFilter();
      flt.type = wave === 'noiseHat' ? 'highpass' : 'bandpass';
      flt.frequency.value = wave === 'noiseHat' ? 6000 : 1800;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, when);
      g.gain.exponentialRampToValueAtTime(0.001, when + len);
      src.connect(flt); flt.connect(g); g.connect(bus);
      src.start(when); src.stop(when + len + 0.02);
      return;
    }
    const freq = this.noteFreq(ev.name);
    if (!freq) return;
    const osc = ctx.createOscillator();
    osc.type = wave === 'noise' ? 'square' : wave;
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.01);
    g.gain.setValueAtTime(vol, when + Math.max(dur - 0.04, 0.02));
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    osc.connect(g); g.connect(bus);
    osc.start(when); osc.stop(when + dur + 0.05);
  },

  noiseBuffer(sec) {
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * sec));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  },

  sfx(key) {
    if (!this.ctx) return;
    const def = this.sfxDefs[key];
    if (!def) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const vol = Math.min(def.vol != null ? def.vol : 0.25, 0.6);
    const dur = def.dur || 0.1;
    const mk = (freqFrom, freqTo, when, d) => {
      const osc = ctx.createOscillator();
      osc.type = def.wave || 'square';
      osc.frequency.setValueAtTime(Math.max(freqFrom, 20), when);
      if (freqTo && freqTo !== freqFrom)
        osc.frequency.exponentialRampToValueAtTime(Math.max(freqTo, 20), when + d);
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, when);
      g.gain.exponentialRampToValueAtTime(0.001, when + d);
      osc.connect(g); g.connect(this.sfxGain);
      osc.start(when); osc.stop(when + d + 0.05);
    };
    if (def.type === 'sweep') mk(def.from || 600, def.to || 200, now, dur);
    else if (def.type === 'blip') mk(def.freq || 800, def.freq || 800, now, dur);
    else if (def.type === 'chord') {
      const freqs = def.freqs || [440, 550, 660];
      const stag = def.stagger || 0.06;
      freqs.forEach((f, i) => mk(f, f, now + i * stag, dur));
    } else if (def.type === 'noise') {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer(dur);
      const flt = ctx.createBiquadFilter();
      flt.type = 'bandpass';
      flt.frequency.setValueAtTime(def.from || 1000, now);
      flt.frequency.exponentialRampToValueAtTime(Math.max(def.to || 300, 40), now + dur);
      flt.Q.value = 1.2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      src.connect(flt); flt.connect(g); g.connect(this.sfxGain);
      src.start(now); src.stop(now + dur + 0.02);
    } else mk(def.from || 500, def.to || def.from || 500, now, dur);
  },
};

window.registerSong = function (key, def) { window.AUDIO.songs[key] = def; };
window.registerSfx = function (key, def) { window.AUDIO.sfxDefs[key] = def; };
window.registerMusicFile = function (key, url) { window.AUDIO.files[key] = url; };
