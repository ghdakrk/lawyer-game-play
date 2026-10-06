/* 법조인 키우기 — 코어 v4: 상태 · 입력 · 월드 · 전투 · 몬스터/보스 AI · 동료 · 드롭 */
'use strict';

// ======================================================================
// 유틸
// ======================================================================
const $ = (s, r = document) => r.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const irand = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const now = () => Date.now();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function fmt(n) {
  n = Math.floor(n);
  if (n < 1e4) return n.toLocaleString('ko-KR');
  const u = [[1e12, '조'], [1e8, '억'], [1e4, '만']];
  for (const [v, s] of u) if (n >= v) { const x = n / v; return (x >= 100 ? Math.floor(x) : x.toFixed(1)).toString().replace(/\.0$/, '') + s; }
  return String(n);
}
const FONT_D = '"Black Han Sans", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
const VW = 480, VH = 270, GROUND = 238;

// ======================================================================
// 에셋
// ======================================================================
const IMG_NAMES = [
  'hero_student', 'hero_lawschool', 'hero_assoc', 'hero_prosecutor', 'hero_judge',
  'mob_paperimp', 'mob_slime', 'mob_goblin', 'mob_ghost', 'mob_copier', 'mob_canmimic', 'mob_phonedemon', 'mob_bat', 'mob_hydra', 'mob_ogre', 'mob_lich', 'mob_stampdevil',
  'boss_orc', 'boss_golem', 'boss_clock', 'boss_doppel', 'boss_kim', 'boss_kakha',
  'npc_haechi', 'npc_gosiwon', 'npc_gimbap', 'npc_gosiwon_body', 'npc_gimbap_body', 'items_equip', 'items_loot', 'cosmetics', 'legend',
  'plat_tiles', 'atlas_heroes', 'atlas_hidden', 'atlas_route', 'atlas_loco1', 'atlas_loco2', 'atlas_loco3', 'atlas_comp', 'atlas_mobs', 'atlas_boss', 'atlas_npc',
];
const BG_NAMES = ['bg_campus', 'bg_library', 'bg_town', 'bg_alley', 'bg_office'];
const A = {};
function loadAssets(onProgress) {
  const all = [...IMG_NAMES.map((n) => [n, `assets/${n}.png`]), ...BG_NAMES.map((n) => [n, `assets/${n}.jpg`])];
  let done = 0;
  return Promise.all(all.map(([n, src]) => new Promise((res) => {
    const img = new Image();
    img.onload = () => { A[n] = img; done++; onProgress && onProgress(done / all.length); res(); };
    img.onerror = () => { A[n] = null; done++; res(); };
    img.src = src;
  })));
}
const ICON = { equip: 'items_equip', loot: 'items_loot', cos: 'cosmetics', leg: 'legend' };
const itemIcon = (it) => (it.cos ? iconStyle('cos', COSMETICS[it.cos].i) : it.leg ? iconStyle('leg', LEGENDS[it.leg].i) : iconStyle('equip', it.base));
function iconStyle(sheet, idx) { const c = idx % 4, r = Math.floor(idx / 4); return `background-image:url(assets/${ICON[sheet]}.png);background-position:${c * 100 / 3}% ${r * 50}%`; }
// 아틀라스 프레임 → 초상화 dataURL
const portraitCache = {};
function frameURL(an, key, fi = 0) {
  const ck = `${an}/${key}/${fi}`; if (portraitCache[ck]) return portraitCache[ck];
  const img = A[an]; const m = ATLAS[an] && ATLAS[an].frames[key]; if (!img || !m) return '';
  const c = document.createElement('canvas'); c.width = m.cw; c.height = m.ch;
  try { c.getContext('2d').drawImage(img, fi * m.cw, m.y, m.cw, m.ch, 0, 0, m.cw, m.ch); portraitCache[ck] = c.toDataURL(); } catch (e) { portraitCache[ck] = ''; }
  return portraitCache[ck];
}
function portraitSrc(key) {
  if (key === 'hero') { const j = JOBS[S.job]; return j.img ? `assets/${j.img}.png` : frameURL(j.anim[0], j.anim[1], 0); }
  const p = PORTRAIT[key]; if (!p) return '';
  if (p.startsWith('img:')) return `assets/${p.slice(4)}.png`;
  if (p.startsWith('npc:')) return frameURL('atlas_npc', 'npc', +p.slice(4));
  if (p.startsWith('comp:')) return frameURL('atlas_comp', p.slice(5), 0);
  return '';
}
function jobPortrait(id) { const j = JOBS[id]; return j.img ? `assets/${j.img}.png` : frameURL(j.anim[0], j.anim[1], 0); }
function compPortrait(id) { const c = COMPANIONS[id]; return c.boss ? 'assets/boss_kim.png' : frameURL(c.anim[0], c.anim[1], 0); }

// ======================================================================
// 사운드 (합성음)
// ======================================================================
const SFX = {
  ctx: null, on: true, last: {},
  init() {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; return; }
    this.bus = this.ctx.createGain(); this.bus.gain.value = 0.55; this.bus.connect(this.ctx.destination);   // 효과음은 한 단계 낮춰 배경음악이 묻히지 않게
  },
  play(type) {
    if (!this.on || !this.ctx) return;
    const tnow = performance.now(); if (this.last[type] && tnow - this.last[type] < 40) return; this.last[type] = tnow;
    const c = this.ctx, t = c.currentTime;
    const tone = (f0, f1, dur, wave = 'square', vol = 0.08, at = 0) => {
      const o = c.createOscillator(), g = c.createGain(); o.type = wave; o.frequency.setValueAtTime(f0, t + at); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + at + dur);
      g.gain.setValueAtTime(vol, t + at); g.gain.exponentialRampToValueAtTime(0.001, t + at + dur); o.connect(g).connect(this.bus); o.start(t + at); o.stop(t + at + dur + 0.02);
    };
    const noise = (dur, vol = 0.12, hp = 800) => {
      const len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = buf; f.type = 'highpass'; f.frequency.value = hp; g.gain.value = vol;
      s.connect(f).connect(g).connect(this.bus); s.start(t);
    };
    switch (type) {
      case 'swing': noise(0.09, 0.07, 2500); break;
      case 'hit': tone(220, 90, 0.08, 'square', 0.06); noise(0.05, 0.07, 1200); break;
      case 'crit': tone(520, 140, 0.12, 'sawtooth', 0.07); noise(0.08, 0.1, 900); break;
      case 'jump': tone(300, 620, 0.12, 'triangle', 0.06); break;
      case 'coin': tone(980, 1500, 0.08, 'triangle', 0.05); break;
      case 'hurt': tone(180, 60, 0.2, 'sawtooth', 0.09); break;
      case 'shot': tone(700, 300, 0.1, 'triangle', 0.05); break;
      case 'skill': tone(400, 900, 0.18, 'triangle', 0.07); noise(0.12, 0.05, 3000); break;
      case 'zap': tone(1200, 200, 0.2, 'sawtooth', 0.05); noise(0.15, 0.06, 4000); break;
      case 'chain': noise(0.2, 0.08, 1800); tone(300, 600, 0.15, 'square', 0.04); break;
      case 'boom': tone(120, 40, 0.35, 'sawtooth', 0.1); noise(0.3, 0.12, 200); break;
      case 'heal': tone(500, 1000, 0.3, 'sine', 0.07); tone(750, 1500, 0.3, 'sine', 0.05, 0.08); break;
      case 'quest': tone(660, 660, 0.1, 'triangle', 0.07); tone(880, 880, 0.12, 'triangle', 0.07, 0.1); tone(1320, 1320, 0.2, 'triangle', 0.06, 0.2); break;
      case 'level': tone(523, 523, 0.1, 'triangle', 0.07); tone(784, 1046, 0.2, 'triangle', 0.07, 0.11); break;
      case 'deny': tone(200, 150, 0.12, 'square', 0.05); break;
    }
  },
};

// ======================================================================
// 상태 · 저장
// ======================================================================
const GAME_VERSION = '0.7.1-test';                // 버그 제보에 붙는 버전
// 그래픽 품질 (기기마다 따로): 0 높음 · 1 중간(빛 번짐 끔) · 2 낮음(+해상도·입자 줄임). 「자동」이면 렉을 감지해 한 단계씩 내리고 기억한다
const GFX_KEY = 'lawyer-gfx', GFX_LV_KEY = 'lawyer-gfx-lv';
let GFX = 'auto', gfxLevel = 0;
// 조작부 높이 (기기마다 따로): 화면 아래 막대·둥근 모서리에 버튼이 가리는 폰을 위해 조작부 전체를 띄운다
const LIFT_KEY = 'lawyer-lift', LIFTS = [[0, '낮게'], [20, '기본'], [44, '높게'], [72, '더 높게']];
let ctrlLift = 20;
try { const v = localStorage.getItem(LIFT_KEY); if (v != null && !isNaN(+v)) ctrlLift = +v; } catch (e) { /* 기본값 */ }
try { GFX = localStorage.getItem(GFX_KEY) || 'auto'; gfxLevel = GFX === 'auto' ? Math.min(2, +(localStorage.getItem(GFX_LV_KEY) || 0)) : ({ high: 0, mid: 1, low: 2 }[GFX] ?? 0); } catch (e) { /* 기본값 */ }
const fxMul = () => (gfxLevel >= 2 ? 0.5 : 1);
const SAVE_KEY = 'lawyer-action-v5';            // v5.2까지 쓰던 단일 저장 (슬롯 1로 옮긴다)
const SLOTS = 3;
let SLOT = 1;
const slotKey = (n) => `${SAVE_KEY}-s${n}`;
const ACC_KEY = 'lawyer-account-v1';             // 슬롯을 넘어 남는 기록: 엔딩 수집
function newState() {
  return {
    v: 5, major: null, job: 'student', jobs: ['student'], lv: 1, exp: 0, pts: 0, sp: 0, spSeen: 0, law: { log: 0, men: 0, foc: 0, agi: 0 },
    trivia: [], dropout: false, aiUntil: 0, best: { surv: 0, runs: 0 }, exam: null,
    gold: 0, inji: 300, cons: { gimbap: 3, coffee: 3, americano: 0, energy: 0 }, contracts: 0, books: { b1: 0, b2: 0, b3: 0 }, qitems: {},
    inv: [], equip: { weapon: null, armor: null, acc: null, gear: null, head: null, back: null }, uid: 1, skl: {}, loadout: [], passives: [], resume: [], rank: {},
    cleared: {}, hard: {}, q: {}, kills: {}, seen: {}, rumors: [], rumorOn: [], titles: [], story: {}, guides: {},
    comps: [], party: [], slots: 1, compLv: {}, bossPity: {}, legPity: 0, daily: { day: '', list: [] },
    boosters: 0, boostUntil: 0, cosTickets: 0, cosPulls: 0,
    eqPulls: 0, shop: { bought: {}, spend: 0, monthlyUntil: 0, monthlyDay: '' },
    auto: false, sound: true, music: true, autoSell: true, created: now(), last: '1-1', saved: 0, endSeen: {}, supreme: {}, ng: 0, career: [],
  };
}
let S = newState();
let hotData = null;
function migrateSave() {
  try { const old = localStorage.getItem(SAVE_KEY); if (old) { if (!localStorage.getItem(slotKey(1))) localStorage.setItem(slotKey(1), old); localStorage.removeItem(SAVE_KEY); } } catch (e) { /* 무시 */ }
}
function readSlot(n) {
  try { const raw = localStorage.getItem(slotKey(n)); if (!raw) return null; const d = JSON.parse(raw); return d && d.v === 5 && d.major ? d : null; } catch (e) { return null; }
}
function load(n = SLOT) {
  SLOT = n; S = newState();
  try {
    const raw = hotData && hotData.state && hotData.slot === n ? hotData.state : localStorage.getItem(slotKey(n));
    if (raw) { const d = JSON.parse(raw); if (d && d.v === 5) { S = Object.assign(newState(), d); S.equip = Object.assign({ head: null, back: null }, S.equip); } }
  } catch (e) { /* 새 게임 */ }
}
function save() { if (!S.major) return; try { S.saved = now(); localStorage.setItem(slotKey(SLOT), JSON.stringify(S)); } catch (e) { /* 무시 */ } }
// 슬롯은 기본 3칸, 영구 구매 「세이브 슬롯 +3칸」으로 6칸 (예전 테스트 구매 extraSlots도 인정)
function slotCount() { return Math.min(6, SLOTS + (owns('slots') ? 3 : accLoad().extraSlots || 0)); }
// 재심(새 회차): 같은 슬롯에서 대학생부터. 성장(레벨·장비·스탯·스킬·상식·동료·코스튬)은 이어 가고 진로·사건만 다시
const NG_KEEP = ['major', 'lv', 'exp', 'pts', 'sp', 'spSeen', 'law', 'trivia', 'aiUntil', 'best', 'gold', 'inji', 'cons', 'contracts', 'books', 'inv', 'equip', 'uid', 'skl', 'passives', 'resume',
  'comps', 'party', 'slots', 'compLv', 'bossPity', 'legPity', 'daily', 'boosters', 'boostUntil', 'cosTickets', 'cosPulls', 'eqPulls', 'shop', 'sound', 'music', 'autoSell', 'created',
  'titles', 'rumors', 'rumorOn', 'seen', 'kills', 'story', 'guides', 'endSeen', 'kakha', 'kimTruth'];
function retrial() {
  const old = S, n = newState();
  for (const k of NG_KEEP) if (old[k] !== undefined) n[k] = old[k];
  n.ng = (old.ng || 0) + 1;
  n.career = [...new Set([...(old.career || []), ...old.jobs.filter((j) => JOBS[j].tier >= 2)])];
  S = n; save();
}
function deleteSlot(n) { try { localStorage.removeItem(slotKey(n)); } catch (e) { /* 무시 */ } }
// 계정 = 슬롯을 넘어 남는 것: 엔딩 도감 + 영구 구매(owned). 실제 앱에서는 구매 기록을 스토어가 보관하고 「구매 복원」으로 되살린다
let accRaw = null, accObj = null;
function accLoad() {
  let raw = '{}'; try { raw = localStorage.getItem(ACC_KEY) || '{}'; } catch (e) { /* 무시 */ }
  if (raw !== accRaw || !accObj) { accRaw = raw; try { accObj = Object.assign({ endings: {}, owned: {} }, JSON.parse(raw)); } catch (e) { accObj = { endings: {}, owned: {} }; } accObj.owned = accObj.owned || {}; }
  return accObj;
}
function accSave(a) { accObj = a; try { localStorage.setItem(ACC_KEY, JSON.stringify(a)); accRaw = null; } catch (e) { /* 저장이 막혀도 이번 실행 동안은 유지 */ } }
const owns = (id) => !!accLoad().owned[id];
// v7.0: 체험판 잠금 없음 — 1~5장 전부 무료, 돈은 인앱 상품(개업 패키지·인지 충전·영구 구매)으로
try { window.claude?.hot?.snapshot?.(() => ({ state: JSON.stringify(S), slot: SLOT })); } catch (e) { /* 무시 */ }

