/* 법조인 키우기 — 스킬 v4: 직업별 기본 공격 · 스킬 32종 · 투사체 · 장판 · 이펙트 */
'use strict';

// ======================================================================
// 기본 공격 — 근거리(melee) · 중거리(wave/lash) · 원거리(shot)
// ======================================================================
function startAttack() {
  const p = player, b = job().basic;
  if (job().mech === 'evidence' && p.evid >= 5) { indict(); return; }
  p.combo = p.comboWin > 0 ? (p.combo % 3) + 1 : 1;
  p.atkDur = b.rate * (p.combo === 3 ? 1.35 : 1); p.atkT = p.atkDur; p.hitDone = false;
  if (!p.onGround) p.vy = Math.min(p.vy, -60);
  SFX.play(b.k === 'shot' ? 'shot' : 'swing');
}
function meleeBox(face, r, h, dmg, o = {}) {
  const p = player; const x0 = face > 0 ? p.x - 8 : p.x - r, y0 = p.y - h - (o.yOff || 0) + (o.yOff ? h / 2 : 0);
  let n = 0; const mech = job().mech;
  if (scene === 'stage') for (const m of W.mobs) {
    if (m.dead || !hitBox(m, x0, y0, r + 8, h)) continue;
    damageMob(m, dmg, { kb: o.kb ?? 90, src: p.x, heavy: o.heavy, up: o.up, stun: o.stun, color: o.color, basic: o.basic && n < 3 ? 'melee' : null });
    if (o.basic && !m.dead && !m.boss && !m.mid && !m.fake && (mech === 'evidence' || mech === 'card') && m.hp < m.max * (mech === 'card' ? 0.15 : 0.18)) execute(m, mech);
    n++;
  }
  if (o.basic && n && mech === 'evidence' && p.evid < 5) { p.evid++; if (p.evid === 5) { W.texts.push({ x: p.x, y: p.y - 92, s: '기소 준비!', c: '#ff6b5c', t: 0, big: true }); SFX.play('level'); showGuide('g_evidence'); } }
  for (const pr of W.props) { if (pr.dead || Math.abs(pr.y - p.y) > 50) continue; if (pr.x > x0 - 14 && pr.x < x0 + r + 22) hitProp(pr); }
  return n;
}
function basicHit() {
  const p = player, j = job(), b = j.basic, st = stats();
  const c = p.combo, mult = [0, 1, 1.1, 1.6][c] * (buff('cram') ? 1.3 : 1);
  const dmg = st.atk * mult, col = j.color, big = c === 3;
  if (b.k === 'melee') {
    const r = b.range * (big ? 1.25 : 1);
    W.fx.push({ k: 'slash', x: p.x + p.face * 10, y: p.y - 34, r, face: p.face, color: col, t: 0, dur: 0.2, combo: c, w: big ? 14 : 9 });
    if (meleeBox(p.face, r, 66, dmg, { kb: big ? 230 : 90, heavy: big, up: big ? 220 : 0, basic: true }) && big) { cam.shake = 5; fxRing(p.x + p.face * r * 0.6, p.y - 10, 40, col); }
  } else if (b.k === 'wave') {
    W.fx.push({ k: 'slash', x: p.x + p.face * 10, y: p.y - 34, r: b.melee, face: p.face, color: col, t: 0, dur: 0.16, combo: c, w: 7 });
    meleeBox(p.face, b.melee, 60, dmg, { kb: 80, basic: true });
    const sp = big ? 430 : 380;
    W.pprj.push({ k: b.proj, x: p.x + p.face * 22, y: p.y - 34, vx: p.face * sp, vy: 0, r: big ? 14 : 9, dmg: dmg * 0.5, pierce: big ? 3 : 0, hit: new Set(), life: (b.dist * (big ? 1.3 : 1)) / sp, rot: 0, face: p.face, color: col, sc: big ? 1.45 : 1, tr: [], basic: 'proj' });
  } else if (b.k === 'shot') {
    const sp = 460; const n = big ? 3 : 1; const aim = aimAngle(p, b.dist);
    for (let i = 0; i < n; i++) { const a = aim + (i - (n - 1) / 2) * 0.12; W.pprj.push({ k: b.proj, x: p.x + p.face * 24, y: p.y - 40, vx: Math.cos(a) * p.face * sp, vy: Math.sin(a) * sp, r: big ? 11 : 9, dmg: dmg * (big ? 0.8 : 1), pierce: b.pierce || 0, hit: new Set(), life: b.dist / sp, face: p.face, color: col, sc: big ? 1.3 : 1, tr: [], basic: 'melee' }); }
    fxSparkle(p.x + p.face * 26, p.y - 40, col, 5);
  } else if (b.k === 'lash') {
    const r = b.range * (big ? 1.2 : 1);
    W.fx.push({ k: 'lash', x: p.x + p.face * 8, y: p.y - 38, r, face: p.face, t: 0, dur: 0.24, color: '#d9e2ff', big });
    meleeBox(p.face, r, 36, dmg, { kb: big ? 200 : 110, yOff: 22, heavy: big, basic: true });
    if (big) SFX.play('chain');
  }
}
// 원거리 조준: 앞쪽 34° 안의 가장 가까운 적(위·아래층 포함)을 향해 비스듬히 쏜다
const AIM_MAX = 0.6;
function aimAngle(p, dist) {
  let best = null, bd = 1e9; const sx = p.x + p.face * 24, sy = p.y - 40;
  for (const m of W.mobs) {
    if (m.dead || m.fake) continue;
    const dx = (m.x - sx) * p.face, dy = (m.y - m.h * 0.5) - sy; if (dx < 10 || dx > dist) continue;
    const a = Math.atan2(dy, dx); if (Math.abs(a) > AIM_MAX) continue;
    const d = Math.hypot(dx, dy); if (d < bd) { bd = d; best = a; }
  }
  return best == null || Math.abs(best) < 0.08 ? 0 : best;
}
// 구속(검사) · 인수합병(CEO): 빈사의 일반 몬스터를 즉시 처치
function execute(m, kind) {
  const p = player, st = stats();
  m.hp = 0; killMob(m);
  if (kind === 'evidence') {
    W.fx.push({ k: 'jail', x: m.x, y: m.y, h: m.h, t: 0, dur: 0.9 });
    W.texts.push({ x: m.x, y: m.y - m.h - 12, s: '구속!', c: '#ff6b5c', t: 0, big: true });
    p.hp = Math.min(st.hp, p.hp + st.hp * 0.025); p.mp = Math.min(st.mp, p.mp + 6); SFX.play('chain');
  } else {
    dropCoins(m.x, m.y - m.h / 2, SCALE.gold(W.g || 0) * 2 * st.gold, 5); p.hp = Math.min(st.hp, p.hp + st.hp * 0.03);
    W.texts.push({ x: m.x, y: m.y - m.h - 12, s: 'M&A!', c: '#ffd24d', t: 0, big: true }); fxSpark(m.x, m.y - m.h / 2, '#ffd24d', 14); SFX.play('coin');
  }
  hitStop = Math.max(hitStop, 0.06); cam.shake = Math.max(cam.shake, 4);
}
// 기소: 증거 5개를 모아 내려찍는 일격
function indict() {
  const p = player, st = stats(); p.evid = 0;
  p.combo = 3; p.atkDur = 0.44; p.atkT = p.atkDur; p.hitDone = true; p.castT = 0.3; p.comboWin = 0;
  const face = p.face;
  W.fx.push({ k: 'slash', x: p.x + face * 10, y: p.y - 40, r: 100, face, color: '#ff3b2f', t: 0, dur: 0.26, combo: 3, w: 18, rot: -0.8 });
  SFX.play('swing');
  later(0.12, () => {
    if (!W || p.dead) return;
    const x = p.x + face * 48;
    W.fx.push({ k: 'indict', x, gy: p.y, t: 0, dur: 0.8 });
    circleHit(x, p.y - 30, 118, st.atk * 4.5, { stun: 1.2, kb: 260, up: 240, heavy: true, color: '#ff3b2f', props: true });
    fxRing(x, p.y - 6, 118, '#ff3b2f'); fxShockDust(x, p.y); cam.shake = 12; hitStop = 0.08; SFX.play('boom');
    W.fx.push({ k: 'callout', s: '기소!', x: p.x, y: p.y - 84, t: 0, dur: 1, color: '#ff3b2f' });
  });
}
// ======================================================================
// 스킬
// ======================================================================
function rumorPenalty(id) { return W && W.rumorSet && W.rumorSet.includes(4) && player.lastSkill === id ? 0.6 : 1; }
function skillMul(id) { const lv = Math.max(1, skillLv(id)); return SKILLS[id].mult * (1 + 0.12 * (lv - 1)) * stats().skill * (SKILLS[id].job === S.job ? 1 : 0.9); }
const evoOf = (id) => (skillLv(id) >= 10 ? 2 : skillLv(id) >= 5 ? 1 : 0);
let lastDeny = 0;
function castSkill(i) {
  const p = player; const id = S.loadout[i]; const sk = SKILLS[id]; const slot = 's' + (i + 1);
  if (p.dead) return;
  if (!sk || !skillLv(id)) { if (performance.now() - lastDeny > 1200) { lastDeny = performance.now(); toast(i >= skillSlots() ? '이 칸은 2차 전직 후 열립니다' : '빈 스킬 칸 · 메뉴 → 스킬에서 넣으세요'); SFX.play('deny'); } return; }
  if (p.cds[slot] > 0 || p.dashT > 0 || p.climb) return;
  const st = stats();
  if (!canCast(id, performance.now() - lastDeny < 1200)) { if (performance.now() - lastDeny > 1200) { lastDeny = performance.now(); SFX.play('deny'); } return; }
  payCast(id); p.cds[slot] = sk.cd * (1 - st.cdr) * (1 - 0.015 * (skillLv(id) - 1));
  p.castT = 0.32; p.atkT = 0;
  const dmg = st.atk * skillMul(id) * rumorPenalty(id) * mechSkillMul();
  const evo = evoOf(id);
  p.lastSkill = id;
  const col = JOBS[sk.job].color;
  W.fx.push({ k: 'callout', s: sk.name + (evo === 2 ? ' ★' : evo === 1 ? ' +' : ''), x: p.x, y: p.y - 78, t: 0, dur: 0.9, color: col });
  if (evo) { fxRing(p.x, p.y - 30, 40 + evo * 16, col); if (evo === 2) fxSparkle(p.x, p.y - 34, col, 12); }
  SFX.play('skill');
  SK[id](p, dmg, st, evo);
}
function castUlt() {
  const p = player, j = job(), st = stats();
  if (p.dead || p.climb) return;
  if (p.ult < 100) { if (performance.now() - lastDeny > 1200) { lastDeny = performance.now(); toast('궁극기 게이지가 부족합니다 (적을 때리면 찹니다)'); } return; }
  p.ult = 0; p.castT = 0.6; p.atkT = 0;
  const id = ultId(); const sk = SKILLS[id];
  const portrait = frameURL(j.anim[0], j.anim[1], HF.cast);
  W.cutin = { t: 0, dur: sk.awak ? 1.0 : 0.75, name: sk.name, color: j.color, an: j.anim, awak: !!sk.awak, job: jobName() };
  timeScale = 0.12; SFX.play('skill'); BGM.jingle(sk.awak ? 'job' : 'win');
  later(sk.awak ? 0.9 : 0.65, () => {
    if (!W || !player) return; timeScale = 1; W.cutin = null;
    SFX.play('boom'); cam.shake = 12; hitStop = 0.08;
    W.fx.push({ k: 'flash', t: 0, dur: 0.35, color: j.color });
    SK[id](player, stats().atk * sk.mult * stats().skill * mechSkillMul(), stats(), 0);
  });
  void portrait;
}
const visibleMobs = () => liveMobs().filter((m) => !m.fake && m.x > cam.x - 30 && m.x < cam.x + viewW + 30);
function nearestMob(x, maxD, exclude) {
  let best = null, bd = maxD;
  for (const m of liveMobs()) { if (m.fake || (exclude && exclude.has(m))) continue; const d = Math.abs(m.x - x); if (d < bd) { bd = d; best = m; } }
  return best;
}
function areaHit(x0, y0, x1, y1, dmg, o = {}) {
  let n = 0;
  for (const m of liveMobs()) { if (!hitBox(m, Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0))) continue; damageMob(m, dmg, { kb: o.kb ?? 0, src: o.src ?? player.x, stun: o.stun, heavy: o.heavy, up: o.up, color: o.color, quiet: n > 2 }); if (o.slow) m.slow = Math.max(m.slow, o.slow); n++; }
  if (o.props) for (const pr of W.props) if (!pr.dead && pr.x > Math.min(x0, x1) - 14 && pr.x < Math.max(x0, x1) + 14) hitProp(pr);
  return n;
}
function circleHit(x, y, r, dmg, o = {}) { return areaHit(x - r, y - r, x + r, y + r, dmg, o); }

