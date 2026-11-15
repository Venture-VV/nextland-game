/* 3D 战斗场景(three.js)。只负责画面:战斗规则和时间轴在 screens/battle.js 里。
 *
 * NL.battle3d(mount) 返回 { kind, render(S), impact(ev), shatter(who), project(who, dy), destroy() };
 * 浏览器不支持 WebGL 或 three.js 没加载到时返回 null,由调用方退回 2D 画法。
 * 约定:0 号是我方(青色),1 号是对手(橙色)。
 */
(function () {
  'use strict';
  const W = 360, H = 781;
  const TEAM = [0x34f0e0, 0xff5a26];      // 我方青、对手橙
  const TEAM_HOT = [0xc8fff8, 0xffd0a0];

  function canvasTex(T, w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    return t;
  }

  NL.battle3d = function (mount) {
    const T = window.THREE;
    if (!T) return null;
    let renderer;
    try { renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' }); } catch (e) { return null; }
    renderer.setPixelRatio(Math.min(3, (window.devicePixelRatio || 1) * Math.max(1, NL.scale)));
    renderer.setSize(W, H, false);
    const cv = renderer.domElement;
    cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block';
    mount.appendChild(cv);
    const disposables = [];
    const keep = (o) => { disposables.push(o); return o; };

    /* ---------- 贴图 ---------- */
    const glowTex = keep(canvasTex(T, 128, 128, (g) => {
      const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.22, 'rgba(255,255,255,.62)');
      r.addColorStop(0.55, 'rgba(255,255,255,.14)'); r.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    }));
    const skyTex = keep(canvasTex(T, 8, 256, (g, w, h) => {
      const r = g.createLinearGradient(0, 0, 0, h);
      r.addColorStop(0, '#1a0b3c'); r.addColorStop(0.35, '#12082a'); r.addColorStop(1, '#090514');
      g.fillStyle = r; g.fillRect(0, 0, w, h);
    }));
    const hexTex = keep(canvasTex(T, 256, 256, (g) => { // 护盾上的蜂窝纹
      g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2.5;
      const s = 22, hh = s * Math.sqrt(3) / 2;
      for (let row = -1; row < 9; row++) for (let col = -1; col < 9; col++) {
        const cx = col * s * 1.5, cy = row * hh * 2 + (col % 2 ? hh : 0);
        g.beginPath();
        for (let k = 0; k < 6; k++) { const a = Math.PI / 3 * k; g[k ? 'lineTo' : 'moveTo'](cx + s * Math.cos(a), cy + s * Math.sin(a)); }
        g.closePath(); g.stroke();
      }
      const r = g.createRadialGradient(128, 128, 20, 128, 128, 128);
      r.addColorStop(0, 'rgba(255,255,255,.28)'); r.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = r; g.fillRect(0, 0, 256, 256);
    }));
    const loader = new T.TextureLoader();
    const face = [NL.embed.avatarMe, NL.embed.avatarFoe].map((src) => {
      const t = keep(loader.load(src));
      t.colorSpace = T.SRGBColorSpace;
      const f = 0.76; // 原图里头像外面还有一圈边框,只取里面的头像
      t.repeat.set(f, f); t.offset.set((1 - f) / 2, (1 - f) / 2);
      return t;
    });

    /* ---------- 场景 ---------- */
    const scene = new T.Scene();
    scene.background = skyTex;
    scene.fog = new T.Fog(0x12082a, 16, 58);
    const FOV = 42;
    const cam = new T.PerspectiveCamera(FOV, W / H, 0.1, 160);
    const CAM = new T.Vector3(0.15, 6.6, 12.6), LOOK = new T.Vector3(0.1, 0.85, -0.3); // 俯视约 25 度,竖屏里两边一上一下
    const HOME = [new T.Vector3(-1.0, 1.1, 2.2), new T.Vector3(1.05, 1.15, -2.7)];
    const SIZE = [1, 1.12]; // 对手离镜头远,略放大一点
    const add = (o, parent) => { (parent || scene).add(o); return o; };
    const basic = (o) => keep(new T.MeshBasicMaterial(o));
    const glowMat = (color, opacity) => keep(new T.SpriteMaterial({ map: glowTex, color, opacity, blending: T.AdditiveBlending, depthWrite: false, transparent: true }));
    const additive = (color, opacity) => basic({ color, opacity, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });

    // 地面:一个着色器平面,画霓虹网格、擂台、警戒环和跟着节拍扩散的光环
    const floorMat = keep(new T.ShaderMaterial({
      transparent: true, depthWrite: false, premultipliedAlpha: true, extensions: { derivatives: true },
      uniforms: { uTime: { value: 0 }, uPulse: { value: 0 }, uA: { value: new T.Vector3() }, uB: { value: new T.Vector3() } },
      vertexShader: 'varying vec2 vP; void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vP = wp.xz; gl_Position = projectionMatrix * viewMatrix * wp; }',
      fragmentShader: [
        'precision highp float; varying vec2 vP; uniform float uTime; uniform float uPulse; uniform vec3 uA; uniform vec3 uB;',
        'float grid(vec2 p, float size, float w){ vec2 q = p / size; vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q); return 1.0 - smoothstep(0.0, w, min(g.x, g.y)); }',
        'void main(){',
        '  float r = length(vP); float ang = atan(vP.y, vP.x);',
        '  float inside = smoothstep(4.42, 4.26, r);',
        '  float fade = exp(-r * 0.06);',
        '  float g1 = grid(vP, 1.5, 1.3), g2 = grid(vP, 6.0, 1.8);',
        '  vec3 col = mix(vec3(0.34,0.13,0.95), vec3(0.95,0.16,0.82), g2) * (g1 * 0.5 + g2 * 0.55) * fade * mix(1.0, 0.3, inside);',
        '  col += vec3(1.0,0.80,0.16) * smoothstep(0.05, 0.0, abs(r - 4.34)) * 0.95;',                         // 擂台边
        '  float band = smoothstep(4.52, 4.56, r) * smoothstep(4.86, 4.82, r);',
        '  col += vec3(1.0,0.27,0.07) * band * step(0.5, fract(ang * 4.456 + (r - 4.5) * 1.3 - uTime * 0.05)) * 0.8;', // 警戒条纹
        '  col += vec3(0.50,0.24,1.0) * (smoothstep(0.03, 0.0, abs(r - 2.25)) * 0.42 + smoothstep(0.02, 0.0, abs(r - 3.35)) * 0.26);',
        '  float tick = step(0.94, fract(ang * 7.639)) * smoothstep(0.12, 0.0, abs(r - 3.35)) * 0.4;',          // 刻度
        '  col += vec3(0.62,0.34,1.0) * tick;',
        '  float pr = 0.5 + (1.0 - uPulse) * 4.0;',                                                             // 节拍光环
        '  col += vec3(0.86,0.30,1.0) * smoothstep(0.16, 0.0, abs(r - pr)) * uPulse * inside * 0.7;',
        '  vec2 da = vP - uA.xy, db = vP - uB.xy;',                                                             // 两边脚下的光
        '  col += vec3(0.20,0.94,0.88) * exp(-dot(da, da) * 1.5) * uA.z + vec3(1.0,0.35,0.15) * exp(-dot(db, db) * 1.5) * uB.z;',
        '  gl_FragColor = vec4(col, inside * 0.62);',
        '}',
      ].join('\n'),
    }));
    const floor = add(new T.Mesh(keep(new T.PlaneGeometry(120, 120)), floorMat));
    floor.rotation.x = -Math.PI / 2; floor.renderOrder = -2;

    // 擂台后方的一圈光柱,镜头摇动时和擂台有视差
    const pylons = [];
    const pylonGeo = keep(new T.BoxGeometry(0.16, 1, 0.16));
    { // 顶点色:底部最亮,越往上越暗,像一束往上散开的光
      const pos = pylonGeo.attributes.position, c = new Float32Array(pos.count * 3);
      for (let k = 0; k < pos.count; k++) { const v = pos.getY(k) > 0 ? 0.0 : 1.0; c[k * 3] = c[k * 3 + 1] = c[k * 3 + 2] = v; }
      pylonGeo.setAttribute('color', new T.BufferAttribute(c, 3));
    }
    for (let i = 0; i < 13; i++) {
      const a = -Math.PI / 2 + (i - 6) * 0.19, rad = 9.5 + (i % 2) * 3.2, hgt = 7 + ((i * 5) % 4) * 2.4;
      const mat = additive(i % 3 === 1 ? 0xff4a1c : 0x8a3dff, 0.75); mat.vertexColors = true;
      const m = add(new T.Mesh(pylonGeo, mat));
      m.scale.y = hgt; m.position.set(Math.cos(a) * rad + 0.3, hgt / 2, Math.sin(a) * rad);
      const cap = add(new T.Sprite(glowMat(i % 3 === 1 ? 0xff6a2c : 0xa860ff, 0.7))); cap.scale.setScalar(1.6); cap.position.set(m.position.x, 0.15, m.position.z);
      pylons.push(m);
    }
    // 飘浮的光点
    const MOTES = 110, motePos = new Float32Array(MOTES * 3), moteSeed = [];
    for (let i = 0; i < MOTES; i++) { moteSeed.push([Math.random() * 18 - 9, Math.random() * 7, Math.random() * 20 - 13, 0.15 + Math.random() * 0.35]); }
    const moteGeo = keep(new T.BufferGeometry());
    moteGeo.setAttribute('position', new T.BufferAttribute(motePos, 3));
    add(new T.Points(moteGeo, keep(new T.PointsMaterial({ size: 0.13, map: glowTex, color: 0xb884ff, transparent: true, opacity: 0.75, blending: T.AdditiveBlending, depthWrite: false }))));

    /* ---------- 两个战斗核心 ---------- */
    const discGeo = keep(new T.CircleGeometry(0.6, 56));
    const rimGeo = keep(new T.TorusGeometry(0.645, 0.05, 14, 72));
    const gyroGeo = [keep(new T.TorusGeometry(0.86, 0.013, 8, 80)), keep(new T.TorusGeometry(1.0, 0.011, 8, 80))];
    const shardGeo = keep(new T.OctahedronGeometry(0.075));
    const hexGeo = keep(new T.CircleGeometry(0.98, 6));
    const padGeo = keep(new T.RingGeometry(0.78, 0.86, 6));
    const cueGeo = keep(new T.TorusGeometry(1, 0.022, 8, 72));
    const fighters = [0, 1].map((i) => {
      const f = { i, g: add(new T.Group()), pos: HOME[i].clone() };
      f.bill = add(new T.Group(), f.g); // 始终正对镜头的部分
      f.halo = add(new T.Sprite(glowMat(TEAM[i], 0.5)), f.bill); f.halo.scale.setScalar(3.1); f.halo.position.z = -0.05;
      f.disc = add(new T.Mesh(discGeo, basic({ map: face[i] })), f.bill);
      f.rimBack = add(new T.Mesh(keep(new T.CircleGeometry(0.66, 56)), basic({ color: 0x0b0716 })), f.bill); f.rimBack.position.z = -0.01;
      f.rim = add(new T.Mesh(rimGeo, basic({ color: TEAM[i] })), f.bill);
      f.flash = add(new T.Mesh(discGeo, additive(0xffffff, 0)), f.bill); f.flash.position.z = 0.02;
      f.gyro = gyroGeo.map((geo, k) => { const m = add(new T.Mesh(geo, additive(k ? TEAM[i] : TEAM_HOT[i], 0.85)), f.g); m.rotation.set(1.1 + k * 0.5, k * 1.3, 0); return m; });
      f.shards = [0, 1, 2].map(() => add(new T.Mesh(shardGeo, basic({ color: TEAM_HOT[i] })), f.g));
      f.pad = add(new T.Mesh(padGeo, additive(TEAM[i], 0.75))); f.pad.rotation.x = -Math.PI / 2; f.pad.position.set(HOME[i].x, 0.02, HOME[i].z);
      f.shield = add(new T.Mesh(hexGeo, keep(new T.MeshBasicMaterial({ map: hexTex, color: TEAM[i], transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }))));
      if (i === 0) { f.cue = add(new T.Mesh(cueGeo, additive(0xffffff, 0)), f.bill); f.cue.position.z = 0.03; }
      return f;
    });

    /* ---------- 特效池 ---------- */
    const UP = new T.Vector3(0, 1, 0), tmp = new T.Vector3(), tmp2 = new T.Vector3(), dummy = new T.Object3D(), col = new T.Color(), WHITE = new T.Color(1, 1, 1), camOff = new T.Vector3();
    const fx = [];
    const flashes = [0, 1, 2, 3].map(() => { const s = add(new T.Sprite(glowMat(0xffffff, 0))); s.visible = false; return s; });
    const ringGeo = keep(new T.RingGeometry(0.93, 1, 72));
    const rings = [0, 1, 2, 3, 4, 5].map(() => { const m = add(new T.Mesh(ringGeo, additive(0xffffff, 0))); m.visible = false; return m; });
    const trails = Array.from({ length: 16 }, () => { const s = add(new T.Sprite(glowMat(0xffffff, 0))); s.visible = false; s.userData.life = 0; return s; });
    let trailIdx = 0, flashIdx = 0, ringIdx = 0;
    const SP = 220, spPos = new Float32Array(SP * 3), spCol = new Float32Array(SP * 3), sp = Array.from({ length: SP }, () => ({ life: 0, max: 1, v: new T.Vector3(), c: new T.Color() }));
    const spGeo = keep(new T.BufferGeometry());
    spGeo.setAttribute('position', new T.BufferAttribute(spPos, 3)); spGeo.setAttribute('color', new T.BufferAttribute(spCol, 3));
    const sparks = add(new T.Points(spGeo, keep(new T.PointsMaterial({ size: 0.24, map: glowTex, vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false }))));
    sparks.frustumCulled = false;
    let spIdx = 0;
    const CUBES = 80, cubeMesh = [0, 1].map((i) => { const m = add(new T.InstancedMesh(keep(new T.BoxGeometry(0.1, 0.1, 0.1)), basic({ color: 0xffffff }), CUBES)); m.count = 0; m.frustumCulled = false; for (let k = 0; k < CUBES; k++) m.setColorAt(k, col.set(TEAM[i]).lerp(WHITE, Math.random() * Math.random() * 0.8)); return m; });
    const cubes = [[], []];
    const beam = add(new T.Group()); beam.visible = false;
    const beamOuter = add(new T.Mesh(keep(new T.CylinderGeometry(0.34, 0.34, 1, 20, 1, true)), additive(TEAM[0], 0.55)), beam);
    const beamCore = add(new T.Mesh(keep(new T.CylinderGeometry(0.13, 0.13, 1, 14, 1, true)), additive(0xffffff, 0.95)), beam);

    function spawnSparks(at, n, color, speed, up) {
      for (let k = 0; k < n; k++) {
        const p = sp[spIdx]; const j = spIdx * 3; spIdx = (spIdx + 1) % SP;
        spPos[j] = at.x; spPos[j + 1] = at.y; spPos[j + 2] = at.z;
        const a = Math.random() * Math.PI * 2, b = Math.acos(Math.random() * 2 - 1), v = speed * (0.35 + Math.random() * 0.9);
        p.v.set(Math.sin(b) * Math.cos(a) * v, Math.abs(Math.cos(b)) * v * (up || 0.7) + 0.6, Math.sin(b) * Math.sin(a) * v);
        p.max = p.life = 0.35 + Math.random() * 0.5;
        p.c.set(Math.random() < 0.3 ? 0xffffff : color);
      }
    }
    function spawnFlash(at, color, size, dur) {
      const s = flashes[flashIdx]; flashIdx = (flashIdx + 1) % flashes.length;
      s.position.copy(at); s.material.color.set(color); s.visible = true;
      fx.push({ t: 0, dur, step(u) { s.scale.setScalar(size * (0.35 + 0.65 * (1 - Math.pow(1 - u, 3)))); s.material.opacity = (1 - u) * (1 - u); if (u >= 1) s.visible = false; } });
    }
    function spawnRing(at, color, size, dur, flat) {
      const m = rings[ringIdx]; ringIdx = (ringIdx + 1) % rings.length;
      m.position.copy(at); m.material.color.set(color); m.visible = true;
      if (flat) { m.rotation.set(-Math.PI / 2, 0, 0); m.position.y = 0.04; } else m.quaternion.copy(cam.quaternion);
      fx.push({ t: 0, dur, step(u) { m.scale.setScalar(0.25 + size * (1 - Math.pow(1 - u, 2.4))); m.material.opacity = 0.9 * (1 - u); if (u >= 1) m.visible = false; } });
    }

    /* ---------- 每帧 ---------- */
    let shake = 0, zoom = 0, last = -1;
    const camPos = new T.Vector3(), camLook = new T.Vector3();
    function placeFighter(f, P, S) {
      const i = f.i, other = HOME[1 - i];
      // 进场:从场外旋转着飞进来
      const en = S.enter[i], home = HOME[i];
      tmp.copy(other).sub(home); // 冲向对手的方向
      const reach = 0.8;
      f.pos.copy(home).addScaledVector(tmp, P.adv * reach);
      f.pos.y = home.y + Math.sin(S.t * 2.1 + i * 2) * 0.05 + Math.sin(Math.max(0, Math.min(1, P.adv)) * Math.PI) * 0.55 + P.rise * 0.5;
      if (en < 1) { const u = 1 - en; f.pos.x += (i ? 5.5 : -5.5) * u * u; f.pos.y += 3.2 * u; }
      let scale = SIZE[i] * (1 + P.charge * 0.07);
      if (S.ko && S.ko.who === i) { // 被击破:飘向场地中央,闪烁、缩小
        const u = S.ko.u;
        f.pos.lerp(tmp2.set(0.05, 1.7, -0.2), u * u * (3 - 2 * u));
        scale *= 1 - 0.45 * u * u;
        f.g.visible = S.ko.u < 1 && !(u > 0.55 && Math.sin(S.t * 70) > 0.2);
      } else f.g.visible = true;
      if (S.victory && S.victory.who === i) { f.pos.y += 0.35 * S.victory.u; scale *= 1 + 0.12 * S.victory.u; }
      f.g.position.copy(f.pos);
      f.g.scale.setScalar(scale);
      f.bill.quaternion.copy(cam.quaternion);
      f.bill.rotation.z += (1 - en) * (1 - en) * 9 + (S.ko && S.ko.who === i ? S.ko.u * S.ko.u * 5 : 0);
      const hot = P.charge + (S.victory && S.victory.who === i ? S.victory.u * 0.6 : 0);
      f.halo.material.opacity = 0.42 + hot * 0.5 + S.pulse * 0.1; f.halo.scale.setScalar(3.0 + hot * 1.3);
      f.flash.material.opacity = Math.min(0.6, P.hurt * 0.6);
      col.set(TEAM[i]).lerp(WHITE, Math.min(1, hot * 0.75 + P.hurt)); f.rim.material.color.copy(col);
      const spin = S.t * (1.1 + hot * 5);
      f.gyro[0].rotation.set(1.15 + Math.sin(S.t * 0.7) * 0.25, spin * 0.9, spin * 0.5);
      f.gyro[1].rotation.set(spin * 0.6, 0.6 + Math.cos(S.t * 0.5) * 0.3, -spin * 0.8);
      f.shards.forEach((m, k) => { const a = S.t * (1.6 + hot * 3) + k * 2.094; m.position.set(Math.cos(a) * 1.16, Math.sin(a * 1.3 + k) * 0.32, Math.sin(a) * 1.16); m.rotation.set(a, a * 1.7, 0); });
      f.pad.material.opacity = 0.5 + S.pulse * 0.4; f.pad.rotation.z = S.t * (i ? -0.4 : 0.4);
      // 护盾立在自己和对手之间
      const sh = f.shield; sh.visible = P.guard > 0.01;
      if (sh.visible) { tmp.copy(other).sub(home).normalize(); sh.position.copy(f.pos).addScaledVector(tmp, 0.75); sh.lookAt(other.x, f.pos.y, other.z); sh.material.opacity = Math.min(1, P.guard * 1.6); sh.scale.setScalar(1.5 - 0.3 * P.guard); }
      if (f.cue) { // 格挡提示环:合拢到头像边缘的瞬间就是对手击中的瞬间
        const c = P.cue; f.cue.visible = c >= 0;
        if (c >= 0) { f.cue.scale.setScalar(0.7 + (1 - c) * 1.5); f.cue.material.opacity = 0.25 + c * 0.75; f.cue.material.color.set(c > 0.72 ? 0xffffff : TEAM[0]); }
      }
      // 高速移动时留下残影
      const sp2 = f.pos.distanceTo(f.prev || f.pos);
      if (sp2 > 0.09 && en >= 1) { const s = trails[trailIdx]; trailIdx = (trailIdx + 1) % trails.length; s.position.copy(f.pos); s.material.color.set(TEAM[i]); s.userData.life = 1; s.visible = true; }
      (f.prev || (f.prev = new T.Vector3())).copy(f.pos);
    }

    const api = {
      kind: '3d',
      render(S) {
        const dt = last < 0 ? 0.016 : Math.min(0.1, Math.max(0, S.t - last)); last = S.t;
        // 镜头:轻微摇摆;蓄力时推近;击破时对准被击破的一方
        shake *= Math.exp(-dt * 9); zoom += ((S.focus ? S.focus.k : 0) - zoom) * Math.min(1, dt * 7);
        camPos.copy(CAM); camLook.copy(LOOK);
        camPos.x += Math.sin(S.t * 0.33) * 0.55; camPos.y += Math.sin(S.t * 0.21) * 0.15;
        if (S.focus) { tmp.copy(fighters[S.focus.who].pos); camPos.lerp(tmp2.copy(tmp).add(camOff.set(0.1, 5.2, 10.2)), zoom * 0.3); camLook.lerp(tmp, zoom * 0.3); }
        camPos.x += Math.sin(S.t * 67) * shake * 0.16; camPos.y += Math.cos(S.t * 53) * shake * 0.13;
        cam.position.copy(camPos); cam.lookAt(camLook);
        cam.fov = FOV - S.pulse * 0.35 - shake * 1.1 - (S.punch || 0) * 2.2; cam.updateProjectionMatrix();

        fighters.forEach((f) => placeFighter(f, S.P[f.i], S));
        floorMat.uniforms.uTime.value = S.t; floorMat.uniforms.uPulse.value = S.pulse;
        floorMat.uniforms.uA.value.set(fighters[0].pos.x, fighters[0].pos.z, fighters[0].g.visible ? 0.6 + S.P[0].charge * 0.6 : 0);
        floorMat.uniforms.uB.value.set(fighters[1].pos.x, fighters[1].pos.z, fighters[1].g.visible ? 0.6 + S.P[1].charge * 0.6 : 0);
        pylons.forEach((m, k) => { m.material.opacity = 0.5 + S.pulse * (k % 2 ? 0.4 : 0.18); });
        for (let i = 0; i < MOTES; i++) { const m = moteSeed[i]; motePos[i * 3] = m[0] + Math.sin(S.t * 0.3 + i) * 0.3; motePos[i * 3 + 1] = (m[1] + S.t * m[3]) % 7; motePos[i * 3 + 2] = m[2]; }
        moteGeo.attributes.position.needsUpdate = true;

        // 爆发光束
        const b = Math.max(S.P[0].beam, S.P[1].beam);
        beam.visible = b > 0.01;
        if (beam.visible) {
          const a = S.P[0].beam > S.P[1].beam ? 0 : 1, from = fighters[a].pos, to = fighters[1 - a].pos;
          tmp.copy(to).sub(from); const len = tmp.length();
          beam.position.copy(from).addScaledVector(tmp, 0.5);
          beam.quaternion.setFromUnitVectors(UP, tmp.normalize());
          const wv = Math.sin(Math.min(1, (1 - b) * 5) * Math.PI / 2) * (0.35 + 0.65 * b);
          beam.scale.set(wv * 1.25, len, wv * 1.25);
          beamOuter.material.color.set(TEAM[a]); beamOuter.material.opacity = 0.5 * b + 0.15; beamCore.material.opacity = Math.min(1, b * 1.6);
        }
        // 特效推进
        for (let k = fx.length - 1; k >= 0; k--) { const e = fx[k]; e.t += dt; e.step(Math.min(1, e.t / e.dur)); if (e.t >= e.dur) fx.splice(k, 1); }
        trails.forEach((s) => { if (!s.visible) return; s.userData.life -= dt * 4.2; if (s.userData.life <= 0) { s.visible = false; return; } s.material.opacity = s.userData.life * 0.5; s.scale.setScalar(1.3 + (1 - s.userData.life) * 0.5); });
        for (let i = 0; i < SP; i++) {
          const p = sp[i], j = i * 3;
          if (p.life <= 0) { spCol[j] = spCol[j + 1] = spCol[j + 2] = 0; continue; }
          p.life -= dt; p.v.y -= 6.5 * dt; p.v.multiplyScalar(1 - 1.6 * dt);
          spPos[j] += p.v.x * dt; spPos[j + 1] = Math.max(0.03, spPos[j + 1] + p.v.y * dt); spPos[j + 2] += p.v.z * dt;
          const k = Math.max(0, p.life / p.max); spCol[j] = p.c.r * k; spCol[j + 1] = p.c.g * k; spCol[j + 2] = p.c.b * k;
        }
        spGeo.attributes.position.needsUpdate = true; spGeo.attributes.color.needsUpdate = true;
        cubes.forEach((list, i) => {
          const mesh = cubeMesh[i]; let n = 0;
          list.forEach((c) => {
            if (c.life <= 0) return;
            c.life -= dt; c.v.y -= 7 * dt; c.p.addScaledVector(c.v, dt);
            if (c.p.y < 0.07) { c.p.y = 0.07; c.v.y *= -0.38; c.v.x *= 0.7; c.v.z *= 0.7; }
            dummy.position.copy(c.p); dummy.rotation.set(c.r.x += c.w.x * dt, c.r.y += c.w.y * dt, 0); dummy.scale.setScalar(c.s * Math.min(1, c.life * 2.2)); dummy.updateMatrix();
            mesh.setMatrixAt(n++, dummy.matrix);
          });
          mesh.count = n; mesh.instanceMatrix.needsUpdate = true;
        });
        renderer.render(scene, cam);
      },
      // ev: {a 进攻方, burst, blocked, dead}
      impact(ev) {
        const d = fighters[1 - ev.a], a = fighters[ev.a];
        tmp.copy(a.pos).sub(d.pos).normalize();
        const at = d.pos.clone().addScaledVector(tmp, ev.burst ? 0.1 : 0.62);
        if (ev.blocked) {
          spawnFlash(at, TEAM[1 - ev.a], 2.6, 0.26); spawnRing(at, TEAM_HOT[1 - ev.a], 2.0, 0.34);
          spawnSparks(at, 26, TEAM[1 - ev.a], 5.5, 0.5); shake = Math.max(shake, 0.45);
        } else {
          spawnFlash(at, ev.burst ? 0xffffff : 0xfff0b0, ev.burst ? 6.5 : 3.8, ev.burst ? 0.5 : 0.3);
          spawnRing(at, TEAM_HOT[ev.a], ev.burst ? 4.2 : 2.6, ev.burst ? 0.5 : 0.36);
          spawnRing(tmp2.set(d.pos.x, 0, d.pos.z), TEAM[ev.a], ev.burst ? 5 : 3, 0.55, true);
          spawnSparks(at, ev.burst ? 70 : 38, ev.burst ? 0xff7af0 : 0xffd45a, ev.burst ? 9 : 6.5, 0.8);
          shake = Math.max(shake, ev.burst ? 1.5 : 0.85);
        }
      },
      // 被击破的一方碎成方块(原版是碎成一片像素块)
      shatter(who) {
        const f = fighters[who], list = cubes[who];
        list.length = 0;
        for (let k = 0; k < CUBES; k++) {
          const a = Math.random() * Math.PI * 2, b = Math.acos(Math.random() * 2 - 1), v = 2.2 + Math.random() * 5;
          list.push({ p: f.pos.clone().add(tmp.set((Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.3)), v: new T.Vector3(Math.sin(b) * Math.cos(a) * v, Math.abs(Math.cos(b)) * v + 1.5, Math.sin(b) * Math.sin(a) * v), r: new T.Vector3(a, b, 0), w: new T.Vector3(Math.random() * 9, Math.random() * 9, 0), s: 0.35 + Math.random() * 0.75, life: 1.0 + Math.random() * 1.2 });
        }
        spawnFlash(f.pos, 0xffffff, 7, 0.55); spawnRing(f.pos, TEAM[who], 4.5, 0.6); spawnSparks(f.pos, 60, TEAM_HOT[who], 8, 1);
        shake = Math.max(shake, 1.2);
      },
      // 把某一方在画面上的位置换算成舞台坐标(给飘字用)
      project(who, dy) {
        tmp.copy(fighters[who].pos); tmp.y += dy || 0; tmp.project(cam);
        return [(tmp.x * 0.5 + 0.5) * W, (-tmp.y * 0.5 + 0.5) * H];
      },
      destroy() {
        disposables.forEach((o) => o.dispose && o.dispose());
        cubeMesh.forEach((m) => m.dispose());
        renderer.dispose();
        if (renderer.forceContextLoss) renderer.forceContextLoss();
        cv.remove();
      },
    };
    return api;
  };

  // 懒加载 three.js:进主页后在后台先加载好,第一场战斗就不用等
  let loading = null;
  NL.loadThree = function () {
    if (window.THREE) return Promise.resolve(true);
    if (!loading) loading = new Promise((ok) => {
      const s = document.createElement('script');
      s.src = 'vendor/three.min.js';
      s.onload = () => ok(!!window.THREE);
      s.onerror = () => { loading = null; ok(false); };
      document.head.appendChild(s);
    });
    return loading;
  };
})();