const major = () => MAJORS.find((m) => m.id === S.major) || MAJORS[0];
const job = () => JOBS[S.job];
const jobName = (id = S.job) => (S.rank[id] && JOBS[id].rank ? JOBS[id].rank.name : JOBS[id].name);
const ultId = () => { const j = job(); return S.rank[S.job] && j.rank ? j.rank.ult : j.ult; };
// 이력서 칸: 직업 하나마다 +1, 재심 전 회차의 직업도 경력으로 친다. 재심 특전으로 회차마다 +1 (최대치도 +1, 10칸까지)
const resumeCap = () => Math.min(10, 5 + (S.ng || 0));
const resumeSlots = () => Math.min(resumeCap(), Math.max(0, S.jobs.length - 1) + (S.career || []).length + (S.ng || 0));
const canRetrial = () => !!(S.cleared && S.cleared['5-5']);   // 재심은 이번 회차에 김성호(5-5)를 넘은 뒤에만
const skillSlots = () => (S.jobs.some((j) => JOBS[j].tier >= 2) ? 4 : 3);
const sid = (c, s) => `${c}-${s}`;
const parseSid = (id) => { const [c, s] = id.split('-').map(Number); return { c, s, g: (c - 1) * 5 + (s - 1) }; };
// 장비 능력치. 코스튬은 수집 효과로 따로, 직업 전용 전설 무기는 그 직업일 때만
function eqStats() {
  const e = { atk: 0, atkPct: 0, hp: 0, dr: 0, crit: 0, spd: 0, cdr: 0, gold: 0, mpr: 0, exp: 0, hpPct: 0, mprPct: 0, skill: 0, ls: 0 };
  for (const k of Object.keys(S.equip)) { const it = S.inv.find((x) => x.uid === S.equip[k]); if (!it || it.cos || (it.leg && it.leg !== S.job)) continue; const em = 1 + 0.1 * (it.en || 0); for (const [s, v] of Object.entries(it.st)) e[s] = (e[s] || 0) + v * em; }
  for (const [s, v] of Object.entries(cosStats())) e[s] = (e[s] || 0) + v;
  return e;
}
// 코스튬 = 외형 + 수집. 입든 안 입든 가진 것마다 고유 능력치의 60%가 붙고, 전부 모으면 세트 효과
const COS_RATE = 0.6, COS_SET = { atkPct: 0.05, hpPct: 0.05 };
const cosOwned = () => Object.keys(COSMETICS).filter((id) => S.inv.some((x) => x.cos === id));
function cosStats() {
  const e = {}, own = cosOwned();
  for (const id of own) for (const [s, v] of Object.entries(COSMETICS[id].st)) e[s] = (e[s] || 0) + v * COS_RATE;
  if (own.length === Object.keys(COSMETICS).length) for (const [s, v] of Object.entries(COS_SET)) e[s] = (e[s] || 0) + v;
  return e;
}
// 켜져 있는 패시브: 현재 직업에서 배운 패시브 + 이력서에 꽂은 패시브
function activePassives() {
  const out = S.passives.filter((id) => PASSIVES[id] && PASSIVES[id].job === S.job);
  for (const id of S.resume.slice(0, resumeSlots())) if (PASSIVES[id] && PASSIVES[id].job !== S.job && !out.includes(id)) out.push(id);
  return out;
}
function passiveEff() {
  const p = {};
  for (const id of activePassives()) for (const [k, v] of Object.entries(PASSIVES[id].eff)) p[k] = (p[k] || 0) + v;
  return p;
}
function partyPassive() {
  const p = { skill: 0, hp: 0, gold: 0, all: 0 };
  for (const id of S.party) { const c = COMPANIONS[id]; if (!c) continue; const lvm = 1 + 0.1 * ((S.compLv[id] || 1) - 1); for (const [k, v] of Object.entries(c.passive)) p[k] += v * lvm; }
  return p;
}
let statCache = null, statTick = -1, tick = 0;
function stats() {
  if (statCache && statTick === tick) return statCache;
  const L = S.lv, j = job(), R = RANGE[j.type], m = major().mods, e = eqStats(), law = S.law, cp = partyPassive(), pe = passiveEff();
  const all = 1 + cp.all;
  const rk = S.rank[S.job] ? 1.15 : 1;
  const vb = j.mech === 'viewers' && player ? 1 + Math.min(0.6, Math.floor((player.viewers || 0) / 1000) * 0.05) : 1;
  const lvM = Math.pow(1.03, L - 1); // 레벨이 오를수록 기본 능력치가 복리로 성장 → 파밍이 의미 있다
  const atk = ((10 + 2.3 * (L - 1)) * lvM * j.atk * rk + law.log * 2 + e.atk) * (1 + e.atkPct) * (buff('energy') ? 1.2 : 1) * all * vb;
  const hp = ((110 + 17 * (L - 1)) * lvM * R.hp + law.men * 15 + e.hp) * (1 + (m.hp || 0) + cp.hp + e.hpPct + (pe.hpPct || 0)) * all * (S.rank[S.job] ? 1.1 : 1);
  const mp = (60 + 3 * (L - 1) + law.foc * 3) * R.mp * (1 + (pe.mpPct || 0));
  statCache = {
    atk, hp, mp,
    mpr: (1.2 + e.mpr * 0.4) * (1 + e.mprPct + (pe.mprPct || 0)) * R.mp,
    mpHit: 2.6 * R.mp * (1 + e.mprPct * 0.5 + (pe.mprPct || 0) * 0.5),
    cdr: Math.min(0.5, e.cdr + (pe.cdr || 0) + Math.min(0.15, law.foc * 0.003)),
    crit: Math.min(0.8, 0.05 + law.agi * 0.004 + e.crit + j.crit + (m.crit || 0) + (pe.crit || 0)),
    critDmg: 1.6 + (pe.critDmg || 0), ls: Math.min(0.12, e.ls),
    spd: j.spd * (1 + law.agi * 0.01 + e.spd + (m.spd || 0) + (pe.spd || 0)) * (buff('americano') ? 1.2 : 1),
    dr: Math.min(0.7, Math.min(0.2, law.men * 0.002) + e.dr + j.dr + R.dr + (pe.dr || 0)),
    gold: (1 + e.gold + (m.gold || 0) + cp.gold + (pe.gold || 0)) * all,
    exp: (1 + e.exp + (pe.exp || 0)) * (S.boostUntil > now() ? 2 : 1),
    skill: (1 + (m.skill || 0) + cp.skill + e.skill + (pe.skill || 0) + law.foc * 0.015) * all,
    boss: 1 + (pe.boss || 0) + (j.type === 'melee' ? 0.15 : 0), heal: 1 + (pe.heal || 0), comp: 1 + (pe.comp || 0), stunMul: 1 + (pe.stun || 0), ultMul: 1 + (pe.ult || 0),
    move: buff('energy') ? 1.15 : 1,
    type: (ty) => (ty === 'criminal' ? 1 + (m.criminal || 0) : 1),
  };
  statTick = tick;
  return statCache;
}
const buffs = { americano: 0, energy: 0, cram: 0, guard: 0, reflect: 0, invuln: 0 };
const buff = (k) => buffs[k] > 0;
const skillLv = (id) => S.skl[id] || 0;
// 자동 사냥: 해결한 사건만 · 공격력 80% (AI 법률비서 100% + 스킬 사용) · 피하기·줍기는 둘 다
const aiOn = () => owns('ai') || S.aiUntil > now();
const humanSim = () => !!window.__humanSim;
const autoMul = () => (S.auto && !humanSim() ? (aiOn() ? 1 : 0.8) : 1);
const autoSkills = () => humanSim() || aiOn();
// CEO는 스킬에 수임료를 쓴다
const skMp = (id) => Math.round(SKILLS[id].mp * (skillLv(id) >= 10 ? 0.8 : 1));   // Lv10 마스터: 커피 −20%
const goldCost = (id) => Math.round(skMp(id) * (0.5 + S.lv * 0.12));
function canCast(id, quiet) {
  const sk = SKILLS[id], p = player;
  if (job().mech === 'card') { if (S.gold >= goldCost(id)) return true; if (!quiet) toast(`수임료가 부족합니다 · 필요 ₩${fmt(goldCost(id))}`); return false; }
  if (p.mp >= skMp(id)) return true; if (!quiet) toast('커피가 부족합니다 · 적을 때리면 찹니다 (W: 믹스커피)'); return false;
}
function payCast(id) { const sk = SKILLS[id]; if (job().mech === 'card') { const c = goldCost(id); S.gold -= c; W.texts.push({ x: player.x, y: player.y - 70, s: `-₩${fmt(c)}`, c: '#ffd24d', t: 0 }); } else player.mp -= skMp(id); }
// 지지율 배율 (정치 신인)
const mechSkillMul = () => (job().mech === 'support' && player ? 1 + (player.support || 0) / 100 * 0.6 : 1);
// 법률 상식 카드
function learnTrivia(id, quiet) {
  if (!id || !TRIVIA[id] || S.trivia.includes(id)) return false;
  S.trivia.push(id); const c = TRIVIA[id];
  if (!quiet) toast(`📜 법률 상식 <b>${esc(c.t)}</b> · ${esc(c.d)} <span style="opacity:.7">(${esc(c.law)})</span>`, 5200);
  if (S.trivia.length % 4 === 0) { S.pts += 1; toast(`법률 상식 ${S.trivia.length}장 · 스탯 포인트 +1`, 3200); updateBadges(); }
  if (S.trivia.length === 1) showGuide('g_trivia');
  return true;
}
function mobBark(m) {
  const list = MOB_BARKS[m.id]; if (!list || !W || W.t - (W.lastBark ?? -9) < 4) return;
  const fresh = list.filter((b) => !S.trivia.includes(b[1]));
  const b = fresh.length && Math.random() < 0.8 ? pick(fresh) : pick(list);
  W.lastBark = W.t; m.bark = { s: b[0], t: 0, dur: 3.2 };
  later(0.6, () => learnTrivia(b[1]));
}

// ======================================================================
// 입력
// ======================================================================
const keys = { left: false, right: false, up: false, down: false, jump: false, attack: false, s1: false, s2: false, s3: false, s4: false, ult: false, potion: false, act: false };
const pressed = {};
function resetKeys() { for (const k of Object.keys(keys)) keys[k] = false; clearPressed(); }
function press(k) { if (!keys[k]) pressed[k] = true; keys[k] = true; }
function release(k) { keys[k] = false; }
const KEYMAP = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', KeyX: 'jump', Space: 'jump', KeyZ: 'attack', KeyJ: 'attack', KeyA: 's1', KeyS: 's2', KeyD: 's3', KeyC: 's4', KeyF: 'ult', KeyQ: 'potion', KeyE: 'act', Enter: 'act' };
function bindInput() {
  const typing = (ev) => ev.target && (ev.target.tagName === 'TEXTAREA' || ev.target.tagName === 'INPUT');
  window.addEventListener('keydown', (ev) => {
    if (typing(ev)) return;   // 버그 제보 칸에 글을 쓸 때는 게임 키를 먹지 않는다
    SFX.init(); BGM.ensure();
    if (ev.code === 'Escape' || ev.code === 'KeyM') { if ($('#guide').classList.contains('show')) { closeGuide(); return; } if (sheetOpen()) tryCloseSheet(); else if (player && !dialog.active) openMenu(); return; }
    if (ev.code === 'KeyW') { useCons('coffee'); return; }
    if ($('#guide').classList.contains('show') && (ev.code === 'Space' || ev.code === 'Enter')) { ev.preventDefault(); closeGuide(); return; }
    if (dialog.active && (ev.code === 'Space' || ev.code === 'Enter' || ev.code === 'KeyX' || ev.code === 'KeyZ')) { ev.preventDefault(); if (!ev.repeat) dialogNext(); return; }   // 꾹 누르고 있어도 한 줄씩
    const k = KEYMAP[ev.code]; if (!k) return; ev.preventDefault(); if (!ev.repeat) press(k); else keys[k] = true;
  });
  window.addEventListener('keyup', (ev) => { if (typing(ev)) return; const k = KEYMAP[ev.code]; if (k) release(k); });
  const map = { 'b-jump': 'jump', 'b-attack': 'attack', 'b-s1': 's1', 'b-s2': 's2', 'b-s3': 's3', 'b-s4': 's4', 'b-ult': 'ult', 'b-hp': 'potion', 'b-act': 'act' };
  for (const [id, k] of Object.entries(map)) {
    const el = document.getElementById(id); if (!el) continue;
    const down = (ev) => {
      ev.preventDefault(); ev.stopPropagation(); SFX.init(); BGM.ensure(); el.classList.add('down');
      if (dialog.active && (k === 'attack' || k === 'act' || k === 'jump')) { dialogNext(); return; }   // 대화 중: 공격·점프 버튼 = 다음 (글자가 나오는 중이면 먼저 문장을 다 보여 준다)
      press(k); try { el.setPointerCapture(ev.pointerId); } catch (e) { /* 무시 */ } };
    const up = (ev) => { ev.preventDefault(); el.classList.remove('down'); release(k); };
    el.addEventListener('pointerdown', down); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
    el.addEventListener('contextmenu', (ev) => ev.preventDefault());
  }
  bindStick();
}
// 아무 데나 눌러 끌면 이동하는 조이스틱
const stick = { id: null, ox: 0, oy: 0, dx: 0, dy: 0 };
function bindStick() {
  const zones = [...document.querySelectorAll('.stickzone')];
  const knob = $('#knob'), base = $('#knobbase');
  const setKeys = () => {
    const dz = 14 * (window.devicePixelRatio > 1 ? 1 : 1);
    const L = stick.dx < -dz, R = stick.dx > dz, U = stick.dy < -30 && Math.abs(stick.dy) > Math.abs(stick.dx) * 0.7, D = stick.dy > 30 && Math.abs(stick.dy) > Math.abs(stick.dx) * 0.7;
    if (L !== keys.left) L ? press('left') : release('left');
    if (R !== keys.right) R ? press('right') : release('right');
    if (U !== keys.up) U ? press('up') : release('up');
    if (D !== keys.down) D ? press('down') : release('down');
  };
  const show = (x, y) => { base.style.display = 'block'; base.style.left = `${stick.ox - 44}px`; base.style.top = `${stick.oy - 44}px`; knob.style.left = `${x - 22}px`; knob.style.top = `${y - 22}px`; knob.style.display = 'block'; };
  for (const z of zones) {
    z.addEventListener('pointerdown', (ev) => {
      if (stick.id != null || dialog.active || scene === 'title') return; if (ev.target.closest('button, #dialog, #qtrack, #sheet, #guide, #title')) return;
      ev.preventDefault(); SFX.init(); BGM.ensure();
      const r = $('#app').getBoundingClientRect(); stick.id = ev.pointerId; stick.ox = ev.clientX - r.left; stick.oy = ev.clientY - r.top; stick.dx = stick.dy = 0;
      try { z.setPointerCapture(ev.pointerId); } catch (e) { /* 무시 */ }
      show(stick.ox, stick.oy);
    });
    z.addEventListener('pointermove', (ev) => {
      if (ev.pointerId !== stick.id) return;
      const r = $('#app').getBoundingClientRect(); let dx = ev.clientX - r.left - stick.ox, dy = ev.clientY - r.top - stick.oy;
      const d = Math.hypot(dx, dy), mx = 44; if (d > mx) { dx *= mx / d; dy *= mx / d; }
      stick.dx = dx; stick.dy = dy; show(stick.ox + dx, stick.oy + dy); setKeys();
    });
    const end = (ev) => { if (ev.pointerId !== stick.id) return; stick.id = null; stick.dx = stick.dy = 0; setKeys(); base.style.display = knob.style.display = 'none'; };
    z.addEventListener('pointerup', end); z.addEventListener('pointercancel', end); z.addEventListener('lostpointercapture', end);
  }
}
// ======================================================================
// 월드
// ======================================================================
let scene = 'title';
let W = null;
let player = null;
const cam = { x: 0, y: 0, shake: 0 };
let hitStop = 0, timeScale = 1;
let viewW = VW, offY = 0;
const timers = [];
function later(sec, fn) { timers.push({ t: sec, fn }); }