const SK = {
  // ---------------- 대학생 ----------------
  st1(p, dmg, st, e) {
    p.dashT = 0.24 * (e ? 1.25 : 1); p.dashV = p.face * 680; p.castT = 0.26;
    W.areas.push({ follow: true, ox0: -20, ox1: 40, y0: -62, y1: 0, dmg, once: true, hit: new Set(), dur: 0.3 * (e ? 1.25 : 1), t: 0, kb: 170, color: '#ffe45c' });
    p.onDashEnd = () => { W.fx.push({ k: 'slash', x: p.x + p.face * 16, y: p.y - 34, r: 70, face: p.face, color: '#ffe45c', t: 0, dur: 0.22, combo: 3, w: 14 }); if (e >= 2) explode(p.x + p.face * 40, p.y - 30, 80, dmg * 1.2, '#ffe45c'); };
  },
  st2(p, dmg, st, e) {
    const lines = e ? [-16, -50] : [-16];
    for (const off of lines) {
      const x0 = p.x + p.face * 20, x1 = p.x + p.face * 280, y = p.y + off;
      W.fx.push({ k: 'underline', x0, x1, y, t: 0, dur: 0.75, fuse: 0.45, color: '#ffe45c' });
      later(0.45, () => { if (!W || scene !== 'stage') return; areaHit(x0, y - 60, x1, y + 16, dmg, { kb: 60, up: 160, color: '#ffe45c', props: true }); cam.shake = 6; SFX.play('zap'); for (let x = Math.min(x0, x1); x < Math.max(x0, x1); x += 18) fxSpark(x, y, '#ffe45c', 2); if (e >= 2) W.areas.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0: y - 40, y1: y + 10, dmg: dmg * 0.2, every: 0.3, t: 0, next: 0.3, dur: 2, color: '#ffe45c', burn: true }); });
    }
  },
  st3(p, dmg, st, e) {
    const n = e ? 10 : 7; p.castT = 0.12 * n + 0.1;
    for (let i = 0; i < n; i++) later(i * 0.1, () => { if (!W || p.dead) return; const last = i === n - 1; W.fx.push({ k: 'slash', x: p.x + p.face * 14, y: p.y - 30 - rand(-10, 10), r: last ? 90 : 70, face: p.face, color: last ? '#fff36b' : '#ffe45c', t: 0, dur: 0.14, combo: (i % 2) + 1, w: last ? 14 : 8, rot: rand(-0.5, 0.5) }); meleeBox(p.face, last ? 90 : 78, 70, dmg * (last ? 2.2 : 1), { kb: last ? 200 : 30, up: last ? 300 : 0, heavy: last, color: '#ffe45c' }); SFX.play('swing'); if (last && e >= 2) W.pprj.push({ k: 'pshock', x: p.x, y: GROUND - 8, vx: p.face * 360, vy: 0, r: 16, dmg: dmg * 2, pierce: 99, hit: new Set(), life: 0.9, color: '#ffe45c', ground: true, gy: p.y }); });
  },
  st_u(p, dmg) {
    for (let i = 0; i < 24; i++) W.pprj.push({ k: 'exam', x: cam.x + 10 + i * (viewW - 20) / 23 + rand(-6, 6), y: cam.y - 30 - rand(0, 200), vx: rand(-20, 20), vy: 260, r: 12, dmg: dmg * 0.9, pierce: 4, hit: new Set(), life: 3, rot: rand(0, 6), vr: rand(-4, 4), land: 'stampF' });
  },
  // ---------------- 로스쿨생 ----------------
  ls1(p, dmg, st, e) {
    const n = 1 + e;
    for (let i = 0; i < n; i++) { const a = (i - (n - 1) / 2) * 0.22; W.pprj.push({ k: 'bookrang', x: p.x + p.face * 20, y: p.y - 36, vx: Math.cos(a) * p.face * 470, vy: Math.sin(a) * 470, r: 14, dmg, pierce: 99, hit: new Set(), life: 1.6, rot: 0, vr: 18, t: 0, face: p.face, tr: [] }); }
  },
  ls2(p, dmg, st, e) {
    const n = [5, 7, 9][e];
    for (let i = 0; i < n; i++) W.pprj.push({ k: 'pcard', x: p.x, y: p.y - 40, vx: 0, vy: 0, r: 9, dmg, pierce: e >= 2 ? 1 : 0, hit: new Set(), life: 3.2, t: 0, orbitT: 0.9 + i * 0.07, ang: i * Math.PI * 2 / n, hue: i, rot: 0, tr: [] });
  },
  ls3(p, dmg, st, e) {
    const hit = new Set(); let src = { x: p.x + p.face * 20, y: p.y - 40 };
    let first = null; let bd = 280;
    for (const m of liveMobs()) { if (m.fake) continue; const dx = (m.x - p.x) * p.face; if (dx > -20 && dx < bd && Math.abs(m.y - p.y) < 120) { bd = dx; first = m; } }
    let cur = first; let i = 0; const maxN = [6, 8, 10][e];
    while (cur && i < maxN) {
      const tgt = cur; const from = { ...src }; const to = { x: tgt.x, y: tgt.y - tgt.h * 0.5 };
      later(i * 0.07, () => { if (!W) return; W.fx.push({ k: 'bolt', x0: from.x, y0: from.y, x1: to.x, y1: to.y, t: 0, dur: 0.3, color: '#ffe26b', seed: Math.random() }); damageMob(tgt, dmg, { stun: e >= 2 ? 1 : 0.4, color: '#ffe26b' }); SFX.play('zap'); });
      hit.add(cur); src = to; i++;
      let nx = null, nd = 170; for (const m of liveMobs()) { if (m.fake || hit.has(m)) continue; const d = Math.hypot(m.x - to.x, (m.y - m.h / 2) - to.y); if (d < nd) { nd = d; nx = m; } }
      cur = nx;
    }
    if (!first) W.fx.push({ k: 'bolt', x0: src.x, y0: src.y, x1: src.x + p.face * 140, y1: src.y + rand(-20, 20), t: 0, dur: 0.25, color: '#ffe26b', seed: Math.random() });
  },
  ls_u(p, dmg) {
    for (let i = 0; i < 18; i++) W.pprj.push({ k: 'book', x: cam.x + 20 + i * (viewW - 40) / 17 + rand(-8, 8), y: cam.y - 20 - rand(0, 180), vx: 0, vy: 320, r: 13, dmg: dmg * 1.1, pierce: 3, hit: new Set(), life: 2.6, rot: rand(0, 6), vr: rand(-6, 6), land: 'dust' });
  },
  // ---------------- 어쏘변호사 ----------------
  as1(p, dmg, st, e) {
    const n = [5, 7, 9][e];
    for (let i = 0; i < n; i++) { const a = (i - (n - 1) / 2) * 0.12; W.pprj.push({ k: 'brief', x: p.x + p.face * 18, y: p.y - 36, vx: Math.cos(a) * p.face * 450, vy: Math.sin(a) * 450, r: 10, dmg, pierce: e >= 2 ? 5 : 3, hit: new Set(), life: 0.75, face: p.face, tr: [] }); }
  },
  as2(p, dmg, st, e) {
    const n = 3 + e;
    for (let i = 0; i < n; i++) W.pprj.push({ k: 'tag', x: p.x + p.face * 18, y: p.y - 40, vx: p.face * (360 + i * 50), vy: -60 + i * 40, r: 9, dmg, pierce: 0, hit: new Set(), life: 1.2, rot: 0, vr: 10, delay: i * 0.07, stick: true, boomR: e >= 2 ? 82 : 58 });
  },
  as3(p, dmg, st, e) {
    p.dashT = 0.14; p.dashV = -p.face * 480; p.castT = 0.4;
    const face = p.face, x0 = p.x, n = [6, 8, 10][e];
    for (let i = 0; i < n; i++) later(0.12 + i * 0.08, () => { if (!W) return; W.pprj.push({ k: 'crate', x: x0 + face * (80 + i * (300 / n) * 1.0) + rand(-8, 8), y: cam.y - 10, vx: 0, vy: 520, r: 16, dmg, pierce: 99, hit: new Set(), life: 2.5, land: 'crate', rot: rand(-0.3, 0.3) }); });
  },
  as_u(p, dmg) {
    for (let w = 0; w < 3; w++) for (let i = 0; i < 9; i++) W.pprj.push({ k: 'brief', x: p.x, y: p.y - 34, vx: p.face * (300 + w * 70), vy: (i - 4) * 42, r: 10, dmg: dmg * 0.9, pierce: 4, hit: new Set(), life: 1.5 + w * 0.2, face: p.face, delay: w * 0.16, tr: [] });
  },
  as_u2(p, dmg) {
    for (let i = 0; i < 14; i++) W.pprj.push({ k: 'case', x: cam.x + 20 + i * (viewW - 40) / 13 + rand(-10, 10), y: cam.y - 40 - rand(0, 220), vx: 0, vy: 360, r: 16, dmg: dmg * 1.1, pierce: 5, hit: new Set(), life: 3, rot: rand(-0.4, 0.4), vr: rand(-3, 3), land: 'goldboom' });
    for (let w = 0; w < 3; w++) for (let i = 0; i < 11; i++) W.pprj.push({ k: 'brief', gold: true, x: p.x, y: p.y - 34, vx: p.face * (320 + w * 80), vy: (i - 5) * 40, r: 11, dmg: dmg * 0.8, pierce: 5, hit: new Set(), life: 1.6 + w * 0.2, face: p.face, delay: 0.3 + w * 0.2, tr: [] });
  },
  // ---------------- 검사 ----------------
  pr1(p, dmg, st, e) {
    p.dashT = 0.3 * (e ? 1.25 : 1); p.dashV = p.face * 560; p.castT = 0.34;
    W.areas.push({ follow: true, ox0: 0, ox1: 46, y0: -64, y1: 0, dmg: dmg * 0.5, once: true, hit: new Set(), dur: p.dashT + 0.02, t: 0, grab: true, color: '#ff6b5c' });
    const slam = () => { circleHit(p.x + p.face * 30, p.y - 30, 70, dmg, { kb: 220, up: 200, heavy: true, color: '#ff6b5c', props: true }); fxRing(p.x + p.face * 30, p.y - 6, 70, '#ff6b5c'); fxShockDust(p.x + p.face * 30, p.y); cam.shake = 8; SFX.play('boom'); };
    p.onDashEnd = () => { slam(); if (e >= 2) later(0.25, () => { if (W) slam(); }); };
  },
  pr2(p, dmg, st, e) {
    const angs = [[0], [0.18, -0.18], [0.3, 0, -0.3]][e];
    for (const a of angs) W.pprj.push({ k: 'hook', x: p.x + p.face * 16, y: p.y - 38, vx: Math.cos(a) * p.face * 720, vy: Math.sin(a) * 720, r: 12, dmg, pierce: 99, hit: new Set(), life: 1.2, t: 0, face: p.face, max: 260, ox: p.x, hooked: [] });
    SFX.play('chain');
  },
  pr3(p, dmg, st, e) {
    const slams = e >= 2 ? 3 : 1; p.castT = 0.4 + slams * 0.3;
    meleeBox(p.face, 74, 80, dmg * 0.6, { kb: 40, up: 380, color: '#ff6b5c' });
    W.fx.push({ k: 'slash', x: p.x + p.face * 14, y: p.y - 40, r: 76, face: p.face, color: '#ff6b5c', t: 0, dur: 0.22, combo: 2, w: 14, rot: -0.9 });
    for (let k = 0; k < slams; k++) later(0.38 + k * 0.3, () => { if (!W) return; for (const dir of [-1, 1]) W.pprj.push({ k: 'pshock', x: p.x, y: GROUND - 8, vx: dir * 300, vy: 0, r: e ? 20 : 14, dmg, pierce: 99, hit: new Set(), life: 1.0, color: '#ff6b5c', ground: true, gy: p.y }); circleHit(p.x, p.y - 20, 60 + (e ? 20 : 0), dmg, { kb: 150, heavy: true, color: '#ff6b5c' }); fxRing(p.x, p.y - 4, 90, '#ff6b5c'); fxShockDust(p.x, p.y); cam.shake = 10; SFX.play('boom'); });
  },
  pr_u(p, dmg) {
    const cx = cam.x + viewW / 2;
    W.fx.push({ k: 'bigstamp', x: cx, t: 0, dur: 1.1, hitAt: 0.38, gy: p.y });
    later(0.38, () => { if (!W) return; for (const m of visibleMobs()) damageMob(m, dmg * 2.2, { stun: 3.5, color: '#ff6b5c', quiet: true }); W.fx.push({ k: 'flash', t: 0, dur: 0.4, color: '#ff3b2f' }); cam.shake = 14; SFX.play('boom'); });
  },
  pr_u2(p, dmg) {
    for (let k = 0; k < 3; k++) {
      const cx = cam.x + viewW * (0.25 + k * 0.25);
      later(k * 0.35, () => { if (!W) return; W.fx.push({ k: 'bigstamp', x: cx, t: 0, dur: 1.0, hitAt: 0.32, gy: p.y }); });
      later(k * 0.35 + 0.32, () => { if (!W) return; for (const m of visibleMobs()) if (Math.abs(m.x - cx) < 180) damageMob(m, dmg * 1.4, { stun: 2.5, color: '#ff6b5c', quiet: true }); cam.shake = 14; SFX.play('boom'); });
    }
    later(1.15, () => { if (!W) return; const vis = visibleMobs(); for (const m of vis) W.fx.push({ k: 'skychain', x: m.x, y: m.y - m.h / 2, t: 0, dur: 1.2 }); later(0.4, () => { if (W) for (const m of vis) damageMob(m, dmg, { stun: 4, color: '#d9e2ff', quiet: true }); }); });
  },
  // ---------------- 판사 ----------------
  jd1(p, dmg, st, e) {
    const dur = e >= 2 ? 0.85 : 0.6, w = e ? 27 : 18; p.castT = dur + 0.02;
    const rows = e >= 2 ? [-52, -24] : [-38];
    for (const yy of rows) {
      W.areas.push({ follow: true, beam: true, ox0: 20, ox1: 340, y0: yy - w * 0.9, y1: yy + w * 0.9, dmg, every: 0.1, t: 0, next: 0, dur, color: '#c48cff', kb: 20 });
      W.fx.push({ k: 'beam', follow: true, ox: 20, len: 330, y: yy, w, t: 0, dur, color: '#c48cff', core: '#fff' });
    }
    SFX.play('zap');
  },
  jd2(p, dmg, st, e) {
    const cages = e >= 2 ? [150, 330] : [150];
    for (const off of cages) {
      const cx = p.x + p.face * off, w = e ? 230 : 170, gy = p.y;
      W.fx.push({ k: 'cage', x: cx, w, t: 0, dur: 3.2, drop: 0.25, color: '#c48cff', gy });
      later(0.25, () => { if (!W) return; areaHit(cx - w / 2, gy - 120, cx + w / 2, gy, dmg * 2, { stun: 3, color: '#c48cff' }); cam.shake = 5; SFX.play('chain'); });
      W.areas.push({ x0: cx - w / 2, x1: cx + w / 2, y0: gy - 120, y1: gy, dmg, every: 0.35, t: 0, next: 0.6, dur: 3.2, color: '#c48cff', slow: 0.5 });
    }
  },
  jd3(p, dmg, st, e) {
    const n = 3 + e; p.castT = 0.3 * n;
    for (let i = 0; i < n; i++) later(i * 0.3, () => { if (!W) return; const x = p.x + p.face * 30; W.fx.push({ k: 'gavelhit', x, y: p.y, t: 0, dur: 0.3, face: p.face }); W.pprj.push({ k: 'pshock', x, y: GROUND - 8, vx: p.face * 330, vy: 0, r: 16, dmg, pierce: 99, hit: new Set(), life: 0.9, color: '#c48cff', ground: true, gy: p.y }); fxRing(x, p.y - 4, 50 + i * 20, '#c48cff'); W.texts.push({ x, y: p.y - 86, s: '정숙' + '!'.repeat(i + 1), c: '#c48cff', t: 0, big: true }); cam.shake = 5 + i * 2; SFX.play('boom'); });
  },
  jd_u(p, dmg) {
    const vis = visibleMobs().sort((a, b) => b.max - a.max);
    const tx = vis[0] ? vis[0].x : p.x + p.face * 120;
    W.fx.push({ k: 'gavel', x: tx, t: 0, dur: 0.75, hit: false, dmg, splash: dmg * 0.35, gy: vis[0] ? vis[0].y : p.y });
  },
  jd_u2(p, dmg) {
    for (let i = 0; i < 13; i++) later(i * 0.07, () => { if (!W) return; const x = cam.x + 20 + rand(0, viewW - 40); W.pprj.push({ k: 'minigavel', x, y: cam.y - 30, vx: 0, vy: 560, r: 18, dmg: dmg * 0.7, pierce: 6, hit: new Set(), life: 2, rot: -0.6, land: 'purple' }); });
    later(1.1, () => { if (!W) return; const vis = visibleMobs().sort((a, b) => b.max - a.max); const tx = vis[0] ? vis[0].x : player.x + player.face * 120; W.fx.push({ k: 'gavel', x: tx, t: 0, dur: 0.75, hit: false, dmg: dmg * 1.6, splash: dmg * 0.5, gy: vis[0] ? vis[0].y : player.y, big: true }); });
  },
  // ---------------- 국선전담변호사 ----------------
  df1(p, dmg, st, e) {
    buffs.guard = e ? 3 : 2;
    meleeBox(p.face, 76, 70, dmg, { kb: 280, heavy: true, color: '#ffd76b' });
    W.fx.push({ k: 'shield', follow: true, t: 0, dur: buffs.guard, color: '#ffd76b' });
    if (e >= 2) W.pprj.push({ k: 'pshock', x: p.x + p.face * 30, y: GROUND - 8, vx: p.face * 340, vy: 0, r: 18, dmg, pierce: 99, hit: new Set(), life: 0.9, color: '#ffd76b', ground: true, gy: p.y });
    fxRing(p.x + p.face * 40, p.y - 30, 44, '#ffd76b'); cam.shake = 6; SFX.play('boom');
  },
  df2(p, dmg, st, e) {
    const r = 0.33 + 0.02 * skillLv('df2');   // 레벨마다 회복 +2% (Lv.1 35% → Lv.10 53%)
    p.hp = Math.min(st.hp, p.hp + st.hp * r); p.castT = 0.6;
    circleHit(p.x, p.y - 30, e >= 1 ? 140 : 100, st.atk * 0.6, { kb: 260, color: '#ffd76b' });
    if (e >= 2) { buffs.invuln = Math.max(buffs.invuln || 0, 2); W.texts.push({ x: p.x, y: p.y - 80, s: '2초 무적', c: '#8dffb0', t: 0 }); }
    W.fx.push({ k: 'pillar', x: p.x, w: 70, color: '#8dffb0', t: 0, dur: 0.9 }); fxSparkle(p.x, p.y - 30, '#8dffb0', 24); fxRing(p.x, p.y - 4, 100, '#ffd76b');
    W.texts.push({ x: p.x, y: p.y - 90, s: `+${Math.round(r * 100)}%`, c: '#8dffb0', t: 0, big: true }); SFX.play('heal');
  },
  df3(p, dmg, st, e) {
    buffs.reflect = e ? 6 : 4; const R = e >= 2 ? 320 : 240;
    for (const m of liveMobs()) if (!m.boss && !m.mid && Math.abs(m.x - p.x) < R && Math.abs(m.y - p.y) < 100) { m.vx = (p.x - m.x) * 3; m.stun = Math.max(m.stun, 0.6); }
    circleHit(p.x, p.y - 30, 90, dmg, { color: '#ffd76b' });
    W.fx.push({ k: 'dome', follow: true, r: 70, t: 0, dur: buffs.reflect, color: '#ffd76b' }); SFX.play('chain');
  },
  df_u(p, dmg) {
    buffs.invuln = 6;
    for (let i = -2; i <= 2; i++) later(Math.abs(i) * 0.08, () => { if (!W) return; W.fx.push({ k: 'pillar', x: p.x + i * 60, w: 46, color: '#ffd76b', t: 0, dur: 0.9 }); });
    later(0.2, () => { if (!W) return; circleHit(p.x, p.y - 40, 200, dmg, { kb: 200, heavy: true, color: '#ffd76b' }); cam.shake = 10; });
    W.fx.push({ k: 'dome', follow: true, r: 64, t: 0, dur: 6, color: '#fff3a0' });
  },
  // ---------------- 특별검사 ----------------
  sp1(p, dmg, st, e) {
    const go = (dir) => {
      p.dashT = 0.14 * (e ? 1.3 : 1); p.dashV = dir * 1350; p.castT = 0.2; p.inv = Math.max(p.inv, 0.25); p.face = dir;
      const marks = new Set();
      W.areas.push({ follow: true, ox0: -60, ox1: 30, y0: -64, y1: 0, dmg, once: true, hit: marks, dur: p.dashT + 0.04, t: 0, kb: 40, color: '#d9e2ff' });
      later(p.dashT + 0.08, () => { if (!W) return; for (const m of marks) { W.fx.push({ k: 'xmark', x: m.x, y: m.y - m.h / 2, t: 0, dur: 0.4, color: '#d9e2ff' }); damageMob(m, dmg * 0.6, { stun: 0.6, color: '#d9e2ff', quiet: true }); } if (marks.size) { cam.shake = 6; SFX.play('crit'); } });
    };
    const f = p.face; go(f);
    if (e >= 2) p.onDashEnd = () => later(0.12, () => { if (W && !p.dead) go(-f); });
  },
  sp2(p, dmg, st, e) {
    const R = e ? 120 : 95, dur = e >= 2 ? 4.5 : 3;
    W.areas.push({ follow: true, circle: true, r: R, ox0: -R, ox1: R, y0: -R - 15, y1: 20, dmg, every: 0.22, t: 0, next: 0, dur, color: '#d9e2ff', kb: 60 });
    W.fx.push({ k: 'spin', follow: true, r: R - 5, t: 0, dur, color: '#d9e2ff' }); SFX.play('chain');
  },
  sp3(p, dmg, st, e) {
    const n = 3 + e;
    for (let i = 0; i < n; i++) { const d = 110 + i * 60; W.pprj.push({ k: 'folder', x: p.x + p.face * 12, y: p.y - 44, vx: p.face * d * 1.4, vy: -360, g: 900, r: 10, dmg, pierce: 0, hit: new Set(), life: 2, rot: 0, vr: 9, land: 'boom', boomR: 70, delay: i * 0.08 }); }
  },
  sp_u(p, dmg) {
    const vis = visibleMobs();
    for (const m of vis) W.fx.push({ k: 'skychain', x: m.x, y: m.y - m.h / 2, t: 0, dur: 1.4 });
    later(0.45, () => { if (!W) return; for (const m of vis) damageMob(m, dmg * 1.3, { stun: 3, color: '#d9e2ff', quiet: true }); cam.shake = 12; SFX.play('chain'); SFX.play('boom'); });
  },
  // ---------------- 헌법재판관 ----------------
  js1(p, dmg, st, e) {
    const n = e >= 2 ? 2 : 1;
    for (let i = 0; i < n; i++) W.pprj.push({ k: 'gorb', x: p.x + p.face * 26, y: p.y - 44 - i * 30, vx: p.face * 170, vy: 0, r: 18, dmg: dmg * 0.25, pierce: 99, hit: new Set(), life: 1.8, multi: 0.25, t: 0, boomEnd: dmg, boomR: e ? 125 : 95, tr: [], delay: i * 0.2 });
  },
  js2(p, dmg, st, e) {
    const R = e ? 140 : 115, dur = e >= 2 ? 7 : 5;
    W.areas.push({ follow: true, circle: true, r: R, ox0: -R, ox1: R, y0: -R - 15, y1: 20, dmg, every: 0.4, t: 0, next: 0, dur, color: '#ffd24d', slow: 0.6, heal: 0.025 });
    W.fx.push({ k: 'dome', follow: true, r: R - 5, t: 0, dur, color: '#ffd24d', big: true }); SFX.play('heal');
  },
  js3(p, dmg, st, e) {
    const n = [9, 12, 15][e]; p.castT = 0.6;
    for (let i = 0; i < n; i++) later(i * 0.1, () => { if (!W) return; const x = p.x + p.face * (50 + i * (360 / n)); W.fx.push({ k: 'pillar', x, w: 30, color: '#ffd24d', t: 0, dur: 0.55 }); areaHit(x - 20, cam.y - 40, x + 20, GROUND, dmg, { kb: 30, color: '#ffd24d' }); SFX.play('zap'); });
  },
  js_u(p, dmg, st) {
    p.hp = st.hp;
    for (let i = 0; i < 9; i++) later(i * 0.06, () => { if (!W) return; W.fx.push({ k: 'pillar', x: cam.x + 20 + i * (viewW - 40) / 8, w: 50, color: '#ffd24d', t: 0, dur: 0.9 }); });
    later(0.35, () => { if (!W) return; for (const m of visibleMobs()) damageMob(m, dmg * 1.6, { stun: 1.5, color: '#ffd24d', quiet: true }); cam.shake = 12; });
    W.texts.push({ x: p.x, y: p.y - 90, s: '멘탈 완전 회복', c: '#8dffb0', t: 0, big: true });
  },
  // ---------------- 리걸테크 CEO ----------------
  ce1(p, dmg, st, e) {
    p.dashT = 0.26 * (e ? 1.25 : 1); p.dashV = p.face * 700; p.castT = 0.28;
    W.areas.push({ follow: true, ox0: -20, ox1: 46, y0: -64, y1: 0, dmg, once: true, hit: new Set(), dur: p.dashT + 0.04, t: 0, kb: 180, color: '#ffd24d' });
    W.fx.push({ k: 'slash', x: p.x + p.face * 14, y: p.y - 34, r: 82, face: p.face, color: '#ffd24d', t: 0, dur: 0.24, combo: 3, w: 16 });
    p.onDashEnd = () => { fxSpark(p.x + p.face * 30, p.y - 34, '#ffd24d', 12); if (e >= 2) explode(p.x + p.face * 40, p.y - 30, 85, dmg * 1.2, '#ffd24d'); };
  },
  ce2(p, dmg, st, e) {
    for (let i = 0; i <= e; i++) W.pprj.push({ k: 'moneybag', x: p.x + p.face * 14, y: p.y - 44, vx: p.face * (240 + i * 95), vy: -390, g: 950, r: 12, dmg, pierce: 0, hit: new Set(), life: 2.4, rot: 0, vr: 7, land: 'money', boomR: 82, stun: e >= 2 ? 1.2 : 0, nohit: true, delay: i * 0.1 });
  },
  ce3(p, dmg, st, e) {
    const R = e ? 260 : 200; p.castT = 0.45;
    for (const m of liveMobs()) if (!m.fake && !m.boss && Math.abs(m.x - p.x) < R && Math.abs(m.y - p.y) < 90) { m.x += (p.x + p.face * 50 - m.x) * 0.85; m.stun = Math.max(m.stun, 0.5); fxSpark(m.x, m.y - m.h / 2, '#ffd24d', 4); }
    W.fx.push({ k: 'ring', x: p.x, y: p.y - 30, r: R * 0.6, color: '#ffd24d', t: 0, dur: 0.4 });
    later(0.18, () => {
      if (!W) return;
      W.fx.push({ k: 'slash', x: p.x + p.face * 12, y: p.y - 36, r: 112, face: p.face, color: '#ffd24d', t: 0, dur: 0.28, combo: 3, w: 20 });
      const thr = e >= 2 ? 0.4 : 0.3;
      for (const m of liveMobs()) { if (m.fake) continue; const dx = (m.x - p.x) * p.face; if (dx < -20 || dx > 135 || Math.abs(m.y - p.y) > 80) continue; if (!m.boss && !m.mid && m.hp < m.max * thr) execute(m, 'card'); else damageMob(m, dmg, { kb: 160, heavy: true, color: '#ffd24d' }); }
      cam.shake = 8; SFX.play('crit');
    });
  },
  ce_u(p, dmg) {
    W.fx.push({ k: 'chart', x0: cam.x, x1: cam.x + viewW, gy: p.y, t: 0, dur: 1.3 });
    later(0.45, () => { if (!W) return; for (const m of visibleMobs()) damageMob(m, dmg * 1.6, { stun: 1.2, color: '#ffd24d', quiet: true }); cam.shake = 12; SFX.play('boom'); });
    for (let i = 0; i < 20; i++) W.pprj.push({ k: 'coinp', x: cam.x + 20 + rand(0, viewW - 40), y: cam.y - 20 - rand(0, 220), vx: rand(-20, 20), vy: 300, r: 9, dmg: dmg * 0.4, pierce: 2, hit: new Set(), life: 3, rot: 0, vr: 10, land: 'dust', delay: 0.5 + rand(0, 0.4) });
  },
  ce_u2(p, dmg) {
    for (let k = 0; k < 2; k++) later(k * 0.5, () => { if (!W) return; W.fx.push({ k: 'chart', x0: cam.x, x1: cam.x + viewW, gy: p.y - k * 30, t: 0, dur: 1.2, txt: k ? '유니콘!' : '상장!' }); });
    for (let k = 0; k < 2; k++) later(0.45 + k * 0.5, () => { if (!W) return; for (const m of visibleMobs()) damageMob(m, dmg * 1.25, { stun: 1.2, color: '#ffd24d', quiet: true }); cam.shake = 13; SFX.play('boom'); });
    for (let i = 0; i < 32; i++) W.pprj.push({ k: 'coinp', x: cam.x + 20 + rand(0, viewW - 40), y: cam.y - 20 - rand(0, 260), vx: rand(-20, 20), vy: 320, r: 10, dmg: dmg * 0.4, pierce: 2, hit: new Set(), life: 3, rot: 0, vr: 10, land: 'dust', delay: 0.6 + rand(0, 0.8) });
    W.texts.push({ x: p.x, y: p.y - 100, s: '기업가치 1조!', c: '#ffd24d', t: 0, big: true });
  },
  // ---------------- 정치 신인 ----------------
  po1(p, dmg, st, e) {
    const n = 3 + e;
    for (let i = 0; i < n; i++) W.pprj.push({ k: 'sound', x: p.x + p.face * 20, y: p.y - 38, vx: p.face * 360, vy: 0, r: 16 + i * 4, dmg, pierce: 99, hit: new Set(), life: 0.75, face: p.face, sc: 1.2 + i * 0.25, color: '#4fd1c5', delay: i * 0.1, kb: 200, stun: e >= 2 ? 0.8 : 0 });
    SFX.play('zap');
  },
  po2(p, dmg, st, e) {
    const n = [5, 7, 9][e];
    for (let i = 0; i < n; i++) W.pprj.push({ k: 'flyer', x: p.x + p.face * 12, y: p.y - 46, vx: p.face * (90 + i * 45), vy: -340 - rand(0, 60), g: 900, r: 10, dmg, pierce: 0, hit: new Set(), life: 2.4, rot: 0, vr: 8, land: 'boom', boomR: 56, nohit: true, hue: i, delay: i * 0.05, burn: e >= 2 });
  },
  po3(p, dmg, st, e) {
    for (let i = 0; i <= e; i++) W.pprj.push({ k: 'truck', x: p.x - p.face * 60, y: p.y - 22, vx: p.face * 430, vy: 0, r: 26, dmg, pierce: 99, hit: new Set(), life: 1.6, face: p.face, delay: i * 0.35, kb: 300, up: 200 });
    SFX.play('boom');
  },
  po_u(p, dmg) {
    for (let i = 0; i < 40; i++) W.fx.push({ k: 'part', x: cam.x + rand(0, viewW), y: cam.y + rand(-20, 40), vx: rand(-60, 60), vy: rand(20, 120), rot: rand(0, 6), vr: rand(-8, 8), color: pick(['#ff6b6b', '#ffe45c', '#4fd1c5', '#c48cff', '#7ee08a']), t: 0, dur: rand(1.2, 2), paper: true });
    for (let i = 0; i < 6; i++) later(i * 0.12, () => { if (W) { fxRing(cam.x + rand(40, viewW - 40), cam.y + rand(40, 140), 50, pick(['#ffe45c', '#4fd1c5', '#ff6b6b'])); SFX.play('zap'); } });
    later(0.4, () => { if (!W) return; for (const m of visibleMobs()) damageMob(m, dmg * 1.5, { stun: 2.5, color: '#4fd1c5', quiet: true }); cam.shake = 12; });
    W.texts.push({ x: p.x, y: p.y - 96, s: '당선 확정!', c: '#4fd1c5', t: 0, big: true });
  },
  po_u2(p, dmg) {
    p.support = 100;
    for (let i = 0; i < 50; i++) W.fx.push({ k: 'part', x: cam.x + rand(0, viewW), y: cam.y + rand(-20, 40), vx: rand(-60, 60), vy: rand(20, 120), rot: rand(0, 6), vr: rand(-8, 8), color: pick(['#ff6b6b', '#ffe45c', '#4fd1c5', '#c48cff', '#7ee08a']), t: 0, dur: rand(1.2, 2), paper: true });
    for (let k = 0; k < 3; k++) {
      const cx = cam.x + viewW * (0.25 + k * 0.25);
      later(k * 0.3, () => { if (!W) return; W.fx.push({ k: 'bigstamp', x: cx, t: 0, dur: 1.0, hitAt: 0.32, gy: p.y, txt: '가 결', c: '#2f8f86' }); });
      later(k * 0.3 + 0.32, () => { if (!W) return; for (const m of visibleMobs()) if (Math.abs(m.x - cx) < 180) damageMob(m, dmg * 1.3, { stun: 2.5, color: '#4fd1c5', quiet: true }); cam.shake = 12; SFX.play('boom'); });
    }
    later(1.1, () => { if (!W) return; for (const m of visibleMobs()) damageMob(m, dmg, { stun: 3.5, color: '#4fd1c5', quiet: true }); W.fx.push({ k: 'flash', t: 0, dur: 0.35, color: '#4fd1c5' }); });
    W.texts.push({ x: p.x, y: p.y - 96, s: '재석 300 · 찬성 300!', c: '#4fd1c5', t: 0, big: true });
  },
  // ---------------- 법률 유튜버 ----------------
  yt1(p, dmg, st, e) {
    const rows = [[-38], [-46, -26], [-54, -36, -18]][e]; const dur = 0.45; p.castT = dur;
    for (const yy of rows) { W.areas.push({ follow: true, beam: true, ox0: 20, ox1: 300, y0: yy - 14, y1: yy + 14, dmg, every: 0.09, t: 0, next: 0, dur, color: '#ffffff', kb: 20 }); W.fx.push({ k: 'beam', follow: true, ox: 20, len: 290, y: yy, w: 12, t: 0, dur, color: '#e9d8ff', core: '#fff' }); }
    W.fx.push({ k: 'flash', t: 0, dur: 0.15, color: '#ffffff' }); SFX.play('zap');
  },
  yt2(p, dmg, st, e) {
    for (let i = 0; i < 3 + e; i++) W.pprj.push({ k: 'heart', x: p.x + p.face * 18, y: p.y - 40, vx: p.face * (340 + i * 50), vy: -50 + i * 35, r: 10, dmg, pierce: 0, hit: new Set(), life: 1.2, rot: 0, vr: 0, delay: i * 0.07, stick: true, boomR: e >= 2 ? 80 : 60 });
  },
  yt3(p, dmg, st, e) {
    const n = [6, 8, 10][e]; const pool = visibleMobs().slice().sort(() => Math.random() - 0.5);
    if (!pool.length) { W.fx.push({ k: 'pillar', x: p.x + p.face * 120, w: 34, color: '#ff6bb5', t: 0, dur: 0.6 }); return; }
    const vis = Array.from({ length: n }, (_, i) => pool[i % pool.length]);
    vis.forEach((m, i) => later(i * 0.08, () => { if (!W || m.dead) return; W.fx.push({ k: 'pillar', x: m.x, w: 34, color: '#ff6bb5', t: 0, dur: 0.6 }); damageMob(m, dmg, { stun: e >= 2 ? 1.2 : 0.3, color: '#ff6bb5' }); W.texts.push({ x: m.x, y: m.y - m.h - 18, s: '좋아요', c: '#ff6bb5', t: 0 }); SFX.play('zap'); }));
  },
  yt_u(p, dmg) {
    p.viewers += 3000;
    W.fx.push({ k: 'trophy', x: p.x, y: p.y - 70, t: 0, dur: 1.4 });
    for (let i = 0; i < 18; i++) W.pprj.push({ k: 'heart', x: cam.x + 20 + rand(0, viewW - 40), y: cam.y - 20 - rand(0, 200), vx: 0, vy: 300, r: 11, dmg: dmg * 0.8, pierce: 3, hit: new Set(), life: 3, rot: 0, vr: 0, land: 'dust' });
    later(0.5, () => { if (!W) return; for (const m of visibleMobs()) damageMob(m, dmg, { stun: 1, color: '#ff6bb5', quiet: true }); cam.shake = 10; });
    W.texts.push({ x: p.x, y: p.y - 100, s: '구독자 100만!', c: '#c48cff', t: 0, big: true });
  },
  yt_u2(p, dmg) {
    p.viewers += 6000;
    W.fx.push({ k: 'trophy', x: p.x, y: p.y - 90, t: 0, dur: 1.6, sc: 2.2 });
    for (let i = 0; i < 28; i++) W.pprj.push({ k: 'heart', x: cam.x + 20 + rand(0, viewW - 40), y: cam.y - 20 - rand(0, 240), vx: 0, vy: 320, r: 12, dmg: dmg * 0.7, pierce: 3, hit: new Set(), life: 3, rot: 0, vr: 0, land: 'dust' });
    for (let k = 0; k < 2; k++) later(0.5 + k * 0.45, () => { if (!W) return; for (const m of visibleMobs()) damageMob(m, dmg * 1.1, { stun: 1.2, color: '#ffd24d', quiet: true }); fxRing(p.x, p.y - 30, 260, '#ffd24d'); cam.shake = 11; SFX.play('boom'); });
    W.texts.push({ x: p.x, y: p.y - 110, s: '골드버튼 언박싱!', c: '#ffd24d', t: 0, big: true });
  },
};
// ======================================================================
// 투사체
// ======================================================================
function explode(x, y, r, dmg, color, o = {}) {
  circleHit(x, y, r, dmg, { kb: 120, color, stun: o.stun, heavy: true, props: true });
  W.fx.push({ k: 'boom', x, y, r, t: 0, dur: 0.4, color });
  fxSpark(x, y, color, 12); cam.shake = Math.max(cam.shake, 6); SFX.play('boom');
}
function updateProjectiles(dt) {
  const p = player;
  for (const b of W.eprj) {
    if (b.home) { const a = Math.atan2((p.y - 30) - b.y, p.x - b.x); const sp = Math.hypot(b.vx, b.vy); b.vx += (Math.cos(a) * sp - b.vx) * dt * 0.8; b.vy += (Math.sin(a) * sp - b.vy) * dt * 0.8; }
    if (b.g) b.vy += b.g * dt;
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; b.rot = (b.rot || 0) + dt * 10;
    if (b.y > GROUND && !b.ground) { b.life = 0; fxBurst(b.x, GROUND - 4, '#c9d1e8', 4); }
    const hy = b.ground ? (p.y - 6) : (p.y - 30);
    if (Math.abs(b.x - p.x) < b.r + 10 && Math.abs(b.y - hy) < b.r + (b.ground ? 10 : 26)) { if (!(b.ground && !p.onGround)) { hurtPlayer(b.dmg, b.x); b.life = 0; } }
  }
  W.eprj = W.eprj.filter((b) => b.life > 0);
  for (const s of W.pprj) {
    if (s.delay > 0) { s.delay -= dt; continue; }
    s.t = (s.t || 0) + dt;
    if (s.tr) { s.tr.push([s.x, s.y]); if (s.tr.length > 7) s.tr.shift(); }
    // 종류별 움직임
    if (s.k === 'bookrang') {
      if (!s.back && s.t > 0.4) { s.back = true; s.hit.clear(); }
      if (s.back) { const a = Math.atan2((p.y - 36) - s.y, p.x - s.x); s.vx = Math.cos(a) * 520; s.vy = Math.sin(a) * 520; if (Math.hypot(p.x - s.x, p.y - 36 - s.y) < 20) s.life = 0; }
      else s.vx *= 0.985;
    } else if (s.k === 'pcard') {
      if (s.t < s.orbitT) { s.ang += dt * 8; s.x = p.x + Math.cos(s.ang) * 46; s.y = p.y - 40 + Math.sin(s.ang) * 30; s.rot = s.ang; }
      else { if (!s.tgt || s.tgt.dead) s.tgt = nearestMob(s.x, 420); const t = s.tgt; if (t) { const a = Math.atan2((t.y - t.h / 2) - s.y, t.x - s.x); s.vx += (Math.cos(a) * 560 - s.vx) * Math.min(1, dt * 8); s.vy += (Math.sin(a) * 560 - s.vy) * Math.min(1, dt * 8); s.rot = Math.atan2(s.vy, s.vx); } else if (!s.vx) { s.vx = p.face * 400; } }
    } else if (s.k === 'tag' && s.stuck) {
      const m = s.stuck; s.fuse -= dt; s.x = m.x + s.ox; s.y = m.y - m.h * 0.55;
      if (s.fuse <= 0 || m.dead) { s.life = 0; explode(s.x, s.y, s.boomR || 58, s.dmg, s.k === 'heart' ? '#ff6bb5' : '#ff4b3a', { stun: 2 }); }
      continue;
    } else if (s.k === 'hook') {
      const dist = Math.abs(s.x - s.ox);
      if (!s.back && dist >= s.max) { s.back = true; s.vx = -s.vx * 0.9; for (const m of s.hooked) if (!m.dead) { m.stun = Math.max(m.stun, 1.6); } }
      if (s.back) { for (const m of s.hooked) if (!m.dead && !m.boss && !m.mid) m.x = s.x; if ((s.x - p.x) * s.face <= 20) s.life = 0; }
      s.ox = p.x;
    } else if (s.k === 'gorb') {
      s.vx *= 1.004;
    }
    if (s.g) s.vy += s.g * dt;
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; s.rot = (s.rot || 0) + (s.vr || 0) * dt;
    if (s.ground && s.gy != null) s.y = s.gy - 8;
    // 땅·발판에 닿음
    const lp = s.land && s.vy > 0 ? platformsUnder(s.x, s.y - s.vy * dt - 1, s.y) : null; const gy = lp ? lp.y : GROUND;
    if (s.land && s.y >= gy - 6) {
      s.y = gy - 6;
      if (s.land === 'crate') { explode(s.x, gy - 14, 44, s.dmg, '#c98a4b'); W.fx.push({ k: 'cratefx', x: s.x, t: 0, dur: 0.8 }); }
      else if (s.land === 'boom') { explode(s.x, gy - 16, s.boomR || 60, s.dmg, '#ff4b3a'); if (s.burn) W.areas.push({ x0: s.x - 40, x1: s.x + 40, y0: gy - 40, y1: gy, dmg: s.dmg * 0.15, every: 0.3, t: 0, next: 0.3, dur: 2, color: '#ff8a3a', burn: true }); }
      else if (s.land === 'money') { explode(s.x, gy - 16, s.boomR || 80, s.dmg, '#ffd24d', { stun: s.stun }); for (let i = 0; i < 8; i++) W.pprj.push({ k: 'coinp', x: s.x, y: gy - 20, vx: rand(-260, 260), vy: rand(-320, -140), g: 900, r: 7, dmg: s.dmg * 0.3, pierce: 0, hit: new Set(), life: 0.9, rot: 0, vr: 12 }); }
      else if (s.land === 'goldboom') explode(s.x, gy - 18, 70, s.dmg, '#ffd24d');
      else if (s.land === 'purple') { explode(s.x, gy - 12, 46, s.dmg * 0.5, '#c48cff'); }
      else if (s.land === 'stampF') { W.fx.push({ k: 'fstamp', x: s.x, t: 0, dur: 0.6 }); fxBurst(s.x, gy - 6, '#f4f1e6', 5, true); }
      else fxBurst(s.x, gy - 6, '#ffcf5c', 6, true);
      s.life = 0; continue;
    }
    // 충돌
    if (scene === 'stage' && !s.nohit) for (const m of W.mobs) {
      if (m.dead) continue;
      if (s.multi) { m._mh = m._mh || {}; const key = s.id || (s.id = Math.random()); if ((m._mh[key] || 0) > W.t) continue; }
      else if (s.hit.has(m)) continue;
      const hy = s.ground ? m.y - 10 : s.y;
      if (!hitBox(m, s.x - s.r, hy - s.r, s.r * 2, s.r * 2)) continue;
      if (s.ground && ((!m.onGround && !m.boss) || Math.abs(m.y - (s.gy ?? GROUND)) > 14)) continue;
      if (s.multi) m._mh[s.id] = W.t + s.multi; else s.hit.add(m);
      if (s.stick) { s.stuck = m; s.fuse = 1.0; s.ox = s.x - m.x; damageMob(m, s.dmg * 0.3, { color: '#ff4b3a' }); m.tag = 1.0; break; }
      if (s.k === 'hook') { s.hooked.push(m); damageMob(m, s.dmg, { color: '#d9e2ff' }); continue; }
      damageMob(m, s.dmg, { kb: s.kb ?? (s.ally ? 40 : 70), up: s.up, stun: s.stun, src: s.x - s.vx, ally: s.ally, color: s.color, quiet: s.quiet, basic: s.basic });
      if (--s.pierce < 0) { s.life = 0; break; }
    }
    // 금고
    if (!s.ally && s.k !== 'pcard') for (const pr of W.props) if (!pr.dead && !s.hit.has(pr) && Math.abs(pr.x - s.x) < 18 && s.y > pr.y - 50 && s.y < pr.y + 6) { s.hit.add(pr); hitProp(pr); }
    if (s.life <= 0 && s.boomEnd) explode(s.x, s.y, s.boomR, s.boomEnd, '#ffd24d');
  }
  W.pprj = W.pprj.filter((s) => s.life > 0);
}

