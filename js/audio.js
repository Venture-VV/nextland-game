/* 声音:背景音乐、战斗音乐、战斗音效,以及右上角的开关 */
(function () {
  'use strict';
  const h = NL.h;
  const BEAT = 60 / 65;        // 战斗音乐 65 拍/分
  const LOOP_START = 0.945;    // 第 2 拍开头稍前,此后 8 拍循环
  const LOOP_BEATS = 8;
  const A = (NL.audio = { BEAT, KICK: 0.07 }); // KICK:重拍比每拍开头晚多少秒

  NL.defaults.push(() => ({ music: true }));
  A.on = () => NL.state.music !== false;

  let bgm = null, unlocked = false, inBattle = false, shown = null;
  let ctx = null, master = null, battleBuf = null, decoding = null, battleSrc = null, btn = null;
  let loopStart = 0, loopEnd = 0;
  const listeners = [];
  A.onChange = (fn) => { listeners.push(fn); return () => listeners.splice(listeners.indexOf(fn), 1); };

  const ICON_ON = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 9v6h4l5 4V5L8 9H4z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M16.500 8.500a5 5 0 0 1 0 7M19 6a8.500 8.500 0 0 1 0 12"/></svg>';
  const ICON_OFF = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 9v6h4l5 4V5L8 9H4z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M16.500 9.500l5 5M21.500 9.500l-5 5"/></svg>';

  /* ---------- 背景音乐 ---------- */
  // 用 <audio> 播放:文件正好是一个循环,结尾自带渐弱,首尾相接听不出接缝
  function sync() {
    const play = A.on() && unlocked && !inBattle && !document.hidden;
    if (play) {
      if (!bgm) { bgm = new Audio(NL.ver('assets/audio/bgm.mp3')); bgm.loop = true; bgm.volume = 0.5; bgm.preload = 'auto'; }
      if (!bgm.paused) return finish();
      const p = bgm.play();
      if (p && p.catch) p.catch(() => {});
    } else if (bgm) bgm.pause();
    finish();
  }
  function finish() {
    if (master) master.gain.value = A.on() ? 1 : 0;
    if (ctx) (document.hidden ? ctx.suspend() : ctx.resume()).catch(() => {});
    if (btn && shown !== A.on()) { shown = A.on(); btn.innerHTML = shown ? ICON_ON : ICON_OFF; btn.classList.toggle('off', !shown); btn.title = shown ? '关闭声音' : '打开声音'; }
  }
  A.set = function (on) {
    NL.state.music = !!on;
    NL.save();
    unlocked = true; // 能点到开关,说明已经有过用户操作
    if (on) prepare().catch(() => {});
    sync();
    listeners.slice().forEach((f) => f(!!on));
  };
  A.toggle = () => A.set(!A.on());
  A.playing = () => !!bgm && !bgm.paused;

  /* ---------- 战斗音乐与音效(Web Audio) ---------- */
  function prepare() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return Promise.reject(new Error('no web audio'));
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = A.on() ? 1 : 0;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended' && !document.hidden) ctx.resume().catch(() => {});
    if (battleBuf) return Promise.resolve();
    if (!decoding) {
      const bin = atob(NL.embed.battleMusic.split(',')[1]);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      decoding = new Promise((ok, fail) => ctx.decodeAudioData(bytes.buffer, ok, fail)).then((buf) => {
        // 把循环终点前 30 毫秒和循环起点前 30 毫秒叠化,跳回起点时波形是连续的
        const d = buf.getChannelData(0), sr = buf.sampleRate;
        const ls = Math.round(LOOP_START * sr), le = ls + Math.round(LOOP_BEATS * BEAT * sr), f = Math.round(0.03 * sr);
        if (le < d.length) for (let i = 0; i < f; i++) { const k = i / f; d[le - f + i] = d[le - f + i] * (1 - k) + d[ls - f + i] * k; }
        loopStart = ls / sr; loopEnd = Math.min(le, d.length) / sr;
        battleBuf = buf;
      });
    }
    return decoding;
  }
  // 开始放战斗音乐。elapsed:战斗已经进行了多少秒(中途打开声音时用)。
  // 返回 Promise:音乐第 0 秒对应的 performance.now() 时刻;放不了就返回 null。
  A.battleStart = function (elapsed) {
    inBattle = true;
    sync();
    A.battleStop(0);
    if (!A.on()) return Promise.resolve(null);
    const go = prepare().then(() => {
      const src = ctx.createBufferSource(), gain = ctx.createGain();
      src.buffer = battleBuf; src.loop = true; src.loopStart = loopStart; src.loopEnd = loopEnd;
      gain.gain.value = 0.62;
      src.connect(gain); gain.connect(master);
      const lead = 0.05, e = Math.max(0, elapsed || 0), span = src.loopEnd - src.loopStart;
      const offset = e < src.loopEnd ? e : src.loopStart + ((e - src.loopStart) % span);
      src.start(ctx.currentTime + lead, offset);
      battleSrc = { src, gain };
      return performance.now() + (lead + (ctx.outputLatency || ctx.baseLatency || 0) - e) * 1000;
    });
    const timeout = new Promise((ok) => setTimeout(() => ok(null), 700));
    return Promise.race([go, timeout]).catch(() => null);
  };
  A.battleStop = function (fade) {
    if (!battleSrc || !ctx) return;
    const { src, gain } = battleSrc;
    battleSrc = null;
    const f = fade == null ? 0.35 : fade;
    try { gain.gain.setTargetAtTime(0, ctx.currentTime, f / 4 + 0.001); src.stop(ctx.currentTime + f + 0.05); } catch (e) { /* 已经停了 */ }
  };
  A.battleDuck = (v) => { if (battleSrc && ctx) battleSrc.gain.gain.setTargetAtTime(0.62 * v, ctx.currentTime, 0.15); };
  A.battleEnd = function () {
    A.battleStop();
    inBattle = false;
    sync(); // 背景音乐从暂停的地方接着放,和录屏里一样
  };

  // 合成的战斗音效(录屏里的战斗只有音乐,没有音效)
  let noiseBuf = null;
  function noise() {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const n = ctx.createBufferSource();
    n.buffer = noiseBuf;
    return n;
  }
  function env(node, t, peak, dur) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    node.connect(g); g.connect(master);
    return g;
  }
  function tone(type, f0, f1, t, dur, peak) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    env(o, t, peak, dur);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function burst(freq, q, t, dur, peak, type) {
    const n = noise(), f = ctx.createBiquadFilter();
    f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    n.connect(f); env(f, t, peak, dur);
    n.start(t); n.stop(t + dur + 0.05);
  }
  const SFX = {
    hit(t) { tone('sine', 170, 48, t, 0.16, 0.5); burst(1500, 0.8, t, 0.09, 0.32); },
    block(t) { tone('triangle', 1480, 1320, t, 0.22, 0.16); tone('sine', 2210, 2100, t, 0.16, 0.1); burst(5200, 2, t, 0.05, 0.18, 'highpass'); },
    charge(t) { tone('sawtooth', 180, 880, t, 0.42, 0.07); },
    burst(t) { tone('sine', 120, 34, t, 0.5, 0.6); burst(420, 0.5, t, 0.45, 0.4, 'lowpass'); burst(3200, 1, t, 0.12, 0.2); },
    ko(t) { tone('sawtooth', 620, 50, t, 0.55, 0.12); burst(2400, 0.7, t + 0.3, 0.4, 0.2); },
    win(t) { [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, t + i * 0.09, 0.3, 0.14)); },
    lose(t) { [392, 330, 262].forEach((f, i) => tone('triangle', f, f * 0.97, t + i * 0.14, 0.34, 0.13)); },
  };
  A.sfx = function (name) {
    if (!A.on() || !ctx || ctx.state !== 'running' || !SFX[name]) return;
    try { SFX[name](ctx.currentTime + 0.005); } catch (e) { /* 音效失败不影响战斗 */ }
  };

  /* ---------- 启动 ---------- */
  NL.bootHooks.push(function () {
    btn = h('button#sound-btn', { 'data-act': 'sound', onclick: (e) => { e.stopPropagation(); A.toggle(); } });
    document.querySelector('#stage').appendChild(btn);
    sync();
    // 浏览器要等用户操作后才允许出声,而且各家认的事件不一样(iOS 只认抬手和点击),
    // 所以这几种事件都试一次,直到背景音乐真的响起来为止
    const kick = () => {
      if (A.playing()) return;
      unlocked = true;
      if (A.on()) prepare().catch(() => {});
      sync();
    };
    ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].forEach((ev) => document.addEventListener(ev, kick, true));
    document.addEventListener('visibilitychange', sync);
  });
})();