function makePlayer(x) {
  const st = stats(), prev = player;
  const np = makePlayerRaw(x, st);
  if (prev && !prev.dead) { np.ult = prev.ult || 0; for (const k of Object.keys(np.cds)) np.cds[k] = prev.cds[k] || 0; np.potCd = prev.potCd || 0; }
  else if (prev) np.ult = prev.ult || 0;   // 번아웃 뒤에도 게이지는 남긴다
  return np;
}
function makePlayerRaw(x, st) {
  return { x, y: GROUND, vx: 0, vy: 0, onGround: true, face: 1, hp: st.hp, mp: st.mp * 0.6, inv: 0, atkT: 0, atkDur: 0, combo: 0, comboWin: 0, hitDone: false,
    hurtT: 0, castT: 0, dashT: 0, dashV: 0, ult: 0, cds: { s1: 0, s2: 0, s3: 0, s4: 0 }, walkT: 0, animT: 0, landT: 0, dead: false, lastSkill: null, trailT: 0, climb: null, dropT: 0, plat: null,
    evid: 0, support: 30, viewers: 0, killT: -9, kchain: 0, donT: 10, potCd: 0 };
}
function enterTown() {
  scene = 'town'; timers.length = 0; timeScale = 1; hitStop = 0; resetKeys();
  W = { kind: 'town', bg: 'bg_town', mirror: true, len: TOWN_LEN, ch: CHAPTERS[2], mobs: [], eprj: [], pprj: [], areas: [], pickups: [], fx: [], texts: [], platforms: [], ropes: [], props: [], allies: [], t: 0, top: 0 };
  W.npcs = Object.entries(NPCS).filter(([id]) => npcPresent(id)).map(([id, n]) => ({ id, ...n }));
  const x0 = player ? clamp(player.x, 60, 400) : 320;
  player = makePlayer(x0); player.mp = stats().mp;
  cam.x = clamp(x0 - viewW * 0.4, 0, W.len - viewW); cam.y = 0;
  $('#bossbar').hidden = true;
  BGM.play('town');
  if (!S.story.town_first) { S.story.town_first = true; startDialog(STORY.town_first); }
  refreshQuestUI(); checkGuides(); save();
}
function stageLayout(c, s, hard) {
  const plan = STAGE_PLAN[s - 1], ch = CHAPTERS[c - 1];
  const gap = 440; const arena = plan.mid || plan.boss;
  const len = 340 + gap * plan.zones + (arena ? VW + 60 : 260);
  const pool = s === 1 ? ch.mobs.slice(0, 2) : s === 2 ? ch.mobs.slice(0, 3) : ch.mobs;
  const waves = []; const plats = []; const ropes = []; const props = [];
  const G = GROUND;
  for (let i = 0; i < plan.zones; i++) {
    const x = 300 + i * gap; const n = plan.per + Math.floor(i / 2) + (hard ? 2 : 0);
    const list = []; for (let k = 0; k < n; k++) list.push(pick(pool));
    const zp = [];
    // 사냥 층은 모두 점프로 오른다 (1층 92 · 2층 184, 한 번 점프 116). 밧줄은 보물 금고가 있는 맨 위층(334)에만
    const tpl = (i + c + s) % 4, F1 = G - 92, F2 = G - 184, F3 = G - 334;
    const hasSafe = (plan.safe && (i === 1 || i === 3)) || (!plan.safe && i === 1 && Math.random() < 0.5);
    const vault = hasSafe && (c >= 2 || s >= 3);   // 금고층 (밧줄로만)
    let top = null;
    if (tpl === 0) {        // 계단 탑
      zp.push({ x: x - 160, y: F1, w: 140 }, { x: x - 40, y: F2, w: 180 }, { x: x + 150, y: F1, w: 120 });
      if (vault) { top = { x: x + 60, y: F3, w: 130, vault: true }; ropes.push({ x: x + 100, y0: F3, y1: F2 }); }
    } else if (tpl === 1) { // 징검다리
      zp.push({ x: x - 150, y: F1, w: 110 }, { x: x - 20, y: F2, w: 140 }, { x: x + 140, y: F1, w: 130 });
      if (vault) { top = { x: x - 60, y: F3, w: 130, vault: true }; ropes.push({ x: x, y0: F3, y1: F2 }); }
    } else if (tpl === 2) { // 긴 1층 위 양 날개
      zp.push({ x: x - 150, y: F1, w: 420 }, { x: x - 130, y: F2, w: 130 }, { x: x + 150, y: F2, w: 120 });
      if (vault) { top = { x: x + 100, y: F3, w: 130, vault: true }; ropes.push({ x: x + 160, y0: F3, y1: F2 }); }
    } else {                // 2층 다리
      zp.push({ x: x - 150, y: F1, w: 100 }, { x: x - 60, y: F2, w: 260 }, { x: x + 210, y: F1, w: 80 });
      if (vault) { top = { x: x - 120, y: F3, w: 120, vault: true }; ropes.push({ x: x - 40, y0: F3, y1: F2 }); }
    }
    if (top) zp.push(top);
    plats.push(...zp);
    waves.push({ x, list, plats: zp, elite: plan.elites.includes(i) || (hard && i === plan.zones - 1), done: false, active: false });
    if (hasSafe) { const top = zp.reduce((a, b) => (b.y < a.y ? b : a)); props.push({ kind: 'safe', x: top.x + top.w / 2, y: top.y, hp: 3 }); }
  }
  const ax = len - VW - 20;
  if (arena) {
    if (ch.boss === 'clock' && plan.boss) plats.push({ x: ax + 60, y: G - 60, w: 90 }, { x: ax + 200, y: G - 95, w: 90 }, { x: ax + 340, y: G - 60, w: 90 });
    else plats.push({ x: ax + 90, y: G - 70, w: 100 }, { x: ax + 300, y: G - 70, w: 100 });
  }
  const top = Math.min(0, ...plats.map((p) => p.y - 150));
  return { len, waves, plats, ropes, props, arena: arena ? ax : null, plan, top };
}
function stageOpen(c, s) {
  if (c === 1 && s === 1) return true;
  if (s > 1) return !!S.cleared[sid(c, s - 1)];
  if (!S.cleared[sid(c - 1, 5)]) return false;
  return chapterReqOk(c);
}
function chapterReqOk(c) {
  const r = CHAPTERS[c - 1].req; if (!r) return true;
  if (r.tier != null && job().tier < r.tier && !S.jobs.some((j) => JOBS[j].tier >= r.tier)) return false;
  if (r.quest && !(S.q[r.quest] && S.q[r.quest].st === 'done')) return false;
  return true;
}
function enterStage(c, s, hard = false) {
  const tier = hard === true ? 1 : +hard || 0; hard = tier > 0;
  const ch = CHAPTERS[c - 1]; timers.length = 0; timeScale = 1; hitStop = 0; resetKeys();
  const lay = stageLayout(c, s, hard);
  scene = 'stage';
  const { g } = parseSid(sid(c, s));
  W = { kind: 'stage', c, s, id: sid(c, s), g, ch, hard, tier, plan: lay.plan, bg: ch.bg, mirror: ch.mirror, len: lay.len, waves: lay.waves, platforms: lay.plats, ropes: lay.ropes, props: lay.props, arena: lay.arena, top: lay.top,
    mobs: [], eprj: [], pprj: [], areas: [], pickups: [], fx: [], texts: [], allies: [], lock: null, boss: null, mid: null, t: 0, kills: 0, hits: 0,
    loot: { gold: 0, exp: 0, items: [], books: {}, qitems: {} }, go: false, ended: false, rumorSet: [], par: lay.plan.zones * 40 + (lay.plan.mid ? 40 : 0) + (lay.plan.boss ? 80 : 0) };
  S.last = W.id;
  if (S.auto && S.cleared[W.id] && (S.cons.gimbap || 0) < 3) {   // 자동 사냥으로 들어가면 김밥 3개까지 수임료로 채운다
    const pr = CONSUMABLES.gimbap.price(c); let n = 0; while ((S.cons.gimbap || 0) < 3 && S.gold >= pr) { S.gold -= pr; S.cons.gimbap = (S.cons.gimbap || 0) + 1; n++; }
    if (n) later(0.5, () => toast(`자동 사냥 · 김밥 ${n}개 자동 구매 (₩${fmt(pr * n)})`));
  }
  if (S.auto && !S.cleared[W.id] && !humanSim()) { S.auto = false; later(0.3, () => toast('처음 해결하는 사건은 직접! AUTO는 해결한 사건에서만 켜집니다')); }
  player = makePlayer(80);
  buildAllies();
  cam.x = 0; cam.y = 0;
  $('#bossbar').hidden = true;
  BGM.play(`ch${c}`);
  showBanner(`${ch.name.split(' · ')[0]} ${s}단계`, `${ch.stages[s - 1]} · ${TYPE_LABEL[ch.type]} · 권장 Lv.${REC[g] + TIERS[tier].lv}${tier ? ` · ${TIERS[tier].name}` : ''}`);
  if (c === 1 && s === 1 && !S.story.intro) { S.story.intro = true; startDialog(STORY.intro); }
  else if (s === 1 && STORY[`pre_${c}`] && !S.story[`pre_${c}`]) { S.story[`pre_${c}`] = true; startDialog(STORY[`pre_${c}`]); }
  refreshQuestUI();
}
const TIERS = [{ name: '1심', hp: 1, dmg: 1, rew: 1, lv: 0 }, { name: '항소심', hp: 2.3, dmg: 1.5, rew: 2, lv: 8 }, { name: '상고심', hp: 6, dmg: 2.4, rew: 4.5, lv: 18 }];
// 재심 n회차: 몬스터 체력 +80%·공격 +40%·보상 +50%씩
function diff() {
  if (W && W.surv) return { hp: 1, dmg: 1, rew: 0.3 };
  const t = TIERS[W && W.tier || 0], ng = S.ng || 0;
  return ng ? { name: t.name, hp: t.hp * (1 + 0.8 * ng), dmg: t.dmg * (1 + 0.4 * ng), rew: t.rew * (1 + 0.5 * ng), lv: t.lv } : t;
}
// 몬스터 레벨: 단계 권장 레벨 + 심급 + 정예·중간보스·보스
function recLv(g) { const i = Math.max(0, Math.floor(g || 0)); return i < REC.length ? REC[i] : REC[REC.length - 1] + (i - REC.length + 1) * 2; }
function mobLevel(m) { return recLv(W.g) + (W.tier ? TIERS[W.tier].lv : 0) + (S.ng || 0) * 6 + (m.elite ? 2 : 0) + (m.mid ? 4 : 0) + (m.boss ? 5 : 0); }