// ======================================================================
// 장판 (지속 피해 · 돌진 판정)
// ======================================================================
function updateAreas(dt) {
  const p = player;
  for (const a of W.areas) {
    a.t += dt;
    let x0, x1, y0, y1;
    if (a.follow) { x0 = p.x + (p.face > 0 ? a.ox0 : -a.ox1); x1 = p.x + (p.face > 0 ? a.ox1 : -a.ox0); y0 = p.y + a.y0; y1 = p.y + a.y1; }
    else { x0 = a.x0; x1 = a.x1; y0 = a.y0; y1 = a.y1; }
    if (a.heal) p.hp = Math.min(stats().hp, p.hp + stats().hp * a.heal * dt);
    if (scene !== 'stage') continue;
    if (a.once) {
      for (const m of liveMobs()) {
        if (a.hit.has(m)) continue;
        if (!hitBox(m, Math.min(x0, x1), y0, Math.abs(x1 - x0), y1 - y0)) continue;
        a.hit.add(m); damageMob(m, a.dmg, { kb: a.kb || 0, src: p.x, color: a.color, stun: a.grab ? 0.5 : 0.25 });
        if (a.grab && !m.boss && !m.mid) m.grabbed = true;
      }
      if (a.grab) for (const m of a.hit) if (m.grabbed && !m.dead) m.x = p.x + p.face * 34;
      for (const pr of W.props) if (!pr.dead && !a.hit.has(pr) && pr.x > Math.min(x0, x1) && pr.x < Math.max(x0, x1)) { a.hit.add(pr); hitProp(pr); }
    } else if (a.t >= a.next) {
      a.next += a.every;
      const n = areaHit(x0, y0, x1, y1, a.dmg, { kb: a.kb || 0, color: a.color, slow: a.slow });
      if (n && a.beam) SFX.play('hit');
    }
  }
  W.areas = W.areas.filter((a) => a.t < a.dur);
  if (!W.areas.some((a) => a.grab)) for (const m of W.mobs) m.grabbed = false;
}