// ---------- 스폰 ----------
// 몬스터 강화 (v6.8): 2차 전직 뒤(3장~)는 점점 단단하게, 각 장 5단계(원흉 단계)와 김성호는 더 세게
function foeMul(boss) {
  if (!W || W.surv || W.kakha) return { hp: 1, dmg: 1 };
  let hp = 1, dmg = 1;
  if (W.c >= 3) { const k = Math.min(W.c, 5) - 3; hp *= [1.1, 1.2, 1.25][k]; dmg *= [1, 1.05, 1.08][k]; }   // 기본 공격 각성(3차 승진)은 5장 중반이라 3·4장은 조금만, 갈수록 세게
  if (W.s === 5) { hp *= boss ? 1.25 : 1.2; dmg *= boss ? 1.1 : 1; }
  return { hp, dmg };
}
function spawnMob(id, x, o = {}) {
  const d = MOBS[id], df = diff(), g = W.g ?? 0;
  const elite = !!o.elite, mid = !!o.mid;
  const fm = foeMul(false), hp = SCALE.hp(g) * d.hp * (elite ? 3 : 1) * (mid ? 16 : 1) * df.hp * fm.hp;
  const h = d.h * (elite ? 1.2 : 1) * (mid ? 1.7 : 1);
  const fly = d.ai === 'flyer';
  const pl = o.plat || null;
  const baseG = pl ? pl.y : GROUND;
  const fy = baseG - 30 - rand(0, 26) - (mid ? 20 : 0);
  const m = { id, d, x, y: fly ? fy : (o.drop ? baseG - 90 : baseG), vx: 0, vy: 0, hp, max: hp, h, w: h * 0.72, face: -1, state: 'move', t: rand(0, 2), cd: rand(0.6, 1.6), stun: 0, flash: 0, atkA: 0,
    elite, mid, boss: false, onGround: !fly && !o.drop, dmg: SCALE.dmg(g) * d.dmg * (elite ? 1.3 : 1) * (mid ? 1.5 : 1) * df.dmg * fm.dmg, baseY: fy, slow: 0, tag: 0, summonT: 6, plat: pl, patrol: rand(0, 1) < 0.5 ? -1 : 1 };
  W.mobs.push(m);
  S.seen[id] = true;
  if (Math.random() < (elite ? 0.6 : 0.22)) mobBark(m);
  if (pl && d.ai === 'shooter' && pl.y < GROUND - 150 && scene === 'stage') later(1.2, () => showGuide('g_snipe'));
  return m;
}
function spawnBoss() {
  const ch = W.ch, d = BOSSES[ch.boss], df = diff();
  const fm = foeMul(true), hp = SCALE.hp(W.g) * d.hp * df.hp * fm.hp * (ch.boss === 'kim' ? 1 + 0.1 * W.rumorSet.length : 1);
  const b = { id: ch.boss, d, boss: true, x: W.arena + VW - 110, y: ch.boss === 'clock' ? GROUND - 26 : GROUND, vx: 0, vy: 0, hp, max: hp, h: d.h, w: d.h * 0.6, face: -1, state: 'idle', t: 0, cd: 2, stun: 0, flash: 0,
    onGround: ch.boss !== 'clock', dmg: SCALE.dmg(W.g) * d.dmg * df.dmg * fm.dmg, pat: 0, stacks: 0, timers: {}, phase: 1, atkA: 0, slow: 0, tag: 0, plat: null };
  W.mobs.push(b); W.boss = b; S.seen['boss_' + ch.boss] = true;
  if (ch.boss === 'doppel') b.real = true;
  $('#bossbar').hidden = false; $('#boss-name').textContent = `Lv.${mobLevel(b)} ${d.name}`; $('#boss-phase').textContent = W.tier === 2 ? '상고심 · 대법원' : W.hard ? '항소심' : '';
  BGM.play(ch.boss === 'kim' ? 'kim' : 'boss');
  SFX.play('boom'); cam.shake = 8;
  if (ch.boss === 'kim' && W.rumorSet.includes(3)) player.mp = 0;
}
function spawnMid() {
  const ch = W.ch;
  const m = spawnMob(ch.mid, W.arena + VW - 100, { mid: true });
  m.name = ch.midName; W.mid = m;
  $('#bossbar').hidden = false; $('#boss-name').textContent = `Lv.${recLv(W.g) + (W.tier ? TIERS[W.tier].lv : 0) + 4} ${ch.midName}`; $('#boss-phase').textContent = '중간 보스';
  BGM.play('boss');
  SFX.play('boom'); cam.shake = 6;
  for (let i = 0; i < 2; i++) spawnMob(pick(ch.mobs), W.arena + VW - 160 - i * 40);
}
// ======================================================================
// 업데이트
// ======================================================================
function update(dt) {
  tick++;
  for (const tm of timers.slice()) { tm.t -= dt; if (tm.t <= 0) { timers.splice(timers.indexOf(tm), 1); tm.fn(); } }
  for (const k of Object.keys(buffs)) if (buffs[k] > 0) buffs[k] -= dt;
  if (hitStop > 0) { hitStop -= dt; return; }
  dt *= timeScale;
  if (!W || !player) return;
  if (dialog.active || sheetOpen() || guideOpen()) { clearPressed(); return; }
  W.t += dt;
  if (S.auto && scene === 'stage') autoPilot();
  updatePlayer(dt);
  updateAllies(dt);
  if (scene === 'stage') { updateStage(dt); for (const m of W.mobs) updateMob(m, dt); }
  updateProjectiles(dt);
  updateAreas(dt);
  updatePickups(dt);
  updateFx(dt);
  updateCamera(dt);
  clearPressed();
}
function clearPressed() { for (const k of Object.keys(pressed)) delete pressed[k]; }
const JUMP_V = 590, JUMP_H = JUMP_V * JUMP_V / 3000;
const airJumps = () => (job().tier >= 2 ? (job().type === 'melee' ? 2 : 1) : 0);   // 공중에서 더 뛸 수 있는 횟수
function platformsUnder(x, y0, y1, w = 0) {
  for (const p of W.platforms) if (x > p.x - w && x < p.x + p.w + w && y0 <= p.y + 0.5 && y1 >= p.y) return p;
  return null;
}
function ropeAt(x, y) { for (const r of W.ropes || []) if (Math.abs(r.x - x) < 14 && y >= r.y0 - 4 && y <= r.y1 + 4) return r; return null; }
function updatePlayer(dt) {
  const p = player, st = stats();
  if (p.dead) return;
  p.inv = Math.max(0, p.inv - dt); p.hurtT = Math.max(0, p.hurtT - dt); p.landT = Math.max(0, p.landT - dt); p.castT = Math.max(0, p.castT - dt); p.animT += dt; p.dropT = Math.max(0, p.dropT - dt);
  for (const k of Object.keys(p.cds)) p.cds[k] = Math.max(0, p.cds[k] - dt);
  p.potCd = Math.max(0, (p.potCd || 0) - dt);
  p.mp = Math.min(st.mp, p.mp + st.mpr * dt);
  if (p.hp > st.hp) p.hp = st.hp;
  const mech = job().mech;
  if (mech === 'support') p.support = Math.max(0, (p.support || 0) - dt * 1.2);
  if (mech === 'viewers' && scene === 'stage') {
    p.viewers = Math.max(0, p.viewers - p.viewers * 0.012 * dt);
    if ((p.donT -= dt) <= 0) { p.donT = 10; const don = Math.round(p.viewers / 100 * SCALE.gold(W.g || 0) * 0.4); if (don > 0) { S.gold += don; W.loot.gold += don; W.texts.push({ x: p.x, y: p.y - 90, s: `후원 ₩${fmt(don)}`, c: '#ffd24d', t: 0, big: true }); SFX.play('coin'); }
      if (p.viewers >= 100 && !p.dead) { const st = stats(); const h = Math.round(st.hp * Math.min(0.08, 0.02 + p.viewers / 1000 * 0.01)); p.hp = Math.min(st.hp, p.hp + h); W.texts.push({ x: p.x, y: p.y - 108, s: `응원 댓글 +${fmt(h)}`, c: '#7ee08a', t: 0 }); } }
  }
  let ax = 0; if (keys.left) ax -= 1; if (keys.right) ax += 1;
  p.ropeCd = Math.max(0, (p.ropeCd || 0) - dt);
  // 밧줄 잡기: 밧줄 앞에서 ↑, 밧줄 위 발판에서 ↓ (공중에서도 ↑로 잡는다)
  if (!p.climb && (keys.up || keys.down) && p.dashT <= 0 && p.hurtT <= 0 && p.ropeCd <= 0) {
    const r = ropeAt(p.x, p.y - (keys.down ? 0 : 6));
    if (r && !(keys.down && p.y >= r.y1 - 1) && !(keys.up && p.y <= r.y0 + 1)) { p.climb = r; p.x = r.x; p.vx = 0; p.vy = 0; p.onGround = false; p.atkT = 0; p.grabT = 0.2; p.dj = 0; p.flashT = 0; }
  }
  if (p.climb) {
    const r = p.climb; p.x = r.x; p.vx = 0; p.grabT = Math.max(0, (p.grabT || 0) - dt);
    // 매달린 채 옆으로 밀면(↑↓ 없이) 그쪽으로 뛰어내린다. 점프 버튼도 같다
    if (pressed.jump || (ax && !keys.up && !keys.down && p.grabT <= 0)) {
      p.climb = null; p.ropeCd = 0.35; p.onGround = false; p.vy = ax ? -330 : -140; p.vx = ax * 170; if (ax) p.face = ax; SFX.play('jump'); updateActButton(); return;
    }
    p.vy = (keys.down ? 1 : 0) * 130 - (keys.up ? 1 : 0) * 130;
    p.y += p.vy * dt; if (p.vy) p.walkT += dt; else p.walkT = 0;
    if (p.y <= r.y0) { p.y = r.y0; p.climb = null; p.onGround = true; p.vy = 0; p.plat = W.platforms.find((q) => Math.abs(q.y - r.y0) < 1 && r.x >= q.x - 2 && r.x <= q.x + q.w + 2) || null; }
    else if (p.y >= r.y1) { p.y = r.y1; p.climb = null; p.onGround = true; p.vy = 0; p.plat = r.y1 >= GROUND ? null : W.platforms.find((q) => Math.abs(q.y - r.y1) < 1) || null; }
    updateActButton();
    return;
  }
  if (p.dashT > 0) {
    p.dashT -= dt; p.vx = p.dashV; p.trailT -= dt;
    if (p.trailT <= 0) { p.trailT = 0.03; W.fx.push({ k: 'trail', x: p.x, y: p.y, face: p.face, fi: HF.strike, t: 0, dur: 0.25, color: job().color }); }
    if (p.dashT <= 0) { p.vx = 0; if (p.onDashEnd) { const f = p.onDashEnd; p.onDashEnd = null; f(); } }
  } else if (p.flashT > 0 && p.hurtT <= 0) {
    p.flashT -= dt; p.vx = p.flashV; p.trailT -= dt;
    if (p.trailT <= 0) { p.trailT = 0.04; W.fx.push({ k: 'trail', x: p.x, y: p.y, face: p.face, fi: HF.jump, t: 0, dur: 0.22, color: job().color }); }
  } else if (p.hurtT <= 0) {
    const attacking = p.atkT > 0 || p.castT > 0;
    const sp = 150 * st.move * (attacking && p.onGround ? 0.3 : 1);
    p.vx = ax * sp;
    if (ax && !(p.atkT > 0)) p.face = ax;
  }
  // 아래로 내려가기 (발판에서 ↓ 또는 ↓+점프)
  if (p.onGround && p.plat && (pressed.down || (keys.down && pressed.jump))) { p.dropT = 0.28; p.onGround = false; p.vy = 60; p.plat = null; }
  // 점프: X·Space·점프 버튼 또는 ↑(밧줄 앞이 아닐 때)
  else if ((pressed.jump || pressed.up) && p.onGround && p.dashT <= 0) { p.vy = -JUMP_V; p.onGround = false; p.dj = 0; SFX.play('jump'); fxDust(p.x, p.y); }
  // 공중 점프: 2차 전직부터 모두 2단 점프, 근거리는 3단(방향키를 누르면 그쪽으로 도약, 안 누르면 곧장 위로). 2단은 금고층(150)에 못 닿고, 근거리 3단은 넉넉히 닿는다 (근거리의 특권)
  else if ((pressed.jump || pressed.up) && !p.onGround && (p.dj || 0) < airJumps() && p.dashT <= 0 && p.hurtT <= 0) {
    p.dj = (p.dj || 0) + 1;
    if (job().type === 'melee' && ax) { p.face = ax; p.vy = -320; p.flashT = 0.3; p.flashV = ax * 430; p.trailT = 0; }   // 방향키를 누르고 있으면 그쪽으로 도약
    else if (job().type === 'melee') { p.vy = -320; p.flashT = 0; }   // 안 누르면 곧장 위로
    else p.vy = Math.min(p.vy, -300);
    W.fx.push({ k: 'ring', x: p.x, y: p.y - 6, r: 22 + 6 * p.dj, t: 0, dur: 0.3, color: job().color }); SFX.play('jump'); fxDust(p.x, p.y);
  }
  p.vy = Math.min(720, p.vy + 1500 * dt);
  const oldY = p.y;
  p.x += p.vx * dt; p.y += p.vy * dt;
  const wasGround = p.onGround; p.onGround = false;
  if (p.y >= GROUND) { p.y = GROUND; p.vy = 0; p.onGround = true; p.plat = null; }
  else if (p.vy >= 0 && p.dropT <= 0) { const pl = platformsUnder(p.x, oldY, p.y); if (pl) { p.y = pl.y; p.vy = 0; p.onGround = true; p.plat = pl; } }
  if (p.onGround && p.plat && (p.x < p.plat.x - 2 || p.x > p.plat.x + p.plat.w + 2)) { p.onGround = false; p.plat = null; }
  if (p.onGround) { p.dj = 0; p.flashT = 0; }
  if (p.onGround && !wasGround) { p.landT = 0.12; fxDust(p.x, p.y); }
  let minX = 14, maxX = W.len - 14;
  if (W.lock) { minX = W.lock[0] + 14; maxX = W.lock[1] - 14; }
  p.x = clamp(p.x, minX, maxX);
  if (Math.abs(p.vx) > 1 && p.onGround) p.walkT += dt; else p.walkT = 0;
  // 기본 공격
  p.comboWin = Math.max(0, p.comboWin - dt);
  if (p.atkT > 0) {
    p.atkT -= dt * st.spd * (buff('cram') ? 1.8 : 1);
    const prog = 1 - p.atkT / p.atkDur;
    if (prog > 0.32 && !p.hitDone) { p.hitDone = true; basicHit(); }
    if (p.atkT <= 0) p.comboWin = 0.34;
  } else if ((pressed.attack || keys.attack) && p.dashT <= 0 && !(scene === 'town' && actTarget)) {
    startAttack();
  }
  if (scene === 'stage') {
    for (let i = 0; i < 4; i++) if (pressed['s' + (i + 1)]) castSkill(i);
    if (pressed.ult) castUlt();
  }
  if (pressed.potion) useCons('gimbap');
  updateActButton();
}
function hitBox(m, x, y, w, h) {
  const mx = m.x - m.w / 2, my = m.y - m.h * 0.92, mw = m.w, mh = m.h * 0.92;
  return x < mx + mw && x + w > mx && y < my + mh && y + h > my;
}
function liveMobs() { return W.mobs.filter((m) => !m.dead); }
function useCons(id) {
  const p = player, st = stats(); if (!p || p.dead) return;
  if ((S.cons[id] || 0) <= 0) { toast(`${CONSUMABLES[id].name}이(가) 없습니다`); return; }
  if (id === 'gimbap' && p.potCd > 0) { if (!S.auto) toast(`김밥은 ${Math.ceil(p.potCd)}초 뒤에 먹을 수 있어요`); return; }
  S.cons[id]--;
  if (id === 'gimbap') p.potCd = 10;
  if (id === 'gimbap') p.hp = Math.min(st.hp, p.hp + st.hp * 0.4 * st.heal);
  if (id === 'coffee') p.mp = Math.min(st.mp, p.mp + st.mp * 0.5);
  if (id === 'americano') { p.mp = st.mp; buffs.americano = 20; }
  if (id === 'energy') buffs.energy = 30;
  if (W) { W.texts.push({ x: p.x, y: p.y - 70, s: CONSUMABLES[id].name, c: '#6ee7a8', t: 0, big: false }); fxSparkle(p.x, p.y - 30, '#6ee7a8', 10); }
  SFX.play('heal');
}
// ---------- 피해 ----------
function damageMob(m, dmg, o = {}) {
  const st = stats();
  if (m.dead) return 0;
  if (m.fake) { m.dead = true; W.texts.push({ x: m.x, y: m.y - m.h, s: '모순!', c: '#c48cff', t: 0, big: true }); fxBurst(m.x, m.y - m.h / 2, '#c48cff', 14); SFX.play('crit'); return 0; }
  const crit = !o.noCrit && Math.random() < st.crit;
  let d = dmg * (crit ? st.critDmg : 1) * st.type(W.ch.type) * rand(0.92, 1.08) * (m.boss || m.mid ? st.boss : 1) * (o.ally ? st.comp : 1);
  if (m.boss) d = bossDamageMod(m, d);
  if (!o.ally) d *= autoMul();
  m.hp -= d; m.flash = m.boss || m.mid ? 0.05 : 0.08;
  if (!o.ally && st.ls) lifesteal(d * st.ls);
  if (!m.boss || m.id === 'orc') {
    if (o.kb) { const heavy = m.boss || m.mid ? 0.15 : 1; m.vx = (m.x > o.src ? 1 : -1) * o.kb * heavy; m.stun = Math.max(m.stun, m.mid ? 0.05 : 0.22); if (m.onGround && o.up && !m.boss && !m.mid) { m.vy = -o.up; m.onGround = false; } }
  }
  if (o.stun) { const sd = o.stun * st.stunMul; m.stun = Math.max(m.stun, m.boss ? sd * 0.25 : m.mid ? sd * 0.4 : sd); }
  if (!o.ally) player.ult = Math.min(100, player.ult + (crit ? 3 : 2) * (o.ultMul ?? 1) * st.ultMul * (job().mech === 'support' && player.support >= 80 ? 2 : 1));
  if (o.basic && job().mech === 'support') player.support = Math.min(100, (player.support || 0) + (o.basic === 'proj' ? 1 : 2));
  if (o.basic) player.mp = Math.min(st.mp, player.mp + st.mpHit * (o.basic === 'proj' ? 0.5 : 1));
  if (o.basic && job().mech === 'card') { const cb = Math.max(1, Math.round(SCALE.gold(W.g || 0) * 0.3 * st.gold)); S.gold += cb; if (W.loot) W.loot.gold += cb; }
  W.texts.push({ x: m.x + rand(-8, 8), y: m.y - m.h - 4, s: fmt(d), c: crit ? '#ffe45c' : o.ally ? '#9ad7ff' : '#ffffff', t: 0, big: crit });
  fxBurst(m.x, m.y - m.h * 0.5, o.color || (crit ? '#ffe45c' : '#f4f1e6'), crit ? 8 : 4);
  if (!o.quiet) SFX.play(crit ? 'crit' : 'hit');
  if (crit || o.heavy) { hitStop = Math.max(hitStop, 0.045); cam.shake = Math.max(cam.shake, crit ? 4 : 3); }
  if (m.hp <= 0) killMob(m);
  return d;
}
// 피흡: 1초에 최대 멘탈의 6%까지 (광역 스킬 한 방에 다 차지 않게)
function lifesteal(h) {
  const p = player, st = stats(); if (!p || p.dead || !W) return;
  if (W.t - (p.lsT ?? -9) >= 1) { p.lsT = W.t; p.lsUsed = 0; }
  const g = Math.min(h, st.hp * 0.06 - p.lsUsed, st.hp - p.hp); if (g <= 0) return;
  p.lsUsed += g; p.hp += g; p.lsShow = (p.lsShow || 0) + g;
  if (W.t - (p.lsTxt ?? -9) > 0.5 && p.lsShow >= 1) { W.texts.push({ x: p.x, y: p.y - 78, s: `+${fmt(p.lsShow)}`, c: '#ff5c7a', t: 0 }); p.lsShow = 0; p.lsTxt = W.t; }
}
function killMob(m) {
  m.dead = true; const st = stats(), df = diff();
  player.ult = Math.min(100, player.ult + 5 * st.ultMul);
  player.mp = Math.min(st.mp, player.mp + st.mpHit * 1.5);
  fxBurst(m.x, m.y - m.h / 2, '#f4f1e6', 16, true);
  if (m.boss) { bossDefeated(m); return; }
  S.kills[m.id] = (S.kills[m.id] || 0) + 1; W.kills++;
  if (job().mech === 'viewers') { const p = player; p.kchain = W.t - p.killT < 3 ? p.kchain + 1 : 1; p.killT = W.t; const add = 40 * Math.min(5, p.kchain) * (m.elite ? 3 : 1); p.viewers += add; W.texts.push({ x: p.x, y: p.y - 74, s: `+${add} 시청자${p.kchain > 1 ? ` ×${Math.min(5, p.kchain)}` : ''}`, c: '#c48cff', t: 0 }); }
  if (m.elite && Math.random() < 0.06) { const left = Object.keys(TRIVIA).filter((t) => !S.trivia.includes(t)); if (left.length) { W.texts.push({ x: m.x, y: m.y - m.h - 10, s: '판례 카드!', c: '#ffe45c', t: 0, big: true }); learnTrivia(pick(left)); } }
  questKill(m.id);
  const g = W.g;
  const expv = SCALE.exp(g) * (m.elite ? 4 : 1) * (m.mid ? 14 : 1) * st.exp * df.rew; gainExp(expv); W.loot.exp += expv;
  dropCoins(m.x, m.y - m.h / 2, SCALE.gold(g) * (m.elite ? 4 : 1) * (m.mid ? 12 : 1) * st.gold * df.rew, m.elite || m.mid ? 6 : irand(1, 2));
  if (m.mid || (m.elite && Math.random() < 0.3) || Math.random() < 0.012) dropItem(m.x, m.y - m.h / 2, { gradeBoost: m.mid ? 1 : 0 });
  if (Math.random() < 0.02) dropLoot(m.x, m.y - 20, pick(['gimbap', 'coffee', 'coffee', 'americano']));
  if (Math.random() < (m.mid ? 1 : m.elite ? 0.25 : 0.012)) dropLoot(m.x, m.y - 20, 'inji');
  if (Math.random() < 0.004) dropLoot(m.x, m.y - 20, 'contract');
  if (m.elite || m.mid) {
    const rid = W.ch.rumors.find((x) => !S.rumors.includes(x) && !W.pickups.some((p) => p.rumor === x));
    if (rid != null && Math.random() < (m.mid ? 1 : 0.3)) dropLoot(m.x, m.y - 20, 'note', { rumor: rid });
  }
  if (m.mid) { if (Math.random() < 0.3) dropLoot(m.x, m.y - 30, 'book', { book: 'b1' }); if (W.c >= 3 && Math.random() < 0.1) dropLoot(m.x, m.y - 30, 'book', { book: 'b2' }); }
  else if (m.elite && Math.random() < 0.03) dropLoot(m.x, m.y - 30, 'book', { book: 'b1' });
  questDrops(m, m.elite || m.mid ? 'elite' : 'all');
  if (m.mid) midDefeated(m);
}
function hurtPlayer(dmg, srcX) {
  const p = player, st = stats();
  if (p.inv > 0 || p.dead || buff('invuln')) return;
  let d = dmg * (1 - st.dr) * rand(0.9, 1.1);
  if (buff('guard')) d *= 0.3;
  if (buff('reflect')) { const near = liveMobs().filter((m) => Math.abs(m.x - p.x) < 160); for (const m of near) damageMob(m, stats().atk * 1.2 * skillMul('df3'), { quiet: true, color: '#ffd76b' }); }
  if (job().mech === 'support') p.support = Math.max(0, (p.support || 0) - 8);
  if (job().mech === 'viewers' && p.viewers > 0) { const lost = Math.round(p.viewers * 0.15); p.viewers -= lost; if (lost > 10) W.texts.push({ x: p.x, y: p.y - 84, s: `-${lost} 시청자`, c: '#ff8a73', t: 0 }); }
  const melee = job().type === 'melee';
  p.hp -= d; p.inv = 0.8; p.hurtT = melee ? 0.1 : 0.22; p.vx = (p.x >= srcX ? 1 : -1) * (melee ? 60 : 170); p.vy = melee ? -90 : -200; p.onGround = false; if (!melee) p.atkT = 0; p.dashT = 0;
  W.hits = (W.hits || 0) + 1;
  W.texts.push({ x: p.x, y: p.y - 64, s: `-${fmt(d)}`, c: '#ff6b6b', t: 0, big: true });
  SFX.play('hurt'); cam.shake = Math.max(cam.shake, 5);
  if (p.hp <= 0) { p.hp = 0; playerDied(); }
}
function playerDied() {
  player.dead = true;
  if (W && W.surv) { W.ended = true; showBanner('탈락', `${W.wave}웨이브`); BGM.jingle('lose'); later(1.2, () => survivalResults()); return; } showBanner('번아웃', '멘탈이 바닥났습니다'); BGM.jingle('lose');
  later(1.2, () => { deathSheet(); showGuide('g_death'); });
}
// 부활은 사건당 4번까지, 갈수록 비싸다 (무한 부활은 막고, 막히면 충전으로 이어진다)
const REVIVE_COST = [50, 100, 200, 300];
function deathSheet() { openSheet('번아웃', [], () => `
    <div class="card"><h3>사건이 속행되었습니다</h3><p>권장 레벨보다 낮다면 앞 단계를 다시 돌며 레벨과 장비를 챙기세요. 스킬·스탯·동료·이력서도 확인!</p>
    <div class="row wrap">${reviveBtns()}<button class="btn ghost" data-act="retry">처음부터 다시</button><button class="btn ghost" data-act="town">마을로</button></div></div>`, null, 'dead'); }
function reviveBtns() {
  const n = W.revives || 0, c = REVIVE_COST[n];
  if (n >= REVIVE_COST.length) return `<button class="btn" disabled>부활은 사건당 ${REVIVE_COST.length}번까지</button>`;
  const left = `<small>(이번 사건 ${REVIVE_COST.length - n}회 남음)</small>`;
  if (S.inji >= c) return `<button class="btn" data-act="revive">그 자리에서 부활 · 인지 ${c} ${left}</button>`;
  return `<button class="btn supreme" data-act="revcharge">인지 충전하고 부활 · ${c - S.inji} 부족 ${left}</button>`;
}
function revive() {
  const n = W.revives || 0; if (n >= REVIVE_COST.length || S.inji < REVIVE_COST[n]) return; S.inji -= REVIVE_COST[n]; W.revives = n + 1; closeSheet();
  const st = stats(); player.dead = false; player.hp = st.hp; player.mp = st.mp; player.inv = 2.5; buffs.invuln = 2;
  W.fx.push({ k: 'pillar', x: player.x, w: 60, color: '#ffe45c', t: 0, dur: 0.8 }); SFX.play('heal');
  for (const m of liveMobs()) if (Math.abs(m.x - player.x) < 200 && !m.boss) { m.vx = (m.x > player.x ? 1 : -1) * 260; m.stun = 1; }
}
function gainExp(x) {
  S.exp += x; let up = 0;
  while (S.exp >= expReq(S.lv)) { S.exp -= expReq(S.lv); S.lv++; S.pts += 3; S.sp += 1; up++; }
  if (up) {
    statCache = null; SFX.play('level'); const st = stats();
    if (player) { player.hp = st.hp; player.mp = Math.max(player.mp, st.mp * 0.5); }
    if (W && player) { W.texts.push({ x: player.x, y: player.y - 80, s: `LEVEL UP! Lv.${S.lv}`, c: '#6ee7a8', t: 0, big: true }); W.fx.push({ k: 'pillar', x: player.x, w: 40, color: '#6ee7a8', t: 0, dur: 0.6 }); }
    toast(`<b>Lv.${S.lv}</b> · 스탯 +${up * 3} · 스킬 포인트 +${up}`);
    for (const id of job().skills) { const sk = SKILLS[id]; if (typeof sk.learn === 'object' && S.lv >= sk.learn.lv && S.lv - up < sk.learn.lv && !skillLv(id)) toast(`스킬 「${sk.name}」을(를) 배울 수 있는 레벨! 필요: ${BOOKS[sk.learn.book].name}`); }
    refreshQuestUI(); checkGuides(); updateBadges();
  }
}
// ---------- 드롭 ----------
function dropCoins(x, y, total, n) { for (let i = 0; i < n; i++) W.pickups.push({ k: 'coin', x: x + rand(-6, 6), y, vx: rand(-90, 90), vy: rand(-260, -140), v: total / n, t: 0 }); }
function dropLoot(x, y, id, extra = {}) { W.pickups.push({ k: id, x, y, vx: rand(-60, 60), vy: -240, t: 0, ...extra }); }
function rollGrade(boost = 0) {
  const w = [62, 27, 9, 1.8, 0.2]; let r = Math.random() * 100; let g = 0;
  for (; g < 4; g++) { if ((r -= w[g]) < 0) break; }
  return Math.min(4, g + boost);
}
function makeItem(base, grade, ilv) {
  const gm = GRADE_MULT[grade]; const st = {};
  if (base.slot === 'weapon') { st.atk = Math.round((4 + ilv * 1.7) * gm); if (Math.random() < 0.5) st.crit = +(0.01 * irand(2, 5) * (1 + grade * 0.3)).toFixed(3); else st.spd = +(0.01 * irand(3, 8) * (1 + grade * 0.3)).toFixed(3); }
  else if (base.slot === 'armor') { st.hp = Math.round((20 + ilv * 9) * gm); st.dr = +(0.01 * irand(1, 3) * (1 + grade * 0.4)).toFixed(3); }
  else if (base.slot === 'acc') { const r = Math.random(); if (r < 0.4) st.crit = +(0.01 * irand(2, 5) * gm * 0.7).toFixed(3); else if (r < 0.75) st.atkPct = +(0.01 * irand(3, 7) * gm * 0.7).toFixed(3); else st.cdr = +(0.01 * irand(2, 5) * gm * 0.6).toFixed(3); }
  else { const r = Math.random(); if (r < 0.4) st.gold = +(0.01 * irand(6, 14) * gm * 0.6).toFixed(3); else if (r < 0.75) st.mpr = +(irand(1, 3) * gm * 0.6).toFixed(2); else st.exp = +(0.01 * irand(4, 9) * gm * 0.6).toFixed(3); }
  const name = `${pick(PREFIX[grade])} ${base.name}`;
  return { uid: S.uid++, base: base.i, slot: base.slot, name, grade, ilv, st, en: 0 };
}
function dropItem(x, y, o = {}) {
  const base = pick(EQ_BASES); const ilv = Math.round((W.g || 0) * 1.4 + 2 + (W.tier === 2 ? 20 : W.hard ? 8 : 0));
  const it = makeItem(base, rollGrade(o.gradeBoost || 0), ilv);
  W.pickups.push({ k: 'item', item: it, x, y, vx: rand(-60, 60), vy: -260, t: 0 });
}
function makeLegend(jid, ilv) {
  const L = LEGENDS[jid];
  return { uid: S.uid++, base: -1, leg: jid, slot: 'weapon', name: L.name, grade: 4, ilv, st: { atk: Math.round((4 + ilv * 1.7) * GRADE_MULT[4] * 1.1), ls: 0.04, ...L.st }, en: 0 };
}
// 직업 전용 전설(피흡) 무기: 보스에게서 낮은 확률 + 천장(보스 15마리)
function legendDrop(x, y, rate) {
  if (!LEGENDS[S.job]) return;
  const n = (S.legPity || 0) + 1;
  if (Math.random() >= rate && n < 15) { S.legPity = n; return; }
  S.legPity = 0;
  const ilv = Math.round((W.g || 0) * 1.4 + 4 + (W.tier === 2 ? 20 : W.hard ? 8 : 0));
  W.pickups.push({ k: 'item', item: makeLegend(S.job, ilv), x, y, vx: rand(-40, 40), vy: -300, t: 0 });
  W.texts.push({ x, y: y - 24, s: '전설 · 피흡 무기!', c: '#ff5c7a', t: 0, big: true });
}
function makeCos(id) { const c = COSMETICS[id]; return { uid: S.uid++, cos: id, slot: c.slot, name: c.name, grade: c.grade, ilv: 0, st: { ...c.st }, en: 0, base: -1 }; }
function giveCos(id, silent) {
  if (S.inv.some((x) => x.cos === id)) { S.inji += 30; if (!silent) toast(`${COSMETICS[id].name} 중복 → 인지 30`); return null; }
  const it = makeCos(id); S.inv.push(it);
  if (!S.equip[it.slot]) { S.equip[it.slot] = it.uid; statCache = null; }
  if (!silent) { toast(`<span class="ic" style="${iconStyle('cos', COSMETICS[id].i)}"></span>코스튬 <b class="gc${it.grade}">${esc(it.name)}</b> 획득!`, 4000); showGuide('g_cos'); }
  return it;
}
function hitProp(pr) {
  pr.hp--; pr.flash = 0.1; SFX.play('hit'); fxBurst(pr.x, pr.y - 20, '#c9d1e8', 6);
  if (pr.hp <= 0) {
    pr.dead = true; SFX.play('coin'); fxBurst(pr.x, pr.y - 20, '#ffe45c', 18, true);
    dropCoins(pr.x, pr.y - 30, SCALE.gold(W.g) * 10 * stats().gold, 8);
    if (Math.random() < 0.6) dropItem(pr.x, pr.y - 30, { gradeBoost: 1 });
    dropLoot(pr.x, pr.y - 30, pick(['gimbap', 'americano', 'energy', 'coffee']));
    if (Math.random() < 0.5) dropLoot(pr.x, pr.y - 30, 'inji');
    if (Math.random() < 0.08) dropLoot(pr.x, pr.y - 30, 'book', { book: 'b1' });
    questDrops(pr, 'safe');
  }
}
function updatePickups(dt) {
  const p = player;
  for (const k of W.pickups) {
    k.t += dt; const oldY = k.y; k.vy += 900 * dt; k.x += k.vx * dt; k.y += k.vy * dt; k.vx *= 0.96;
    const floor = GROUND - 6; if (k.y > floor) { k.y = floor; k.vy *= -0.35; k.vx *= 0.7; }
    else if (k.vy > 0) { const pl = platformsUnder(k.x, oldY + 6, k.y + 6); if (pl) { k.y = pl.y - 6; k.vy *= -0.35; k.vx *= 0.7; } }
    let c = p, d = Math.hypot(p.x - k.x, (p.y - 26) - k.y);   // 가장 가까운 사람이 줍는다 (동료 포함)
    for (const a of W.allies || []) { const da = Math.hypot(a.x - k.x, (a.y - 26) - k.y); if (da < d) { d = da; c = a; } }
    const dx = c.x - k.x, dy = (c.y - 26) - k.y;
    const mag = k.k === 'coin' ? 90 : 70;
    if (k.t > 0.4 && d < mag) { k.x += dx * Math.min(1, dt * 9); k.y += dy * Math.min(1, dt * 9); }
    if (k.t > 0.4 && d < 18) { k.done = true; collect(k); }
  }
  W.pickups = W.pickups.filter((k) => !k.done);
}
function collect(k) {
  SFX.play('coin');
  if (k.k === 'coin') { S.gold += k.v; W.loot.gold += k.v; W.texts.push({ x: k.x, y: k.y - 10, s: `+₩${fmt(k.v)}`, c: '#ffe45c', t: 0 }); return; }
  if (k.k === 'item') {
    const it = k.item;
    const cur = S.inv.find((x) => x.uid === S.equip[it.slot]);
    if (S.autoSell && it.grade === 0 && cur && itemScore(cur) >= itemScore(it)) { const g = sellPrice(it); S.gold += g; W.loot.gold += g; W.texts.push({ x: k.x, y: k.y - 14, s: `자동 판매 +₩${fmt(g)}`, c: '#c9d1e8', t: 0 }); return; }
    S.inv.push(it); W.loot.items.push(it); toast(`<span class="ic" style="${itemIcon(it)}"></span><b class="gc${it.grade}">${esc(it.name)}</b> 획득`); if (it.leg) { showBanner('전설 · 피흡 무기!', it.name); SFX.play('level'); } else if (it.grade >= 3) showBanner(`${GRADES[it.grade]} 장비!`, it.name); autoEquipIfBetter(it); return;
  }
  if (k.k === 'cos') { giveCos(k.cos); return; }
  if (k.k === 'inji') { const v = irand(10, 30); S.inji += v; toast(`<span class="ic" style="${iconStyle('loot', LOOT.inji)}"></span>인지 +${v}`); return; }
  if (k.k === 'contract') { S.contracts++; toast(`<span class="ic" style="${iconStyle('loot', LOOT.contract)}"></span>헤드헌팅 계약서 (백화점 무료 1회)`); return; }
  if (k.k === 'note') { if (!S.rumors.includes(k.rumor)) { S.rumors.push(k.rumor); const r = RUMORS[k.rumor]; toast(`<span class="ic" style="${iconStyle('loot', LOOT.note)}"></span>비밀 쪽지 · ${esc(r.npc)}: “${esc(r.line)}”`, 5000); } return; }
  if (k.k === 'book') { S.books[k.book] = (S.books[k.book] || 0) + 1; W.loot.books[k.book] = (W.loot.books[k.book] || 0) + 1; toast(`<span class="ic" style="${iconStyle('equip', 1)}"></span><b style="color:#c48cff">${BOOKS[k.book].name}</b> 획득! (메뉴 → 스킬)`, 4000); showBanner(BOOKS[k.book].name, '스킬을 배울 수 있다'); updateBadges(); return; }
  if (k.k === 'qitem') { S.qitems[k.it] = (S.qitems[k.it] || 0) + 1; W.loot.qitems[k.it] = (W.loot.qitems[k.it] || 0) + 1; const need = questNeed(k.it); const it = QITEMS[k.it]; toast(`<span class="ic" style="${iconStyle(it.icon[0], it.icon[1])}"></span><b>${esc(it.name)}</b> ${S.qitems[k.it]}${need ? ` / ${need}` : ''}`); refreshQuestUI(); return; }
  if (CONSUMABLES[k.k]) { S.cons[k.k] = (S.cons[k.k] || 0) + 1; toast(`<span class="ic" style="${iconStyle('loot', CONSUMABLES[k.k].icon)}"></span>${CONSUMABLES[k.k].name} +1`); }
}
function itemScore(it) { if (!it) return 0; const s = it.st, em = 1 + 0.1 * (it.en || 0); return ((s.atk || 0) * 2 + (s.hp || 0) * 0.25 + ((s.crit || 0) + (s.atkPct || 0) + (s.spd || 0) + (s.dr || 0) + (s.cdr || 0)) * 300 + ((s.gold || 0) + (s.exp || 0) + (s.skill || 0)) * 100 + (s.mpr || 0) * 6 + (s.ls || 0) * 1500) * em; }
function autoEquipIfBetter(it) {
  if (it.leg && it.leg !== S.job) return;
  const cur = S.inv.find((x) => x.uid === S.equip[it.slot]);
  if (!cur || itemScore(it) > itemScore(cur)) { S.equip[it.slot] = it.uid; statCache = null; toast(`자동 장착: ${esc(it.name)}`); }
}