// ======================================================================
// 이펙트
// ======================================================================
function fxBurst(x, y, color, n, paper = false) { n = Math.ceil(n * fxMul()); for (let i = 0; i < n; i++) W.fx.push({ k: 'part', x, y, vx: rand(-150, 150), vy: rand(-240, -40), rot: rand(0, 6), vr: rand(-10, 10), color, t: 0, dur: rand(0.4, 0.8), paper }); }
function fxDust(x, y) { for (let i = 0; i < 4; i++) W.fx.push({ k: 'part', x: x + rand(-8, 8), y: y - 2, vx: rand(-40, 40), vy: rand(-60, -20), rot: 0, vr: 0, color: 'rgba(220,220,230,.6)', t: 0, dur: 0.35 }); }
function fxShockDust(x, y) { for (let i = 0; i < 12 * fxMul(); i++) W.fx.push({ k: 'part', x: x + rand(-20, 20), y: y - 2, vx: rand(-200, 200), vy: rand(-180, -40), rot: 0, vr: 0, color: 'rgba(200,190,170,.75)', t: 0, dur: 0.5 }); }
function fxSpark(x, y, color, n) { n = Math.ceil(n * fxMul()); for (let i = 0; i < n; i++) W.fx.push({ k: 'spark', x, y, vx: rand(-220, 220), vy: rand(-220, 120), color, t: 0, dur: rand(0.25, 0.5), s: rand(2, 4) }); }
function fxSparkle(x, y, color, n) { n = Math.ceil(n * fxMul()); for (let i = 0; i < n; i++) W.fx.push({ k: 'spark', x: x + rand(-18, 18), y: y + rand(-24, 16), vx: rand(-30, 30), vy: rand(-90, -20), color, t: 0, dur: rand(0.4, 0.8), s: rand(1.5, 3) }); }
function fxRing(x, y, r, color) { W.fx.push({ k: 'ring', x, y, r, color, t: 0, dur: 0.4 }); }