// ---------- 스테이지 진행 ----------
function updateStage(dt) {
  if (W.surv) { updateSurvival(dt); return; }
  const p = player;
  if (W.ended) { W.mobs = W.mobs.filter((m) => !m.dead || m.boss); return; }
  if (!W.lock) {
    for (const w of W.waves) {
      if (!w.done && !w.active && p.x > w.x) {
        w.active = true; const LW = Math.max(VW, viewW); const l0 = clamp(p.x - LW * 0.4, 0, W.len - LW); W.lock = [l0, l0 + LW]; W.go = false;
        const plats = w.plats.filter((q) => !q.vault && q.x + q.w > l0 + 20 && q.x < l0 + LW - 20);
        w.list.forEach((id, i) => {
          const shooter = MOBS[id].ai === 'shooter';
          const onPlat = plats.length && MOBS[id].ai !== 'flyer' && (shooter || i % 3 === 1);
          const high = plats.slice().sort((a, b) => a.y - b.y);
          if (onPlat) { const q = shooter ? high[i % Math.min(2, high.length)] : plats[i % plats.length]; spawnMob(id, clamp(q.x + rand(15, q.w - 15), Math.max(l0 + 30, q.x + 10), Math.min(l0 + LW - 30, q.x + q.w - 10)), { plat: q, drop: true }); }
          else { const fromLeft = i % 4 === 3; spawnMob(id, fromLeft ? W.lock[0] - 20 - i * 6 : W.lock[1] + 20 + i * 26); }
        });
        if (w.elite) spawnMob(pick(W.ch.mobs), W.lock[1] + 40, { elite: true });
        break;
      }
    }
    const allDone = W.waves.every((w) => w.done);
    if (allDone && W.arena != null && !W.arenaOn && p.x > W.arena + 40) {
      W.lock = [W.arena, W.arena + VW]; W.arenaOn = true;
      if (W.plan.boss) { if (W.ch.boss === 'kim') kimPrep(); else bossIntro(); }
      else midIntro();
    }
    if (allDone && W.arena == null && p.x > W.len - 80) stageClear();
  } else {
    const active = W.waves.find((w) => w.active && !w.done);
    if (active && W.mobs.every((m) => m.dead)) { active.done = true; active.active = false; W.lock = null; W.go = true; W.mobs = []; showBanner('GO ▶', ''); later(1.8, () => { if (W) W.go = false; }); }
  }
  W.mobs = W.mobs.filter((m) => !m.dead || m.boss);
  for (const pr of W.props) pr.flash = Math.max(0, (pr.flash || 0) - dt);
}
// ---------- 로스쿨 서바이벌: 끝없는 웨이브 ----------
function enterSurvival() {
  const maxC = Math.max(1, ...Object.keys(S.cleared).map((k) => parseSid(k).c));
  const ch = CHAPTERS[maxC - 1]; timers.length = 0; timeScale = 1; hitStop = 0; resetKeys(); S.auto = false;
  scene = 'stage'; const G = GROUND, len = 960;
  const plats = [{ x: 110, y: G - 72, w: 150 }, { x: 700, y: G - 72, w: 150 }, { x: 390, y: G - 146, w: 180 }];
  W = { kind: 'stage', surv: true, c: maxC, s: 0, id: 'surv', g: 1, ch, hard: false, plan: { zones: 0, mid: false, boss: false, elites: [] }, bg: ch.bg, mirror: ch.mirror, len, waves: [], platforms: plats, ropes: [{ x: 480, y0: G - 146, y1: G }], props: [], arena: null, top: G - 146 - 150,
    mobs: [], eprj: [], pprj: [], areas: [], pickups: [], fx: [], texts: [], allies: [], lock: [0, len], boss: null, mid: null, t: 0, kills: 0, hits: 0,
    loot: { gold: 0, exp: 0, items: [], books: {}, qitems: {} }, go: false, ended: false, rumorSet: [], par: 999, wave: 0, waveT: 2.5 };
  player = makePlayer(len / 2); buildAllies(); cam.x = 0; cam.y = 0; $('#bossbar').hidden = true;
  BGM.play('boss'); showBanner('로스쿨 서바이벌', `최고 기록 ${S.best.surv}웨이브 · 끝까지 버텨라`); showGuide('g_surv'); S.best.runs++;
}
function updateSurvival(dt) {
  if (W.ended) return;
  W.mobs = W.mobs.filter((m) => !m.dead);
  W.waveT -= dt;
  if (!W.mobs.length && W.wave > 0 && W.waveT > 1.5) W.waveT = 1.5;
  if (W.waveT > 0) return;
  W.wave++; W.g = Math.min(32, W.wave * 1.05);
  const pool = [...new Set(CHAPTERS.slice(0, W.c).flatMap((c) => c.mobs))];
  const n = Math.min(4 + Math.floor(W.wave * 0.7), 16);
  for (let i = 0; i < n; i++) spawnMob(pick(pool), i % 2 ? -10 - i * 16 : W.len + 10 + i * 16);
  if (W.wave % 5 === 0) { for (let i = 0; i < 1 + Math.floor(W.wave / 10); i++) spawnMob(pick(pool), W.len + 40 + i * 30, { elite: true }); showBanner(`${W.wave}웨이브 · 시험 감독관`, '정예 등장'); }
  else showBanner(`${W.wave}웨이브`, `몬스터 ${n}마리`);
  W.waveT = 16 + n * 0.6;
  if (W.wave > S.best.surv) { S.best.surv = W.wave; if (W.wave > 1) W.texts.push({ x: player.x, y: player.y - 96, s: '최고 기록 갱신!', c: '#ffe45c', t: 0, big: true }); }
}
function bossIntro() {
  if (W.kakha) { if (!S.story.kakha_pre) { S.story.kakha_pre = true; startDialog(KAKHA_PRE, spawnBoss); } else spawnBoss(); return; }
  const key = `boss_${W.c}`;
  if (!S.story[key] && STORY[key]) { S.story[key] = true; startDialog(STORY[key], spawnBoss); } else spawnBoss();
}
function midIntro() {
  const key = `mid_${W.c}`;
  if (!S.story[key] && STORY[key]) { S.story[key] = true; startDialog(STORY[key], spawnMid); } else spawnMid();
}
function startKim() { W.rumorSet = S.rumorOn.filter((i) => S.rumors.includes(i)); closeSheet(); bossIntro(); }
function midDefeated(m) {
  $('#bossbar').hidden = true;
  for (const x of W.mobs) if (!x.dead && x !== m) { x.dead = true; fxBurst(x.x, x.y - x.h / 2, '#f4f1e6', 10, true); }
  later(1.2, () => stageClear());
}
function bossDefeated(b) {
  W.ended = true; timeScale = 0.3; SFX.play('boom'); cam.shake = 12; BGM.jingle('win');
  showBanner(b.id === 'kim' ? '최종 변론 승리' : b.id === 'kakha' ? '각하를 각하했다!' : '승소!', b.d.name);
  W.mobs.forEach((m) => { if (!m.dead) { m.dead = true; fxBurst(m.x, m.y - m.h / 2, '#f4f1e6', 10, true); } });
  W.eprj = [];
  const df = diff(), st = stats();
  const rm = b.id === 'kim' ? 1 + 0.1 * W.rumorSet.length : b.id === 'kakha' ? 2 : 1;   // 소문을 켤수록, 각하는 2배
  const expv = SCALE.exp(W.g) * 32 * st.exp * df.rew * rm; gainExp(expv); W.loot.exp += expv;
  dropCoins(b.x, b.y - b.h / 2, SCALE.gold(W.g) * 30 * st.gold * df.rew * rm, 14);
  dropItem(b.x, b.y - b.h / 2, { gradeBoost: W.tier === 2 ? 3 : W.hard ? 2 : 1 }); if (Math.random() < 0.3) dropItem(b.x, b.y - b.h / 2, { gradeBoost: 1 });
  if (Math.random() < 0.06) { const pool = Object.keys(COSMETICS).filter((id) => COSMETICS[id].grade <= 3); dropLoot(b.x, b.y - 40, 'cos', { cos: pick(pool) }); }
  legendDrop(b.x, b.y - 50, b.id === 'kakha' ? 0.25 : W.tier === 2 ? 0.1 : W.hard ? 0.05 : 0.02);
  const c = W.c; const pity = S.bossPity[c] || 0;
  const table = { 1: [['b1', 0.5], ['b2', 0.2]], 2: [['b2', 0.3]], 3: [['b2', 0.3], ['b3', 0.1]], 4: [['b3', 0.15], ['b2', 0.3]], 5: [['b3', 0.25]] }[c];
  let got = false;
  for (const [bk, r] of table) if (Math.random() < r) { dropLoot(b.x, b.y - 40, 'book', { book: bk }); got = true; }
  if (!got && pity >= 3) { dropLoot(b.x, b.y - 40, 'book', { book: table[table.length - 1][0] }); got = true; }
  S.bossPity[c] = got ? 0 : pity + 1;
  questDrops(b, 'elite');
  later(1.6, () => { timeScale = 1; stageClear(); });
}
function stageClear() {
  if (W.kakha) { kakhaClear(); return; }
  if (W.cleared) return; W.cleared = true; W.ended = true;
  $('#bossbar').hidden = true;
  for (const k of W.pickups) { k.done = true; collect(k); }
  W.pickups = [];
  const id = W.id, prev = S.cleared[id];
  const stars = 1 + (W.hits <= 6 ? 1 : 0) + (W.t <= W.par ? 1 : 0);
  const first = !prev;
  let bonus = 0;
  if (first) bonus += 50;
  const prevStars = prev ? prev.stars : 0;
  if (stars > prevStars) bonus += (stars - prevStars) * 20;
  S.cleared[id] = { stars: Math.max(stars, prevStars), best: Math.min(W.t, prev ? prev.best : 1e9) };
  if (W.hard && !S.hard[id]) { S.hard[id] = true; bonus += 100; }
  if (W.tier === 2 && !S.supreme[id]) { S.supreme[id] = true; bonus += 200; if (id === '5-5' && !S.titles.includes('대법원 확정판결')) S.titles.push('대법원 확정판결'); }
  questClear(id, W.hard);
  const kimWin = W.plan.boss && W.c === 5, rumorN = kimWin ? W.rumorSet.length : 0;
  if (rumorN) bonus += 20 * rumorN;   // 소문 하나에 인지 20
  S.inji += bonus;
  if (W.plan.boss && W.c === 5 && first) { if (!S.titles.includes('김성호를 넘은 자')) S.titles.push('김성호를 넘은 자'); }
  refreshQuestUI();
  const key = `post_${W.c}`;
  const w0 = W; const finish = () => { if (W === w0 && W.loot) stageResults(first, bonus, stars); };
  // 김성호(5-5)를 넘으면 그 직업의 엔딩 (슬롯마다 직업별 한 번)
  const endJob = W.plan.boss && W.c === 5 && ENDINGS[S.job] && !S.endSeen[S.job] ? S.job : null;
  const after = endJob ? () => playEnding(endJob, finish) : finish;
  const go = () => { if (W.plan.boss && !S.story[key] && STORY[key]) { S.story[key] = true; startDialog(STORY[key], after); } else after(); };
  if (rumorN >= RUMORS.length && !S.kimTruth) {   // 소문 10개 전부: 진실
    S.kimTruth = true; if (!S.titles.includes('모든 소문의 증인')) S.titles.push('모든 소문의 증인'); giveCos('horns', true);
    startDialog(KIM_TRUTH, go);
  } else go();
  save();
}

// ======================================================================
// 몬스터 AI
// ======================================================================
function updateMob(m, dt) {
  if (m.dead) return;
  m.t += dt; m.flash = Math.max(0, m.flash - dt); m.atkA = Math.max(0, m.atkA - dt); m.slow = Math.max(0, m.slow - dt);
  if (m.slow > 0) dt *= 0.5;
  const p = player; const dx = p.x - m.x, adx = Math.abs(dx);
  if (m.boss) { updateBoss(m, dt); physicsMob(m, dt); return; }
  if (m.stun > 0) { m.stun -= dt; physicsMob(m, dt); return; }
  m.cd -= dt;
  const d = m.d;
  if (m.mid) {
    m.summonT -= dt;
    if (m.summonT <= 0) { m.summonT = 7; const n = liveMobs().length; if (n < 7) { for (let i = 0; i < 2; i++) spawnMob(pick(W.ch.mobs), m.x + rand(-60, 60)); W.texts.push({ x: m.x, y: m.y - m.h - 10, s: '부하 호출!', c: '#ffb84d', t: 0, big: true }); } }
  }
  const reach = m.w * 0.5 + 14;
  const sameLevel = Math.abs(p.y - m.y) < 34;
  // 발판 위 몬스터: 다른 층의 플레이어는 순찰
  const lo = m.plat ? m.plat.x + 8 : -1e9, hi = m.plat ? m.plat.x + m.plat.w - 8 : 1e9;
  const chase = (spd) => { let v = adx > reach - 4 ? Math.sign(dx) * spd : 0; if (m.plat && ((v < 0 && m.x <= lo) || (v > 0 && m.x >= hi))) v = 0; return v; };
  const patrol = (spd) => { if (m.x <= lo) m.patrol = 1; if (m.x >= hi) m.patrol = -1; m.face = m.patrol; return m.patrol * spd * 0.5; };
  // 플레이어가 아래층에 오래 있으면 가까운 발판 끝으로 걸어가 뛰어내린다
  if (m.plat && m.onGround && p.y > m.y + 20 && !m.boss && d.ai !== 'shooter') m.offT = (m.offT || 0) + dt; else m.offT = 0;
  if (m.offT > 4 && m.state !== 'attack' && m.state !== 'dash' && m.state !== 'wind') {
    const dir = m.x - m.plat.x < m.plat.x + m.plat.w - m.x ? -1 : 1; m.vx = dir * Math.max(30, d.spd); m.face = dir; physicsMob(m, dt); return;
  }
  if (Math.abs(dx) > 4 && m.state !== 'attack' && m.state !== 'dash' && (sameLevel || !m.plat)) m.face = dx > 0 ? 1 : -1;
  if (d.ai === 'walker') {
    if (m.state === 'wind') { m.wt -= dt; m.vx = 0; if (m.wt <= 0) { m.state = 'attack'; m.wt = 0.22; m.atkA = 0.3; if (Math.abs(p.x - (m.x + m.face * reach * 0.8)) < reach && Math.abs(p.y - m.y) < 40 + m.h * 0.3) hurtPlayer(m.dmg, m.x); } }
    else if (m.state === 'attack') { m.wt -= dt; if (m.wt <= 0) { m.state = 'move'; m.cd = rand(0.8, 1.2); } }
    else { m.vx = sameLevel || !m.plat ? chase(d.spd) : patrol(d.spd); if (adx < reach + 6 && sameLevel && m.cd <= 0) { m.state = 'wind'; m.wt = 0.38; } }
  } else if (d.ai === 'hopper') {
    if (m.onGround) { m.vx *= 0.8; if (m.cd <= 0) { m.vy = -360; let tx = Math.sign(dx) * Math.min(160, adx * 1.3 + 40); if (m.plat && !sameLevel) tx = m.patrol * 60; m.vx = tx; m.onGround = false; m.cd = rand(1.1, 1.7); m.atkA = 0.4; } }
    if (adx < m.w * 0.5 + 8 && Math.abs(p.y - m.y) < m.h) hurtPlayer(m.dmg, m.x);
  } else if (d.ai === 'charger') {
    if (m.state === 'wind') { m.wt -= dt; m.vx = 0; if (m.wt <= 0) { m.state = 'dash'; m.wt = 0.6; m.vx = m.face * (d.spd * 4.5); m.atkA = 0.6; } }
    else if (m.state === 'dash') { m.wt -= dt; if (adx < m.w * 0.5 + 10 && Math.abs(p.y - m.y) < 40) hurtPlayer(m.dmg * 1.4, m.x); if (m.wt <= 0) { m.state = 'move'; m.vx = 0; m.cd = rand(1.4, 2.2); } }
    else { m.vx = sameLevel || !m.plat ? chase(d.spd) : patrol(d.spd); if (adx < 220 && sameLevel && m.cd <= 0) { m.state = 'wind'; m.wt = 0.5; } if (adx < 28 && Math.abs(p.y - m.y) < 40 && m.cd <= 0) hurtPlayer(m.dmg, m.x); }
  } else if (d.ai === 'flyer') {
    if (m.state === 'swoop') { m.wt -= dt; m.atkA = 0.1; const tx = m.sx, ty = m.sy; m.x += (tx - m.x) * Math.min(1, dt * 4); m.y += (ty - m.y) * Math.min(1, dt * 4); if (Math.hypot(p.x - m.x, (p.y - 30) - (m.y - m.h / 2)) < 26 + m.h * 0.2) hurtPlayer(m.dmg, m.x); if (m.wt <= 0) { m.state = 'move'; m.cd = rand(1.6, 2.4); } }
    else {
      const tx = p.x - Math.sign(dx || 1) * 90; m.x += (tx - m.x) * Math.min(1, dt * 0.9);
      m.baseY += ((p.y - 46 - rand(0, 20)) - m.baseY) * Math.min(1, dt * 0.6); m.y = m.baseY + Math.sin(m.t * 3) * 10;
      if (m.cd <= 0) {
        if (d.proj && Math.random() < 0.6) { shootAt(m, d.proj); m.cd = rand(1.8, 2.6); m.atkA = 0.35; }
        else { m.state = 'swoop'; m.wt = 0.8; m.sx = p.x; m.sy = p.y - 8; }
      }
    }
    keepInLock(m);
    return;
  } else if (d.ai === 'shooter') {
    let v = 0; if (adx < 120) v = -Math.sign(dx) * d.spd; else if (adx > 240) v = Math.sign(dx) * d.spd;
    if (m.plat && ((v < 0 && m.x <= lo) || (v > 0 && m.x >= hi))) v = 0;
    if (W.lock) { if (m.x > W.lock[1] - 30) v = -d.spd; else if (m.x < W.lock[0] + 30) v = d.spd; }
    m.vx = v;
    if (m.cd <= 0 && adx < 360 && Math.abs(p.y - m.y) < 220) { shootAt(m, d.proj); m.cd = rand(1.8, 2.5); m.atkA = 0.35; }
    if (adx < 24 && Math.abs(p.y - m.y) < 40) hurtPlayer(m.dmg * 0.7, m.x);
  }
  physicsMob(m, dt);
}
function physicsMob(m, dt) {
  if (m.d && m.d.ai === 'flyer' && !m.boss) { if (m.stun > 0) { m.x += m.vx * dt; m.vx *= 0.9; } return; }
  if (m.boss && m.flying) return;
  const oldY = m.y;
  m.vy = Math.min(700, m.vy + 1300 * dt); m.x += m.vx * dt; m.y += m.vy * dt;
  if (m.y >= GROUND) { m.y = GROUND; m.vy = 0; m.onGround = true; m.plat = null; }
  else if (m.vy >= 0 && !m.boss) { const pl = platformsUnder(m.x, oldY, m.y); if (pl) { m.y = pl.y; m.vy = 0; m.onGround = true; m.plat = pl; } else m.onGround = false; }
  else m.onGround = false;
  if (m.plat && m.onGround && (m.x < m.plat.x - 4 || m.x > m.plat.x + m.plat.w + 4)) { m.onGround = false; m.plat = null; }
  if (m.stun > 0) m.vx *= 0.88;
  keepInLock(m);
}
function keepInLock(m) {
  if (!W.lock) { m.x = clamp(m.x, 0, W.len); return; }
  const a = W.lock[0] + 12, b = W.lock[1] - 12;
  if (m.x > a && m.x < b) m.inside = true;
  m.x = m.inside ? clamp(m.x, a, b) : clamp(m.x, W.lock[0] - 30, W.lock[1] + 60);
}
function shootAt(m, kind) {
  const p = player; const sx = m.x + m.face * m.w * 0.3, sy = m.y - m.h * 0.6;
  const a = Math.atan2((p.y - 30) - sy, p.x - sx);
  if (kind === 'paper') W.eprj.push({ k: 'paper', x: sx, y: sy, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, r: 8, dmg: m.dmg, life: 3, rot: 0 });
  else if (kind === 'coin') W.eprj.push({ k: 'coin', x: sx, y: sy, vx: (p.x - sx) * 0.9, vy: -330 + (p.y - m.y) * 1.1, g: 700, r: 7, dmg: m.dmg, life: 3 });
  else if (kind === 'orb') W.eprj.push({ k: 'orb', x: sx, y: sy, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, r: 9, dmg: m.dmg, life: 4, home: 1 });
  else if (kind === 'wave') W.eprj.push({ k: 'wave', x: sx, y: sy, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, r: 10, dmg: m.dmg, life: 3 });
}
// ---------- 보스 ----------
function bossDamageMod(b, d) {
  if (b.id === 'orc') { const n = W.mobs.filter((m) => !m.dead && m.member).length; if (n >= 3) { d *= 0.25; if (Math.random() < 0.2) W.texts.push({ x: b.x, y: b.y - b.h - 14, s: '조원 뒤에 숨음!', c: '#ffb84d', t: 0 }); } if (b.state === 'lazy') d *= 1.6; }
  if (b.id === 'golem') d *= Math.pow(0.9, b.stacks);
  if (b.id === 'kim') {
    if (b.shield) d *= 0.15;
    if (W.rumorSet.includes(7)) d *= 0.85;
  }
  return d;
}
function bossTxt(b, s, c = '#ff6b6b') { W.texts.push({ x: b.x, y: b.y - b.h - 10, s, c, t: 0, big: true }); }
function updateBoss(b, dt) {
  const p = player; const dx = p.x - b.x, adx = Math.abs(dx);
  b.atkA = Math.max(0, b.atkA - dt);
  if (b.stun > 0) { b.stun -= dt; return; }
  b.cd -= dt;
  for (const k of Object.keys(b.timers)) b.timers[k] -= dt;
  const ratio = b.hp / b.max;
  const spdMul = (b.id === 'kim' && W.rumorSet.includes(6) ? 1.6 : 1) * (W.tier === 2 ? 1.25 : W.hard ? 1.15 : 1);
  b.cd -= dt * (spdMul - 1);
  if (b.state === 'idle' || b.state === 'move') b.face = dx > 0 ? 1 : -1;
  const contact = (f = 0.6) => { if (adx < b.w * 0.45 && Math.abs(p.y - b.y) < b.h * 0.7) hurtPlayer(b.dmg * f, b.x); };
  if (b.id === 'orc') {
    if (b.state === 'lazy') { b.wt -= dt; b.vx = 0; if (b.wt <= 0) { b.state = 'idle'; b.cd = 1.5; } return; }
    if (b.state === 'slam') { b.wt -= dt; if (b.wt <= 0) { shockwave(b.x, b.dmg); b.state = 'idle'; b.cd = 1.8; b.atkA = 0.4; } return; }
    b.vx = adx > 70 ? Math.sign(dx) * 30 : 0; b.state = b.vx ? 'move' : 'idle'; contact(0.3);
    if (b.cd <= 0) {
      const r = b.pat++ % 3;
      if (r === 0) { const n = W.mobs.filter((m) => !m.dead && m.member).length; for (let i = 0; i < Math.min(3, 6 - n); i++) { const m = spawnMob('paperimp', b.x + rand(-40, 40)); m.member = true; m.dmg *= 0.8; } b.cd = 3; bossTxt(b, '조원 소환!', '#ffb84d'); }
      else if (r === 1) { b.state = 'slam'; b.wt = 0.8; bossTxt(b, '보고서 내려찍기!'); }
      else { b.state = 'lazy'; b.wt = 2.4; bossTxt(b, '드러눕기 (빈틈!)', '#6ee7a8'); }
    }
  } else if (b.id === 'golem') {
    b.timers.armor = (b.timers.armor ?? 8);
    if (b.timers.armor <= 0) { b.stacks = Math.min(8, b.stacks + 1); b.timers.armor = 8; bossTxt(b, `${b.stacks * 375}쪽 돌파! 방어 ↑`, '#c48cff'); }
    if (b.state === 'jump') { if (b.onGround && b.vy === 0 && b.wt <= 0) { shockwave(b.x, b.dmg); cam.shake = 8; b.state = 'idle'; b.cd = 2; } b.wt -= dt; contact(); return; }
    if (b.state === 'throw') { b.wt -= dt; if (b.wt <= 0) { for (let i = 0; i < 3; i++) W.eprj.push({ k: 'binder', x: b.x, y: b.y - b.h * 0.8, vx: dx * (0.55 + i * 0.25), vy: -380 - i * 40, g: 700, r: 11, dmg: b.dmg * 0.8, life: 4, rot: 0 }); b.state = 'idle'; b.cd = 2.4; b.atkA = 0.4; } return; }
    b.vx = adx > 60 ? Math.sign(dx) * 26 : 0; b.state = b.vx ? 'move' : 'idle'; contact(0.3);
    if (b.cd <= 0) {
      const r = b.pat++ % 2;
      if (r === 0) { b.state = 'throw'; b.wt = 0.5; }
      else { b.state = 'jump'; b.vy = -520; b.vx = dx * 1.1; b.onGround = false; b.wt = 0.3; }
    }
  } else if (b.id === 'clock') {
    b.flying = true; b.vx = 0;
    const tx = clamp(p.x - Math.sign(dx || 1) * 130, W.arena + 40, W.arena + VW - 40);
    b.x += (tx - b.x) * dt * 0.8; b.y = GROUND - 26 + Math.sin(b.t * 1.6) * 14;
    b.timers.midnight = b.timers.midnight ?? 12;
    if (b.timers.midnight <= 3 && !b.mn) { b.mn = true; W.fx.push({ k: 'countdown', t: 0, dur: 3 }); b.state = 'special'; }
    if (b.timers.midnight <= 0) { b.mn = false; b.state = 'idle'; b.timers.midnight = 13; W.fx.push({ k: 'floorfire', t: 0, dur: 2.2, dmg: b.dmg * 1.3 }); cam.shake = 8; SFX.play('boom'); }
    if (b.cd <= 0 && !b.mn) { const a0 = Math.atan2((p.y - 30) - (b.y - b.h * 0.6), dx); for (let i = -2; i <= 2; i++) W.eprj.push({ k: 'fire', x: b.x, y: b.y - b.h * 0.6, vx: Math.cos(a0 + i * 0.16) * 170, vy: Math.sin(a0 + i * 0.16) * 170, r: 8, dmg: b.dmg * 0.6, life: 4 }); b.cd = 2.2; b.atkA = 0.45; }
  } else if (b.id === 'doppel') {
    if (b.state === 'crouch') { b.wt -= dt; if (b.wt <= 0) { b.state = 'dash'; b.wt = 0.45; b.vx = b.face * 280; } return; }
    if (b.state === 'dash') { b.wt -= dt; b.atkA = 0.1; contact(); if (b.wt <= 0) { b.state = 'idle'; b.vx = 0; b.cd = 1.4; } return; }
    b.vx = adx > 80 ? Math.sign(dx) * 40 : 0; b.state = b.vx ? 'move' : 'idle'; contact(0.3);
    if (b.cd <= 0) {
      const r = b.pat++ % 3;
      if (r === 0) { b.x = clamp(p.x - p.face * 90, W.arena + 30, W.arena + VW - 30); fxBurst(b.x, b.y - 50, '#c48cff', 16); b.face = p.x > b.x ? 1 : -1; b.state = 'crouch'; b.wt = 0.3; }
      else if (r === 1) {
        const fakes = W.mobs.filter((m) => m.fake && !m.dead).length;
        for (let i = fakes; i < 2; i++) { const f = { ...b, fake: true, real: false, x: clamp(b.x + (i ? 120 : -120), W.arena + 30, W.arena + VW - 30), hp: 1, max: 1, timers: {}, boss: false, d: { ...MOBS.paperimp, ai: 'none' }, bossId: 'doppel', state: 'idle', cd: 1, stun: 0 }; W.mobs.push(f); }
        const tmp = b.x; const f0 = W.mobs.find((m) => m.fake && !m.dead); if (f0) { b.x = f0.x; f0.x = tmp; }
        bossTxt(b, '진술 번복!', '#c48cff'); b.cd = 2.6; b.specialA = 0.6;
      } else { W.eprj.push({ k: 'wave', x: b.x, y: b.y - 60, vx: Math.sign(dx) * 200, vy: 0, r: 12, dmg: b.dmg * 0.7, life: 3 }); b.cd = 1.6; b.atkA = 0.35; }
    }
  } else if (b.id === 'kim') updateKim(b, dt, dx, adx, ratio, contact);
  else if (b.id === 'kakha') updateKakha(b, dt, dx, adx, ratio, contact);
  if (b.specialA) b.specialA = Math.max(0, b.specialA - dt);
}
function updateKim(b, dt, dx, adx, ratio, contact) {
  const p = player; const R = W.rumorSet;
  const ph = ratio > 0.75 ? 1 : ratio > 0.5 ? 2 : ratio > 0.25 ? 3 : 4;
  if (ph !== b.phase) {
    b.phase = ph; showBanner(['', '기록 검토', '빈틈 포착', '기본권 방패', '끝까지 간다'][ph], `“${KIM_PHASE_LINES[ph]}”`); $('#boss-phase').textContent = `${ph}페이즈`; b.specialA = 1;
    // 소문 이벤트: 3개면 소문에 반응하고, 6개면 뿔 그림자가 드러난다
    if (ph === 3 && R.length >= 3) later(1.8, () => { if (!b.dead) bossTxt(b, '그 소문… 누가 그래요?', '#c48cff'); });
    if (ph === 4 && R.length >= 6) { b.horns = true; cam.shake = 10; later(1.8, () => { if (!b.dead) { bossTxt(b, '…반은 사실이에요.', '#ff6b6b'); showBanner('소문의 실체', '김성호의 그림자에 뿔이 돋는다'); } }); }
  }
  b.shieldClock = (b.shieldClock || 0) + dt;
  b.shield = ph === 3 && (b.shieldClock % 8) < 5;
  if (R.includes(2)) b.hp = Math.min(b.max, b.hp + b.max * 0.004 * dt);
  if (b.state === 'dash') { b.wt -= dt; b.atkA = 0.1; contact(); if (b.wt <= 0) { b.state = 'idle'; b.vx = 0; b.cd = 1.2; } }
  else if (b.state === 'wind') { b.wt -= dt; b.vx = 0; if (b.wt <= 0) { b.state = 'dash'; b.wt = 0.5; b.face = Math.sign(dx) || 1; b.vx = b.face * 300; bossTxt(b, '믹스커피 대시!', '#ffb84d'); } }
  else { b.vx = adx > 120 ? Math.sign(dx) * 36 : adx < 60 ? -Math.sign(dx) * 30 : 0; b.state = b.vx ? 'move' : 'idle'; contact(0.3); }
  if (b.cd <= 0 && b.state !== 'dash' && b.state !== 'wind') {
    const a0 = Math.atan2((p.y - 30) - (b.y - 60), dx);
    if (ph === 1 || (ph === 4 && b.pat % 3 === 0)) { for (let i = -1; i <= 1; i++) W.eprj.push({ k: 'paper', x: b.x, y: b.y - 60, vx: Math.cos(a0 + i * 0.18) * 200, vy: Math.sin(a0 + i * 0.18) * 200, r: 8, dmg: b.dmg * 0.55, life: 3, rot: 0 }); if (b.pat % 2 === 0) for (let i = 0; i < 2; i++) spawnMob('paperimp', b.x + rand(-50, 50)); b.cd = 2; b.atkA = 0.4; }
    else if (ph === 2 || (ph === 4 && b.pat % 3 === 1)) { b.state = 'wind'; b.wt = 0.35; b.cd = 1.6; }
    else { for (let i = 0; i < 2; i++) spawnMob(pick(['stampdevil', 'paperimp']), b.x + rand(-60, 60)); W.eprj.push({ k: 'orb', x: b.x, y: b.y - 60, vx: Math.cos(a0) * 140, vy: Math.sin(a0) * 140, r: 10, dmg: b.dmg * 0.7, life: 4, home: 1 }); b.cd = 2.4; b.atkA = 0.4; }
    b.pat++;
    if (ph === 4) b.cd *= 0.7;
  }
  // 소문
  if (R.includes(0)) { b.timers.r0 = b.timers.r0 ?? 4; if (b.timers.r0 <= 0) { b.r0w = !b.r0w; for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 + (b.r0w ? 0.3 : 0); W.eprj.push({ k: b.r0w ? 'water' : 'fire', x: b.x, y: b.y - 60, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, r: 7, dmg: b.dmg * 0.45, life: 4 }); } b.timers.r0 = 4 / (R.includes(6) ? 1.6 : 1); } }
  if (R.includes(1)) { b.timers.r1 = b.timers.r1 ?? 3; if (b.timers.r1 <= 0) { W.fx.push({ k: 'lava', x: p.x, t: 0, dur: 5, warn: 1, w: 70, dmg: b.dmg * 0.5 }); b.timers.r1 = 3.5; } }
  if (R.includes(5)) { b.timers.r5 = b.timers.r5 ?? 5; if (b.timers.r5 <= 0) { W.fx.push({ k: 'drop', x: p.x + rand(-20, 20), t: 0, dur: 1.4, warn: 1.1, w: 60, dmg: b.dmg * 1.2 }); b.timers.r5 = 5; } }
  if (R.includes(8)) { b.timers.r8 = b.timers.r8 ?? 7; if (b.timers.r8 <= 0) { kimMimic(b); b.timers.r8 = 7; } }
  if (R.includes(9)) { b.timers.r9 = b.timers.r9 ?? 6; if (b.timers.r9 <= 0) { b.x = clamp(p.x - p.face * 80, W.arena + 30, W.arena + VW - 30); fxBurst(b.x, b.y - 50, '#ffe45c', 16); b.timers.r9 = 6; } }
}
// 미결마왕 각하: 도장 낙하 · 붉은 종이 폭풍 · 졸병 소환 · 낙인 충격파 · 순간이동 (페이즈마다 거세진다)
function updateKakha(b, dt, dx, adx, ratio, contact) {
  const p = player, ph = ratio > 0.66 ? 1 : ratio > 0.33 ? 2 : 3;
  if (ph !== b.phase) {
    b.phase = ph; b.atkA = 0.6; $('#boss-phase').textContent = `${ph}페이즈`;
    showBanner(['', '읽지 않고 각하', '기한 도과', '미결의 폭풍'][ph], ['', '“제출 기한 도과. 각하.”', '“억울함은 쌓일수록 달콤하지.”', '“이 도시의 모든 사건을… 각하한다!”'][ph]);
    if (ph === 3) { cam.shake = 10; for (let i = 0; i < 3; i++) spawnMob('stampdevil', b.x + rand(-80, 80)); }
  }
  if (b.state === 'wind') { b.wt -= dt; b.vx = 0; b.atkA = 0.2; if (b.wt <= 0) { shockwave(b.x, b.dmg * 1.1); fxBurst(b.x, b.y - 20, '#ff3b3b', 20, true); b.state = 'idle'; b.cd = 1.4; } return; }
  b.vx = adx > 170 ? Math.sign(dx) * 40 : adx < 90 ? -Math.sign(dx) * 34 : 0; b.state = b.vx ? 'move' : 'idle'; contact(0.35);
  if (W.arena != null) b.x = clamp(b.x, W.arena + 30, W.arena + VW - 30);
  if (ph >= 2) {   // 순간이동
    b.timers.tp = b.timers.tp ?? 7;
    if (b.timers.tp <= 0) { fxBurst(b.x, b.y - 60, '#ff3b3b', 14, true); b.x = clamp(p.x - p.face * 110, (W.arena ?? 0) + 30, (W.arena ?? 0) + VW - 30); fxBurst(b.x, b.y - 60, '#ff3b3b', 14, true); bossTxt(b, '각하!'); b.timers.tp = ph === 3 ? 5 : 7; }
  }
  if (b.cd > 0) return;
  const r = b.pat++ % (ph === 1 ? 3 : 4), a0 = Math.atan2((p.y - 30) - (b.y - 70), dx);
  if (r === 0) {   // 각하 도장: 내 자리에 거대한 도장이 떨어진다
    const n = ph; for (let i = 0; i < n; i++) { const x = p.x + (i - (n - 1) / 2) * 70; later(i * 0.25, () => { if (W && !W.ended) W.fx.push({ k: 'drop', x, t: 0, dur: 1.4, warn: 1.0, w: 60, dmg: b.dmg * 1.1 }); }); }
    bossTxt(b, '각하 도장!'); b.cd = 2.2;
  } else if (r === 1) {   // 기한 도과: 붉은 종이 폭풍
    const k = ph === 3 ? 16 : 12; for (let i = 0; i < k; i++) { const a = i * Math.PI * 2 / k + b.pat * 0.2; W.eprj.push({ k: 'paper', x: b.x, y: b.y - 70, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, r: 8, dmg: b.dmg * 0.5, life: 3.2, rot: 0 }); }
    b.atkA = 0.4; b.cd = ph === 3 ? 1.6 : 2.2;
  } else if (r === 2) {   // 읽지 않고 각하: 졸병 소환 + 따라오는 구슬
    for (let i = 0; i < (ph === 1 ? 1 : 2); i++) spawnMob(pick(['stampdevil', 'paperimp']), b.x + rand(-70, 70));
    W.eprj.push({ k: 'orb', x: b.x, y: b.y - 70, vx: Math.cos(a0) * 140, vy: Math.sin(a0) * 140, r: 11, dmg: b.dmg * 0.7, life: 4, home: 1 }); b.cd = 2.6;
  } else { b.state = 'wind'; b.wt = 0.55; bossTxt(b, '붉은 낙인…', '#ffb84d'); b.cd = 2; }   // 낙인: 예비 동작 뒤 충격파
}
// 소문 #9: 마지막 스킬 따라 하기
function kimMimic(b) {
  const id = player.lastSkill; const sk = id && SKILLS[id];
  const col = JOBS[sk ? sk.job : 'assoc'].color;
  bossTxt(b, sk ? `「${sk.name}」 따라 하기!` : '따라 하기!', '#9ad7ff');
  const a0 = Math.atan2((player.y - 30) - (b.y - 60), player.x - b.x);
  for (let i = -3; i <= 3; i++) W.eprj.push({ k: 'mimic', color: col, x: b.x, y: b.y - 60, vx: Math.cos(a0 + i * 0.12) * 190, vy: Math.sin(a0 + i * 0.12) * 190, r: 8, dmg: b.dmg * 0.45, life: 3 });
  b.atkA = 0.5;
}
function shockwave(x, dmg) {
  SFX.play('boom'); cam.shake = Math.max(cam.shake, 6);
  for (const dir of [-1, 1]) W.eprj.push({ k: 'shock', x, y: GROUND - 8, vx: dir * 240, vy: 0, r: 12, dmg: dmg * 0.8, life: 1.6, ground: true });
}