function updateFx(dt) {
  const p = player;
  for (const f of W.fx) {
    f.t += dt;
    if (f.k === 'gavel' && !f.hit && f.t > 0.38) {
      f.hit = true; SFX.play('boom'); cam.shake = 14; hitStop = 0.1;
      const gy = f.gy ?? GROUND;
      for (const m of liveMobs()) { const d = Math.abs(m.x - f.x); if (Math.abs(m.y - gy) > 150) continue; if (d < 56 * (f.big ? 1.5 : 1)) damageMob(m, f.dmg, { stun: 2, color: '#c48cff' }); else if (d < 280) damageMob(m, f.splash, { kb: 140, src: f.x, color: '#c48cff', quiet: true }); }
      fxShockDust(f.x, gy); fxSpark(f.x, gy - 20, '#c48cff', 18);
    }
    if (f.k === 'floorfire' && p.onGround && p.y >= GROUND - 1) hurtPlayer(f.dmg, p.x + 1);
    if (f.k === 'lava' && f.t > f.warn && Math.abs(p.x - f.x) < f.w / 2 && p.onGround) hurtPlayer(f.dmg, f.x);
    if (f.k === 'drop' && f.t > f.warn && !f.hit) { f.hit = true; cam.shake = 6; SFX.play('boom'); if (Math.abs(p.x - f.x) < f.w / 2) hurtPlayer(f.dmg, f.x); }
    if (f.k === 'part') { f.vy += 600 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt; }
    if (f.k === 'spark') { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.93; f.vy *= 0.93; }
  }
  W.fx = W.fx.filter((f) => f.t < f.dur);
  const cap = gfxLevel >= 2 ? 160 : 400; if (W.fx.length > cap) W.fx.splice(0, W.fx.length - cap);
  for (const t of W.texts) { t.t += dt; t.y -= 26 * dt; }
  W.texts = W.texts.filter((t) => t.t < 0.9);
  if (W.texts.length > 50) W.texts.splice(0, W.texts.length - 50);
}