// ======================================================================
// 동료
// ======================================================================
function buildAllies() {
  W.allies = S.party.filter((id) => COMPANIONS[id]).map((id, i) => ({ id, d: COMPANIONS[id], x: player.x - 40 - i * 30, y: player.y, face: 1, cd: rand(0.5, 1.2), atkT: 0, walkT: 0, i, vx: 0, dashT: 0 }));
}
function updateAllies(dt) {
  const p = player; const st = stats();
  for (const a of W.allies) {
    a.cd -= dt; a.atkT = Math.max(0, a.atkT - dt);
    const lvm = (1 + 0.1 * ((S.compLv[a.id] || 1) - 1));
    // 플레이어 층을 따라간다
    const ty = p.climb ? p.y : p.onGround ? p.y : a.y; a.y += (ty - a.y) * Math.min(1, dt * 6);
    const targets = scene === 'stage' ? liveMobs().filter((m) => !m.fake && Math.abs(m.x - a.x) < a.d.range + 40 && Math.abs(m.y - a.y) < 90) : [];
    targets.sort((x, y) => Math.abs(x.x - a.x) - Math.abs(y.x - a.x));
    const t = targets[0];
    if (a.dashT > 0) {
      a.dashT -= dt; a.x += a.vx * dt;
      if (a.dashT <= 0 && t) { a.atkT = 0.3; damageMob(t, st.atk * a.d.atk * lvm, { kb: 120, src: a.x, stun: 0.6, ally: true, color: '#9ad7ff' }); fxRing(t.x, t.y - t.h / 2, 26, '#9ad7ff'); }
      continue;
    }
    const home = p.x - p.face * (36 + a.i * 30);
    let tx = home;
    if (t && a.d.type === 'melee') tx = t.x - Math.sign(t.x - a.x || 1) * 30;
    const dx = tx - a.x;
    a.vx = Math.abs(dx) > 8 ? Math.sign(dx) * Math.min(190, Math.abs(dx) * 3) : 0;
    a.x += a.vx * dt;
    if (Math.abs(a.vx) > 5) { a.walkT += dt; a.face = Math.sign(a.vx); } else a.walkT = 0;
    if (t) a.face = Math.sign(t.x - a.x) || a.face;
    if (t && a.cd <= 0) {
      a.cd = a.d.cd; a.atkT = 0.35;
      const atk = st.atk * a.d.atk * lvm;
      const sx = a.x + a.face * 14, sy = a.y - 40;
      if (a.d.attack === 'cards') { for (let i = -1; i <= 1; i++) { const ang = Math.atan2((t.y - t.h / 2) - sy, t.x - sx) + i * 0.12; W.pprj.push({ k: 'card', x: sx, y: sy, vx: Math.cos(ang) * 380, vy: Math.sin(ang) * 380, r: 7, dmg: atk, pierce: 0, hit: new Set(), life: 0.9, rot: 0, vr: 14, ally: true, hue: i }); } SFX.play('shot'); }
      else if (a.d.attack === 'coins') { for (let i = 0; i < 4; i++) W.pprj.push({ k: 'coin', x: sx, y: sy, vx: a.face * rand(180, 300), vy: rand(-260, -120), g: 700, r: 6, dmg: atk, pierce: 0, hit: new Set(), life: 1.6, ally: true }); SFX.play('coin'); }
      else if (a.d.attack === 'files') { for (let i = -2; i <= 2; i++) W.pprj.push({ k: 'paper', x: sx, y: sy, vx: a.face * 360, vy: i * 40, r: 8, dmg: atk, pierce: 2, hit: new Set(), life: 0.9, rot: 0, ally: true, gold: true }); SFX.play('swing'); }
      else if (a.d.attack === 'baton') { a.dashT = 0.16; a.vx = Math.sign(t.x - a.x) * 420; a.face = Math.sign(a.vx); SFX.play('swing'); }
    }
  }
}
// ======================================================================
// 자동 사냥
// ======================================================================
// 자동 사냥 길찾기: 바닥(0)과 발판(1..)을 노드로, 점프·밧줄·뛰어내리기를 간선으로 BFS
function navNode(x, y, plat) {
  if (plat) return W.platforms.indexOf(plat) + 1;
  if (y >= GROUND - 2) return 0;
  const i = W.platforms.findIndex((q) => Math.abs(q.y - y) < 3 && x >= q.x - 4 && x <= q.x + q.w + 4); return i + 1 || -1;
}
// (x, y)에서 뛰어내리면 처음 닿는 노드
function navLanding(x, y) { let best = 0, by = GROUND; W.platforms.forEach((q, i) => { if (q.y > y + 2 && q.y < by && x >= q.x && x <= q.x + q.w) { best = i + 1; by = q.y; } }); return best; }
function navEdges(n, x0, x1) {
  const pl = W.platforms, ny = n ? pl[n - 1].y : GROUND, a0 = Math.max(x0, n ? pl[n - 1].x : x0), a1 = Math.min(x1, n ? pl[n - 1].x + pl[n - 1].w : x1), out = [];
  if (a0 > a1) return out;   // 잠긴 화면 밖 발판
  pl.forEach((q, i) => {
    if (q.x + q.w < x0 || q.x > x1) return;
    const b0 = Math.max(x0, q.x), b1 = Math.min(x1, q.x + q.w), gap = Math.max(b0 - a1, a0 - b1, 0);
    if (q.y < ny - 10 && ny - q.y <= JUMP_H - 10 && gap <= 60 && b0 < b1) {
      const lo = Math.max(a0, b0) + 12, hi = Math.min(a1, b1) - 12;
      const x = lo <= hi ? (lo + hi) / 2 : Math.max(a0 + 8, Math.min(a1 - 8, (b0 + b1) / 2));   // 겹침이 좁거나 없으면 목표 쪽 끝에서 뛴다
      out.push({ to: i + 1, k: 'jump', x, dir: Math.sign((b0 + b1) / 2 - x) });
    }
    if (n && q.y > ny + 10) { const lo = Math.max(a0, b0) + 10, hi = Math.min(a1, b1) - 10; if (lo <= hi) { const x = (lo + hi) / 2; out.push({ to: navLanding(x, ny), k: 'drop', x }); } }
  });
  if (n) out.push({ to: navLanding(a0 + 6, ny), k: 'drop', x: a0 + 6 }, { to: navLanding(a1 - 6, ny), k: 'drop', x: a1 - 6 });
  for (const r of W.ropes || []) if (Math.abs(r.y1 - ny) < 3 && r.x >= a0 - 2 && r.x <= a1 + 2 && r.x > x0 && r.x < x1) { const to = navNode(r.x, r.y0, null); if (to >= 0) out.push({ to, k: 'rope', x: r.x }); }
  return out;
}
function navTo(tx, ty, tplat) {
  const p = player;
  const go = (x) => { if (Math.abs(x - p.x) > 5) keys[x > p.x ? 'right' : 'left'] = true; return Math.abs(x - p.x) <= 5; };
  if (!p.onGround) { if (p.navDir) keys[p.navDir > 0 ? 'right' : 'left'] = true; return; }
  p.navDir = 0;
  const x0 = W.lock ? W.lock[0] + 16 : 0, x1 = W.lock ? W.lock[1] - 16 : W.len;
  const from = navNode(p.x, p.y, p.plat), goal = navNode(tx, ty, tplat);
  if (from < 0 || goal < 0 || from === goal) { if (Math.abs(tx - p.x) > 10) keys[tx > p.x ? 'right' : 'left'] = true; return; }
  const prev = new Map([[from, null]]), q = [from];
  while (q.length && !prev.has(goal)) { const n = q.shift(); for (const e of navEdges(n, x0, x1)) if (!prev.has(e.to)) { prev.set(e.to, { n, e }); q.push(e.to); } }
  if (!prev.has(goal)) { if (Math.abs(tx - p.x) > 10) keys[tx > p.x ? 'right' : 'left'] = true; return; }
  let cur = goal, step = prev.get(cur); while (step && step.n !== from) { cur = step.n; step = prev.get(cur); }
  const e = step.e;
  if (e.k === 'rope') { if (go(e.x)) keys.up = true; }
  else if (e.k === 'jump') { if (go(e.x)) { pressed.jump = true; p.navDir = e.dir; if (e.dir) keys[e.dir > 0 ? 'right' : 'left'] = true; } }
  else if (navLanding(p.x, p.y) === e.to || go(e.x)) pressed.down = true;   // 발판은 어디서든 ↓로 내려간다
}
// 자동 사냥 회피: 탄환·돌진·내려찍기·근접 예비 동작을 보고 피한다 (뒤로 물러났으면 true)
function autoDodge(p, targets) {
  if (p.climb) return false;
  for (const e of W.eprj) {
    const dx = p.x - e.x, vx = e.vx || 0; if (Math.abs(e.y - (p.y - 24)) > 46) continue;
    if ((vx && Math.sign(vx) === Math.sign(dx) && Math.abs(dx) / Math.abs(vx) < 0.38) || Math.abs(dx) < 26) { if (p.onGround) pressed.jump = true; break; }
  }
  for (const f of W.fx) if ((f.k === 'drop' || f.k === 'lava') && f.t < (f.warn || 0) && Math.abs(f.x - p.x) < (f.w || 60) / 2 + 14) { keys.left = keys.right = false; keys[p.x >= f.x ? 'right' : 'left'] = true; return true; }   // 떨어질 자리·장판에서 비킨다
  for (const m of targets) {
    if (m.boss && m.id === 'kakha' && m.state === 'wind' && m.wt < 0.2 && p.onGround) { pressed.jump = true; continue; }   // 낙인 충격파는 뛰어넘는다
    const dx = m.x - p.x, adx = Math.abs(dx), facing = Math.sign(m.face || 1) === Math.sign(-dx || 1);
    if (Math.abs(m.y - p.y) > 50) continue;
    if (m.state === 'dash' && adx < 120 && facing) { if (p.onGround) pressed.jump = true; continue; }   // 돌진은 뛰어넘는다
    if (m.boss && (m.state === 'crouch' || m.state === 'jump') && adx < 150) { keys.left = keys.right = false; keys[dx > 0 ? 'left' : 'right'] = true; return true; }   // 내려찍기 착지점에서 벗어난다
    if (m.boss && m.state === 'slam' && adx < 220 && p.onGround) { pressed.jump = true; continue; }
    if (m.state === 'wind' && !m.boss && facing && adx < m.w * 0.5 + 14 + 26) { keys.left = keys.right = false; keys[dx > 0 ? 'left' : 'right'] = true; return true; }   // 근접 공격 예비 동작이면 한 걸음 물러났다가 다시 친다
  }
  return false;
}
function autoPilot() {
  const p = player; if (p.dead) return;
  keys.left = keys.right = keys.up = keys.down = false;
  const targets = liveMobs().filter((m) => !m.fake);
  const st = stats();
  if (p.hp < st.hp * (targets.some((m) => m.boss) ? 0.55 : 0.45) && S.cons.gimbap > 0) pressed.potion = true;
  if (p.mp < st.mp * 0.15 && S.cons.coffee > 0 && targets.some((m) => m.boss || m.mid)) useCons('coffee');
  if (!targets.length) {
    // 떨어진 수임료·장비부터 줍는다 (금고를 깨고 바로 떠나지 않게)
    const loot = W.pickups.filter((k) => !k.done && Math.abs(k.x - p.x) < 340 && Math.abs(k.y - p.y) < 220).sort((a, c) => Math.abs(a.x - p.x) - Math.abs(c.x - p.x))[0];
    if (loot && (p.lootT = (p.lootT || 0) + 1 / 60) < 7) {
      if (p.climb) { keys.down = true; return; }
      if (Math.abs(loot.y + 6 - p.y) > 40) navTo(loot.x, loot.y + 6, W.platforms.find((q) => Math.abs(q.y - loot.y - 6) < 6 && loot.x >= q.x - 4 && loot.x <= q.x + q.w + 4) || null);
      else if (Math.abs(loot.x - p.x) > 8) keys[loot.x > p.x ? 'right' : 'left'] = true;
      return;
    }
    if (!loot) p.lootT = 0;
    let prop = p.ap && !p.ap.dead && !p.ap.skip ? p.ap : W.props.find((x) => !x.dead && !x.skip && Math.abs(x.x - p.x) < 220);
    if (prop !== p.ap) { p.ap = prop; p.apT = 0; }
    if (prop && (p.apT += 1 / 60) > 12) { prop.skip = true; p.ap = prop = null; }
    if (!prop && p.climb) { keys.down = true; return; }
    if (prop) {
      const dy = prop.y - p.y;
      if (p.climb) { if (prop.y <= p.climb.y0 + 20) keys.up = true; else keys.down = true; return; }
      if (Math.abs(dy) > 30) { navTo(prop.x, prop.y, W.platforms.find((q) => Math.abs(q.y - prop.y) < 3 && prop.x >= q.x - 4 && prop.x <= q.x + q.w + 4) || null); return; }
      if (Math.abs(prop.x - p.x) > 26) { keys[prop.x > p.x ? 'right' : 'left'] = true; } else { p.face = prop.x > p.x ? 1 : -1; if (p.atkT <= 0) pressed.attack = true; } return;
    }
    if (p.plat && p.onGround) { pressed.down = true; return; }
    if (!W.ended) keys.right = true; return;
  }
  targets.sort((a, b) => (Math.abs(a.x - p.x) + Math.abs(a.y - p.y) * 1.5) - (Math.abs(b.x - p.x) + Math.abs(b.y - p.y) * 1.5));
  const t = targets[0]; const dx = t.x - p.x; const dy = t.y - p.y;
  const b = job().basic;
  const flyer = t.d && t.d.ai === 'flyer';
  if (p.climb) { if (!flyer && t.y <= p.climb.y0 + 20) keys.up = true; else keys.down = true; return; }
  // 층이 다르면 밧줄·발판 점프로 오르내리기
  // 원거리는 비스듬히 쏠 수 있으면 올라가지 않고 아래에서 쏜다
  const aimUp = b.k === 'shot' && dy < -40 && Math.abs(dx) <= b.dist * 0.9 && Math.abs(dx) >= -dy * 1.5;
  if (aimUp) { p.face = dx > 0 ? 1 : -1; if (p.atkT <= 0) pressed.attack = true; }
  else if (!flyer && !t.boss && Math.abs(dy) > 40 && t.onGround) { navTo(t.x, t.y, t.plat); return; }
  const want = b.k === 'shot' ? Math.min(b.dist * 0.7, 200) : b.k === 'lash' ? b.range * 0.75 : b.k === 'wave' ? Math.min(b.dist * 0.8, 120) : b.range * 0.75 + t.w * 0.3;
  const keepAway = b.k === 'shot' ? 90 : 0;
  if (aimUp) { /* 제자리에서 비스듬히 쏜다 */ }
  else if (Math.abs(dx) > want) keys[dx > 0 ? 'right' : 'left'] = true;
  else if (Math.abs(dx) < keepAway && (!W.lock || (dx > 0 ? p.x - W.lock[0] > 60 : W.lock[1] - p.x > 60))) keys[dx > 0 ? 'left' : 'right'] = true;
  else { p.face = dx > 0 ? 1 : -1; if (p.atkT <= 0) pressed.attack = true; }
  if (autoDodge(p, targets)) return;
  if (W.fx.some((f) => f.k === 'countdown') && p.onGround && p.y >= GROUND - 1) { const pl = W.platforms.slice().sort((a, c) => Math.abs(a.x + a.w / 2 - p.x) - Math.abs(c.x + c.w / 2 - p.x))[0]; if (pl) { keys.left = keys.right = false; const cx = pl.x + pl.w / 2; if (Math.abs(cx - p.x) > 20) keys[cx > p.x ? 'right' : 'left'] = true; else pressed.jump = true; } }
  const near = targets.filter((m) => Math.abs(m.x - p.x) < 170 && Math.abs(m.y - p.y) < 80).length;
  const lo = S.loadout;
  if (autoSkills()) {
    for (let i = 0; i < lo.length; i++) { const id = lo[i]; const sk = id && SKILLS[id]; if (sk && skillLv(id) && p.cds['s' + (i + 1)] <= 0 && canCast(id, true) && (near >= 2 || t.boss || t.mid)) { pressed['s' + (i + 1)] = true; break; } }
    if (p.ult >= 100 && (near >= 3 || t.boss || t.mid)) pressed.ult = true;
  }
}