// ---------- 그리기 (투사체·이펙트) ----------
function glow(color, blur) { if (gfxLevel) return; ctx.shadowColor = color; ctx.shadowBlur = blur; }   // 빛 번짐(shadowBlur)은 폰에서 가장 무거워 중간·낮음에서는 끈다
function noGlow() { ctx.shadowBlur = 0; }
function drawTrail(s, color, width) {
  if (!s.tr || s.tr.length < 2) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (let i = 1; i < s.tr.length; i++) { ctx.globalAlpha = (i / s.tr.length) * 0.5; ctx.strokeStyle = color; ctx.lineWidth = width * (i / s.tr.length); ctx.beginPath(); ctx.moveTo(s.tr[i - 1][0], s.tr[i - 1][1]); ctx.lineTo(s.tr[i][0], s.tr[i][1]); ctx.stroke(); }
  ctx.restore();
}
function crescent(r, w, color, alpha = 1) {
  ctx.globalAlpha = alpha; ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(0, 0, r, -1.1, 1.1); ctx.arc(-w, 0, r - 2, 1.0, -1.0, true); ctx.closePath(); ctx.fill();
}
function drawPProj(s) {
  const k = s.k;
  if (k === 'ink' || k === 'slash' || k === 'page' || k === 'sound') {
    drawTrail(s, s.color || '#ffe45c', 10 * (s.sc || 1));
    ctx.save(); ctx.translate(s.x, s.y); ctx.scale((s.face || 1) * (s.sc || 1), s.sc || 1);
    if (k === 'page') { glow('#ffcf5c', 12); ctx.rotate(Math.sin(s.t * 20) * 0.3); ctx.fillStyle = '#fffbea'; ctx.fillRect(-8, -6, 16, 12); ctx.fillStyle = '#c9a15a'; ctx.fillRect(-5, -2, 10, 1); ctx.fillRect(-5, 1, 7, 1); }
    else { ctx.globalCompositeOperation = 'lighter'; glow(s.color, 14); crescent(k === 'slash' ? 16 : 12, k === 'slash' ? 7 : 5, s.color, 0.95); ctx.globalAlpha = 0.9; crescent(k === 'slash' ? 13 : 9, 3, '#ffffff'); }
    ctx.restore(); noGlow(); return;
  }
  if (k === 'bolt' || k === 'gold' || k === 'flash') {
    const col = k === 'bolt' ? '#c48cff' : k === 'flash' ? '#f1e6ff' : '#ffd24d';
    drawTrail(s, col, 9 * (s.sc || 1));
    ctx.save(); ctx.translate(s.x, s.y); ctx.globalCompositeOperation = 'lighter'; glow(col, 16);
    const a = Math.atan2(s.vy, s.vx); ctx.rotate(a); ctx.scale(s.sc || 1, s.sc || 1);
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 0, 13, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(2, 0, 7, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore(); noGlow(); return;
  }
  if (k === 'gorb') {
    drawTrail(s, '#ffd24d', 20);
    ctx.save(); ctx.translate(s.x, s.y); ctx.globalCompositeOperation = 'lighter'; glow('#ffd24d', 24);
    const pulse = 1 + Math.sin(s.t * 18) * 0.1;
    ctx.fillStyle = 'rgba(255,210,77,.5)'; ctx.beginPath(); ctx.arc(0, 0, s.r * 1.3 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff5c2'; ctx.beginPath(); ctx.arc(0, 0, s.r * 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffd24d'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(0, 0, s.r * 1.6, s.r * 0.5, s.t * 3 + i * 1.05, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore(); noGlow(); return;
  }
  ctx.save(); ctx.translate(s.x, s.y);
  if (k === 'card' || k === 'pcard') {
    if (s.tr) drawTrail(s, ['#ff6b6b', '#6aa9ff', '#7ee08a', '#ffb84d', '#c48cff'][(s.hue + 5) % 5], 6);
    ctx.rotate(s.rot || 0); glow('#fff', 6);
    ctx.fillStyle = ['#e5533d', '#3d7be5', '#3daa5c', '#e5a03d', '#9a5ce5'][(s.hue + 5) % 5]; ctx.fillRect(-6, -8, 12, 16);
    ctx.fillStyle = '#ffe45c'; ctx.fillRect(-3, -3, 6, 6);
  } else if (k === 'coin') {
    glow('#ffd34d', 8); ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.ellipse(0, 0, 5 * Math.abs(Math.cos(s.t * 12)) + 1.5, 6, 0, 0, Math.PI * 2); ctx.fill();
  } else if (k === 'paper' || k === 'brief') {
    if (s.tr) drawTrail(s, '#9ad7ff', 6);
    ctx.rotate(Math.atan2(s.vy, s.vx)); glow(s.gold ? '#ffd24d' : '#9ad7ff', 10);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-8, -6); ctx.lineTo(-5, 0); ctx.lineTo(-8, 6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = s.gold ? '#ffd24d' : '#6aa9ff'; ctx.lineWidth = 1.5; ctx.stroke();
  } else if (k === 'bookrang') {
    drawTrail(s, '#ffcf5c', 12);
    ctx.rotate(s.rot); glow('#ffcf5c', 12); ctx.fillStyle = '#6b3a1e'; ctx.fillRect(-12, -9, 24, 18); ctx.fillStyle = '#ffcf5c'; ctx.fillRect(-12, -9, 5, 18); ctx.fillStyle = '#f4f1e6'; ctx.fillRect(-6, -7, 16, 3);
  } else if (k === 'book') {
    ctx.rotate(s.rot); ctx.fillStyle = '#6b3a1e'; ctx.fillRect(-10, -8, 20, 16); ctx.fillStyle = '#ffcf5c'; ctx.fillRect(-10, -8, 4, 16);
  } else if (k === 'exam') {
    ctx.rotate(s.rot); ctx.fillStyle = '#ffffff'; ctx.fillRect(-9, -12, 18, 24); ctx.fillStyle = '#9aa3c4'; for (let i = 0; i < 4; i++) ctx.fillRect(-6, -8 + i * 5, 12, 1.5);
    ctx.fillStyle = '#e5533d'; ctx.font = `12px ${FONT_D}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('F', 4, -5);
  } else if (k === 'tag') {
    ctx.rotate(s.stuck ? Math.sin(s.t * 30) * 0.2 : s.rot); glow('#ff4b3a', s.stuck ? 14 : 6);
    ctx.fillStyle = '#e5332a'; ctx.fillRect(-9, -6, 18, 12); ctx.fillStyle = '#fff'; ctx.font = `8px ${FONT_D}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('압류', 0, 1);
  } else if (k === 'crate') {
    ctx.rotate(s.rot); ctx.fillStyle = '#9a6b3a'; ctx.fillRect(-15, -15, 30, 30); ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 2; ctx.strokeRect(-15, -15, 30, 30); ctx.beginPath(); ctx.moveTo(-15, -15); ctx.lineTo(15, 15); ctx.stroke();
    ctx.fillStyle = '#ffe45c'; ctx.font = `8px ${FONT_D}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('증거', 0, -7);
  } else if (k === 'case') {
    ctx.rotate(s.rot); glow('#ffd24d', 14); ctx.fillStyle = '#c9952b'; ctx.fillRect(-16, -11, 32, 22); ctx.fillStyle = '#ffe28a'; ctx.fillRect(-16, -11, 32, 5); ctx.fillStyle = '#7a5410'; ctx.fillRect(-6, -16, 12, 5); ctx.fillStyle = '#fff3c2'; ctx.fillRect(-3, -2, 6, 5);
  } else if (k === 'minigavel') {
    ctx.rotate(s.rot); glow('#c48cff', 14); ctx.fillStyle = '#7a4a2a'; ctx.fillRect(-18, -10, 36, 20); ctx.fillStyle = '#c9a15a'; ctx.fillRect(-18, -3, 36, 4); ctx.fillStyle = '#5a3418'; ctx.fillRect(-3, -46, 6, 36);
  } else if (k === 'folder') {
    ctx.rotate(s.rot); glow('#ff4b3a', 10); ctx.fillStyle = '#c62f25'; ctx.fillRect(-10, -7, 20, 14); ctx.fillStyle = '#ffd1c7'; ctx.fillRect(-10, -9, 8, 3);
  } else if (k === 'hook') {
    ctx.restore();
    ctx.save(); ctx.strokeStyle = '#c9d1e8'; ctx.lineWidth = 3; ctx.setLineDash([5, 3]); ctx.beginPath(); ctx.moveTo(player.x + s.face * 14, player.y - 38); ctx.lineTo(s.x, s.y); ctx.stroke(); ctx.setLineDash([]);
    ctx.translate(s.x, s.y); glow('#d9e2ff', 10); ctx.strokeStyle = '#eef2ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -4, 7, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(6, 6, 7, 0, Math.PI * 2); ctx.stroke();
  } else if (k === 'coinp') {
    ctx.rotate(s.rot); glow('#ffd34d', 10); ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.ellipse(0, 0, 6 * Math.abs(Math.cos(s.t * 10)) + 1.5, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff6c2'; ctx.fillRect(-1, -3, 2, 3);
  } else if (k === 'moneybag') {
    ctx.rotate(s.rot * 0.3); glow('#ffd24d', 12); ctx.fillStyle = '#8a6a2a'; ctx.beginPath(); ctx.ellipse(0, 3, 12, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#5a3a1a'; ctx.fillRect(-4, -10, 8, 5);
    ctx.fillStyle = '#ffd24d'; ctx.font = `11px ${FONT_D}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('₩', 0, 4);
  } else if (k === 'flyer') {
    ctx.rotate(s.rot); ctx.fillStyle = ['#ff6b6b', '#ffe45c', '#4fd1c5', '#c48cff', '#7ee08a'][s.hue % 5]; ctx.fillRect(-9, -11, 18, 22); ctx.fillStyle = '#fff'; ctx.fillRect(-6, -7, 12, 2); ctx.fillRect(-6, -2, 9, 2); ctx.fillRect(-6, 3, 11, 2);
  } else if (k === 'heart') {
    glow('#ff6bb5', 12); ctx.fillStyle = '#ff6bb5'; ctx.beginPath(); ctx.moveTo(0, 8); ctx.bezierCurveTo(-12, -2, -6, -12, 0, -5); ctx.bezierCurveTo(6, -12, 12, -2, 0, 8); ctx.fill(); ctx.fillStyle = '#ffd1e8'; ctx.fillRect(-5, -6, 3, 3);
  } else if (k === 'truck') {
    ctx.scale(s.face || 1, 1); glow('#4fd1c5', 10); ctx.fillStyle = '#f4f1e6'; ctx.fillRect(-34, -20, 58, 30); ctx.fillStyle = '#4fd1c5'; ctx.fillRect(-34, -6, 58, 6); ctx.fillRect(24, -12, 14, 22);
    ctx.fillStyle = '#9ad7ff'; ctx.fillRect(27, -9, 9, 8); ctx.fillStyle = '#2a2e3e'; ctx.beginPath(); ctx.arc(-20, 12, 6, 0, Math.PI * 2); ctx.arc(22, 12, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e5e5e5'; ctx.beginPath(); ctx.moveTo(-8, -20); ctx.lineTo(-2, -32); ctx.lineTo(4, -32); ctx.lineTo(0, -20); ctx.fill();
  } else if (k === 'pshock') {
    ctx.globalCompositeOperation = 'lighter'; glow(s.color, 16); ctx.fillStyle = s.color; ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.ellipse(0, 4, 20, 14, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.ellipse(0, 4, 10, 7, 0, Math.PI, 0); ctx.fill();
  }
  ctx.restore(); noGlow(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
function drawEProj(b) {
  ctx.save(); ctx.translate(b.x, b.y);
  if (b.k === 'paper') { ctx.rotate(b.rot); ctx.fillStyle = '#f4f1e6'; ctx.fillRect(-7, -5, 14, 10); ctx.fillStyle = '#e5533d'; ctx.fillRect(-4, -1, 8, 2); }
  else if (b.k === 'coin') { ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#a07a10'; ctx.stroke(); }
  else if (b.k === 'binder') { ctx.rotate(b.rot); ctx.fillStyle = '#2f4a7a'; ctx.fillRect(-11, -8, 22, 16); ctx.fillStyle = '#f4f1e6'; ctx.fillRect(-7, -4, 14, 4); }
  else if (b.k === 'shock') { ctx.fillStyle = 'rgba(255,190,90,.85)'; ctx.beginPath(); ctx.ellipse(0, 0, 16, 9, 0, Math.PI, 0); ctx.fill(); }
  else { const col = b.color || { orb: '#7dffa8', wave: '#c06bff', fire: '#ff7a3d', water: '#5fb8ff', mimic: '#9ad7ff' }[b.k] || '#fff'; glow(col, 10); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, b.r * 0.8, 0, Math.PI * 2); ctx.fill(); noGlow(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(-2, -2, b.r * 0.3, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore(); noGlow();
}
function drawHazard(f) {
  if (f.k === 'floorfire') { const a = 0.5 + 0.3 * Math.sin(f.t * 30); ctx.fillStyle = `rgba(255,90,30,${a})`; ctx.fillRect(W.arena, GROUND - 10, VW, 12); for (let x = W.arena; x < W.arena + VW; x += 16) { ctx.fillStyle = 'rgba(255,200,60,.8)'; ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.lineTo(x + 8, GROUND - 14 - Math.sin(f.t * 20 + x) * 6); ctx.lineTo(x + 16, GROUND); ctx.fill(); } return; }
  const warn = f.t < f.warn;
  ctx.globalAlpha = warn ? 0.3 + 0.2 * Math.sin(f.t * 25) : 0.7;
  ctx.fillStyle = f.k === 'lava' ? '#ff5a1f' : '#f4f1e6';
  ctx.fillRect(f.x - f.w / 2, GROUND - 6, f.w, 8);
  if (f.k === 'drop') { const y = warn ? -40 + (f.t / f.warn) * (GROUND - 20) : GROUND - 20; ctx.globalAlpha = 1; ctx.fillStyle = '#f4f1e6'; ctx.fillRect(f.x - 26, y - 20, 52, 26); ctx.fillStyle = '#9aa3c4'; for (let i = 0; i < 5; i++) ctx.fillRect(f.x - 24, y - 16 + i * 5, 48, 1); }
  ctx.globalAlpha = 1;
}
function boltPath(x0, y0, x1, y1, seed, n = 8) {
  const pts = [[x0, y0]]; let s = seed * 9999;
  const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 - 0.5; };
  for (let i = 1; i < n; i++) { const t = i / n; pts.push([x0 + (x1 - x0) * t + r() * 10, y0 + (y1 - y0) * t + r() * 26]); }
  pts.push([x1, y1]); return pts;
}
function drawFx(f) {
  const k = f.t / f.dur; const p = player;
  switch (f.k) {
    case 'slash': {
      ctx.save(); ctx.translate(f.x, f.y); ctx.scale(f.face, 1); if (f.rot) ctx.rotate(f.rot);
      ctx.globalCompositeOperation = 'lighter'; glow(f.color, 16);
      const a0 = f.combo === 2 ? 1.1 : -1.2, a1 = f.combo === 2 ? -1.1 : 1.0; const prog = Math.min(1, k * 1.8); const a = a0 + (a1 - a0) * prog;
      ctx.globalAlpha = 1 - k; ctx.strokeStyle = f.color; ctx.lineWidth = f.w; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, 0, f.r * 0.78, a0, a, a < a0); ctx.stroke();
      ctx.lineWidth = f.w * 0.35; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      ctx.restore(); noGlow(); break;
    }
    case 'lash': {
      ctx.save(); ctx.translate(f.x, f.y); ctx.scale(f.face, 1);
      const len = f.r * Math.min(1, k * 2.2);
      ctx.strokeStyle = '#c9d1e8'; ctx.lineWidth = f.big ? 4 : 3; ctx.setLineDash([6, 3]); ctx.globalAlpha = 1 - k * 0.6;
      ctx.beginPath(); ctx.moveTo(0, 0); for (let x = 0; x <= len; x += 10) ctx.lineTo(x, Math.sin(x * 0.08 + f.t * 40) * 6 * (1 - k)); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalCompositeOperation = 'lighter'; glow('#d9e2ff', 12); ctx.strokeStyle = '#eef2ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(len, 0, 6, 0, Math.PI * 2); ctx.stroke();
      ctx.restore(); noGlow(); break;
    }
    case 'part': {
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot); ctx.globalAlpha = 1 - k; ctx.fillStyle = f.color;
      if (f.paper) ctx.fillRect(-3, -2, 6, 4); else ctx.fillRect(-1.5, -1.5, 3, 3);
      ctx.restore(); break;
    }
    case 'spark': {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - k; ctx.fillStyle = f.color; glow(f.color, 8);
      ctx.beginPath(); ctx.arc(f.x, f.y, f.s * (1 - k * 0.5), 0, Math.PI * 2); ctx.fill(); ctx.restore(); noGlow(); break;
    }
    case 'ring': {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = f.color; ctx.lineWidth = 4 * (1 - k) + 1; ctx.globalAlpha = 1 - k; glow(f.color, 10);
      ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * (0.3 + k * 0.9), f.r * 0.35 * (0.3 + k * 0.9), 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); noGlow(); break;
    }
    case 'boom': {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(f.color, 20);
      ctx.globalAlpha = (1 - k) * 0.8; ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.4 + k * 0.7), 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = (1 - k); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.35 * (1 - k), 0, Math.PI * 2); ctx.fill();
      ctx.restore(); noGlow(); break;
    }
    case 'trail': {
      const j = job(); ctx.save(); ctx.globalAlpha = 0.45 * (1 - k); drawAnim(j.anim[0], j.anim[1], f.fi, f.x, f.y, 62, { flip: f.face < 0, tint: f.color }); ctx.restore(); break;
    }
    case 'underline': {
      const x0 = f.x0, x1 = f.x1; const prog = Math.min(1, f.t / (f.fuse * 0.6));
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(f.color, 16);
      if (f.t < f.fuse) { ctx.strokeStyle = f.color; ctx.lineWidth = 6; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.moveTo(x0, f.y); ctx.lineTo(x0 + (x1 - x0) * prog, f.y); ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); }
      else { const e = (f.t - f.fuse) / (f.dur - f.fuse); ctx.globalAlpha = 1 - e; ctx.fillStyle = f.color; ctx.fillRect(Math.min(x0, x1), f.y - 50 * (1 - e * 0.5), Math.abs(x1 - x0), 60 * (1 - e * 0.5)); ctx.fillStyle = '#fff'; ctx.fillRect(Math.min(x0, x1), f.y - 4, Math.abs(x1 - x0), 6 * (1 - e)); }
      ctx.restore(); noGlow(); break;
    }
    case 'bolt': {
      const pts = boltPath(f.x0, f.y0, f.x1, f.y1, f.seed + Math.floor(f.t * 30) * 0.01);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(f.color, 18); ctx.globalAlpha = 1 - k;
      for (const [w, c] of [[6, f.color], [2, '#fff']]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const q of pts) ctx.lineTo(q[0], q[1]); ctx.stroke(); }
      ctx.restore(); noGlow(); break;
    }
    case 'beam': {
      const x = p.x + p.face * f.ox, y = p.y + f.y, len = f.len * Math.min(1, f.t * 8);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(f.color, 24);
      const fl = 1 - Math.max(0, (f.t - f.dur + 0.15) / 0.15); const w = f.w * (0.8 + Math.sin(f.t * 60) * 0.2) * fl;
      ctx.fillStyle = f.color; ctx.globalAlpha = 0.75; ctx.fillRect(p.face > 0 ? x : x - len, y - w / 2, len, w);
      ctx.fillStyle = f.core; ctx.globalAlpha = 0.95; ctx.fillRect(p.face > 0 ? x : x - len, y - w / 6, len, w / 3);
      ctx.beginPath(); ctx.arc(x, y, w * 0.8, 0, Math.PI * 2); ctx.fillStyle = f.color; ctx.globalAlpha = 0.8; ctx.fill();
      ctx.restore(); noGlow(); break;
    }
    case 'cage': {
      const gy = f.gy ?? GROUND; const drop = Math.min(1, f.t / f.drop); const top = cam.y - 40 + drop * (gy - 120 - cam.y + 40);
      ctx.save(); glow(f.color, 14); ctx.globalAlpha = f.t > f.dur - 0.3 ? (f.dur - f.t) / 0.3 : 1;
      ctx.strokeStyle = f.color; ctx.lineWidth = 3;
      for (let x = f.x - f.w / 2; x <= f.x + f.w / 2; x += 17) { ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top + 120); ctx.stroke(); }
      ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(f.x - f.w / 2 - 6, top); ctx.lineTo(f.x + f.w / 2 + 6, top); ctx.stroke();
      ctx.fillStyle = f.color; ctx.globalAlpha *= 0.12; ctx.fillRect(f.x - f.w / 2, top, f.w, 120);
      ctx.restore(); noGlow(); break;
    }
    case 'pillar': {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(f.color, 26);
      const e = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8; const w = f.w * (0.4 + e * 0.6);
      const g = ctx.createLinearGradient(0, (cam.y - offY / scale), 0, GROUND); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.6, f.color); g.addColorStop(1, '#ffffff');
      ctx.globalAlpha = e; ctx.fillStyle = g; ctx.fillRect(f.x - w / 2, (cam.y - offY / scale), w, GROUND - cam.y + offY / scale);
      ctx.fillStyle = '#fff'; ctx.globalAlpha = e * 0.8; ctx.fillRect(f.x - w / 6, (cam.y - offY / scale), w / 3, GROUND - cam.y + offY / scale);
      ctx.beginPath(); ctx.ellipse(f.x, GROUND, w * 0.9, 6, 0, 0, Math.PI * 2); ctx.fillStyle = f.color; ctx.fill();
      ctx.restore(); noGlow(); break;
    }
    case 'dome': {
      const r = f.r * (f.big ? 1 : 1) * Math.min(1, f.t * 6);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(f.color, 16); ctx.globalAlpha = f.t > f.dur - 0.3 ? (f.dur - f.t) / 0.3 * 0.5 : 0.5;
      ctx.strokeStyle = f.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 0.95, 0, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = f.color; ctx.globalAlpha *= 0.25; ctx.fill();
      ctx.globalAlpha = 0.6; for (let i = 0; i < 6; i++) { const a = Math.PI + (i / 6) * Math.PI + f.t * 0.8; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.95, 2, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore(); noGlow(); break;
    }
    case 'shield': {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(f.color, 14); ctx.globalAlpha = 0.6 * (1 - k * 0.5);
      ctx.strokeStyle = f.color; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x + p.face * 18, p.y - 32, 30, p.face > 0 ? -1.2 : Math.PI - 1.2 + 0.0, p.face > 0 ? 1.2 : Math.PI + 1.2); ctx.stroke();
      ctx.restore(); noGlow(); break;
    }
    case 'spin': {
      ctx.save(); ctx.translate(p.x, p.y - 34); ctx.globalAlpha = f.t > f.dur - 0.3 ? (f.dur - f.t) / 0.3 : 1;
      ctx.rotate(f.t * 14); ctx.strokeStyle = '#c9d1e8'; ctx.lineWidth = 3; ctx.setLineDash([6, 3]);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(f.r, 0); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalCompositeOperation = 'lighter'; glow('#d9e2ff', 12); ctx.strokeStyle = 'rgba(217,226,255,.35)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(0, 0, f.r, -0.8, 0); ctx.stroke();
      ctx.strokeStyle = '#eef2ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(f.r, 0, 7, 0, Math.PI * 2); ctx.stroke();
      ctx.restore(); noGlow(); break;
    }
    case 'xmark': {
      ctx.save(); ctx.translate(f.x, f.y); ctx.globalCompositeOperation = 'lighter'; glow(f.color, 14); ctx.globalAlpha = 1 - k; ctx.strokeStyle = f.color; ctx.lineWidth = 4;
      const s = 18 * (0.6 + k * 0.6); ctx.beginPath(); ctx.moveTo(-s, -s); ctx.lineTo(s, s); ctx.moveTo(s, -s); ctx.lineTo(-s, s); ctx.stroke(); ctx.restore(); noGlow(); break;
    }
    case 'skychain': {
      const drop = Math.min(1, f.t / 0.35); const top = (cam.y - offY / scale);
      ctx.save(); ctx.strokeStyle = '#c9d1e8'; ctx.lineWidth = 3; ctx.setLineDash([7, 4]); ctx.globalAlpha = f.t > f.dur - 0.3 ? (f.dur - f.t) / 0.3 : 1;
      ctx.beginPath(); ctx.moveTo(f.x - 30, top); ctx.lineTo(f.x - 30 + 30 * drop, top + (f.y - top) * drop); ctx.moveTo(f.x + 30, top); ctx.lineTo(f.x + 30 - 30 * drop, top + (f.y - top) * drop); ctx.stroke(); ctx.setLineDash([]);
      if (drop >= 1) { glow('#d9e2ff', 12); ctx.strokeStyle = '#eef2ff'; ctx.beginPath(); ctx.arc(f.x, f.y, 12, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore(); noGlow(); break;
    }
    case 'bigstamp': {
      const gy = f.gy ?? GROUND; const fall = Math.min(1, f.t / f.hitAt); const y = cam.y - 120 + fall * (gy - cam.y + 130);
      ctx.save(); ctx.translate(f.x, y); ctx.globalAlpha = f.t > f.dur - 0.3 ? (f.dur - f.t) / 0.3 : 1;
      glow('#ff3b2f', 24); ctx.fillStyle = '#7a1a14'; ctx.fillRect(-14, -150, 28, 90); ctx.fillStyle = f.c || '#c62f25'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-90, -64, 180, 64, 10) : ctx.rect(-90, -64, 180, 64); ctx.fill();
      ctx.fillStyle = '#ffd1c7'; ctx.font = `30px ${FONT_D}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(f.txt || '구 속', 0, -32);
      ctx.restore(); noGlow();
      if (f.t > f.hitAt) { const e = (f.t - f.hitAt) / (f.dur - f.hitAt); ctx.save(); ctx.globalAlpha = 1 - e; ctx.strokeStyle = '#ff3b2f'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(f.x, gy, 300 * e + 40, 18 * e + 6, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
      break;
    }
    case 'gavel': {
      const gy = f.gy ?? GROUND; const y = f.t < 0.38 ? cam.y - 80 + (f.t / 0.38) * (gy - cam.y + 40) : gy - 40;
      ctx.save(); ctx.translate(f.x, y); if (f.big) ctx.scale(1.5, 1.5); glow('#c48cff', 20); ctx.fillStyle = '#7a4a2a'; ctx.fillRect(-46, -30, 92, 46); ctx.fillStyle = '#c9a15a'; ctx.fillRect(-46, -10, 92, 7); ctx.fillStyle = '#5a3418'; ctx.fillRect(-6, -140, 12, 112); ctx.restore(); noGlow();
      if (f.hit) { const e = Math.min(1, (f.t - 0.38) * 3); ctx.save(); ctx.globalAlpha = 1 - e; ctx.strokeStyle = '#c48cff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(f.x, gy, 280 * e, 18 * e + 4, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); drawText('판결!', f.x, gy - 100, 18, '#c48cff'); }
      break;
    }
    case 'gavelhit': {
      ctx.save(); ctx.translate(f.x, f.y - 20); ctx.scale(f.face, 1); ctx.rotate(-1.2 + Math.min(1, k * 3) * 1.4); ctx.fillStyle = '#7a4a2a'; ctx.fillRect(10, -50, 20, 14); ctx.fillStyle = '#5a3418'; ctx.fillRect(-2, -46, 14, 4); ctx.restore(); break;
    }
    case 'fstamp': {
      ctx.save(); ctx.globalAlpha = 1 - k; ctx.translate(f.x, GROUND - 26); ctx.rotate(-0.2); ctx.strokeStyle = '#e5332a'; ctx.lineWidth = 2; ctx.strokeRect(-11, -11, 22, 22); ctx.fillStyle = '#e5332a'; ctx.font = `18px ${FONT_D}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('F', 0, 1); ctx.restore(); break;
    }
    case 'cratefx': {
      ctx.save(); ctx.globalAlpha = 1 - k; ctx.translate(f.x, GROUND - 10); ctx.fillStyle = '#9a6b3a'; ctx.fillRect(-14, -12, 28, 12); ctx.restore(); break;
    }
    case 'jail': {
      const top = f.y - f.h - 10, a = k < 0.2 ? k / 0.2 : 1 - Math.max(0, (k - 0.7) / 0.3); const drop = Math.min(1, k * 4);
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#c9d1e8'; ctx.lineWidth = 3; glow('#ff6b5c', 10);
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(f.x + i * 9, top - 30 + drop * 30); ctx.lineTo(f.x + i * 9, f.y); ctx.stroke(); }
      ctx.strokeRect(f.x - 22, top - 30 + drop * 30, 44, f.y - top + 30 - drop * 30); ctx.restore(); noGlow(); break;
    }
    case 'indict': {
      const gy = f.gy ?? GROUND; const fall = Math.min(1, f.t / 0.12); const y = gy - 120 + fall * 120;
      ctx.save(); ctx.translate(f.x, y); ctx.globalAlpha = 1 - Math.max(0, (k - 0.6) / 0.4); glow('#ff3b2f', 20);
      ctx.fillStyle = '#7a1a14'; ctx.fillRect(-8, -86, 16, 50); ctx.fillStyle = '#c62f25'; ctx.fillRect(-52, -40, 104, 40);
      ctx.fillStyle = '#ffd1c7'; ctx.font = `20px ${FONT_D}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('기 소', 0, -20); ctx.restore(); noGlow(); break;
    }
    case 'chart': {
      const gy = f.gy ?? GROUND; const prog = Math.min(1, k * 2); const xs = f.x0 + (f.x1 - f.x0) * prog;
      ctx.save(); ctx.globalAlpha = 1 - Math.max(0, (k - 0.7) / 0.3); ctx.strokeStyle = '#ff4b3a'; ctx.lineWidth = 7; glow('#ffd24d', 18); ctx.lineJoin = 'round';
      ctx.beginPath(); for (let i = 0; i <= 12; i++) { const x = f.x0 + (xs - f.x0) * i / 12; const y = gy - 20 - (i / 12) * 160 + (i % 2 ? 22 : 0); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
      ctx.fillStyle = '#ff4b3a'; ctx.beginPath(); ctx.moveTo(xs + 18, gy - 190); ctx.lineTo(xs - 10, gy - 184); ctx.lineTo(xs + 4, gy - 160); ctx.fill();
      drawText(f.txt || '상장!', xs - 30, gy - 210, 18, '#ffd24d'); ctx.restore(); noGlow(); break;
    }
    case 'trophy': {
      ctx.save(); ctx.translate(f.x, f.y - k * 20); if (f.sc) ctx.scale(f.sc, f.sc); ctx.globalAlpha = 1 - Math.max(0, (k - 0.7) / 0.3); glow('#ffd24d', 20); ctx.fillStyle = '#ffd24d';
      ctx.beginPath(); ctx.moveTo(-16, -20); ctx.lineTo(16, -20); ctx.lineTo(10, 4); ctx.lineTo(-10, 4); ctx.closePath(); ctx.fill(); ctx.fillRect(-3, 4, 6, 10); ctx.fillRect(-10, 14, 20, 5);
      ctx.strokeStyle = '#ffd24d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-17, -12, 6, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke(); ctx.beginPath(); ctx.arc(17, -12, 6, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke(); ctx.restore(); noGlow(); break;
    }
    case 'callout': {
      ctx.save(); ctx.globalAlpha = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.6) / 0.4); const s = 1 + (k < 0.15 ? (1 - k / 0.15) * 0.6 : 0);
      ctx.translate(p.x, p.y - 82 - k * 10); ctx.scale(s, s); drawText(f.s, 0, 0, 14, f.color); ctx.restore(); break;
    }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
