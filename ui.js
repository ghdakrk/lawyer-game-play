/* 법조인 키우기 — UI v3: 렌더 · HUD · 대화 · 퀘스트 · 마을 · 메뉴 · 부팅 */
'use strict';

// ======================================================================
// 퀘스트
// ======================================================================
const QMAP = Object.fromEntries(QUESTS.map((q) => [q.id, q]));
const qState = (id) => (S.q[id] ? S.q[id].st : null);
const qDone = (id) => qState(id) === 'done';
const clientDone = () => QUESTS.filter((q) => q.type === 'client' && qDone(q.id)).length;
function reqOk(r, soft = false) {
  if (!r) return true;
  if (r.q && !r.q.every(qDone)) return false;
  if (soft) return true;
  if (r.lv && S.lv < r.lv) return false;
  if (r.tier != null && !S.jobs.some((j) => JOBS[j].tier >= r.tier)) return false;
  if (r.jobs && !r.jobs.some((j) => j === S.job || HIDDEN_OF[j] === S.job)) return false;   // 승진·히든 퀘스트는 「지금 직업」(또는 거기서 오른 히든 직업) 기준 — 이직해도 예전 직업 퀘스트가 열리지 않게
  if (r.client && clientDone() < r.client) return false;
  if (r.trivia && S.trivia.length < r.trivia) return false;
  if (r.path === 'law' && S.dropout) return false;
  if (r.route && !(S.dropout && S.job === r.route && S.jobs.filter((j) => JOBS[j].route).length === 1)) return false;   // 데뷔 퀘스트는 처음 고른 중퇴 직업만
  if (r.free2 && S.jobs.some((j) => JOBS[j].tier >= 2)) return false;
  if (r.law) for (const [k, v] of Object.entries(r.law)) if (S.law[k] < v) return false;
  return true;
}
function reqWhy(r) {
  const out = [];
  if (r.lv && S.lv < r.lv) out.push(`Lv.${r.lv}`);
  if (r.tier != null && !S.jobs.some((j) => JOBS[j].tier >= r.tier)) out.push(r.tier >= 2 ? '2차 직업' : '로스쿨생');
  if (r.jobs && !r.jobs.some((j) => j === S.job || HIDDEN_OF[j] === S.job)) out.push('현재 직업 ' + r.jobs.map((j) => JOBS[j].name).join('/'));
  if (r.client && clientDone() < r.client) out.push(`의뢰인 퀘스트 ${clientDone()}/${r.client}`);
  if (r.trivia && S.trivia.length < r.trivia) out.push(`법률 상식 카드 ${S.trivia.length}/${r.trivia}`);
  if (r.path === 'law' && S.dropout) out.push('로스쿨 재학생만');
  if (r.law) for (const [k, v] of Object.entries(r.law)) if (S.law[k] < v) out.push(`${LAWS.find((l) => l.id === k).name} ${S.law[k]}/${v}`);
  return out.join(' · ');
}
const questAvail = (q) => !S.q[q.id] && reqOk(q.req);
const questLockedVisible = (q) => !S.q[q.id] && q.type !== 'hidden' && q.req && q.req.q && q.req.q.length > 0 && reqOk(q.req, true) && !reqOk(q.req);
const stageLabel = (st) => { const { c, s } = parseSid(st); return `${c}-${s} ${CHAPTERS[c - 1].stages[s - 1]}`; };
function goalProg(q, g) {
  const st = S.q[q.id] || {};
  switch (g.k) {
    case 'kill': return [Math.min(g.n, (st.prog && st.prog[g.m]) || 0), g.n, `${MOBS[g.m].name} 처치`];
    case 'clear': return [(g.fresh ? st.prog && st.prog['clear_' + g.st] : g.hard ? S.hard[g.st] : S.cleared[g.st]) ? 1 : 0, 1, `${stageLabel(g.st)}${g.hard ? ' 항소심' : ''} 해결${g.fresh ? ' (수락 후)' : ''}`];
    case 'item': return [Math.min(g.n, S.qitems[g.it] || 0), g.n, `${QITEMS[g.it].name} 모으기`];
    case 'lv': return [Math.min(g.n, S.lv), g.n, `레벨 ${g.n} 달성`];
    case 'pay': return [S.gold >= g.n ? 1 : 0, 1, `보증금 ₩${fmt(g.n)} 지참`];
    case 'quiz': return [st.quiz ? 1 : 0, 1, '변호사시험 합격 (OX 5문제)'];
    case 'exam': return [st.exam ? 1 : 0, 1, '중간고사 통과 (OX 6문제 중 3)'];
    case 'law': return [Math.min(g.n, S.law[g.law]), g.n, `${LAWS.find((l) => l.id === g.law).name} ${g.n}`];
  }
  return [0, 1, '?'];
}
const goalText = (q, g) => { const [c, n, label] = goalProg(q, g); return n > 1 ? `${label} ${c}/${n}` : `${label}${c >= n ? ' ✔' : ''}`; };
function questReady(q) { return qState(q.id) === 'active' && q.goals.every((g) => { const [c, n] = goalProg(q, g); return c >= n; }); }
function questNeed(it) { for (const q of QUESTS) if (qState(q.id) === 'active') for (const g of q.goals) if (g.k === 'item' && g.it === it) return g.n; return 0; }
function questKill(id) {
  for (const q of QUESTS) if (qState(q.id) === 'active' && q.goals.some((g) => g.k === 'kill' && g.m === id)) {
    const st = S.q[q.id]; st.prog = st.prog || {}; const g = q.goals.find((x) => x.k === 'kill' && x.m === id);
    if ((st.prog[id] || 0) < g.n) { st.prog[id] = (st.prog[id] || 0) + 1; if (st.prog[id] === g.n) { toast(`<b>${esc(q.title)}</b> · ${esc(MOBS[id].name)} ${g.n}/${g.n} 완료!`); SFX.play('quest'); } }
  }
  for (const d of S.daily.list) if (!d.claimed && d.m === id && d.prog < d.n) { d.prog++; if (d.prog === d.n) toast(`오늘의 의뢰 완료: ${esc(MOBS[id].name)} ${d.n}마리 · 게시판에서 보상`); }
  refreshQuestUI();
}
function questClear(id, hard) {
  for (const q of QUESTS) if (qState(q.id) === 'active') for (const g of q.goals) if (g.k === 'clear' && g.fresh && g.st === id && (!g.hard || hard)) { const st = S.q[q.id]; st.prog = st.prog || {}; st.prog['clear_' + id] = 1; }
}
function questDrops(src, from) {
  for (const q of QUESTS) {
    if (qState(q.id) !== 'active' || !q.drops) continue;
    for (const d of q.drops) {
      if (!d.ch.includes(W.c)) continue;
      const f = d.from || 'all';
      if (f === 'safe' && from !== 'safe') continue;
      if (f === 'elite' && from !== 'elite') continue;
      if (f === 'all' && from === 'safe') continue;
      const need = q.goals.find((g) => g.k === 'item' && g.it === d.it).n;
      const pending = W.pickups.filter((p) => p.k === 'qitem' && p.it === d.it).length;
      if ((S.qitems[d.it] || 0) + pending >= need) continue;
      if (Math.random() < d.rate * (from === 'elite' && f === 'all' ? 3 : 1)) dropLoot(src.x, src.y - 30, 'qitem', { it: d.it });
    }
  }
}
function acceptQuest(q, silent) {
  if (S.q[q.id]) return;
  S.q[q.id] = { st: 'active', prog: {} };
  SFX.play('quest');
  if (!silent) toast(`퀘스트 수락: <b>${esc(q.title)}</b>`);
  const after = () => { refreshQuestUI(); if (scene === 'town') rebuildNpcs(); };
  if (q.start && q.start.length && !silent) startDialog(q.start, after); else after();
  save();
}
function turnIn(q) {
  if (!questReady(q)) return;
  for (const g of q.goals) { if (g.k === 'item') S.qitems[g.it] = Math.max(0, (S.qitems[g.it] || 0) - g.n); if (g.k === 'pay') S.gold -= g.n; }
  S.q[q.id].st = 'done';
  SFX.play('quest');
  const lines = q.end || [];
  const fin = () => { const msg = giveRewards(q.rew || {}); toast(`퀘스트 완료: <b>${esc(q.title)}</b>${msg ? ` · ${msg}` : ''}`, 4200); refreshQuestUI(); if (scene === 'town') rebuildNpcs(); save(); autoAcceptNext(); };
  if (lines.length) startDialog(lines, fin); else fin();
}
function autoAcceptNext() { for (const q of QUESTS) if (q.auto && questAvail(q)) acceptQuest(q, true); }
function giveRewards(r) {
  const out = [];
  if (r.exp) { gainExp(r.exp); out.push(`경험치 ${fmt(r.exp)}`); }
  if (r.gold) { S.gold += r.gold; out.push(`₩${fmt(r.gold)}`); }
  if (r.inji) { S.inji += r.inji; out.push(`인지 ${r.inji}`); }
  if (r.items) for (const [b, n] of Object.entries(r.items)) { S.books[b] = (S.books[b] || 0) + n; out.push(`${BOOKS[b].name} ×${n}`); }
  if (r.cons) for (const [c, n] of Object.entries(r.cons)) { S.cons[c] = (S.cons[c] || 0) + n; out.push(`${CONSUMABLES[c].name} ×${n}`); }
  if (r.skill) { S.skl[r.skill] = Math.max(1, S.skl[r.skill] || 0); ensureLoadout(); out.push(`스킬 「${SKILLS[r.skill].name}」`); showBanner('새 스킬', SKILLS[r.skill].name); }
  if (r.job) { addJob(r.job); changeJob(r.job); }
  if (r.unlock) { addJob(r.unlock); S.sp += 3; out.push(`직업: ${JOBS[r.unlock].name} · SP +3`); if (job().tier < JOBS[r.unlock].tier) changeJob(r.unlock); else checkPassives(); if (JOBS[r.unlock].tier === 2) for (const id of ['j2a', 'j2b', 'j2c']) if (qState(id) === 'active') delete S.q[id]; }
  if (r.rank) { S.rank[r.rank] = 1; S.sp += 5; out.push('SP +5'); checkPassives();
    if (S.job !== r.rank && JOBS[S.job].tier > JOBS[r.rank].tier) { statCache = null; toast(`${esc(jobName(r.rank))} 경력 인정 · 승진 패시브는 이력서에 꽂을 수 있어요`, 4000); }   // 히든 직업이 된 뒤 끝낸 승진: 직업은 그대로 (내려가지 않는다)
    else if (S.job !== r.rank) changeJob(r.rank); else { statCache = null; showBanner(`3차 전직 · ${jobName()}`, `각성 궁극기 「${SKILLS[ultId()].name}」 · 스킬 Lv.10 개방`); BGM.jingle('job'); const jid = S.job; later(2.6, () => awakeBanner(jid)); later(5, () => showGuide('g_awake')); } out.push(`승진: ${jobName(r.rank)}`); }
  if (r.comp) { if (!S.comps.includes(r.comp)) S.comps.push(r.comp); if (S.party.length < S.slots && !S.party.includes(r.comp)) S.party.push(r.comp); out.push(`동료 ${COMPANIONS[r.comp].name}`); if (W && W.kind === 'stage') buildAllies(); }
  if (r.slots) { S.slots = Math.max(S.slots, r.slots); for (const c of S.comps) if (S.party.length < S.slots && !S.party.includes(c)) S.party.push(c); if (W && W.kind === 'stage') buildAllies(); }
  if (r.title && !S.titles.includes(r.title)) { S.titles.push(r.title); out.push(`칭호 「${r.title}」`); }
  if (r.rumor != null && !S.rumors.includes(r.rumor)) { S.rumors.push(r.rumor); out.push('비밀 쪽지'); }
  if (r.cos) { giveCos(r.cos); out.push(`코스튬 「${COSMETICS[r.cos].name}」`); }
  if (r.trivia) learnTrivia(r.trivia);
  statCache = null; updateBadges();
  return out.join(' · ');
}
function addJob(id) { if (!S.jobs.includes(id)) S.jobs.push(id); }
// 직업 전용 퀘스트는 지금 직업 것만 남긴다. 승진은 경력으로 친다: 한 번 승진했거나 히든(3차) 직업이었으면 이직한 직업도 승진 상태로
function fixJobQuests() {
  for (const q of QUESTS) if (qState(q.id) === 'active' && q.req && (q.req.jobs || q.req.route) && !reqOk(q.req)) delete S.q[q.id];
  const j = JOBS[S.job];
  if (j.rank && !S.rank[S.job] && (Object.values(S.rank).some(Boolean) || S.jobs.some((x) => JOBS[x].hidden))) { S.rank[S.job] = 1; S.q[j.rank.q] = { st: 'done', prog: {} }; checkPassives(); statCache = null; return true; }
  return false;
}
const upCostAt = (id, lv) => Math.round(120 * Math.pow(lv, 1.7) * (1 + JOBS[SKILLS[id].job].tier));
// 이직: 떠나는 2차·3차 직업의 스킬은 반납하고, 모든 스킬 레벨을 1로 되돌려 SP·수임료·비급을 돌려준다. 패시브(이력서)는 그대로
// 스킬 초기화: keep(sid)면 Lv.1로 남기고, 아니면 반납(비급·배운 값 환급). 올린 레벨만큼 SP·수임료를 돌려준다
function refundSkills(keep) {
  let sp = 0, gold = 0;
  for (const [sid, lv] of Object.entries(S.skl)) {
    const sk = SKILLS[sid]; if (!sk || sk.ult || !lv) continue;
    for (let l = 1; l < lv; l++) { sp++; gold += upCostAt(sid, l); }
    if (keep(sid)) S.skl[sid] = 1;
    else { delete S.skl[sid]; if (typeof sk.learn === 'object') { S.books[sk.learn.book] = (S.books[sk.learn.book] || 0) + 1; gold += sk.learn.gold; } }
  }
  S.sp += sp; S.gold += gold; statCache = null;
  return { sp, gold };
}
// 스킬 최대 레벨: 대학생·로스쿨생 스킬은 Lv.5까지, 2차 스킬은 3차 승진(또는 그 직업의 히든 직업)이 되어야 Lv.6~10, 히든 스킬은 Lv.10
function skillCap(id) {
  const sj = SKILLS[id].job, t = JOBS[sj].tier;
  if (t >= 3) return 10;
  if (t === 2) return S.rank[sj] || S.jobs.includes(HIDDEN_OF[sj]) ? 10 : 5;
  return 5;
}
function transferJob(id) {
  const { sp, gold } = refundSkills((sid) => JOBS[SKILLS[sid].job].tier < 2 || SKILLS[sid].job === id);
  addJob(id); changeJob(id);
  const ranked = fixJobQuests();
  if (ranked) showBanner(`이직 · ${jobName(id)}`, '3차 경력을 인정받아 승진 상태로 시작합니다');
  else if (JOBS[id].rank && !S.rank[id]) { const rq = QMAP[JOBS[id].rank.q]; if (rq && questAvail(rq)) { acceptQuest(rq, true); later(1.2, () => toast(`승진 심사 「${esc(rq.title)}」를 받았어요 · ${esc(NPCS[rq.giver].name)}에게`, 4500)); } }
  refreshQuestUI(); updateBadges();
  return { sp, gold, ranked };
}
function changeJob(id) {
  const prevMax = Math.max(1, ...Object.values(S.skl));
  S.job = id; statCache = null;
  for (const sk of JOBS[id].skills) if (SKILLS[sk].learn === 'job') S.skl[sk] = Math.max(S.skl[sk] || 0, Math.max(1, Math.floor(prevMax / 2)));
  checkPassives(); ensureLoadout(true);
  const st = stats(); if (player) { player.hp = st.hp; player.mp = st.mp; player.cds = { s1: 0, s2: 0, s3: 0, s4: 0 }; }
  showBanner(`전직 · ${jobName(id)}`, `${RANGE[JOBS[id].type].name} · ${RANGE[JOBS[id].type].d}`);
  SFX.play('level'); BGM.jingle('job');
  if (W && player) { fxSparkle(player.x, player.y - 30, JOBS[id].color, 30); W.fx.push({ k: 'pillar', x: player.x, w: 60, color: JOBS[id].color, t: 0, dur: 0.9 }); }
  learnTrivia(JOB_TRIVIA[id]); if (JOBS[id].tier >= 2) showGuide('g_lock'); if (JOBS[id].mech === 'evidence') later(1.5, () => showGuide('g_evidence')); if (JOBS[id].tier >= 2) { later(2.4, () => (awakeOf(id) ? awakeBanner(id) : jumpBanner(id))); later(4.6, () => showGuide(awakeOf(id) ? 'g_awake' : 'g_dj')); }
  checkGuides(); updateBadges(); save();
}
// 2차: 점프 해금 · 3차 승진(히든): 기본 공격 각성
function jumpBanner(id) { const aw = AWAKE[JOBS[id].basic.k]; showBanner(`${JOBS[id].type === 'melee' ? '3단' : '2단'} 점프 해금`, `공중에서 점프를 한 번 더 · 3차 승진하면 기본 공격 각성 「${aw.name}」`); if (W && player) fxRing(player.x, player.y - 30, 50, JOBS[id].color); }
function awakeBanner(id) { const aw = AWAKE[JOBS[id].basic.k]; showBanner(`기본 공격 각성 · ${aw.name}`, aw.d); if (W && player) { fxRing(player.x, player.y - 30, 80, JOBS[id].color); fxSparkle(player.x, player.y - 40, JOBS[id].color, 24); } SFX.play('skill'); }
// 패시브 해금 확인
function checkPassives() {
  const fresh = [];
  for (const [id, p] of Object.entries(PASSIVES)) {
    if (S.passives.includes(id) || !S.jobs.includes(p.job)) continue;
    const u = p.unlock;
    const ok = u === 'job' || (u === 'rank' && S.rank[p.job]) || (typeof u === 'object' && skillLv(u.skill) >= u.lv);
    if (ok) { S.passives.push(id); fresh.push(id); if (S.lv > 1) toast(`패시브 습득: <b>${esc(p.name)}</b> (${esc(p.d)})${p.job !== S.job ? ' · 이력서에 꽂을 수 있어요' : ''}`, 4000); }
  }
  // 이력서 자동 채우기는 새로 배운 패시브·새로 열린 칸에만 (직접 뺀 패시브를 다시 꽂지 않는다)
  S.resume = S.resume.filter((id) => PASSIVES[id] && S.passives.includes(id) && PASSIVES[id].job !== S.job);
  const n = resumeSlots(), grew = n > (S.resumeN || 0); S.resumeN = n;
  for (const id of grew ? S.passives : fresh) { if (S.resume.length >= n) break; if (PASSIVES[id].job !== S.job && !S.resume.includes(id)) S.resume.push(id); }
  statCache = null;
}
// 스킬 칸 정리: 배운 스킬만, 현재 직업 스킬 우선
function ensureLoadout(prefJob) {
  const n = skillSlots();
  let lo = (S.loadout || []).filter((id) => SKILLS[id] && !SKILLS[id].ult && skillLv(id));
  if (prefJob) { const mine = job().skills.filter((id) => skillLv(id)); lo = [...mine, ...lo.filter((id) => !mine.includes(id))]; }
  const learned = Object.keys(S.skl).filter((id) => SKILLS[id] && !SKILLS[id].ult && skillLv(id));
  for (const id of [...job().skills, ...learned]) if (lo.length < n && skillLv(id) && !lo.includes(id)) lo.push(id);
  S.loadout = lo.slice(0, n);
  while (S.loadout.length < n) S.loadout.push(null);
}
// 오늘의 의뢰
function ensureDaily() {
  const day = new Date().toDateString();
  if (S.daily.day === day && S.daily.list.length) return;
  const open = CHAPTERS.filter((c, i) => stageOpen(i + 1, 1)); if (!open.length) return;
  const top = open[open.length - 1], gi = (top.id - 1) * 5 + 2;
  const pool = [...new Set(open.flatMap((c) => c.mobs))];
  S.daily = { day, list: [0, 1, 2].map((i) => { const m = pick(pool); const n = [15, 20, 30][i]; return { id: `d${i}`, m, n, prog: 0, claimed: false, gold: Math.round(SCALE.gold(gi) * n * 1.6), inji: 20 + i * 15 }; }) };
}

// ======================================================================
// 마을 · NPC
// ======================================================================
function npcPresent(id) {
  const n = NPCS[id];
  if (['haechi', 'gosiwon', 'gimbap', 'mall', 'board'].includes(id)) return true;
  if (n.comp) return qDone('m4');
  if (id === 'prof') return qDone('j1');
  return QUESTS.some((q) => q.giver === id && (S.q[q.id] || questAvail(q) || questLockedVisible(q)));
}
function rebuildNpcs() { if (W && W.kind === 'town') W.npcs = Object.entries(NPCS).filter(([id]) => npcPresent(id)).map(([id, n]) => ({ id, ...n })); }
function npcMark(id) {
  const qs = QUESTS.filter((q) => q.giver === id);
  if (qs.some(questReady)) return ['?', '#6ee7a8'];
  if (qs.some(questAvail)) return ['!', '#ffe45c'];
  if (id === 'board') { ensureDaily(); if (S.daily.list.some((d) => d.prog >= d.n && !d.claimed)) return ['?', '#6ee7a8']; }
  if (qs.some((q) => qState(q.id) === 'active')) return ['…', '#c9d1e8'];
  if (qs.some(questLockedVisible)) return ['!', '#7a7f99'];
  return null;
}
let actTarget = null;
function updateActButton() {
  actTarget = null;
  if (scene === 'town') { let bd = 46; for (const n of W.npcs) { const d = Math.abs(player.x - n.x); if (d < bd) { bd = d; actTarget = n; } } }
  const lbl = $('#b-attack .lbl'), t = actTarget ? '대화' : '공격';
  if (lbl.textContent !== t) { lbl.textContent = t; $('#b-attack').classList.toggle('talk', !!actTarget); }
  if ((pressed.act || pressed.attack) && actTarget) { pressed.attack = false; interact(actTarget); }
}
function interact(n) {
  const qs = QUESTS.filter((q) => q.giver === n.id);
  const ready = qs.find(questReady);
  if (ready) { turnIn(ready); return; }
  const quizQ = qs.find((q) => qState(q.id) === 'active' && q.goals.some((g) => g.k === 'quiz') && !S.q[q.id].quiz);
  if (quizQ) { startQuiz(quizQ); return; }
  const examQ = qs.find((q) => qState(q.id) === 'active' && q.goals.some((g) => g.k === 'exam') && !S.q[q.id].exam);
  if (examQ) { startQuiz(examQ, 'exam'); return; }
  const avail = qs.filter(questAvail);
  const fn = NPCS[n.id].fn;
  if (!fn && avail.length === 1 && !qs.some((q) => qState(q.id) === 'active')) { acceptQuest(avail[0]); return; }
  if (fn === 'board' && !avail.length) { openBoard(); return; }
  if (fn === 'mall' && !avail.length) { openMenu('shop'); return; }
  npcSheet(n.id);
}
const NPC_CHAT = {
  haechi: () => (S.jobs.some((j) => JOBS[j].tier >= 2) ? '한번 정한 길은 되돌릴 수 없어. 그래도 배운 스킬은 다 네 거야.' : '레벨이 오르면 메뉴 → 상태에서 스탯을, 메뉴 → 스킬에서 스킬을 배워!'),
  gosiwon: () => { const r = S.rumors.length ? RUMORS[pick(S.rumors)] : RUMORS[0]; return pick([`이건 진짜 비밀인데… “${r.line}”`, '정예 괴물이 떨어뜨리는 「비밀 쪽지」를 모으면 그 변호사 소문을 더 알 수 있대.', '서류 금고는 몇 대 때리면 열려. 안에 좋은 게 많다더라.']); },
  gimbap: () => pick(['보스 잡으러 가기 전엔 김밥 넉넉히!', '새벽 6시에 오는 단골이 있는데… 늘 기록을 한 아름 들고 와.', '아메리카노는 커피도 채우고 손도 빨라진다니까.']),
  prof: () => pick(['기록은 끝까지 읽게. 그게 전부야.', '레벨보다 중요한 건 스킬과 장비의 조합이네.', '헌법을 공부해 두게. 언젠가 쓸모가 있을 걸세.']),
  pan: () => (S.comps.includes('pan') ? pick(['오늘 판례는 대법원 전원합의체로 갈까요?', '스터디 끝나고 판례 퀴즈 어때요?', '노트 찾아 줘서 아직도 고마워요.']) : '노트… 혹시 보셨어요?'),
  kang: () => (S.comps.includes('kang') ? pick(['체력 단련은 매일입니다!', '그 사기범, 이번엔 꼭 법정에 세우겠습니다.', '검사가 되면 수사 기록부터 끝까지 읽겠습니다.']) : '스터디요? 체력부터 증명해 주십시오!'),
  yoon: () => (S.comps.includes('yoon') ? pick(['수임료 계산은 저한테 맡기세요.', '복리의 마법을 아십니까? 다단계 말고요.', '김밥값은 n분의 1입니다.']) : '계산이 맞으면 함께하죠.'),
};
function npcSheet(id) {
  const n = NPCS[id]; const qs = QUESTS.filter((q) => q.giver === id);
  const rows = [];
  for (const q of qs) {
    if (questAvail(q)) rows.push(`<button class="choice q" data-acc="${q.id}"><span class="mk y">!</span><span><span class="t">${esc(q.title)}</span><br><span class="d">${qTypeName(q.type)} · 수락하기</span></span></button>`);
    else if (qState(q.id) === 'active') rows.push(`<div class="choice q"><span class="mk g">…</span><span><span class="t">${esc(q.title)}</span><br><span class="d">${q.goals.map((g) => esc(goalText(q, g))).join(' · ')}</span></span></div>`);
    else if (questLockedVisible(q)) rows.push(`<div class="choice q" style="opacity:.6"><span class="mk">!</span><span><span class="t">${esc(q.title)}</span><br><span class="d">조건: ${esc(reqWhy(q.req))}</span></span></div>`);
  }
  const fnBtns = [];
  if (id === 'haechi') { fnBtns.push('<button class="btn" data-act="jobs">진로 상담</button>', '<button class="btn ghost" data-act="skills">스킬 배우기</button>'); }
  if (n.fn === 'food') fnBtns.push('<button class="btn" data-act="food">김밥집 메뉴</button>');
  if (n.fn === 'mall') fnBtns.push('<button class="btn" data-act="mall">장비 뽑기</button>');
  if (n.fn === 'board') fnBtns.push('<button class="btn" data-act="board">사건 고르기</button>');
  if (NPC_CHAT[id] || NPC_TRIVIA[id]) fnBtns.push('<button class="btn ghost" data-act="chat">이야기</button>');
  const src = n.img ? `assets/${n.img}.png` : n.f != null ? frameURL('atlas_npc', 'npc', n.f) : n.comp ? compPortrait(n.comp) : '';
  openSheet(n.name, [], () => `
    <div class="card"><div class="row" style="gap:10px">${src ? `<img src="${src}" alt="" style="width:64px;height:72px;object-fit:contain">` : ''}<p>${esc(NPC_CHAT[id] ? NPC_CHAT[id]() : '무슨 일이에요?')}</p></div></div>
    ${rows.length ? `<div class="choices">${rows.join('')}</div>` : ''}
    ${fnBtns.length ? `<div class="row wrap">${fnBtns.join('')}</div>` : ''}`, null, 'npc');
  sheetNpc = id;
}
let sheetNpc = null;
const qTypeName = (t) => ({ main: '메인', job: '전직', comp: '동료', client: '의뢰인', hidden: '히든 직업' }[t] || t);

// 퀴즈
let quiz = null;
function startQuiz(q, kind = 'bar') {
  const exam = kind === 'exam';
  const pool = QUIZ.slice().sort(() => Math.random() - 0.5).slice(0, exam ? 6 : 5);
  quiz = { q, pool, i: 0, ok: 0, answered: null, exam, need: exam ? 3 : 4 };
  openSheet(exam ? '로스쿨 서바이벌 · 중간고사' : '변호사시험', [], quizRender, null, exam ? 'exam' : 'quiz');
}
function quizRender() {
  const z = quiz; if (!z) return '';
  if (z.i >= z.pool.length) {
    const pass = z.ok >= z.need;
    if (z.exam) return `<div class="card"><h3>${pass ? '통과!' : '과락'}</h3><p>${z.ok} / ${z.pool.length} 정답 · 통과선 ${z.need}문제</p>
      <div class="row wrap">${pass ? '<button class="btn" data-act="exampass">결과 보고하기</button>' : '<button class="btn red" data-act="examfail">결과 확인…</button>'}</div></div>`;
    return `<div class="card"><h3>${pass ? '합격!' : '불합격'}</h3><p>${z.ok} / ${z.pool.length} 정답 · 합격선 ${z.need}문제</p>
      <div class="row wrap">${pass ? '<button class="btn" data-act="quizpass">결과 보고하기</button>' : '<button class="btn" data-act="quizretry">다시 응시</button><button class="btn ghost" data-act="close">나중에</button>'}</div></div>`;
  }
  const item = z.pool[z.i];
  return `<div class="card"><div class="row between"><h3>문제 ${z.i + 1} / ${z.pool.length}</h3><span class="note">정답 ${z.ok}</span></div>
    <p style="font-size:15px;color:var(--fg);line-height:1.6">${esc(item.q)}</p>
    ${z.answered == null ? '<div class="row" style="gap:12px"><button class="btn ox" data-ox="1">O</button><button class="btn red ox" data-ox="0">X</button></div>'
      : `<p><b style="color:${z.answered ? 'var(--exp)' : 'var(--hp)'}">${z.answered ? '정답!' : '오답'}</b> · 정답은 ${item.a ? 'O' : 'X'}. ${esc(item.why)}</p><button class="btn" data-act="quiznext">다음</button>`}</div>`;
}

// 퇴학 (중간고사 과락 또는 자퇴) → 중퇴 루트 선택. 재입학 불가
function expel(voluntary) {
  S.dropout = true; if (S.q.m4b) S.q.m4b.st = 'done'; else S.q.m4b = { st: 'done', prog: {} }; S.q.m4b.failed = true;
  closeSheet(); learnTrivia('t32');
  const lines = voluntary
    ? [['나', 'hero', '…저, 로스쿨 그만두겠습니다.'], ['엄정한 교수', 'prof', '자네 결정이라면 존중하네. 법은 법정 밖에서도 배울 수 있지.'], ['해치', 'haechi', '다시는 못 돌아와. 그래도… 네 길은 네가 정하는 거야.']]
    : [['엄정한 교수', 'prof', '과락일세. 학칙대로… 제적이네. 미안하네.'], ['나', 'hero', '……'], ['해치', 'haechi', '괜찮아! 법은 법정에서만 쓰는 게 아니야. 다른 길로 사람을 지키면 돼.']];
  startDialog(lines, () => { routeSheet(); showGuide('g_drop'); });
  save();
}
function routeSheet() {
  openSheet('새로운 길', [], () => `<p class="note">한 번 고르면 바꿀 수 없어요 (「이직 신청서」 제외).</p>
    <div class="choices">${ROUTE_JOBS.map((id) => { const j = JOBS[id]; return `<button class="choice" data-route="${id}"><img src="${jobPortrait(id)}" alt=""><span><span class="t">${esc(j.name)}</span> <span class="note" style="color:${RANGE[j.type].color}">${RANGE[j.type].name}</span> <span class="note" style="color:var(--hl)">${esc(ROUTE_DIFF[id] || '')}</span><br><span class="d">${esc(j.desc)}</span></span></button>`; }).join('')}</div>`, null, 'route');
}
// ======================================================================
// 대화
// ======================================================================
const dialog = { active: false, lines: [], i: 0, typed: 0, cb: null, full: '' };
function startDialog(lines, cb) {
  if (!lines || !lines.length) { if (cb) cb(); return; }
  if (dialog.active) { const prev = dialog.cb; dialog.lines = dialog.lines.concat(lines); dialog.cb = () => { if (prev) prev(); if (cb) cb(); }; return; }
  dialog.active = true; dialog.lines = lines.slice(); dialog.i = 0; dialog.cb = cb || null; showLine();
  $('#dialog').classList.add('show'); $('#app').classList.add('dlg');
}
function showLine() {
  const [who, img, text] = dialog.lines[dialog.i];
  const name = who === 'sys' ? '' : who;
  const src = img ? portraitSrc(img) : '';
  $('#dlg-name').textContent = name;
  const pt = $('#dlg-portrait');
  pt.style.display = src ? 'block' : 'none';
  if (src) pt.style.backgroundImage = `url("${src}")`;
  dialog.full = text; dialog.typed = 0;
  $('#dlg-text').textContent = '';
  $('#dlg-text').style.fontStyle = who === 'sys' ? 'italic' : 'normal';
}
function dialogTick(dt) {
  if (!dialog.active) return;
  if (dialog.typed < dialog.full.length) { dialog.typed = Math.min(dialog.full.length, dialog.typed + dt * 60); $('#dlg-text').textContent = dialog.full.slice(0, Math.floor(dialog.typed)); }
}
function dialogNext() {
  if (dialog.typed < dialog.full.length) { dialog.typed = dialog.full.length; $('#dlg-text').textContent = dialog.full; return; }
  dialog.i++;
  if (dialog.i >= dialog.lines.length) endDialog(); else showLine();
}
function endDialog() {
  dialog.active = false; $('#dialog').classList.remove('show'); $('#app').classList.remove('dlg');
  const cb = dialog.cb; dialog.cb = null; if (cb) cb();
}

// ======================================================================
// 렌더
// ======================================================================
let ctx, scale = 1;
const tintCanvas = document.createElement('canvas'); tintCanvas.width = 320; tintCanvas.height = 260; const tintCtx = tintCanvas.getContext('2d');
function drawTinted(img, sx, sy, sw, sh, dx, dy, dw, dh, color) {
  if (tintCanvas.width < sw || tintCanvas.height < sh) { tintCanvas.width = Math.max(tintCanvas.width, sw); tintCanvas.height = Math.max(tintCanvas.height, sh); }
  tintCtx.globalCompositeOperation = 'source-over'; tintCtx.clearRect(0, 0, sw + 2, sh + 2);
  tintCtx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  tintCtx.globalCompositeOperation = 'source-in'; tintCtx.fillStyle = color; tintCtx.fillRect(0, 0, sw, sh);
  ctx.drawImage(tintCanvas, 0, 0, sw, sh, dx, dy, dw, dh);
}
function drawAnim(an, key, fi, x, y, h, o = {}) {
  const img = A[an]; const meta = ATLAS[an] && ATLAS[an].frames[key]; if (!img || !meta) return;
  fi = clamp(fi | 0, 0, meta.n - 1);
  const k = h / meta.bh; const w = meta.cw * k, hh = meta.ch * k;
  const sx = fi * meta.cw, sy = meta.y;
  ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); ctx.scale((o.flip ? -1 : 1) * (o.sx || 1), o.sy || 1);
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  const dx = -w / 2, dy = -(meta.ch - 3) * k;
  if (o.tint) drawTinted(img, sx, sy, meta.cw, meta.ch, dx, dy, w, hh, o.tint);
  else {
    if (o.glow && !gfxLevel) { ctx.shadowColor = o.glow; ctx.shadowBlur = 12; }
    ctx.drawImage(img, sx, sy, meta.cw, meta.ch, dx, dy, w, hh);
    ctx.shadowBlur = 0;
    if (o.flash) { ctx.globalAlpha *= o.flash; drawTinted(img, sx, sy, meta.cw, meta.ch, dx, dy, w, hh, '#ffffff'); }
  }
  ctx.restore();
}
function drawSprite(name, x, y, h, o = {}) {
  const img = A[name]; if (!img) return;
  const w = img.width * h / img.height;
  ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot);
  ctx.scale((o.flip ? -1 : 1) * (o.sx || 1), o.sy || 1);
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  ctx.drawImage(img, -w / 2, -h, w, h);
  ctx.restore();
}
function render() {
  ctx.setTransform(scale, 0, 0, scale, 0, offY);
  if (!W) return;
  const sx = cam.shake ? rand(-cam.shake, cam.shake) * 0.5 : 0, sy = cam.shake ? rand(-cam.shake, cam.shake) * 0.5 : 0;
  drawBackground();
  ctx.save(); ctx.translate(-Math.round(cam.x) + sx, -Math.round(cam.y) + sy);
  drawGround();
  for (const r of W.ropes || []) drawRope(r);
  for (const pl of W.platforms) drawPlatform(pl);
  if (W.kind === 'town') drawTownProps();
  for (const pr of W.props) if (!pr.dead) drawSafe(pr);
  for (const f of W.fx) if (f.k === 'lava' || f.k === 'drop' || f.k === 'floorfire') drawHazard(f);
  for (const f of W.fx) if (f.k === 'trail' || f.k === 'dome' || f.k === 'cage') drawFx(f);
  for (const a of W.areas) if (a.burn) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 + Math.sin(a.t * 20) * 0.1; ctx.fillStyle = '#ffd24d'; ctx.fillRect(a.x0, a.y1 - 8, a.x1 - a.x0, 8); ctx.restore(); }
  for (const k of W.pickups) drawPickup(k);
  for (const m of W.mobs) if (!m.dead) drawMob(m);
  for (const a of W.allies) drawAlly(a);
  drawPlayer();
  for (const s of W.pprj) if (!(s.delay > 0)) drawPProj(s);
  for (const b of W.eprj) drawEProj(b);
  for (const f of W.fx) if (f.k !== 'trail' && f.k !== 'dome' && f.k !== 'cage' && f.k !== 'flash' && f.k !== 'countdown' && !['lava', 'drop', 'floorfire'].includes(f.k)) drawFx(f);
  for (const t of W.texts) { ctx.globalAlpha = 1 - t.t / 0.9; drawText(t.s, t.x, t.y, t.big ? 13 : 10, t.c); ctx.globalAlpha = 1; }
  if (W.lock && scene === 'stage') { ctx.fillStyle = 'rgba(229,83,61,.25)'; ctx.fillRect(W.lock[0], cam.y - 200, 4, GROUND - cam.y + 200); ctx.fillRect(W.lock[1] - 4, cam.y - 200, 4, GROUND - cam.y + 200); }
  if (scene === 'stage' && !W.surv && W.arena == null && W.waves.every((w) => w.done)) { ctx.fillStyle = 'rgba(110,231,168,.25)'; ctx.fillRect(W.len - 70, 0, 56, GROUND); drawText('사건 해결 ▶', W.len - 42, GROUND - 90, 11, '#6ee7a8'); }
  ctx.restore();
  for (const f of W.fx) if (f.k === 'flash') { ctx.fillStyle = f.color; ctx.globalAlpha = 0.35 * (1 - f.t / f.dur); ctx.fillRect(0, -offY / scale, viewW, VH + offY / scale); ctx.globalAlpha = 1; }
  for (const f of W.fx) if (f.k === 'countdown') { const n = Math.max(1, 3 - Math.floor(f.t)); drawText(`23:59:5${7 + (3 - n)}`, viewW / 2, 70, 26, '#ff6b5c'); drawText('발판 위로!', viewW / 2, 96, 13, '#ffe45c'); }
  if (scene === 'stage' && W.lock) drawOffscreenMarks();
  if (W.cutin) drawCutin(W.cutin);
  if (W.go && scene === 'stage') { const a = 0.5 + 0.5 * Math.sin(performance.now() / 120); ctx.globalAlpha = a; drawText('GO ▶', viewW - 50, 120, 22, '#ffe45c'); ctx.globalAlpha = 1; }
  if (scene === 'stage' && W.id === '1-1' && player.x < 380 && !W.waves[0].done) drawText('Z 공격 · X·↑ 점프 · 밧줄 앞 ↑ 오르기 · 밧줄에서 ←→ 뛰어내리기', viewW / 2, 60, 10, '#ffe45c');
}
// 화면 위·아래로 벗어난 몬스터: ▲·▼ 표시 (위층 저격수 찾기)
function drawOffscreenMarks() {
  const top = cam.y + 4, bot = cam.y + VH - 30;
  for (const m of W.mobs) {
    if (m.dead || m.fake) continue;
    const up = m.y - m.h * 0.5 < top, down = m.y - m.h * 0.5 > bot; if (!up && !down) continue;
    const x = clamp(m.x - cam.x, 16, viewW - 16), y = up ? 16 : VH - 44;
    const a = 0.65 + 0.35 * Math.sin(performance.now() / 150);
    ctx.globalAlpha = a; drawText(up ? '▲' : '▼', x, y, 14, m.elite ? '#ffb84d' : '#ff6b5c'); ctx.globalAlpha = 1;
  }
}
// 밧줄: 꼰 삼베 밧줄 + 빨간 서류 끈 매듭 + 아래 매듭. 잡을 수 있으면 살짝 빛난다
function drawRope(r) {
  const x = r.x, y0 = r.y0 - 4, y1 = r.y1, P = player;
  const near = P && !P.climb && Math.abs(P.x - x) < 14 && P.y >= r.y0 - 4 && P.y <= r.y1 + 4;
  if (near) { ctx.save(); ctx.globalAlpha = 0.35 + 0.2 * Math.sin(performance.now() / 160); ctx.fillStyle = '#ffe45c'; ctx.fillRect(x - 5, y0, 10, y1 - y0); ctx.restore(); }
  ctx.fillStyle = '#6e4a28'; ctx.fillRect(x - 2.5, y0, 5, y1 - y0);
  ctx.fillStyle = '#a77c48'; ctx.fillRect(x - 2.5, y0, 2, y1 - y0);
  ctx.strokeStyle = 'rgba(50,30,12,.8)'; ctx.lineWidth = 1.1; ctx.beginPath();
  for (let y = y0 + 3; y < y1 - 4; y += 5) { ctx.moveTo(x - 2.5, y); ctx.lineTo(x + 2.5, y + 3); }
  ctx.stroke();
  for (let y = y0 + 34; y < y1 - 16; y += 62) { ctx.fillStyle = '#b8261d'; ctx.fillRect(x - 3.5, y, 7, 4); ctx.fillStyle = '#ff6b5c'; ctx.fillRect(x - 3.5, y, 7, 1); }
  ctx.fillStyle = '#5a3a1e'; ctx.beginPath(); ctx.ellipse(x, y1 - 3, 4, 3.2, 0, 0, Math.PI * 2); ctx.fill();
}
function drawCutin(c) {
  c.t = (c.t || 0) + 1 / 60; const k = Math.min(1, c.t / 0.18), out = c.t > c.dur - 0.15 ? (c.dur - c.t) / 0.15 : 1;
  const top = 70, hgt = 120;
  ctx.save(); ctx.globalAlpha = Math.max(0, out);
  ctx.fillStyle = 'rgba(5,6,14,.82)'; ctx.fillRect(0, top, viewW, hgt);
  ctx.fillStyle = c.color; ctx.fillRect(0, top, viewW, 3); ctx.fillRect(0, top + hgt - 3, viewW, 3);
  ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = c.color; ctx.globalAlpha = 0.25 * out;
  for (let i = 0; i < 14; i++) { const yy = top + 8 + ((i * 37 + c.t * 900) % (hgt - 16)); ctx.lineWidth = 1 + (i % 3); ctx.beginPath(); ctx.moveTo(viewW, yy); ctx.lineTo(viewW * 0.25, yy); ctx.stroke(); }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = Math.max(0, out);
  const px = -60 + k * (viewW * 0.26);
  drawAnim(c.an[0], c.an[1], HF.cast, px, top + hgt + 30, 150, { glow: c.color });
  ctx.globalAlpha = Math.max(0, out);
  const tx = viewW * 0.62 + (1 - k) * 80;
  if (c.awak) drawText('각성', tx, top + 30, 12, '#ffffff');
  drawText(c.job, tx, top + (c.awak ? 48 : 38), 11, '#c9d1e8');
  drawText(c.name, tx, top + 78, c.name.length > 7 ? 22 : 26, c.color);
  ctx.restore();
}
function drawBackground() {
  const img = A[W.bg]; if (!img) return;
  const par = 0.35, vpar = 0.3;
  const extra = Math.max(0, -(W.top || 0)) * vpar;
  const top = -offY / scale - 2 - extra; const h = VH + 14 - top, w = img.width * h / img.height;
  const off = cam.x * par, voff = cam.y * vpar;
  const start = Math.floor(off / w);
  for (let i = start; i * w - off < viewW; i++) {
    const x = i * w - off;
    if (W.mirror && i % 2 !== 0) { ctx.save(); ctx.translate(x + w, top - voff); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, w, h); ctx.restore(); }
    else ctx.drawImage(img, x, top - voff, w, h);
  }
  ctx.fillStyle = 'rgba(5,6,12,.18)'; ctx.fillRect(0, -offY / scale - 2, viewW, VH + offY / scale + 4);
}
function drawGround() {
  const g = W.ch.ground;
  const x0 = cam.x - 20, x1 = cam.x + viewW + 20;
  const gr = ctx.createLinearGradient(0, GROUND, 0, VH); gr.addColorStop(0, g[0]); gr.addColorStop(1, g[1]);
  ctx.fillStyle = gr; ctx.fillRect(x0, GROUND, x1 - x0, VH - GROUND);
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x0, GROUND, x1 - x0, 2);
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  for (let x = Math.floor(x0 / 48) * 48; x < x1; x += 48) ctx.fillRect(x, GROUND + 2, 2, VH - GROUND);
}
// 발판 그림: 장마다 다른 띠 (왼쪽 끝 · 가운데 반복 · 오른쪽 끝)를 발판 길이에 맞춰 한 번 그려 캐시
const platCache = new Map();
function platSprite(pl) {
  const img = A.plat_tiles; const c = W.ch ? W.ch.id : 1; const style = c <= 2 ? 'books' : c <= 4 ? 'boxes' : 'marble'; const t = PLAT_TILES[style];
  if (!img || !t) return null;
  const key = `${style}:${Math.round(pl.w)}`; let cv = platCache.get(key); if (cv) return cv;
  const H = t.dh, k = H / t.h, w = Math.round(pl.w), cap = Math.min(Math.round(t.cap * k), Math.floor(w / 2)), R = 2;
  cv = document.createElement('canvas'); cv.width = w * R; cv.height = H * R; const g = cv.getContext('2d'); g.scale(R, R); g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, t.y, cap / k, t.h, 0, 0, cap, H);
  const midSrc = t.w - 2 * t.cap, midW = midSrc * k, need = w - 2 * cap;
  if (need <= midW) g.drawImage(img, t.cap + (midSrc - need / k) / 2, t.y, need / k, t.h, cap, 0, need, H);   // 가운데를 잘라 쓴다
  else for (let x = cap; x < w - cap; x += midW) { const seg = Math.min(midW, w - cap - x); g.drawImage(img, t.cap, t.y, seg / k, t.h, x, 0, seg, H); }
  g.drawImage(img, t.w - cap / k, t.y, cap / k, t.h, w - cap, 0, cap, H);
  cv.top = t.top * k; platCache.set(key, cv); return cv;
}
function drawPlatform(pl) {
  const spr = platSprite(pl);
  if (spr) { ctx.drawImage(spr, pl.x, pl.y - spr.top, pl.w, spr.height / 2); return; }
  const colors = ['#2f4a7a', '#7a2f2f', '#2f6a4a', '#6a5a2f'];
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(pl.x + 4, pl.y + 14, pl.w - 8, 4);
  for (let i = 0; i < Math.floor(pl.w / 18); i++) { ctx.fillStyle = colors[i % 4]; ctx.fillRect(pl.x + i * 18, pl.y, 16, 14); ctx.fillStyle = '#f4f1e6'; ctx.fillRect(pl.x + i * 18 + 3, pl.y + 3, 10, 3); }
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(pl.x, pl.y, pl.w, 2);
}
function drawShadow(x, y, w) {
  let gy = GROUND; const pl = W.platforms.find((p) => x > p.x && x < p.x + p.w && y <= p.y + 1 && p.y - y < 140); if (pl) gy = pl.y;
  const k = clamp(1 - (gy - y) / 200, 0.3, 1);
  ctx.fillStyle = `rgba(0,0,0,${0.32 * k})`; ctx.beginPath(); ctx.ellipse(x, gy + 1, w * 0.45 * k, 4 * k, 0, 0, Math.PI * 2); ctx.fill();
}
function playerFrame(p) {
  if (p.dead || p.hurtT > 0) return HF.hurt;
  if (p.dashT > 0) return HF.strike;
  if (p.castT > 0) return HF.cast;
  if (p.atkT > 0) { const prog = 1 - p.atkT / p.atkDur; return prog < 0.3 ? HF.wind : HF.strike; }
  if (!p.onGround) return HF.jump;
  if (p.walkT > 0) return Math.floor(p.walkT * 7) % 2 ? HF.walk2 : HF.walk1;
  return HF.idle;
}
function drawPlayer() {
  const p = player, j = job(); if (!p) return;
  drawShadow(p.x, p.y, 30);
  if (p.inv > 0 && Math.floor(p.inv * 16) % 2 && !p.dead && !buff('invuln')) return;
  const pose = playerPose(p, j), fi = pose.fi;
  let sx = 1, sy = 1, rot = 0, oy = 0;
  if (!pose.loco && fi === HF.idle) sy = 1 + Math.sin(p.animT * 3.2) * 0.018;
  if (!pose.loco && (fi === HF.walk1 || fi === HF.walk2)) oy = -Math.abs(Math.sin(p.walkT * 14)) * 2;
  if (p.landT > 0 && !p.climb) { sx = 1.08; sy = 0.92; }
  if (p.dead) rot = -1.3 * p.face;
  let lunge = 0; if (p.atkT > 0 && !pose.loco && fi === HF.strike) lunge = p.face * 3;
  const glowC = buff('invuln') ? '#fff3a0' : buff('cram') || buff('energy') ? '#ffe45c' : p.evid >= 5 ? '#ff6b5c' : null;
  drawFigure(pose, p.x + lunge, p.y + oy, 64, p.face, { sx, sy, rot, glow: glowC, aura: true, t: p.animT, vel: [p.vx, p.vy, p.onGround] });
  if (!p.dead) drawMech(p);
}
// 걷기·밧줄은 전용 시트, 나머지는 기본 8프레임
function playerPose(p, j = job()) {
  const L = LOCO[S.job];
  if (p.climb && L) return { an: L[0], key: L[1], fi: Math.abs(p.vy) > 1 ? (Math.floor(p.walkT * 5) % 2 ? LF.c2 : LF.c1) : LF.c1, back: true, loco: true };
  const fi = playerFrame(p);
  if (L && (fi === HF.walk1 || fi === HF.walk2)) return { an: L[0], key: L[1], fi: [LF.w1, LF.p1, LF.w2, LF.p2][Math.floor(p.walkT * 9) % 4], loco: true };
  return { an: j.anim[0], key: j.anim[1], fi };
}
function drawMech(p) {
  const mech = job().mech; if (!mech || scene !== 'stage') return;
  const y = p.y - 78;
  if (mech === 'evidence') { for (let i = 0; i < 5; i++) { const on = i < p.evid; ctx.fillStyle = on ? (p.evid >= 5 ? '#ff3b2f' : '#ff6b5c') : 'rgba(0,0,0,.35)'; ctx.fillRect(p.x - 22 + i * 9, y, 7, 7); if (on) { ctx.fillStyle = '#ffd1c7'; ctx.fillRect(p.x - 20 + i * 9, y + 2, 3, 3); } } if (p.evid >= 5) drawText('기소 준비', p.x, y - 8, 8, '#ff6b5c'); }
  else if (mech === 'support') { const v = p.support || 0; ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(p.x - 22, y, 44, 5); ctx.fillStyle = v >= 80 ? '#ffe45c' : '#4fd1c5'; ctx.fillRect(p.x - 22, y, 44 * v / 100, 5); drawText(`지지율 ${Math.round(v)}%`, p.x, y - 7, 8, v >= 80 ? '#ffe45c' : '#4fd1c5'); }
  else if (mech === 'viewers') { const v = Math.round(p.viewers || 0); drawText(`● LIVE ${fmt(v)}명`, p.x, y - 2, 8, '#ff6bb5'); }
  else if (mech === 'card') drawText(`₩${fmt(S.gold)}`, p.x, y - 2, 8, '#ffd24d');
}
const poseOf = (id, fi = 0) => ({ an: JOBS[id].anim[0], key: JOBS[id].anim[1], fi });
// 주인공 그리기: 오라 → 몸 뒤 코스튬(망토 몸판·날개·가발 뒷머리) → 몸 → 몸 앞 코스튬(모자·가발·망토 깃)
function drawFigure(pose, x, y, h, face, o = {}) {
  const t = o.t || performance.now() / 1000;
  if (o.aura) drawAura(x, y, h, t);
  const cos = !o.rot && (S.equip.head || S.equip.back);
  if (cos) drawCos('under', pose, x, y, h, face, t, o);
  drawAnim(pose.an, pose.key, pose.fi, x, y, h, { flip: face < 0, sx: o.sx, sy: o.sy, rot: o.rot, glow: o.glow });
  if (cos) drawCos('over', pose, x, y, h, face, t, o);
}
function bestGrade() { let g = -1; for (const k of ['weapon', 'armor', 'acc', 'gear']) { const it = S.inv.find((x) => x.uid === S.equip[k]); if (it) g = Math.max(g, it.grade + Math.floor((it.en || 0) / 5)); } return Math.min(4, g); }
function drawAura(x, y, h, t) {
  if (gfxLevel >= 2) return;
  const g = bestGrade(); if (g < 2) return;
  const col = ['', '', '#6aa9ff', '#c48cff', '#ffb84d'][g];
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const r = h * (0.55 + Math.sin(t * 3) * 0.04);
  const gr = ctx.createRadialGradient(x, y - h * 0.45, 4, x, y - h * 0.45, r); gr.addColorStop(0, col + '55'); gr.addColorStop(1, col + '00');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(x, y - h * 0.45, r * 0.8, r, 0, 0, Math.PI * 2); ctx.fill();
  if (g >= 3) for (let i = 0; i < (g === 4 ? 5 : 3); i++) { const a = t * 1.6 + i * 2.1; const px = x + Math.cos(a) * h * 0.35, py = y - h * 0.15 - ((t * 30 + i * 17) % (h * 0.9)); ctx.globalAlpha = 0.8; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(px, py, 1.6, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
// ---------- 코스튬: 머리·얼굴 위치에 맞춰 씌운다 ----------
// 프레임마다 그림에서 잰 머리 기하(HEADG). 좌표 = 원본 픽셀, 원점 = 머리 위 가운데, +x = 얼굴 쪽
function headGeo(pose) {
  const key = `${pose.an}/${pose.key}`, meta = ATLAS[pose.an] && ATLAS[pose.an].frames[pose.key]; if (!meta) return null;
  const G = HEADG[key], g = G && G[clamp(pose.fi, 0, G.length - 1)];
  if (g) { const [X, T, U, fl, ft, fr, fb] = g; return { X, T, U, fl: fl - X, ft: ft - T, fr: fr - X, fb: fb - T, back: !!pose.back, meta }; }
  const A0 = HEAD[key]; if (!A0) return null; const [cx, top, hw] = A0[clamp(pose.fi, 0, A0.length - 1)];
  const U = hw * 1.05; return { X: cx, T: top, U, fl: -U * 0.32, ft: U * 0.42, fr: U * 0.32, fb: U * 0.84, back: true, meta };
}
// 망토·술이 움직임을 따라 늦게 따라온다 (주인공 하나만)
const cloth = { a: 0, va: 0, l: 0, vl: 0, at: 0 };
function clothState(o, face, t) {
  const idle = Math.sin(t * 1.7) * 0.06 + 0.06;
  if (!o.vel) return { a: idle, l: 0 };
  const tn = performance.now() / 1000, dt = clamp(tn - (cloth.at || tn), 0, 0.05); cloth.at = tn;
  const [vx, vy, ground] = o.vel, fwd = vx * face;
  const ta = idle + clamp(fwd / 240, -0.3, 1) * 0.8, tl = ground ? 0 : clamp(vy / 420, -0.6, 1);
  cloth.va += ((ta - cloth.a) * 70 - cloth.va * 10) * dt; cloth.a += cloth.va * dt;
  cloth.vl += ((tl - cloth.l) * 55 - cloth.vl * 9) * dt; cloth.l += cloth.vl * dt;
  return cloth;
}
function drawCos(layer, pose, x, y, h, face, t, o = {}) {
  const g = headGeo(pose); if (!g) return;
  const k = h / g.meta.bh, flip = face < 0 ? -1 : 1, cl = clothState(o, face, t);
  for (const slot of ['back', 'head']) {
    const it = S.equip[slot] && S.inv.find((v) => v.uid === S.equip[slot]); if (!it || !it.cos) continue;
    const c = COSMETICS[it.cos]; if (!c) continue;
    ctx.save();
    ctx.translate(x, y); ctx.scale(o.sx || 1, o.sy || 1);   // 착지할 때 찌그러짐도 따라간다
    ctx.translate(flip * (g.X - g.meta.cw / 2) * k, (g.T - (g.meta.ch - 3)) * k); ctx.scale(flip * k, k);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (c.proc === 'cape') drawCape(g, layer, cl, t);
    else if (c.proc === 'wig') drawWig(g, layer, cl, t);
    else if (c.proc === 'phones') { if (layer === 'over') drawPhones(g); }
    else if (slot === 'head') { if (layer === 'over') drawHat(c, g, cl, t); }
    else if (layer === (g.back && !c.float ? 'over' : 'under')) drawBackItem(c, g, t);
    ctx.restore();
  }
}
function cosImg(c, x, y, w, ax, ay) {   // 아이콘 그림을 (x, y)에 폭 w로. ax·ay = 그림 안의 기준점 (0~1)
  const img = A.cosmetics; if (!img) return;
  const [iw, ih] = COS_ATLAS.sizes[c.i]; const sx0 = (c.i % 4) * COS_ATLAS.cw + (COS_ATLAS.cw - iw) / 2, sy0 = Math.floor(c.i / 4) * COS_ATLAS.ch + (COS_ATLAS.ch - ih) / 2;
  const hh = w * ih / iw; ctx.drawImage(img, sx0, sy0, iw, ih, x - w * ax, y - hh * ay, w, hh);
}
function drawHat(c, g, cl, t) {
  const U = g.U, w = c.w * U;
  let by = (c.ref === 'brow' ? g.ft : 0) + c.by * U;
  if (c.float) by += Math.sin(t * 3) * 0.03 * U;
  ctx.translate(c.x * U, by); if (c.rot && !g.back) ctx.rotate(c.rot);
  if (!c.float) {   // 챙 밑 그림자: 모자가 머리에 얹힌 게 아니라 눌러 쓴 것처럼
    ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(0, U * 0.03, w * 0.4, U * 0.05, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  if (c.float) ctx.globalCompositeOperation = 'lighter';
  if (c.mirror && !g.back) ctx.scale(-1, 1);
  cosImg(c, 0, 0, w, 0.5, c.seat);
}
function drawBackItem(c, g, t) {
  const U = g.U, nY = g.fb + U * 0.05;
  let x = g.back && !c.float ? 0 : c.x * U, y = nY + c.y * U;
  if (c.float) y += Math.sin(t * 2.4) * 0.04 * U;
  ctx.translate(x, y);
  if (c.flap) ctx.scale(1 + Math.sin(t * 9) * 0.08, 1 - Math.sin(t * 9) * 0.03);
  if (c.float) { ctx.globalAlpha = 0.92; ctx.globalCompositeOperation = 'lighter'; }
  cosImg(c, 0, 0, c.w * U, 0.5, 0.5);
}
// 영웅 망토: 어깨에 매달려 움직임 반대로 휘날린다. 몸 뒤에 몸판, 몸 앞에 깃·브로치
function drawCape(g, layer, cl, t) {
  const U = g.U, nY = g.fb + U * 0.04, feet = g.meta.ch - 3 - g.T, L = Math.max(U * 0.8, (feet - nY) * 0.8);
  const RED = '#cf2632', DEEP = '#7a0f1a', LINE = '#2c080d', GOLD = '#f2c14e';
  const fillCape = (y0, y1) => { const gr = ctx.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, RED); gr.addColorStop(1, DEEP); ctx.fillStyle = gr; ctx.fill(); ctx.strokeStyle = LINE; ctx.lineWidth = 2.6; ctx.stroke(); };
  if (g.back) {   // 뒷모습(밧줄): 등 전체를 덮고 아래로 늘어진다
    if (layer !== 'over') return;
    const sw = Math.sin(t * 2.2) * 0.05 * U, y0 = nY + U * 0.02, y1 = nY + L * 0.9;
    ctx.beginPath(); ctx.moveTo(-0.36 * U, y0); ctx.quadraticCurveTo(0, y0 - 0.06 * U, 0.36 * U, y0);
    ctx.quadraticCurveTo(0.48 * U, (y0 + y1) / 2, 0.5 * U + sw, y1);
    for (let i = 1; i <= 4; i++) { const xa = 0.5 * U - i * 0.25 * U + sw; ctx.quadraticCurveTo(xa + 0.125 * U, y1 + (i % 2 ? 0.07 : -0.03) * U, xa, y1); }
    ctx.quadraticCurveTo(-0.48 * U, (y0 + y1) / 2, -0.36 * U, y0); ctx.closePath(); fillCape(y0, y1);
    ctx.strokeStyle = 'rgba(40,0,8,.35)'; ctx.lineWidth = 2; for (const fx of [-0.15, 0.12]) { ctx.beginPath(); ctx.moveTo(fx * U, y0 + 0.1 * U); ctx.quadraticCurveTo(fx * 1.6 * U, (y0 + y1) / 2, fx * 1.9 * U + sw, y1 - 0.04 * U); ctx.stroke(); }
    return;
  }
  const sb = [-0.36 * U, nY + 0.03 * U], sf = [0.02 * U, nY + 0.06 * U];
  if (layer === 'over') {   // 깃: 목 둘레에 짧게 + 금 브로치
    ctx.beginPath(); ctx.moveTo(-0.26 * U, nY - 0.01 * U); ctx.quadraticCurveTo(-0.1 * U, nY + 0.07 * U, 0.03 * U, nY + 0.04 * U);
    ctx.strokeStyle = LINE; ctx.lineWidth = 0.075 * U; ctx.stroke(); ctx.strokeStyle = RED; ctx.lineWidth = 0.045 * U; ctx.stroke();
    const bx = 0.04 * U, byy = nY + 0.04 * U, r = 0.042 * U;
    ctx.beginPath(); ctx.arc(bx, byy, r, 0, Math.PI * 2); ctx.fillStyle = GOLD; ctx.fill(); ctx.strokeStyle = LINE; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(bx - r * 0.3, byy - r * 0.3, r * 0.35, 0, Math.PI * 2); ctx.fillStyle = '#fff6c8'; ctx.fill();
    return;
  }
  const a = clamp(cl.a, -0.25, 1.15), lift = cl.l, sw = Math.sin(t * 2.3) * 0.035;
  const th = a * 0.95 + Math.max(0, lift) * 0.5 + sw, Lb = L * (1 - Math.max(0, lift) * 0.22 + Math.max(0, -lift) * 0.06);
  const hb = [sb[0] - Math.sin(th) * Lb - 0.3 * U, sb[1] + Math.cos(th) * Lb * 0.97];
  const hf = [sf[0] - 0.12 * U - Math.sin(th * 0.6) * Lb * 0.95, sf[1] + Math.cos(th * 0.6) * Lb * 0.9];
  const hem = () => {   // 물결치는 밑단 (hf → hb)
    const n = 4, amp = 0.045 * U * (1 + a * 0.8);
    for (let i = 1; i <= n; i++) {
      const p0 = [hf[0] + (hb[0] - hf[0]) * (i - 0.5) / n, hf[1] + (hb[1] - hf[1]) * (i - 0.5) / n], p1 = [hf[0] + (hb[0] - hf[0]) * i / n, hf[1] + (hb[1] - hf[1]) * i / n];
      const wv = Math.sin(t * 6 + i * 1.7) * amp; ctx.quadraticCurveTo(p0[0], p0[1] + amp + wv, p1[0], p1[1]);
    }
  };
  const bulge = [(hb[0] + sb[0]) / 2 - (0.2 + 0.1 * a) * U, sb[1] + (hb[1] - sb[1]) * 0.35];
  ctx.beginPath(); ctx.moveTo(sf[0], sf[1]); ctx.quadraticCurveTo(sf[0] - 0.02 * U, (sf[1] + hf[1]) / 2, hf[0], hf[1]);
  hem(); ctx.quadraticCurveTo(bulge[0], bulge[1], sb[0], sb[1]); ctx.quadraticCurveTo(-0.07 * U, nY - 0.03 * U, sf[0], sf[1]); ctx.closePath();
  fillCape(nY, Math.max(hb[1], hf[1]));
  // 안감이 보이는 뒷자락 + 밑단 금실
  ctx.save(); ctx.clip();
  ctx.beginPath(); ctx.moveTo(sb[0], sb[1]); ctx.quadraticCurveTo(bulge[0], bulge[1], hb[0], hb[1]); ctx.lineTo(hb[0] + 0.14 * U, hb[1] - 0.04 * U); ctx.quadraticCurveTo(bulge[0] + 0.16 * U, bulge[1], sb[0] + 0.08 * U, sb[1]); ctx.closePath();
  ctx.fillStyle = 'rgba(45,4,12,.55)'; ctx.fill();
  ctx.strokeStyle = 'rgba(40,0,8,.38)'; ctx.lineWidth = 2;
  for (const f of [0.35, 0.65]) { const top = [sb[0] + (sf[0] - sb[0]) * f, sb[1] + (sf[1] - sb[1]) * f], bot = [hb[0] + (hf[0] - hb[0]) * f, hb[1] + (hf[1] - hb[1]) * f]; ctx.beginPath(); ctx.moveTo(top[0], top[1] + 0.06 * U); ctx.quadraticCurveTo((top[0] + bot[0]) / 2 - 0.06 * U, (top[1] + bot[1]) / 2, bot[0], bot[1]); ctx.stroke(); }
  ctx.restore();
  ctx.beginPath(); ctx.moveTo(hf[0], hf[1]); hem(); ctx.strokeStyle = GOLD; ctx.lineWidth = 2.2; ctx.stroke();
}
// 고양이 헤드폰: 머리 위 띠 + 고양이 귀, 보이는 쪽 귀에 컵 하나 (반대쪽은 머리 뒤)
function drawPhones(g) {
  const U = g.U, PK = '#ff8fbf', PD = '#e0628f', OL = '#3a2430', earY = g.back ? 0.62 * U : g.ft + (g.fb - g.ft) * 0.45, earX = g.back ? -0.5 * U : Math.max(-0.5 * U, g.fl - 0.02 * U);
  const ear = (cx, rot) => { ctx.save(); ctx.translate(cx, -0.02 * U); ctx.rotate(rot); ctx.beginPath(); ctx.moveTo(-0.12 * U, 0.06 * U); ctx.lineTo(0, -0.2 * U); ctx.lineTo(0.12 * U, 0.06 * U); ctx.closePath(); ctx.fillStyle = PK; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-0.06 * U, 0.03 * U); ctx.lineTo(0, -0.11 * U); ctx.lineTo(0.06 * U, 0.03 * U); ctx.closePath(); ctx.fillStyle = '#ffd3e6'; ctx.fill(); ctx.restore(); };
  ear(-0.26 * U, -0.35); ear(0.2 * U, 0.3);
  ctx.beginPath(); ctx.moveTo(earX, earY - 0.08 * U); ctx.bezierCurveTo(-0.62 * U, -0.2 * U, 0.5 * U, -0.22 * U, 0.46 * U, 0.3 * U);   // 머리 위 띠
  ctx.strokeStyle = OL; ctx.lineWidth = 0.11 * U; ctx.stroke(); ctx.strokeStyle = PK; ctx.lineWidth = 0.07 * U; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(earX, earY, 0.15 * U, 0.2 * U, 0, 0, Math.PI * 2); ctx.fillStyle = PK; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 2.4; ctx.stroke();   // 컵
  ctx.beginPath(); ctx.ellipse(earX - 0.02 * U, earY, 0.1 * U, 0.14 * U, 0, 0, Math.PI * 2); ctx.fillStyle = PD; ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(earX - 0.02 * U, earY + 0.03 * U, 0.035 * U, 0, Math.PI * 2); ctx.fill();   // 발바닥 무늬
  for (const [dx, dy] of [[-0.05, -0.04], [0, -0.06], [0.05, -0.04]]) { ctx.beginPath(); ctx.arc(earX - 0.02 * U + dx * U, earY + dy * U, 0.016 * U, 0, Math.PI * 2); ctx.fill(); }
}
// 법정 가발 (아이콘 그림체): 소용돌이 결의 정수리가 머리카락을 덮고, 귀 옆에 끝이 보이는 원통 컬 세 줄, 목 뒤 갈고리 꼬리
function drawWig(g, layer, cl, t) {
  const U = g.U, W0 = '#f7f3ef', W1 = '#e2dad5', W2 = '#b9aeaa', W3 = '#8f8582', OL = '#3d3638';
  const sway = Math.sin(t * 2) * 0.07 + clamp(cl.a, -0.2, 1) * 0.5;
  const roll = (x0, x1, yc, hh) => {   // 원통 컬: 몸통 + 앞쪽 끝 단면(구멍)
    const r = hh / 2; ctx.beginPath(); ctx.moveTo(x1, yc - r); ctx.lineTo(x0 + r * 0.6, yc - r); ctx.ellipse(x0 + r * 0.6, yc, r * 0.6, r, 0, -Math.PI / 2, Math.PI / 2, true); ctx.lineTo(x1, yc + r); ctx.closePath();
    const gr = ctx.createLinearGradient(0, yc - r, 0, yc + r); gr.addColorStop(0, W0); gr.addColorStop(0.5, W1); gr.addColorStop(1, W2); ctx.fillStyle = gr; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.strokeStyle = 'rgba(120,105,100,.55)'; ctx.lineWidth = 1.3;   // 감긴 결
    for (let k = 1; k <= 2; k++) { const xx = x0 + (x1 - x0) * k / 3; ctx.beginPath(); ctx.moveTo(xx, yc - r * 0.85); ctx.quadraticCurveTo(xx - r * 0.35, yc, xx, yc + r * 0.85); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(x1, yc, r * 0.55, r, 0, 0, Math.PI * 2); ctx.fillStyle = W0; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x1 + r * 0.05, yc + r * 0.05, r * 0.26, r * 0.5, 0, 0, Math.PI * 2); ctx.fillStyle = W3; ctx.fill();
  };
  if (layer === 'under') {   // 목 뒤 갈고리 꼬리
    if (g.back) return;
    ctx.save(); ctx.translate(-0.46 * U, g.fb - 0.08 * U); ctx.rotate(sway);
    const L = 0.36 * U, w = 0.12 * U;
    ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.quadraticCurveTo(-w * 0.7, L * 0.6, -w * 0.1, L); ctx.quadraticCurveTo(w * 0.9, L * 1.05, w * 1.0, L * 0.78);
    ctx.quadraticCurveTo(w * 0.45, L * 0.9, w * 0.2, L * 0.72); ctx.quadraticCurveTo(w * 0.45, L * 0.35, w / 2, 0); ctx.closePath();
    ctx.fillStyle = W1; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    return;
  }
  const back = -0.64 * U, front = g.back ? 0.62 * U : Math.max(g.fr + 0.05 * U, 0.5 * U), brow = g.back ? 0.5 * U : g.ft + 0.01 * U, top = -0.15 * U;
  // 정수리 덮개: 뒤로 빗어 넘긴 듯 볼록하게
  ctx.beginPath(); ctx.moveTo(back + 0.02 * U, brow + 0.22 * U);
  ctx.bezierCurveTo(back - 0.14 * U, top - 0.02 * U, front - 0.02 * U, top - 0.1 * U, front, brow);
  ctx.quadraticCurveTo((front + back) / 2 + 0.12 * U, brow + 0.03 * U, back + 0.02 * U, brow + 0.22 * U); ctx.closePath();
  const gr = ctx.createRadialGradient(0.05 * U, top + 0.14 * U, 0.04 * U, -0.1 * U, brow * 0.7, 0.8 * U); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, W0); gr.addColorStop(0.85, W1); gr.addColorStop(1, W2);
  ctx.fillStyle = gr; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 2.6; ctx.stroke();
  ctx.save(); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(0.08 * U, top + 0.13 * U, 0.24 * U, 0.07 * U, -0.25, 0, Math.PI * 2); ctx.fill();   // 윤기
  ctx.lineWidth = 1.7;   // 결: 이마 위에서 뒤통수로 빗어 넘긴 소용돌이
  for (let k = 0; k < 5; k++) {
    const sy = top + (0.1 + k * 0.08) * U;
    ctx.strokeStyle = k % 2 ? 'rgba(150,135,130,.45)' : 'rgba(135,120,115,.6)';
    ctx.beginPath(); ctx.moveTo(front - (0.04 + k * 0.05) * U, sy + 0.05 * U);
    ctx.bezierCurveTo(0.12 * U - k * 0.04 * U, sy - 0.09 * U, -0.32 * U, sy - 0.03 * U, back + 0.05 * U, sy + (0.13 + k * 0.03) * U); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(120,100,100,.2)'; ctx.beginPath(); ctx.ellipse(back + 0.1 * U, brow + 0.08 * U, 0.24 * U, 0.17 * U, 0, 0, Math.PI * 2); ctx.fill();   // 뒤 아래 그늘
  ctx.restore();
  if (g.back) { for (let r = 0; r < 3; r++) roll(-0.6 * U, 0.6 * U, brow + (0.04 + r * 0.15) * U, 0.16 * U); return; }
  // 귀 옆 컬 세 줄 (뒤에서 앞으로, 끝 단면이 얼굴 쪽)
  const x1 = Math.max(-0.34 * U, Math.min(-0.2 * U, g.fl + 0.04 * U));
  roll(back - 0.04 * U, x1, brow + 0.1 * U, 0.17 * U);
  roll(back - 0.06 * U, x1 - 0.02 * U, brow + 0.27 * U, 0.17 * U);
  roll(back - 0.03 * U, x1 - 0.05 * U, brow + 0.44 * U, 0.16 * U);
}
function heroPreview(id = S.job, w = 120, hgt = 140, pose = poseOf(id), face = 1, t = 0) {
  const c = document.createElement('canvas'); c.width = w * 2; c.height = hgt * 2; const saved = ctx; ctx = c.getContext('2d'); ctx.scale(2, 2);
  try { drawFigure(pose, w / 2, hgt - 6, hgt * 0.62, face, { aura: id === S.job, t }); } catch (e) { /* 무시 */ }
  ctx = saved; return c.toDataURL();
}
function drawAlly(a) {
  const c = a.d; drawShadow(a.x, a.y, 26);
  let fi;
  if (c.boss) fi = a.atkT > 0 ? BF.atk : a.walkT > 0 ? (Math.floor(a.walkT * 7) % 2 ? BF.move : BF.idle) : BF.idle;
  else fi = a.atkT > 0 ? (a.atkT > 0.2 ? 2 : 3) : a.walkT > 0 ? (Math.floor(a.walkT * 7) % 2 ? 1 : 0) : 0;
  drawAnim(c.anim[0], c.anim[1], fi, a.x, a.y + (a.walkT > 0 ? -Math.abs(Math.sin(a.walkT * 14)) * 1.5 : 0), c.boss ? 60 : 56, { flip: a.face < 0 });
}
function mobFrame(m) {
  if (m.flash > 0.03 || m.stun > 0.25) return MF.hurt;
  if (m.atkA > 0 || m.state === 'wind' || m.state === 'attack' || m.state === 'dash' || m.state === 'swoop') return MF.atk;
  const moving = Math.abs(m.vx) > 4 || m.d.ai === 'flyer' || (m.d.ai === 'hopper' && !m.onGround);
  if (moving) return Math.floor(m.t * 6) % 2 ? MF.move : MF.idle;
  return MF.idle;
}
function bossFrame(b) {
  if (b.flash > 0.03 && b.stun > 0.2) return BF.hurt;
  const st = b.state;
  if (b.id === 'orc' && st === 'lazy') return BF.special;
  if (b.id === 'orc' && st === 'slam') return BF.wind;
  if (b.id === 'golem' && st === 'jump') return BF.special;
  if (b.id === 'golem' && st === 'throw') return BF.wind;
  if (b.id === 'clock' && b.mn) return BF.special;
  if (b.id === 'doppel' && st === 'crouch') return BF.wind;
  if (st === 'wind') return BF.wind;
  if (b.specialA > 0 || (b.id === 'kim' && b.shield)) return BF.special;
  if (b.atkA > 0 || st === 'dash') return BF.atk;
  if (b.stun > 0) return BF.hurt;
  if (Math.abs(b.vx) > 4 || b.flying) return Math.floor(b.t * 5) % 2 ? BF.move : BF.idle;
  return BF.idle;
}
function drawBark(m) {
  const b = m.bark; b.t += 1 / 60; if (b.t > b.dur) { m.bark = null; return; }
  ctx.save(); ctx.globalAlpha = Math.min(1, b.t * 5, (b.dur - b.t) * 3);
  ctx.font = `11px ${FONT_D}`;
  if (!b.lines) { const maxW = Math.min(200, viewW - 24); b.lines = []; let cur = ''; for (const ch of b.s) { if (ctx.measureText(cur + ch).width > maxW - 12 && cur) { b.lines.push(cur); cur = ch; } else cur += ch; } b.lines.push(cur); b.lines = b.lines.slice(0, 3); b.w = Math.max(...b.lines.map((l) => ctx.measureText(l).width)) + 14; }
  const w = b.w, hgt = b.lines.length * 14 + 6, x = clamp(m.x - w / 2, cam.x + 4, cam.x + viewW - w - 4), y = m.y - m.h - 14 - hgt;
  ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fillRect(x, y, w, hgt); ctx.beginPath(); ctx.moveTo(m.x - 4, y + hgt); ctx.lineTo(m.x + 4, y + hgt); ctx.lineTo(m.x, y + hgt + 6); ctx.fill();
  ctx.fillStyle = '#1d2340'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; b.lines.forEach((l, i) => ctx.fillText(l, x + 7, y + 10 + i * 14)); ctx.restore();
}
// 김성호의 뿔 그림자 (소문 6개 이상, 마지막 페이즈)
function drawHorns(m) {
  const t = m.t, hx = m.x + m.face * m.h * 0.04, hy = m.y - m.h * 0.98 + Math.sin(t * 3) * 1.5, s = m.h / 104;
  ctx.save(); ctx.globalAlpha = 0.55 + Math.sin(t * 5) * 0.15; ctx.fillStyle = '#7a0d12';
  for (const dir of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx + dir * 9 * s, hy + 6 * s); ctx.quadraticCurveTo(hx + dir * 22 * s, hy - 4 * s, hx + dir * 17 * s, hy - 22 * s); ctx.quadraticCurveTo(hx + dir * 13 * s, hy - 6 * s, hx + dir * 3 * s, hy + 4 * s); ctx.fill(); }
  ctx.restore();
}
function drawMob(m) {
  if (m.bark) drawBark(m);
  drawShadow(m.x, m.y, m.w);
  const isBossAnim = m.boss || m.bossId;
  const bid = m.boss ? m.id : m.bossId;
  let fi = isBossAnim ? bossFrame(m) : mobFrame(m);
  let sx = 1, sy = 1, rot = 0, ox = 0, oy = 0;
  if (m.d.ai === 'hopper' && !m.boss) { if (m.onGround) { sy = 1 - Math.abs(Math.sin(m.t * 4)) * 0.06; sx = 2 - sy; } else { sy = 1.06; sx = 0.95; } }
  if (m.state === 'wind' && !m.boss) ox = rand(-1.5, 1.5);
  if (fi === MF.idle && !isBossAnim) sy *= 1 + Math.sin(m.t * 3) * 0.02;
  if (m.dead) rot = 1;
  const alpha = m.fake ? 0.82 : 1;
  const glow = m.mid ? '#ff8a5c' : m.elite ? '#ffb84d' : m.boss && (m.shield || (m.id === 'orc' && W.mobs.filter((x) => !x.dead && x.member).length >= 3)) ? '#ffe45c' : m.real && m.boss && m.id === 'doppel' ? '#c48cff' : null;
  const flash = m.flash > 0 ? (m.boss || m.mid ? 0.45 : 0.7) : 0;
  if (isBossAnim && bid === 'kakha') {   // 한 장짜리 그림을 둥둥 띄우고, 공격할 때 부풀린다
    const pulse = 1 + (m.atkA > 0 ? 0.06 : 0) + Math.sin(m.t * 2.2) * 0.015;
    drawAnim('boss_kakha', 'kakha', 0, m.x + ox, m.y + oy - 6 + Math.sin(m.t * 1.8) * 4, m.h, { flip: m.face > 0, sx: sx * pulse, sy: sy * pulse, rot: rot + Math.sin(m.t * 1.3) * 0.03, alpha, glow: glow || '#ff3b3b', flash });
  } else if (isBossAnim) {
    if (m.boss && m.horns) drawHorns(m);
    drawAnim('atlas_boss', bid, fi, m.x + ox, m.y + oy, m.h, { flip: m.face < 0, sx, sy, rot, alpha, glow: glow || (m.horns ? '#ff3b3b' : null), flash });
  }
  else drawAnim('atlas_mobs', m.id, fi, m.x + ox, m.y + oy, m.h, { flip: m.face < 0, sx, sy, rot, alpha, glow, flash });
  if (m.tag > 0) { m.tag = Math.max(0, m.tag - 1 / 60); }
  if (m.stun > 0.25 && !m.boss) drawText('✶ ✶', m.x, m.y - m.h - 6, 9, '#ffe45c');
  if (m.slow > 0) drawText('느림', m.x, m.y - m.h - 16, 7, '#9ad7ff');
  if (!m.boss && !m.mid && !m.fake && m.hp < m.max) { const w = Math.max(24, m.w * 0.8); ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(m.x - w / 2, m.y - m.h - 6, w, 3); ctx.fillStyle = m.elite ? '#ffb84d' : '#ff6b6b'; ctx.fillRect(m.x - w / 2, m.y - m.h - 6, w * clamp(m.hp / m.max, 0, 1), 3); }
  if (m.elite) drawText('정예', m.x, m.y - m.h - 12, 8, '#ffb84d');
  if (!m.boss && !m.fake && !m.dead) { const lv = mobLevel(m), d = lv - S.lv; const c = d >= 5 ? '#ff6b5c' : d >= 2 ? '#ffb84d' : d <= -5 ? '#9aa3b8' : '#ffffff'; drawText(`Lv.${lv} ${m.mid ? W.ch.midName : m.d.name}`, m.x, m.y + (m.d.ai === 'flyer' ? 8 : 9), 7.5, c); }
  if (m.boss && m.id === 'golem' && m.stacks) drawText(`방어 ${m.stacks}단`, m.x, m.y - m.h - 8, 10, '#c48cff');
  if (m.boss && m.shield) drawText('기본권 방패', m.x, m.y - m.h - 8, 10, '#ffe45c');
}
function drawSafe(pr) {
  const img = A.items_loot; if (!img) return;
  const cw = img.width / 4, chh = img.height / 3; const s = 40;
  drawShadow(pr.x, pr.y, 36);
  ctx.save(); ctx.translate(pr.x + (pr.flash > 0 ? rand(-2, 2) : 0), pr.y);
  ctx.drawImage(img, 2 * cw, 2 * chh, cw, chh, -s / 2, -s, s, s);
  ctx.restore();
  drawText('서류 금고', pr.x, pr.y - s - 6, 8, '#c9d1e8');
}
function drawPickup(k) {
  const bob = Math.sin(k.t * 6) * 2;
  if (k.k === 'coin') { ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(k.x, k.y + bob, 4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff6c2'; ctx.fillRect(k.x - 1, k.y - 2 + bob, 2, 2); return; }
  let sheet = A.items_loot, idx = LOOT[k.k] ?? CONSUMABLES[k.k]?.icon ?? 0;
  if (k.k === 'item') { sheet = k.item.leg ? A.legend : A.items_equip; idx = k.item.leg ? LEGENDS[k.item.leg].i : k.item.base; }
  if (k.k === 'book') { sheet = A.items_equip; idx = 1; }
  if (k.k === 'qitem') { const ic = QITEMS[k.it].icon; sheet = ic[0] === 'equip' ? A.items_equip : A.items_loot; idx = ic[1]; }
  if (!sheet) return;
  const cw = sheet.width / 4, chh = sheet.height / 3; const s = 20;
  const halo = k.k === 'item' ? ['rgba(185,192,216,.35)', 'rgba(126,224,138,.4)', 'rgba(106,169,255,.45)', 'rgba(196,140,255,.5)', 'rgba(255,184,77,.6)'][k.item.grade] : k.k === 'book' ? 'rgba(196,140,255,.65)' : k.k === 'qitem' ? 'rgba(110,231,168,.6)' : null;
  if (halo) { ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(k.x, k.y - 6 + bob, 13 + Math.sin(k.t * 5) * 1.5, 0, Math.PI * 2); ctx.fill(); }
  ctx.drawImage(sheet, (idx % 4) * cw, Math.floor(idx / 4) * chh, cw, chh, k.x - s / 2, k.y - s + 4 + bob, s, s);
  if (k.k === 'qitem') drawText('퀘스트', k.x, k.y - 24 + bob, 7, '#6ee7a8');
}
function drawText(s, x, y, size, fill, stroke = '#0b0d16') {
  if (size < 16) size = Math.round(size * 12) / 10;   // 작은 글씨는 1.2배 (가독성)
  ctx.font = `${size}px ${FONT_D}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 3; ctx.strokeStyle = stroke; ctx.strokeText(s, x, y); ctx.fillStyle = fill; ctx.fillText(s, x, y);
}
function drawTownProps() {
  // 스터디 카페 간판
  if (qDone('m4')) { ctx.fillStyle = '#2a3a5a'; ctx.fillRect(1450, GROUND - 120, 250, 24); drawText('스터디 카페 「끝까지」', 1575, GROUND - 108, 10, '#ffe45c'); }
  for (const n of W.npcs) {
    const near = actTarget === n; const t = performance.now() / 1000;
    if (n.img) { drawShadow(n.x, GROUND, 34); drawSprite(n.body || n.img, n.x, GROUND + (n.id === 'haechi' ? Math.sin(t * 3.3) * 1.5 : 0), n.h, { flip: player.x < n.x, sy: 1 + Math.sin(t * 2 + n.x) * 0.012 }); }
    else if (n.f != null) { drawShadow(n.x, GROUND, 30); drawAnim('atlas_npc', 'npc', n.f, n.x, GROUND, n.h, { flip: player.x < n.x, sy: 1 + Math.sin(t * 2 + n.x) * 0.015 }); }
    else if (n.comp) { drawShadow(n.x, GROUND, 30); const c = COMPANIONS[n.comp]; drawAnim(c.anim[0], c.anim[1], 0, n.x, GROUND, n.h, { flip: player.x < n.x, sy: 1 + Math.sin(t * 2 + n.x) * 0.015 }); }
    else if (n.id === 'mall') {
      ctx.fillStyle = '#3a2350'; ctx.fillRect(n.x - 34, GROUND - 64, 68, 64); ctx.fillStyle = '#ffb84d'; ctx.fillRect(n.x - 38, GROUND - 74, 76, 14);
      drawText('서초 백화점', n.x, GROUND - 67, 9, '#2a1600', '#ffb84d');
      const img = A.items_equip; if (img) { const cw = img.width / 4, chh = img.height / 3; [0, 3, 6].forEach((idx, i) => ctx.drawImage(img, (idx % 4) * cw, Math.floor(idx / 4) * chh, cw, chh, n.x - 30 + i * 20, GROUND - 52, 20, 20)); }
      ctx.fillStyle = '#ffe45c'; ctx.fillRect(n.x - 30, GROUND - 26, 60, 14); drawText('장비 뽑기', n.x, GROUND - 19, 8, '#2a2300', '#ffe45c');
    } else if (n.id === 'board') {
      ctx.fillStyle = '#5a3a1a'; ctx.fillRect(n.x - 4, GROUND - 70, 8, 70); ctx.fillStyle = '#8a5a2a'; ctx.fillRect(n.x - 36, GROUND - 76, 72, 46);
      ctx.fillStyle = '#f4f1e6'; for (let i = 0; i < 4; i++) ctx.fillRect(n.x - 30 + (i % 2) * 32, GROUND - 72 + Math.floor(i / 2) * 20, 26, 16);
      ctx.fillStyle = '#e5533d'; for (let i = 0; i < 4; i++) ctx.fillRect(n.x - 19 + (i % 2) * 32, GROUND - 72 + Math.floor(i / 2) * 20, 4, 4);
    }
    drawText(n.name, n.x, GROUND - n.h - 10, 9, near ? '#ffe45c' : '#ffffff');
    const mk = npcMark(n.id);
    if (mk) { const by = GROUND - n.h - 26 + Math.sin(t * 5) * 2; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.arc(n.x, by, 8, 0, Math.PI * 2); ctx.fill(); drawText(mk[0], n.x, by + 1, 12, mk[1]); }
    else if (near) drawText('▼', n.x, GROUND - n.h - 22 + Math.sin(t * 6) * 2, 10, '#ffe45c');
    if (near) drawText('공격 버튼 = 대화', n.x, GROUND - n.h - 44, 9, '#ffe45c');
  }
}
function updateCamera(dt) {
  const p = player;
  const target = p.x - viewW * 0.42;
  let lo = 0, hi = W.len - viewW;
  if (W.lock) { lo = W.lock[0]; hi = W.lock[1] - viewW; }
  if (hi < lo) { const mid = (lo + hi) / 2; lo = hi = mid; }
  cam.x += (clamp(target, lo, hi) - cam.x) * Math.min(1, dt * 6);
  if (Math.abs(cam.x - clamp(target, lo, hi)) > 600) cam.x = clamp(target, lo, hi);
  const ty = clamp(p.y - 195, W.top || 0, 0);   // 플레이어를 아래쪽에 두어 바로 위층이 HUD 밑에 보이게
  cam.y += (ty - cam.y) * Math.min(1, dt * 4);
  cam.shake = Math.max(0, cam.shake - dt * 30);
}
// ======================================================================
// HUD
// ======================================================================
// 경험치 2배: 남은 시간을 HUD에 보여 주고, 끝나면 알린다
let boostWas = false;
const mmss = (ms) => { const t = Math.ceil(ms / 1000); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
function boostHud() {
  const left = S.boostUntil - now(), on = left > 0, el = $('#h-boost');
  if (el.hidden === on) { el.hidden = !on; $('.bar.exp').classList.toggle('boost', on); $('#app').classList.toggle('boosting', on); }
  if (on) { const tx = mmss(left); if ($('#h-boostt').textContent !== tx) $('#h-boostt').textContent = tx; }
  if (boostWas && !on && scene !== 'title') toast('경험치 2배가 끝났어요 · 가방에 부스터가 있으면 다시 켜세요', 3500);
  boostWas = on;
}
function renderHud() {
  const st = stats(), p = player;
  $('#h-lv').textContent = `Lv.${S.lv}`;
  const jn = `${jobName()} · ${RANGE[job().type].name}`; if ($('#h-job').textContent !== jn) $('#h-job').textContent = jn;
  boostHud();
  if (p) {
    $('#h-hp').style.width = `${clamp(p.hp / st.hp * 100, 0, 100)}%`; $('#h-hpt').textContent = `멘탈 ${fmt(Math.max(0, p.hp))}/${fmt(st.hp)}`;
    $('#h-mp').style.width = `${clamp(p.mp / st.mp * 100, 0, 100)}%`; $('#h-mpt').textContent = `커피 ${Math.floor(p.mp)}/${Math.floor(st.mp)}`;
  }
  $('#h-exp').style.width = `${clamp(S.exp / expReq(S.lv) * 100, 0, 100)}%`;
  $('#h-gold').textContent = fmt(S.gold); $('#h-inji').textContent = fmt(S.inji);
  $('#b-home').hidden = scene !== 'stage' || !!(W && W.ended);
  $('#b-auto').classList.toggle('on', S.auto); const al = S.auto ? (aiOn() ? 'AUTO 100%' : 'AUTO 80%') : 'AUTO'; if ($('#b-auto').textContent !== al) $('#b-auto').textContent = al; $('#b-sound').classList.toggle('on', S.sound);
  const n = skillSlots();
  for (let i = 0; i < 4; i++) {
    const slot = 's' + (i + 1), btn = $(`#b-${slot}`); if (!btn) continue;
    btn.style.display = i < n ? '' : 'none';
    const id = S.loadout[i], sk = id && SKILLS[id], lv = sk ? skillLv(id) : 0;
    const lbl = $(`#l-${slot}`); const txt = sk && lv ? shortName(sk.name) : '＋';
    const html = txt.length === 4 ? `${txt.slice(0, 2)}<br>${txt.slice(2)}` : txt.length === 5 ? `${txt.slice(0, 3)}<br>${txt.slice(3)}` : txt;   // 4~5자는 두 줄
    if (lbl.innerHTML !== html) lbl.innerHTML = html;
    const cd = p && sk && lv ? p.cds[slot] / skCd(id, st) : 0;
    $(`#cd-${slot}`).style.transform = `scaleY(${clamp(cd, 0, 1)})`;
    btn.classList.toggle('nomp', !!(p && sk && lv && p.mp < skMp(id)));
    btn.classList.toggle('off', !!(sk && sk.job !== S.job));
    btn.style.setProperty('--c', sk ? JOBS[sk.job].color : '#666');
  }
  const ut = shortName(SKILLS[ultId()].name), ul = ut.length === 4 ? `${ut.slice(0, 2)}<br>${ut.slice(2)}` : ut.length === 5 ? `${ut.slice(0, 3)}<br>${ut.slice(3)}` : ut; if ($('#l-ult').innerHTML !== ul) $('#l-ult').innerHTML = ul;
  if (p) { $('#cd-ult').style.transform = `scaleY(${1 - p.ult / 100})`; $('#b-ult').classList.toggle('ready', p.ult >= 100); }
  const ph = p && p.potCd > 0 ? `${S.cons.gimbap || 0}·${Math.ceil(p.potCd)}s` : `${S.cons.gimbap || 0}`; if ($('#c-hp').textContent !== ph) $('#c-hp').textContent = ph;
  const bb = W && (W.boss && !W.boss.dead ? W.boss : W.mid && !W.mid.dead ? W.mid : null);
  if (bb) $('#boss-hp').style.width = `${clamp(bb.hp / bb.max * 100, 0, 100)}%`;
  if (!renderHud.t || performance.now() - renderHud.t > 600) { renderHud.t = performance.now(); updateBadges(); flushGuides(); }
}
// 알림 점
function badgeState() {
  const b = {};
  b.stat = S.pts > 0;
  b.skill = job().skills.some((id) => { const sk = SKILLS[id], L = sk.learn; return !skillLv(id) && typeof L === 'object' && S.lv >= L.lv && S.books[L.book] > 0 && S.gold >= L.gold; })
    || (S.sp > (S.spSeen || 0) && job().skills.some((id) => skillLv(id) && skillLv(id) < skillCap(id) && S.gold >= skillUpCost(id).gold))   // 새로 생긴 SP만 알린다 (스킬 탭을 한 번 보면 꺼짐)
    || S.loadout.slice(0, skillSlots()).some((x) => !x) && Object.keys(S.skl).some((id) => SKILLS[id] && !SKILLS[id].ult && skillLv(id) && !S.loadout.includes(id));
  b.resume = S.resume.length < resumeSlots() && S.passives.some((id) => PASSIVES[id].job !== S.job && !S.resume.includes(id));
  b.quest = QUESTS.some(questReady);
  return b;
}
function updateBadges() {
  const b = badgeState(); const any = b.stat || b.skill || b.resume;
  const el = $('#badge-menu'); if (el) { el.hidden = !any; el.textContent = ''; $('#b-menu').title = b.stat ? `스탯 포인트 ${S.pts}` : '새 소식'; }
  document.querySelectorAll('#sh-tabs button').forEach((t) => t.classList.toggle('dot', !!b[t.dataset.tab]));
}
// 성장 안내
const guideQ = [];
function showGuide(id) {
  if (S.guides[id] || !GUIDES[id] || guideQ.includes(id)) return;
  S.guides[id] = true; guideQ.push(id); flushGuides();
}
// 전투 중에는 쌓아 두었다가 마을·결과 화면에서 보여 준다
const guideOpen = () => $('#guide').classList.contains('show');
function flushGuides() { if (!guideQ.length || guideOpen() || dialog.active || scene === 'title' || (sheetOpen() && ['route', 'exam', 'quiz', 'major', 'ending', 'gallery'].includes(sheetMode))) return; if (scene === 'stage' && W && !W.ended && !sheetOpen()) return; openGuide(); }
function openGuide() {
  const id = guideQ[0]; if (!id) return; const g = GUIDES[id];
  $('#g-title').textContent = g.title; $('#g-body').textContent = g.body; $('#guide').classList.add('show');
}
function closeGuide() { $('#guide').classList.remove('show'); guideQ.shift(); if (guideQ.length) setTimeout(flushGuides, 200); save(); }
function checkGuides() {
  if (!S.major) return;
  if (S.lv >= 2 && S.pts > 0) showGuide('g_stat');
  if (S.lv >= 5 && S.job === 'student') showGuide('g_job1');
  if (S.jobs.length >= 2) { showGuide('g_keep'); showGuide('g_resume'); }
  if (S.lv >= 12 && !S.jobs.some((j) => JOBS[j].tier >= 2)) showGuide('g_job2');
  if (S.lv >= 18) showGuide('g_slow');
  if (S.lv >= 22 && qDone('m8')) showGuide('g_hidden');
  if (S.lv >= 27 && S.jobs.some((j) => JOBS[j].rank)) showGuide('g_job3');
}
function refreshQuestUI() {
  const el = $('#qtrack'); if (!el) return;
  const act = QUESTS.filter((q) => qState(q.id) === 'active').sort((a, b) => (a.type === 'main' ? 0 : 1) - (b.type === 'main' ? 0 : 1));
  const lines = [];
  for (const q of act.slice(0, 3)) {
    if (questReady(q)) lines.push(`<div class="qt ok">✔ <b>${esc(q.title)}</b> · ${esc(NPCS[q.giver].name)}에게 보고</div>`);
    else { const g = q.goals.find((x) => { const [c, n] = goalProg(q, x); return c < n; }); lines.push(`<div class="qt ${q.type}"><b>${esc(q.title)}</b> · ${esc(goalText(q, g))}</div>`); }
  }
  if (!act.length && QUESTS.some(questAvail)) lines.push('<div class="qt">! 마을에 새 퀘스트가 있습니다</div>');
  el.innerHTML = lines.join('');
  fitQtrack();
}
// 세로 화면에서 퀘스트 안내가 패드 버튼(궁극기 등)을 가리지 않도록 줄마다 폭을 줄인다
function fitQtrack() {
  const el = $('#qtrack'); if (!el) return;
  const btns = [...document.querySelectorAll('#pad button')].filter((b) => b.offsetParent).map((b) => b.getBoundingClientRect());
  for (const ln of el.children) {
    ln.style.maxWidth = '';
    const r = ln.getBoundingClientRect(); let right = Infinity;
    for (const b of btns) if (b.bottom > r.top - 8 && b.top < r.bottom + 8 && b.right > r.left) right = Math.min(right, b.left - 14);   // 손가락 여유
    if (right < r.right) ln.style.maxWidth = Math.max(90, right - r.left) + 'px';
  }
}
function showBanner(t, sub) {
  const b = $('#banner'); b.innerHTML = `${esc(t)}${sub ? `<small>${esc(sub)}</small>` : ''}`; b.classList.add('show');
  clearTimeout(showBanner.t); showBanner.t = setTimeout(() => b.classList.remove('show'), 1700);
}
// 스킬 버튼용 짧은 이름: 띄어쓰기 빼고 4자 이하면 그대로, 아니면 첫 단어
function shortName(n) { const t = n.replace(/\s/g, ''); if (t.length <= 4) return t; const w = n.split(/\s/)[0].replace(/[()]/g, ''); return w.length >= 2 ? w.slice(0, 5) : t.slice(0, 4); }
function toast(html, ms = 2600) {
  const el = document.createElement('div'); el.className = 'toast'; el.innerHTML = html;
  const box = $('#toasts'); box.appendChild(el); while (box.children.length > 2) box.firstChild.remove();
  setTimeout(() => el.remove(), ms);
}

// ======================================================================
// 시트 (메뉴)
// ======================================================================
let sheetRender = null, sheetTab = null, selItem = null, sheetMode = '', sheetDrawn = null;
function sheetOpen() { return $('#sheet').classList.contains('show'); }
// 패드를 누른 채 시트가 열리면, 손을 뗄 때 생기는 클릭이 시트 버튼(입장 등)을 누르는 문제를 막는다
let sheetT = 0, sheetPD = 0;
const ghostClick = (ev) => ev.isTrusted && ev.detail > 0 && sheetPD < sheetT;
function openSheet(title, tabs, renderFn, tab, mode = '') {
  sheetMode = mode; sheetT = now();
  $('#sh-title').textContent = title;
  sheetRender = renderFn; sheetTab = tab || (tabs[0] && tabs[0][0]);
  $('#sh-tabs').innerHTML = tabs.map(([id, name]) => `<button data-tab="${id}" class="${id === sheetTab ? 'on' : ''}">${name}</button>`).join('');
  $('#sh-tabs').style.display = tabs.length ? 'flex' : 'none';
  $('#sh-close').style.visibility = ['major', 'route', 'exam'].includes(mode) ? 'hidden' : '';
  $('#sheet').classList.add('show'); sheetDrawn = null; $('#sh-body').scrollTop = 0; refreshSheet();
}
// 같은 모양의 화면은 통째로 갈아 끼우지 않고 바뀐 글자·속성만 고친다.
// 누른 버튼과 목록이 그대로 남으니 휴대폰에서 스크롤이 맨 위로 튀지 않는다. 펼친 확률표(details)도 그대로 둔다.
function morph(from, to) {
  const a = [...from.childNodes], b = [...to.childNodes];
  b.forEach((y, i) => {
    const x = a[i];
    if (!x) { from.appendChild(y); return; }
    if (x.nodeType !== y.nodeType || x.nodeName !== y.nodeName) { from.replaceChild(y, x); return; }
    if (x.nodeType !== 1) { if (x.nodeValue !== y.nodeValue) x.nodeValue = y.nodeValue; return; }
    for (const { name } of [...x.attributes]) if (!y.hasAttribute(name) && !(name === 'open' && x.nodeName === 'DETAILS')) x.removeAttribute(name);
    for (const { name, value } of [...y.attributes]) if (x.getAttribute(name) !== value) x.setAttribute(name, value);
    morph(x, y);
  });
  for (let i = a.length - 1; i >= b.length; i--) from.removeChild(a[i]);
}
// 다시 그려도 화면이 튀지 않게: 스크롤 위치를 지키고, 방금 누른 버튼이 같은 자리에 오도록 맞춘다
let sheetAnchor = null;
function refreshSheet() {
  if (!sheetRender) return;
  const body = $('#sh-body'), sc = body.scrollTop, html = sheetRender(sheetTab);
  if (sheetDrawn && sheetDrawn.r === sheetRender && sheetDrawn.t === sheetTab) { const tpl = document.createElement('template'); tpl.innerHTML = html; morph(body, tpl.content); }
  else body.innerHTML = html;
  sheetDrawn = { r: sheetRender, t: sheetTab };
  body.scrollTop = sc;
  const a = sheetAnchor; sheetAnchor = null;
  if (a && now() - a.t < 400) { const el = body.querySelector(a.sel); if (el) body.scrollTop += el.getBoundingClientRect().top - a.top; }
  // 그래도 다음 화면에서 위로 튀어 있으면 한 번 되돌린다
  const want = body.scrollTop, drawn = sheetDrawn;
  requestAnimationFrame(() => { if (sheetDrawn === drawn && body.scrollTop < want - 2) body.scrollTop = want; });
}
function tryCloseSheet() {
  if (sheetMode === 'major' || sheetMode === 'route' || sheetMode === 'exam') return;
  if (sheetMode === 'results' || sheetMode === 'dead') { closeSheet(); enterTown(); return; }
  if (sheetMode === 'kim') { startKim(); return; }
  if (sheetMode === 'ending') { endingDone(); return; }
  if (!sheetMode && scene === 'stage' && W && !W.ended && player && player.dead) { closeSheet(); deathSheet(); return; }   // 쓰러진 채 메뉴(충전)를 닫으면 부활 창으로
  closeSheet();
}
function closeSheet() { $('#sheet').classList.remove('show', 'top'); sheetRender = null; selItem = null; sheetMode = ''; quiz = null; save(); refreshQuestUI(); }
const MENU_TABS = [['stat', '상태'], ['skill', '스킬'], ['resume', '이력서'], ['bag', '가방'], ['cos', '코디'], ['quest', '퀘스트'], ['comp', '동료'], ['shop', '상점'], ['book', '도감'], ['opt', '설정']];
function openMenu(tab) { openSheet('메뉴', MENU_TABS, menuRender, tab); updateBadges(); }
function menuRender(tab) {
  return ({ stat: statTab, skill: skillTab, resume: resumeTab, bag: bagTab, cos: cosTab, quest: questTab, comp: compTab, shop: shopTab, book: bookTab, opt: optTab }[tab] || statTab)();
}
function statTab() {
  const st = stats(), j = job(), R = RANGE[j.type], law = S.law, L = S.lv, rk = S.rank[S.job] ? 1.15 : 1, e = eqStats();
  const baseAtk = (10 + 2.3 * (L - 1)) * Math.pow(1.03, L - 1) * j.atk * rk;
  const mech = j.mech && MECH_INFO[j.mech];
  return `
  <div class="card"><div class="row between"><h3>${esc(jobName())} · Lv.${S.lv}</h3><span class="note">${esc(major().name)} · ${esc(major().pro)}</span></div>
    <div class="row" style="gap:12px;align-items:flex-start"><img src="${heroPreview()}" alt="" style="width:96px;height:112px;object-fit:contain">
      <table class="tbl"><tr><td>공격력</td><td><b>${fmt(st.atk)}</b><br><span class="note">레벨·직업 ${fmt(baseAtk)} + 논리력 ${law.log * 2} + 장비 ${fmt(e.atk)}${e.atkPct ? ` · ×${(1 + e.atkPct).toFixed(2)}` : ''}</span></td></tr>
      <tr><td>최대 멘탈</td><td>${fmt(st.hp)} <span class="note">(멘탈 +${law.men * 15})</span></td></tr><tr><td>최대 커피</td><td>${Math.floor(st.mp)} <span class="note">(타격 +${st.mpHit.toFixed(1)})</span></td></tr>
      <tr><td>스킬 피해</td><td>×${st.skill.toFixed(2)}</td></tr><tr><td>결정타</td><td>${(st.crit * 100).toFixed(1)}% · ×${st.critDmg.toFixed(2)}</td></tr><tr><td>공격 속도</td><td>×${st.spd.toFixed(2)}</td></tr><tr><td>받는 피해 감소</td><td>${(st.dr * 100).toFixed(1)}%</td></tr>${st.ls ? `<tr><td>피흡</td><td>${(st.ls * 100).toFixed(1)}% <span class="note">(1초에 최대 멘탈 6%)</span></td></tr>` : ''}<tr><td>스킬 재사용 감소</td><td>${(st.cdr * 100).toFixed(1)}%${law.foc ? ` <span class="note">(집중력 −${Math.min(15, law.foc * 0.3).toFixed(1)}%)</span>` : ''}</td></tr></table></div>
    <p>${esc(RANGE[j.type].name)} · ${esc(R.d)} · 경험치 ${fmt(S.exp)} / ${fmt(expReq(S.lv))}${S.boostUntil > now() ? ` · <b style="color:var(--exp)">경험치 2배 ${Math.ceil((S.boostUntil - now()) / 60000)}분</b>` : ''}</p></div>
  ${mech ? `<div class="card"><h3>직업 특성 · ${esc(mech.name)}</h3><p>${esc(mech.d)}</p></div>` : ''}
  <div class="card ${S.pts ? 'hot' : ''}"><div class="row between"><h3>스탯</h3><b style="color:var(--hl)">남은 포인트 ${S.pts}</b></div>
    <p class="note">레벨업마다 3점. 법률 상식 카드 4장마다 1점.</p>
    ${LAWS.map((l) => `<div class="stat"><span><b>${l.name}</b> ${law[l.id]} <span class="note">[${l.eff}]</span><br><span class="note">1점당 ${l.d} · 지금 ${l.per(law[l.id])}</span></span><button class="btn sm" data-law="${l.id}" data-n="1" ${S.pts ? '' : 'disabled'}>+1</button><button class="btn sm" data-law="${l.id}" data-n="5" ${S.pts >= 5 ? '' : 'disabled'}>+5</button></div>`).join('')}
    <div class="row wrap"><button class="btn ghost sm" data-act="respec">스탯 재배분 (인지 100)</button></div></div>
  <div class="card"><h3>법률 상식 카드 <span class="note">${S.trivia.length} / ${Object.keys(TRIVIA).length}</span></h3><p class="note">몬스터 대사, 마을 사람들과의 이야기, 전직, 정예 몬스터에게서 모은다. 메뉴 → 도감에서 볼 수 있다.</p><p class="note">게임 속 법률 상식은 재미로 보는 일반적인 정보예요. 실제 사건에 대한 법률 자문이 아니며, 법령은 바뀔 수 있으니 실제 문제는 전문가와 상담하세요.</p></div>
  ${S.titles.length ? `<div class="card"><h3>칭호</h3><p>${S.titles.map((t) => `「${esc(t)}」`).join(' ')}</p></div>` : ''}`;
}

const skillUpCost = (id) => { const lv = skillLv(id); return { sp: 1, gold: Math.round(120 * Math.pow(lv, 1.7) * (1 + JOBS[SKILLS[id].job].tier)) }; };
let pickSlot = 0;
function skillTab() {
  ensureLoadout();
  if (S.spSeen !== S.sp) { S.spSeen = S.sp; setTimeout(updateBadges, 0); }
  const j = job(), n = skillSlots();
  const slots = S.loadout.slice(0, 4).map((id, i) => {
    const sk = id && SKILLS[id]; const locked = i >= n;
    return `<button class="lslot ${pickSlot === i ? 'sel' : ''} ${locked ? 'locked' : ''}" data-pslot="${i}" ${locked ? 'disabled' : ''} style="--c:${sk ? JOBS[sk.job].color : '#555'}"><span class="k">${'ASDC'[i]}</span>${locked ? '<span class="note">2차 전직</span>' : sk ? `<b>${esc(sk.name)}</b><span class="note">Lv.${skillLv(id)}${sk.job !== S.job ? ' · 90%' : ''}</span>` : '<span class="note">비어 있음</span>'}</button>`;
  }).join('');
  const learned = Object.keys(S.skl).filter((id) => SKILLS[id] && !SKILLS[id].ult && skillLv(id));
  const byJob = {}; for (const id of learned) (byJob[SKILLS[id].job] = byJob[SKILLS[id].job] || []).push(id);
  const pool = Object.entries(byJob).map(([jid, ids]) => `<div class="pool"><span class="note">${esc(JOBS[jid].name)}</span>${ids.map((id) => `<button class="chip ${S.loadout.includes(id) ? 'on' : ''}" data-equipsk="${id}" style="--c:${JOBS[jid].color}">${esc(SKILLS[id].name)} <small>Lv.${skillLv(id)}</small></button>`).join('')}</div>`).join('');
  const rows = j.skills.map((id, i) => {
    const sk = SKILLS[id], lv = skillLv(id), L = sk.learn, evo = SKILL_EVO[id] || [];
    let action = '';
    if (!lv) {
      if (L === 'quest') action = '<span class="note">퀘스트 「서류폭풍」 보상으로 배움</span>';
      else if (L === 'job') action = '<span class="note">전직하면 배움</span>';
      else { const ok = S.lv >= L.lv && S.books[L.book] > 0 && S.gold >= L.gold; action = `<span class="note">Lv.${L.lv} · ${BOOKS[L.book].name} (${S.books[L.book] || 0}) · ₩${fmt(L.gold)}</span><button class="btn sm" data-learn="${id}" ${ok ? '' : 'disabled'}>배우기</button>`; }
    } else if (lv >= skillCap(id) && lv < 10) action = `<span class="note">최대 Lv.${skillCap(id)} · ${JOBS[sk.job].tier === 2 ? '3차 승진(또는 히든 직업)하면 Lv.10까지 열려요' : '이 직업 스킬은 Lv.5까지'}</span>`;
    else if (lv < 10) { const c = skillUpCost(id); action = `<span class="note">SP ${c.sp} · ₩${fmt(c.gold)}</span><button class="btn sm" data-skup="${id}" ${S.sp >= c.sp && S.gold >= c.gold ? '' : 'disabled'}>Lv 올리기</button>`; }
    else action = '<span class="note">최대 레벨</span>';
    const est = Math.round(stats().atk * sk.mult * (1 + 0.12 * (Math.max(1, lv) - 1)) * stats().skill);
    const cost = j.mech === 'card' ? `₩${fmt(goldCost(id))}` : `커피 ${skMp(id)}`;
    return `<div class="skrow ${lv ? '' : 'locked'}"><div class="skic" style="--c:${j.color}">${i + 1}</div><div style="min-width:0"><b>${esc(sk.name)}</b> ${lv ? `<span class="lvtag">Lv.${lv}</span>` : '<span class="note">미습득</span>'} <span class="tag">${esc(sk.tag || '')}</span><br><span class="note">${esc(sk.d)}</span><br><span class="note"><b style="color:var(--fg)">공격력의 ${Math.round(sk.mult * (1 + 0.12 * (Math.max(1, lv) - 1)) * 100)}%</b> (약 ${fmt(est)}) · ${cost} · 재사용 ${sk.cd}초</span>
      ${evo.length ? `<div class="evo"><span class="${lv >= 5 ? 'on' : ''}">Lv5 강화: ${esc(evo[0])}</span>${JOBS[sk.job].tier >= 2 ? `<span class="${lv >= 7 ? 'on' : ''}">Lv7 각성: ${esc(evo[1])}</span><span class="${lv >= 10 ? 'on' : ''}">Lv10 마스터: 재사용·커피 −20%</span>` : ''}</div>` : ''}<div class="row wrap" style="margin-top:4px">${action}</div></div></div>`;
  }).join('');
  const u = SKILLS[ultId()];
  return `<div class="card"><div class="row between"><h3>스킬 칸 (A·S·D${n > 3 ? '·C' : ''})</h3><span class="note">칸을 고르고 아래 스킬을 누르세요</span></div>
    <div class="lslots">${slots}</div>
    ${pool || '<p>배운 스킬이 없습니다.</p>'}
    <p class="note">전직해도 배운 스킬은 사라지지 않아요(이직하면 떠나는 직업 스킬은 반납·환급). 다른 직업 스킬은 위력 90%. 2차 전직하면 C칸이 열립니다.</p></div>
  <div class="card"><div class="row between"><h3>${esc(jobName())}의 스킬 배우기</h3><b style="color:var(--hl)">SP ${S.sp}</b></div>
    <p>비급: 초급 ${S.books.b1 || 0} · 중급 ${S.books.b2 || 0} · 고급 ${S.books.b3 || 0}. 스킬 레벨당 피해 +12%. Lv5 강화 · Lv7 각성(새 기능) · Lv10 마스터(재사용·커피 −20%).</p>
    ${rows}
    ${(() => { const aw = AWAKE[j.basic.k]; return awakeOf(S.job) ? `<div class="skrow"><div class="skic" style="--c:${j.color}">Z</div><div><b>기본 공격 각성 · ${esc(aw.name)}</b> <span class="lvtag">3차</span><br><span class="note">${esc(aw.d)}</span></div></div>` : `<div class="skrow locked"><div class="skic">Z</div><div><b>기본 공격 각성 · ${esc(aw.name)}</b> <span class="note">${j.tier >= 2 ? '3차 승진(또는 히든 직업)하면' : '2차 진로를 고른 뒤 3차 승진하면'}</span><br><span class="note">${esc(aw.d)}</span></div></div>`; })()}
    <div class="skrow"><div class="skic ult" style="--c:${j.color}">F</div><div><b>${esc(u.name)}</b> <span class="lvtag">${u.awak ? '각성 궁극기' : '궁극기'}</span> <span class="tag">${esc(u.tag || '')}</span><br><span class="note">${esc(u.d)} · 공격력의 ${Math.round(u.mult * 100)}% · 적을 때리면 게이지가 찹니다</span>${j.rank && !S.rank[S.job] ? `<br><span class="note">Lv.30 승진(3차 전직)하면 「${esc(SKILLS[j.rank.ult].name)}」으로 각성</span>` : ''}</div></div></div>`;
}
function resumeTab() {
  checkPassives();
  const n = resumeSlots();
  const mine = S.passives.filter((id) => PASSIVES[id].job === S.job);
  const others = S.passives.filter((id) => PASSIVES[id].job !== S.job);
  const card = (id, on, btn) => { const p = PASSIVES[id]; return `<div class="pcard ${on ? 'on' : ''}" style="--c:${JOBS[p.job].color}"><div><b>${esc(p.name)}</b> <span class="note">${esc(JOBS[p.job].name)}</span><br><span class="note">${esc(p.d)}</span></div>${btn || ''}</div>`; };
  const locked = Object.entries(PASSIVES).filter(([id, p]) => !S.passives.includes(id) && S.jobs.includes(p.job)).map(([id, p]) => `<div class="pcard locked"><div><b>${esc(p.name)}</b> <span class="note">${esc(JOBS[p.job].name)}</span><br><span class="note">${esc(p.d)} · 조건: ${p.unlock === 'rank' ? '승진' : `「${esc(SKILLS[p.unlock.skill].name)}」 Lv.${p.unlock.lv}`}</span></div></div>`).join('');
  return `<div class="card"><div class="row between"><h3>이력서</h3><b style="color:var(--hl)">칸 ${S.resume.length} / ${n}</b></div>
    <p>직업을 하나 얻을 때마다 이력서 칸이 1칸 늘어요(최대 ${resumeCap()}${S.ng ? ` · 재심 특전 +${S.ng}` : ' · 재심할 때마다 +1'}). 예전 직업의 패시브를 꽂아 들고 다니세요. <b>이직할수록 강해집니다.</b></p>
    ${n ? '' : '<p class="note">1차 전직(로스쿨생) 후 첫 칸이 열립니다.</p>'}
    ${S.resume.map((id) => card(id, true, `<button class="btn ghost sm" data-unres="${id}">빼기</button>`)).join('')}</div>
  <div class="card"><h3>현재 직업 패시브 <span class="note">항상 켜짐</span></h3>${mine.length ? mine.map((id) => card(id, true)).join('') : '<p>아직 없습니다.</p>'}</div>
  <div class="card"><h3>예전 직업 패시브</h3>${others.length ? others.map((id) => card(id, S.resume.includes(id), S.resume.includes(id) ? '<span class="note">착용 중</span>' : `<button class="btn sm" data-res="${id}" ${S.resume.length < n ? '' : 'disabled'}>꽂기</button>`)).join('') : '<p>직업을 바꾸면 이전 직업 패시브가 여기에 모입니다.</p>'}</div>
  ${locked ? `<div class="card"><h3>아직 못 배운 패시브</h3>${locked}</div>` : ''}`;
}
function itemStatLine(it) {
  const em = 1 + 0.1 * (it.en || 0);
  return Object.entries(it.st).map(([k, v0]) => { const v = v0 * em; return ({ atk: `논리력 +${Math.round(v)}`, hp: `멘탈 +${Math.round(v)}`, dr: `피해 감소 +${(v * 100).toFixed(1)}%`, crit: `결정타 +${(v * 100).toFixed(1)}%`, spd: `공격 속도 +${(v * 100).toFixed(0)}%`, atkPct: `논리력 +${(v * 100).toFixed(0)}%`, cdr: `재사용 −${(v * 100).toFixed(0)}%`, ls: `피흡 ${(v * 100).toFixed(1)}%`, skill: `스킬 피해 +${(v * 100).toFixed(0)}%`, hpPct: `멘탈 +${(v * 100).toFixed(0)}%`, mprPct: `커피 회복 +${(v * 100).toFixed(0)}%`, gold: `수임료 +${(v * 100).toFixed(0)}%`, mpr: `커피 회복 +${v.toFixed(1)}`, exp: `경험치 +${(v * 100).toFixed(0)}%` }[k]); }).join(' · ');
}
const enhCost = (it) => Math.round((60 + it.ilv * 14) * Math.pow((it.en || 0) + 1, 1.6) * GRADE_MULT[it.grade]);
function bagTab() {
  const icon = (it) => `<div class="ic" style="${itemIcon(it)}"></div>`;
  const eq = Object.keys(S.equip).filter((slot) => SLOT_NAME[slot]).map((slot) => { const it = S.inv.find((x) => x.uid === S.equip[slot]); return `<div><div class="slot ${it ? 'g' + it.grade : ''} ${selItem === (it && it.uid) ? 'sel' : ''}" data-item="${it ? it.uid : ''}"><span class="k">${SLOT_NAME[slot] || (slot === 'head' ? '머리' : '등')}</span>${it ? `${icon(it)}${it.en ? `<span class="n">+${it.en}</span>` : ''}` : ''}</div></div>`; }).join('');
  const sorted = S.inv.filter((x) => !x.cos).sort((a, b) => b.grade - a.grade || itemScore(b) - itemScore(a));
  const sel = S.inv.find((x) => x.uid === selItem && !x.cos);
  const equipped = sel && S.equip[sel.slot] === sel.uid;
  const qi = Object.entries(S.qitems).filter(([, n]) => n > 0);
  return `
  <div class="card"><div class="row" style="gap:10px;align-items:flex-start"><img src="${heroPreview()}" alt="" style="width:80px;height:94px;object-fit:contain;flex:none"><div style="min-width:0;flex:1"><h3>장착 <span class="note">성능</span></h3><div class="grid">${eq}</div><p class="note">장비 = 능력치. 모습은 「코디」 탭의 코스튬으로 바꿔요.</p></div></div></div>
  ${sel ? `<div class="card"><div class="row" style="gap:10px"><div class="slot g${sel.grade}" style="width:64px;flex:none">${icon(sel)}</div><div style="min-width:0"><b class="gc${sel.grade}">${GRADES[sel.grade]} · ${esc(sel.name)}${sel.en ? ` +${sel.en}` : ''}</b><p>${sel.cos ? (COSMETICS[sel.cos].slot === 'head' ? '코스튬 · 머리' : '코스튬 · 등') : `${SLOT_NAME[sel.slot]} · Lv.${sel.ilv}`} · ${itemStatLine(sel)}</p>${sel.leg ? `<p class="note"><b style="color:#ff5c7a">${esc(JOBS[sel.leg].name)} 전용 · 피흡</b> 가한 피해의 일부를 멘탈로 흡수 (1초에 최대 멘탈의 6%). ${esc(LEGENDS[sel.leg].d)}${sel.leg !== S.job ? ' <b style="color:var(--hp)">지금 직업에서는 효과 없음</b>' : ''}</p>` : ''}</div></div>
    <div class="row wrap">${equipped ? '<button class="btn ghost sm" data-act="unequip">해제</button>' : sel.leg && sel.leg !== S.job ? `<button class="btn sm" disabled>${esc(JOBS[sel.leg].name)} 전용</button>` : '<button class="btn sm" data-act="equip">장착</button>'}
    ${sel.cos ? '' : (sel.en || 0) < 10 ? `<button class="btn sm" data-act="enhance" ${S.gold >= enhCost(sel) ? '' : 'disabled'}>강화 +${(sel.en || 0) + 1} · ₩${fmt(enhCost(sel))} · ${Math.round(ENH_RATE[sel.en || 0] * 100)}%</button>` : '<span class="note">최대 강화</span>'}
    ${equipped || sel.cos ? '' : `<button class="btn ghost sm" data-act="sell">판매 ₩${fmt(sellPrice(sel))}</button>`}</div>${sel.cos ? '<p class="note">코스튬은 캐릭터 모습을 바꿉니다.</p>' : '<p class="note">강화 1단계당 능력치 +10%. +5부터는 실패하면 1단계 내려갑니다. 장비 등급·강화가 높으면 몸에 오라가 생깁니다.</p>'}</div>` : ''}
  <div class="card"><div class="row between"><h3>가방 <span class="note">${sorted.length}</span></h3><button class="btn ghost sm" data-act="sellall">일반·고급 일괄 판매</button></div>
    ${sorted.length ? `<div class="grid">${sorted.map((it) => `<div class="slot g${it.grade} ${selItem === it.uid ? 'sel' : ''}" data-item="${it.uid}">${icon(it)}${Object.values(S.equip).includes(it.uid) ? '<span class="k">E</span>' : ''}${it.en ? `<span class="n">+${it.en}</span>` : ''}</div>`).join('')}</div>` : '<p>장비가 없습니다.</p>'}</div>
  ${consCard()}`;
}
// 소모품·재료: 무엇에 쓰는지와 쓰는 법을 글로 보여 준다 (휴대폰엔 툴팁이 없다)
function consCard() {
  const inStage = scene === 'stage' && W && !W.ended;
  const left = S.boostUntil - now();
  const row = (ic, name, n, d, how, btn) => `<div class="citem"><div class="ic" style="${ic}"></div><div style="min-width:0"><b>${name}</b> <span class="cnt">×${n}</span><p>${d}</p>${how ? `<p class="how">${how}</p>` : ''}</div>${btn || ''}</div>`;
  const cons = Object.entries(CONSUMABLES).map(([id, c]) => row(iconStyle('loot', c.icon), esc(c.name), S.cons[id] || 0, esc(c.d), esc(c.how),
    `<button class="btn sm" data-use="${id}" ${inStage && S.cons[id] ? '' : 'disabled'}>${id === 'gimbap' ? '먹기' : '마시기'}</button>`)).join('');
  const boost = row(`${iconStyle('loot', LOOT.energy)}" data-x2="1`, '경험치 부스터', S.boosters, `켜면 30분 동안 얻는 경험치 2배${left > 0 ? ` · <b style="color:var(--exp)">지금 켜짐 · 남은 시간 ${mmss(left)}</b>` : ''}`,
    '실제 시간으로 흐른다(게임을 꺼도 줄어든다). 또 켜면 30분씩 늘어난다. 화면 위 경험치 바 아래에 남은 시간이 보인다.',
    `<button class="btn sm" data-act="useboost" ${S.boosters ? '' : 'disabled'}>${left > 0 ? '+30분' : '켜기'}</button>`);
  const qi = Object.entries(S.qitems).filter(([, n]) => n > 0);
  const mats = [row(iconStyle('loot', LOOT.contract), '헤드헌팅 계약서', S.contracts, '상점 → 서초 백화점(장비 뽑기)에서 공짜로 1회 뽑기', '', S.contracts ? '<button class="btn ghost sm" data-act="toshop">백화점</button>' : '')]
    .concat(['b1', 'b2', 'b3'].map((b) => row(iconStyle('equip', 1), esc(BOOKS[b].name), S.books[b] || 0, esc(BOOKS[b].d), '메뉴 → 스킬에서 배울 때 자동으로 쓴다. 정예·보스에게서 나온다', '')))
    .concat(qi.map(([it, n]) => row(iconStyle(QITEMS[it].icon[0], QITEMS[it].icon[1]), esc(QITEMS[it].name), n, '퀘스트 납품용', '모으면 마을에서 퀘스트를 준 사람에게 보고', ''))).join('');
  return `<div class="card"><h3>소모품</h3>${inStage ? '' : '<p class="note">먹고 마시는 건 사건(전투) 중에만 쓸 수 있어요. 마을 김밥집(상점)에서 수임료로 산다.</p>'}<div style="display:grid;gap:6px">${cons}${boost}</div></div>
  <div class="card"><h3>재료</h3><div style="display:grid;gap:6px">${mats}</div></div>`;
}
// 코디: 코스튬 갈아입기 + 수집 효과. 장비(성능)와 분리된 외형 레이어
const pctLine = (e) => Object.entries(e).map(([k, v]) => `${{ atkPct: '논리력', hpPct: '멘탈', spd: '공격 속도', crit: '결정타', dr: '받는 피해 감소', skill: '스킬 피해', exp: '경험치', gold: '수임료', mprPct: '커피 회복' }[k] || k} +${(v * 100).toFixed(1)}%`).join(' · ');
function cosTab() {
  const all = Object.keys(COSMETICS), own = cosOwned();
  const worn = (slot) => { const it = S.inv.find((x) => x.uid === S.equip[slot]); return it ? `<b class="gc${it.grade}">${esc(it.name)}</b>` : '없음'; };
  const cell = (id) => {
    const c = COSMETICS[id], it = S.inv.find((x) => x.cos === id), on = it && S.equip[c.slot] === it.uid;
    return `<button class="slot cosc g${c.grade} ${on ? 'sel' : ''} ${it ? '' : 'locked'}" data-wear="${id}" ${it ? '' : 'disabled'}><div class="ic" style="${iconStyle('cos', c.i)}${it ? '' : ';filter:brightness(0) opacity(.4)'}"></div>${on ? '<span class="k">착용</span>' : ''}<span class="cn">${it ? esc(c.name) : '???'}</span></button>`;
  };
  return `<div class="card"><div class="row" style="gap:10px;align-items:flex-start"><img src="${heroPreview()}" alt="" style="width:80px;height:94px;object-fit:contain;flex:none"><div style="min-width:0;flex:1"><h3>코디 <span class="note">외형</span></h3><p>머리 ${worn('head')} · 등 ${worn('back')}</p><p class="note">코스튬은 입든 안 입든 <b>가지고만 있으면</b> 능력치가 붙어요. 성능 걱정 없이 마음에 드는 모습으로 입으세요. 탭하면 입기/벗기.</p></div></div></div>
  <div class="card"><h3>머리</h3><div class="grid">${all.filter((id) => COSMETICS[id].slot === 'head').map(cell).join('')}</div><h3 style="margin-top:8px">등</h3><div class="grid">${all.filter((id) => COSMETICS[id].slot === 'back').map(cell).join('')}</div></div>
  <div class="card ${own.length === all.length ? 'hot' : ''}"><div class="row between"><h3>수집 효과</h3><b style="color:var(--hl)">${own.length} / ${all.length}</b></div><p>${own.length ? pctLine(cosStats()) : '아직 모은 코스튬이 없습니다.'}</p>
    <p class="note">코스튬마다 고유 능력치의 ${Math.round(COS_RATE * 100)}%가 영구 적용. ${all.length}종을 모두 모으면 세트 효과 ${pctLine(COS_SET)}${own.length === all.length ? ' <b style="color:var(--exp)">달성!</b>' : ''}.</p>
    <div class="row wrap"><button class="btn sm" data-tab="shop">코스튬 뽑기 →</button></div></div>
  <div class="card"><h3>장비와 코스튬</h3><p class="note"><b>장비</b>(가방 탭): 몬스터·장비 뽑기에서 얻는 성능 아이템. 레벨이 오르면 더 좋은 것으로 바꾸고 강화·판매해요.<br><b>코스튬</b>(코디 탭): 모습을 바꾸는 수집품. 버릴 일이 없고, 모은 만큼 영구 능력치가 쌓여요.</p></div>`;
}
function sellPrice(it) { return Math.round((20 + it.ilv * 6) * GRADE_MULT[it.grade] * GRADE_MULT[it.grade] * (1 + 0.3 * (it.en || 0))); }
function questTab() {
  const act = QUESTS.filter((q) => qState(q.id) === 'active');
  const av = QUESTS.filter(questAvail);
  const done = QUESTS.filter((q) => qDone(q.id)).length;
  ensureDaily();
  const card = (q) => `<div class="qcard ${q.type} ${questReady(q) ? 'ready' : ''}"><div class="row between"><b>${esc(q.title)}</b><span class="tag ${q.type}">${qTypeName(q.type)}</span></div>
    ${q.goals.map((g) => { const [c, n] = goalProg(q, g); return `<div class="goal ${c >= n ? 'ok' : ''}">${c >= n ? '✔' : '·'} ${esc(goalText(q, g))}</div>`; }).join('')}
    <span class="note">${questReady(q) ? `완료! ${esc(NPCS[q.giver].name)}에게 보고하세요` : `의뢰인: ${esc(NPCS[q.giver].name)}`}${q.drops ? ` · 드롭: ${q.drops.map((d) => `${d.ch.join('·')}장${d.from === 'elite' ? ' 정예' : d.from === 'safe' ? ' 금고' : ''}`).join(', ')}` : ''}</span></div>`;
  return `
  <div class="card"><h3>진행 중 <span class="note">${act.length}</span></h3>${act.length ? act.map(card).join('') : '<p>진행 중인 퀘스트가 없습니다.</p>'}</div>
  <div class="card"><h3>받을 수 있는 퀘스트 <span class="note">${av.length}</span></h3>${av.length ? av.map((q) => `<div class="row between"><span><b>${esc(q.title)}</b> <span class="tag ${q.type}">${qTypeName(q.type)}</span></span><span class="note">마을 · ${esc(NPCS[q.giver].name)}</span></div>`).join('') : '<p>지금은 없습니다. 이야기를 진행하면 늘어납니다.</p>'}</div>
  <div class="card"><h3>오늘의 의뢰 <span class="note">사건 게시판</span></h3>${S.daily.list.length ? S.daily.list.map((d) => `<div class="row between"><span>${esc(MOBS[d.m].name)} ${d.prog}/${d.n}</span><span class="note">${d.claimed ? '보상 받음' : `₩${fmt(d.gold)} · 인지 ${d.inji}`}</span></div>`).join('') : '<p>1장을 시작하면 열립니다.</p>'}</div>
  <p class="note">완료한 퀘스트 ${done} / ${QUESTS.length} · 의뢰인 퀘스트 ${clientDone()}</p>`;
}
function compTab() {
  const ids = Object.keys(COMPANIONS);
  return `<div class="card"><div class="row between"><h3>스터디 · 동료</h3><span class="note">함께 가는 동료 ${S.party.length} / ${S.slots}</span></div>
    <p>동료는 전투를 돕고 패시브 효과를 줍니다. 동료 레벨당 공격·패시브 +10%.</p>
    ${ids.map((id) => {
      const c = COMPANIONS[id]; const has = S.comps.includes(id); const lv = S.compLv[id] || 1; const inP = S.party.includes(id); const cost = Math.round(600 * Math.pow(lv, 1.8));
      if (!has) return `<div class="skrow locked"><div class="cport" style="background-image:url('${compPortrait(id)}');filter:brightness(0) opacity(.5)"></div><div><b>???</b><br><span class="note">${id === 'kim' ? '1부를 끝까지 깨면 합류' : '로스쿨에서 만날 수 있다'}</span></div></div>`;
      return `<div class="skrow"><div class="cport" style="background-image:url('${compPortrait(id)}')"></div><div style="min-width:0"><b>${esc(c.name)}</b> <span class="lvtag">Lv.${lv}</span> <span class="note" style="color:${RANGE[c.type].color}">${RANGE[c.type].name}</span><br><span class="note">${esc(c.desc)} · ${esc(c.pd)}</span>
        <div class="row wrap" style="margin-top:4px"><button class="btn sm ${inP ? 'ghost' : ''}" data-party="${id}" ${!inP && S.party.length >= S.slots ? 'disabled' : ''}>${inP ? '빼기' : '데려가기'}</button>${lv < 10 ? `<button class="btn ghost sm" data-cup="${id}" ${S.gold >= cost ? '' : 'disabled'}>레벨 업 · ₩${fmt(cost)}</button>` : ''}</div></div></div>`;
    }).join('')}</div>`;
}
// 영구 구매 (스토어가 구매 기록을 보관 → 「구매 복원」). 인지는 아래 인지 충전에서 판다
// 개업 패키지: 계정에 한 번만 파는 첫 결제 상품. 코스튬은 모든 슬롯, 인지·뽑기권·계약서는 산 슬롯에 한 번
const STARTER = { inji: 600, tickets: 3, contracts: 3 };
const STORE = [
  { id: 'starter', name: '개업 패키지', price: 2900, cos: ['cape'], d: `한 번만 · 인지 ${STARTER.inji} + 코스튬 뽑기권 ${STARTER.tickets} + 장비 계약서 ${STARTER.contracts} + 영웅 망토` },
  { id: 'ai', name: 'AI 법률비서 (영구)', price: 2200, d: 'AUTO 공격력 80% → 100% · 스킬·궁극기 자동 사용' },
  { id: 'slots', name: '세이브 슬롯 +3칸', price: 1500, d: '타이틀 슬롯 3칸 → 6칸. 진로별로 동시에 키우기' },
  { id: 'cos_court', name: '코스튬 팩 · 법정 패션', price: 1900, cos: ['wig', 'policecap', 'scales'], d: '법정 가발 · 경찰 모자 · 정의의 저울(전설). 모든 슬롯에 지급' },
  { id: 'cos_angel', name: '코스튬 팩 · 천사와 악마', price: 1900, cos: ['halo', 'angel', 'horns', 'batwing'], d: '천사 링 · 천사 날개 · 악마 뿔 · 박쥐 날개. 모든 슬롯에 지급' },
  { id: 'deluxe', name: '디럭스 에디션', price: 6900, all: true, d: '위 다섯 가지 전부 (따로 사면 ₩10,400)' },
];
const won = (n) => `₩${n.toLocaleString('ko-KR')}`;
// 앱(안드로이드) 뒤로 가기: 창이 열려 있으면 닫고, 게임 중이면 메뉴, 타이틀에서는 앱 종료
function appHooks() {
  const C = window.Capacitor; if (!C || !C.isNativePlatform || !C.isNativePlatform()) return;
  const App = (C.Plugins && C.Plugins.App) || (C.registerPlugin && C.registerPlugin('App')); if (!App) return;
  App.addListener('backButton', () => {
    if ($('#guide').classList.contains('show')) { closeGuide(); return; }
    if (dialog.active) { dialogNext(); return; }
    if (sheetOpen()) { tryCloseSheet(); return; }
    if (player && S.major) { openMenu(); return; }
    App.exitApp();
  });
}
// ---------- 스토어 결제 ----------
// 앱(Capacitor): RevenueCat → 구글 플레이 결제 / StoreKit. 웹(테스트 링크): 결제 없이 바로 지급
// 출시 때 RevenueCat 공개 SDK 키를 넣는다 (docs/12-app-release.md). 키가 비어 있으면 앱에서도 테스트 모드
const RC_KEY = { android: '', ios: '' };
const PRODUCT_ID = { starter: 'starter_pack', ai: 'ai_secretary', slots: 'save_slots', cos_court: 'cos_court', cos_angel: 'cos_angel', deluxe: 'deluxe_edition',
  p1: 'inji_120', p2: 'inji_600', p3: 'inji_1250', p4: 'inji_3900', monthly: 'monthly_office' };
const Billing = {
  rc: null, ready: false, busy: false,
  native() { const C = window.Capacitor; return !!(C && C.isNativePlatform && C.isNativePlatform()); },
  async init() {
    if (!this.native()) return;
    const C = window.Capacitor, key = RC_KEY[C.getPlatform()]; if (!key) return;
    this.rc = (C.Plugins && C.Plugins.Purchases) || (C.registerPlugin && C.registerPlugin('Purchases'));
    try { await this.rc.configure({ apiKey: key }); this.ready = true; } catch (e) { logErr(`결제 초기화 실패: ${e && e.message}`); }
  },
  // 키가 없거나 웹이면 테스트 모드(바로 지급). 앱에서는 처음 결제·구매 복원을 누를 때 결제 서비스에 연결한다 (그 전엔 아무것도 보내지 않음)
  get test() { const C = window.Capacitor; return !this.native() || !RC_KEY[C.getPlatform()]; },
  async ensure() { if (!this.ready) await this.init(); if (!this.ready) toast('결제 서비스에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요'); return this.ready; },
  // 결제가 끝나면 true (취소·실패는 false). 테스트 모드는 바로 true
  async buy(key) {
    if (isChild()) { toast('만 14세 미만은 유료 상품을 살 수 없어요'); return false; }
    if (this.test) return true;
    if (this.busy || !(await this.ensure())) return false;
    this.busy = true;
    try {
      const id = PRODUCT_ID[key]; const r = await this.rc.getProducts({ productIdentifiers: [id], type: 'NON_SUBSCRIPTION' });
      const prod = r && r.products && r.products[0]; if (!prod) { toast('상품 정보를 받지 못했어요. 잠시 뒤 다시 시도해 주세요'); return false; }
      await this.rc.purchaseStoreProduct({ product: prod });
      return true;
    } catch (e) {
      const d = (e && e.data) || {}, code = String((e && e.code) ?? d.code ?? '');   // 플러그인 원래 오류: code '1' = 사용자가 취소
      if (!(e && (e.userCancelled || d.userCancelled || code === '1'))) { toast('결제가 완료되지 않았어요'); logErr(`결제 실패 ${key}: ${(e && e.message) || code}`); }
      return false;
    } finally { this.busy = false; }
  },
  // 스토어에 남은 구매 기록 → 영구 상품 id 목록
  async restore() {
    if (this.test || isChild()) return null;
    if (!(await this.ensure())) throw new Error('결제 서비스 연결 실패');
    const r = await this.rc.restorePurchases(); const tx = (r && r.customerInfo && r.customerInfo.nonSubscriptionTransactions) || [];
    const ids = new Set(tx.map((t) => t.productIdentifier));
    return STORE.filter((p) => ids.has(PRODUCT_ID[p.id])).map((p) => p.id);
  },
};
const childNote = () => (isChild() ? '<p class="note" style="color:var(--stamp)">만 14세 미만(기기 저장 모드)은 유료 상품을 살 수 없어요. 인지는 게임 안에서 모아 쓰세요.</p>' : '');
const testNote = () => (Billing.test ? '<div class="banner-test"><b>테스트 모드</b> · 실제 결제가 일어나지 않습니다. 누르면 바로 지급됩니다.</div>' : '');
const storeVisible = (p) => (p.all ? !STORE.some((x) => !x.all && owns(x.id)) : true);
// 스토어 결제가 끝나면 grantOwned (테스트 모드는 바로)
async function purchase(id) {
  const p = STORE.find((x) => x.id === id); if (!p || owns(id)) return;
  if (!(await Billing.buy(id))) return;
  grantOwned(id); SFX.play('level');
  toast(`<b>${esc(p.name)}</b> 구매 완료${Billing.test ? ' (테스트 · 실제 결제 없음)' : ''}`, 3500);
  if (id === 'starter' || p.all) claimStarter();
  refreshSheet(); save();
}
function grantOwned(id) {
  const a = accLoad(), p = STORE.find((x) => x.id === id); if (!p) return;
  for (const x of p.all ? STORE.filter((q) => !q.all) : [p]) a.owned[x.id] = a.owned[x.id] || now();
  accSave(a); applyOwned();
}
// 영구 구매 코스튬을 지금 슬롯에 넣는다 (슬롯을 불러올 때마다 확인 → 모든 슬롯에 적용)
function applyOwned() {
  for (const p of STORE) if (p.cos && owns(p.id)) for (const c of p.cos) if (!S.inv.some((x) => x.cos === c)) { const it = makeCos(c); S.inv.push(it); if (!S.equip[it.slot]) S.equip[it.slot] = it.uid; }
  statCache = null;
}
// 구매 복원: 앱은 스토어 구매 기록을 받아 grantOwned, 테스트는 이 기기에 남은 기록을 다시 적용
async function restorePurchases() {
  if (!Billing.test) { try { const ids = await Billing.restore(); for (const id of ids || []) grantOwned(id); claimStarter(); } catch (e) { toast('구매 복원에 실패했어요. 잠시 뒤 다시 시도해 주세요'); logErr(`복원 실패: ${e && e.message}`); return; } }
  applyOwned(); const got = STORE.filter((p) => !p.all && owns(p.id)).map((p) => p.name);
  toast(got.length ? `구매 복원: ${got.map(esc).join(' · ')}` : '복원할 구매가 없습니다', 3500); refreshSheet(); save();
}
// 예전 정식판(테스트 기간 구매·인정)은 개업 패키지로 바꿔 준다
function grandfather() {
  const a = accLoad(); if (a.owned.full && !a.owned.starter) { a.owned.starter = a.owned.full; accSave(a); toast('정식판이 없어지고 모두 무료가 됐어요 · 정식판 → 「개업 패키지」로 바꿔 드렸어요', 5000); }
  claimStarter();
}
// 개업 패키지의 인지·뽑기권·계약서는 계정에 한 번, 지금 슬롯에 지급
function claimStarter() {
  const a = accLoad(); if (!a.owned.starter || a.starterClaimed || !S.major) return;
  a.starterClaimed = now(); accSave(a);
  S.inji += STARTER.inji; S.cosTickets = (S.cosTickets || 0) + STARTER.tickets; S.contracts = (S.contracts || 0) + STARTER.contracts;
  showBanner('개업 패키지', `인지 ${STARTER.inji} · 코스튬 뽑기권 ${STARTER.tickets} · 장비 계약서 ${STARTER.contracts} · 영웅 망토`); applyOwned(); save();
}
// 인지 충전 (소모성 유료 재화). 실제 앱에서는 스토어 결제가 확인된 뒤 지급하고, 영수증 검증·클라우드 저장을 붙인다
const INJI_PACKS = [
  { id: 'p1', inji: 120, bonus: 0, price: 1200 },
  { id: 'p2', inji: 600, bonus: 60, price: 5500 },
  { id: 'p3', inji: 1250, bonus: 250, price: 11000 },
  { id: 'p4', inji: 3900, bonus: 1100, price: 33000 },
];
const MONTHLY = { price: 5500, now: 300, daily: 100, days: 30 };
async function buyInji(id) {
  const p = INJI_PACKS.find((x) => x.id === id); if (!p) return;
  if (!(await Billing.buy(id))) return;
  const a = accLoad(); a.packs = a.packs || {}; const first = !a.packs[id];
  const got = (p.inji + p.bonus) * (first ? 2 : 1);   // 상품마다 첫 구매 2배 (계정에 한 번)
  a.packs[id] = (a.packs[id] || 0) + 1; accSave(a);
  S.inji += got; SFX.play('coin'); toast(`인지 ${fmt(got)} 충전${first ? ' · 첫 구매 2배!' : ''}${Billing.test ? ' (테스트)' : ''}`, 3500); refreshSheet(); save();
}
async function buyMonthly() {
  if (!(await Billing.buy('monthly'))) return;
  const a = accLoad(); a.monthlyUntil = Math.max(now(), a.monthlyUntil || 0) + MONTHLY.days * 864e5; a.monthlyDay = new Date().toDateString(); accSave(a);
  S.inji += MONTHLY.now; SFX.play('coin'); toast(`월간 사무지원 · 인지 ${MONTHLY.now} · ${MONTHLY.days}일간 매일 ${MONTHLY.daily}${Billing.test ? ' (테스트)' : ''}`, 4000); refreshSheet(); save();
}
// 월간 사무지원: 하루 한 번, 그날 처음 플레이하는 슬롯에 지급
function monthlyTick() {
  if (!S.major) return; const a = accLoad(); if (!(a.monthlyUntil > now())) return;
  const d = new Date().toDateString(); if (a.monthlyDay === d) return;
  a.monthlyDay = d; accSave(a); S.inji += MONTHLY.daily; toast(`월간 사무지원 · 오늘의 인지 +${MONTHLY.daily}`, 3500); save();
}
function injiCard() {
  const a = accLoad(), packs = a.packs || {}, left = a.monthlyUntil > now() ? Math.ceil((a.monthlyUntil - now()) / 864e5) : 0;
  return `<div class="card" id="inji-shop"><div class="row between"><h3>인지 충전</h3><b style="color:var(--hl)">보유 ${fmt(S.inji)}</b></div>
    <p class="note">뽑기 · 비급 · 이직 신청서 · AI 법률비서 · 경험치 부스터에 써요. 상품마다 <b>첫 구매는 2배</b>.</p>
    <div class="row between"><span><b>월간 사무지원</b> <span class="note" style="color:var(--exp)">가장 이득</span><br><span class="note">즉시 인지 ${MONTHLY.now} + ${MONTHLY.days}일간 매일 ${MONTHLY.daily} (총 ${fmt(MONTHLY.now + MONTHLY.daily * MONTHLY.days)})${left ? ` · <b style="color:var(--exp)">${left}일 남음</b>` : ''}</span></span><button class="btn sm red" data-act="monthly">${won(MONTHLY.price)}</button></div>
    ${INJI_PACKS.map((p) => `<div class="row between"><span><b>인지 ${fmt(p.inji)}</b>${p.bonus ? ` <span class="note">+${fmt(p.bonus)} 보너스</span>` : ''}${packs[p.id] ? '' : ' <span class="note" style="color:var(--stamp)">첫 구매 2배</span>'}</span><button class="btn sm" data-pack="${p.id}">${won(p.price)}</button></div>`).join('')}
    ${childNote()}${testNote()}</div>`;
}
const toCharge = () => setTimeout(() => { const el = $('#inji-shop'); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60);
function storeCard() {
  return `<div class="card"><div class="row between"><h3>영구 구매 · 패키지</h3><button class="btn ghost sm" data-act="restore">구매 복원</button></div>
    <p class="note">한 번 사면 영구. 모든 슬롯에 적용되고, 앱을 지웠다 깔거나 폰을 바꿔도 「구매 복원」으로 돌아옵니다. 인지는 아래 「인지 충전」에서.</p>
    ${STORE.filter(storeVisible).map((p) => `<div class="row between"><span><b>${esc(p.name)}</b>${p.id === 'starter' && !owns('starter') ? ' <span class="note" style="color:var(--stamp)">첫 결제 추천</span>' : ''}<br><span class="note">${esc(p.d)}</span></span>${owns(p.id) ? '<span class="note" style="color:var(--exp);flex:none">보유</span>' : `<button class="btn sm ${p.id === 'full' || p.all ? 'red' : ''}" data-own="${p.id}">${won(p.price)}</button>`}</div>`).join('')}
    ${childNote()}${testNote()}</div>`;
}
function shopTab() {
  const lv = Math.min(10, 1 + Math.floor(S.eqPulls / 30)); const c = Math.max(0, ...Object.keys(S.cleared).map((k) => parseSid(k).c)) || 1;
  const owned = Object.keys(COSMETICS).filter((id) => S.inv.some((x) => x.cos === id)).length;
  const top = !owns('starter');   // 개업 패키지를 안 샀으면 맨 위에
  return `${top ? storeCard() : ''}
  <div class="card"><h3>서초 백화점 · 장비 뽑기 <span class="note">뽑기 Lv.${lv}</span></h3>
    <p>확률 (Lv.${lv}): ${gachaRates(lv).map((r, i) => `<span class="gc${i}">${GRADES[i]} ${r.toFixed(1)}%</span>`).join(' · ')}.</p>
    ${eqOdds(lv)}
    <div class="row wrap"><button class="btn sm" data-gacha="1" ${S.inji >= 60 ? '' : 'disabled'}>1회 · 인지 60</button><button class="btn red sm" data-gacha="11" ${S.inji >= 600 ? '' : 'disabled'}>11회 · 인지 600</button>${S.inji < 600 ? '<button class="btn ghost sm" data-act="tocharge">인지 충전</button>' : ''}${S.contracts ? `<button class="btn ghost sm" data-gacha="c">계약서로 1회 (${S.contracts})</button>` : ''}</div></div>
  <div class="card"><h3>코스튬 뽑기 <span class="note">수집 ${owned}/${Object.keys(COSMETICS).length}</span></h3>
    <div class="cosrow">${Object.entries(COSMETICS).map(([id, cc]) => `<span class="cosic ${S.inv.some((x) => x.cos === id) ? '' : 'no'}" title="${esc(cc.name)}" style="${iconStyle('cos', cc.i)}"></span>`).join('')}</div>
    <p>인지로 뽑는다. 모자·등 장식. 입으면 모습이 바뀌고, <b>모으기만 해도</b> 수집 효과(능력치)가 쌓입니다. 12종 완성 시 세트 효과. 확률: 고급 55% · 희귀 33% · 영웅 10% · 전설 2%. 중복이면 인지 30 환급.</p>${cosOdds()}
    <div class="row wrap"><button class="btn sm" data-cosg="1" ${S.inji >= 120 || S.cosTickets ? '' : 'disabled'}>${S.cosTickets ? `뽑기권 1회 (${S.cosTickets})` : '1회 · 인지 120'}</button><button class="btn red sm" data-cosg="10" ${S.inji >= 1100 ? '' : 'disabled'}>10회 · 인지 1,100</button>${S.inji < 1100 ? '<button class="btn ghost sm" data-act="tocharge">인지 충전</button>' : ''}</div></div>
  ${injiCard()}
  ${scene === 'town' ? `<div class="card"><h3>김밥집 <span class="note">수임료로 구매 · 가방에서 사용</span></h3><div style="display:grid;gap:6px">${Object.entries(CONSUMABLES).map(([id, cc]) => `<div class="citem"><div class="ic" style="${iconStyle('loot', cc.icon)}"></div><div style="min-width:0"><b>${esc(cc.name)}</b> <span class="note">보유 ${S.cons[id] || 0}</span><p>${esc(cc.d)}</p></div><button class="btn sm" data-buyc="${id}" ${S.gold >= cc.price(c) ? '' : 'disabled'}>₩${fmt(cc.price(c))}</button></div>`).join('')}</div></div>` : '<p class="note">김밥집은 마을에서 이용할 수 있습니다.</p>'}
  <div class="card"><h3>성장 상점</h3>
    <div class="row between"><span><b>경험치 부스터</b><br><span class="note">켜면 30분간 경험치 2배 (가방에서 켜기) · 보유 ${S.boosters}</span></span><button class="btn sm" data-act="buyboost" ${S.inji >= 150 ? '' : 'disabled'}>인지 150</button></div>
    <div class="row between"><span><b>비급 · 중급</b><br><span class="note">스킬 배우기 재료</span></span><button class="btn sm" data-bbook="b2" ${S.inji >= 300 ? '' : 'disabled'}>인지 300</button></div>
    <div class="row between"><span><b>비급 · 고급</b><br><span class="note">마지막 스킬 재료</span></span><button class="btn sm" data-bbook="b3" ${S.inji >= 800 ? '' : 'disabled'}>인지 800</button></div>
    <div class="row between"><span><b>스킬 초기화</b><br><span class="note">모든 스킬을 Lv.1로 · 쓴 SP·수임료 전부 환급 (배운 스킬은 그대로)</span></span><button class="btn sm ${skArm ? 'red' : ''}" data-act="skreset" ${S.inji >= 200 ? '' : 'disabled'}>${skArm ? '정말 초기화?' : '인지 200'}</button></div>
    <div class="row between"><span><b>이직 신청서</b><br><span class="note">고정된 2차 직업을 다른 직업으로 · 이력서 칸 +1 · 스킬 초기화(SP·수임료 환급) · 승진 경력 유지</span></span><button class="btn sm" data-act="jobticket" ${S.jobs.some((j) => JOBS[j].tier >= 2) && S.inji >= 800 ? '' : 'disabled'}>인지 800</button></div>
    ${owns('ai') ? '' : `<div class="row between"><span><b>AI 법률비서 (7일)</b><br><span class="note">AUTO 공격력 80% → 100%, 스킬·궁극기 자동 사용${aiOn() ? ` · <b style="color:var(--exp)">${Math.ceil((S.aiUntil - now()) / 864e5)}일 남음</b>` : ''}</span></span><button class="btn sm" data-act="buyai" ${S.inji >= 300 ? '' : 'disabled'}>인지 300</button></div>`}</div>
  ${top ? '' : storeCard()}`;
}
function cosGacha(n) {
  if (n === 1 && S.cosTickets) S.cosTickets--;
  else { const cost = n === 1 ? 120 : 1100; if (S.inji < cost) return; S.inji -= cost; }
  const out = [];
  for (let i = 0; i < n; i++) {
    const r = Math.random() * 100; const g = r < 2 ? 4 : r < 12 ? 3 : r < 45 ? 2 : 1;
    let pool = Object.keys(COSMETICS).filter((id) => COSMETICS[id].grade === g); if (!pool.length) pool = Object.keys(COSMETICS);
    const id = pick(pool); const it = giveCos(id, true); out.push([id, !!it]); S.cosPulls++;
  }
  SFX.play('level');
  openSheet('코스튬 뽑기', [], () => `<div class="grid">${out.map(([id, nw]) => `<div class="slot g${COSMETICS[id].grade}" title="${esc(COSMETICS[id].name)}"><div class="ic" style="${iconStyle('cos', COSMETICS[id].i)}"></div><span class="k">${nw ? 'NEW' : '중복'}</span></div>`).join('')}</div>
    <p>${out.map(([id, nw]) => `<b class="gc${COSMETICS[id].grade}">${esc(COSMETICS[id].name)}</b>${nw ? '' : '(인지 30)'}`).join(' · ')}</p>
    <div class="row wrap"><button class="btn sm" data-act="mall">상점으로</button><button class="btn ghost sm" data-act="tobag">가방에서 끼기</button></div>`);
  showGuide('g_cos'); save();
}
// 확률 공개 (확률형 아이템): 코스튬은 등급 확률 ÷ 그 등급 개수, 장비는 등급 확률 × 종류 균등. 전설은 30%가 지금 직업 전용 전설 무기
const COS_GRADE_P = { 4: 2, 3: 10, 2: 33, 1: 55 };
function cosOdds() {
  const rows = Object.entries(COS_GRADE_P).map(([g, gp]) => { const ids = Object.keys(COSMETICS).filter((id) => COSMETICS[id].grade === +g); return `<tr><td class="gc${g}">${GRADES[g]} ${gp}%</td><td>${ids.map((id) => `${esc(COSMETICS[id].name)} ${(gp / ids.length).toFixed(2)}%`).join(' · ')}</td></tr>`; }).join('');
  return `<details class="odds"><summary>아이템별 확률 보기</summary><table>${rows}</table><p class="note">이미 가진 코스튬이 나오면 인지 30을 돌려받아요. 뽑기권도 같은 확률.</p></details>`;
}
function eqOdds(lv) {
  const r = gachaRates(lv), n = EQ_BASES.length, leg = LEGENDS[S.job];
  const rows = r.map((gp, g) => `<tr><td class="gc${g}">${GRADES[g]} ${gp.toFixed(2)}%</td><td>${g === 4 && leg ? `「${esc(leg.name)}」(지금 직업 전용·피흡) ${(gp * 0.3).toFixed(3)}% · 그 밖의 ${n}종 각 ${(gp * 0.7 / n).toFixed(3)}%` : `${n}종 각 ${(gp / n).toFixed(3)}%`}</td></tr>`).join('');
  return `<details class="odds"><summary>아이템별 확률 보기 (뽑기 Lv.${lv})</summary><table>${rows}</table><p class="note">종류: ${EQ_BASES.map((b) => esc(b.name)).join(' · ')}. 능력치는 등급·레벨에 따른 범위 안에서 무작위. 30회 뽑을 때마다 뽑기 Lv +1(최대 10)이고 확률이 좋아져요. 장비 계약서도 같은 확률.</p></details>`;
}
function gachaRates(lv) { const a = [62, 26, 9.5, 2.3, 0.2], b = [30, 34, 24, 9.5, 2.5]; const t = (lv - 1) / 9; const r = a.map((x, i) => x + (b[i] - x) * t); const s = r.reduce((x, y) => x + y, 0); return r.map((x) => x / s * 100); }
function bookTab() {
  const cell = (x) => `<div class="beast ${x.seen ? '' : 'locked'}"><img src="${x.src}" alt=""><b>${x.seen ? esc(x.name) : '???'}</b><span class="note">${x.seen ? esc(x.desc) : esc(x.hint || '아직 만나지 못했다')}${x.n ? ` · 처치 ${x.n}` : ''}</span></div>`;
  const mobs = Object.entries(MOBS).map(([id, m]) => ({ src: `assets/mob_${id}.png`, name: m.name, desc: m.desc, seen: S.seen[id], n: S.kills[id] || 0 }));
  const bosses = Object.entries(BOSSES).map(([id, b]) => ({ src: `assets/boss_${id}.png`, name: b.name, desc: b.desc, seen: S.seen['boss_' + id] }));
  const jobs = Object.entries(JOBS).map(([id, j]) => ({ src: jobPortrait(id), name: `${j.name} · ${RANGE[j.type].name}`, desc: j.desc, seen: !j.hidden || S.jobs.includes(id), hint: j.hidden ? `히든 직업 · 조건: ${HIDDEN_HINTS[id]}` : '' }));
  const npcs = [['haechi', '해치', '시비선악을 가리는 정의의 수호수. 누군가의 파트너였다는데…', 'assets/npc_haechi.png'], ['prof', '엄정한 교수', '로스쿨 민사법 교수. 엄하지만 정이 많다.', frameURL('atlas_npc', 'npc', 0)], ['kakha', '미결마왕 각하', '모든 억울함을 읽지도 않고 각하하는 마왕. 20년 전 봉인되었다.', 'assets/boss_kakha.png']];
  return `
  <div class="card"><h3>미결마물 <span class="note">${mobs.filter((m) => m.seen).length}/${mobs.length}</span></h3><div class="bestiary">${mobs.map(cell).join('')}</div></div>
  <div class="card"><h3>사건의 원흉</h3><div class="bestiary">${bosses.map(cell).join('')}</div></div>
  <div class="card"><h3>직업 <span class="note">해금 ${S.jobs.length}/${Object.keys(JOBS).length}</span></h3><div class="bestiary">${jobs.map(cell).join('')}</div>
    <p class="note">추가 예정 히든 직업: ${HIDDEN_LOCKED.map((h) => `${h.name}(${h.hint})`).join(' · ')}</p></div>
  <div class="card"><h3>인물</h3><div class="bestiary">${npcs.map(([id, name, desc, src]) => cell({ src, name, desc, seen: id !== 'kakha' || !!S.story.post_3, hint: '???' })).join('')}</div></div>
  <div class="card"><h3>법률 상식 카드 <span class="note">${S.trivia.length}/${Object.keys(TRIVIA).length} · 4장마다 스탯 +1</span></h3>
    <p class="note">게임 속 법률 상식은 재미로 보는 일반적인 정보예요. 실제 사건에 대한 법률 자문이 아니며, 법령은 바뀔 수 있으니 실제 문제는 전문가와 상담하세요.</p>
    <div class="tcards">${Object.entries(TRIVIA).map(([id, c]) => S.trivia.includes(id) ? `<div class="tcard"><b>${esc(c.t)}</b><span>${esc(c.d)}</span><em>${esc(c.law)}</em></div>` : '<div class="tcard no"><b>???</b><span>몬스터 대사·마을 사람·전직에서 얻는다</span></div>').join('')}</div></div>
  <div class="card"><h3>소문 도감 <span class="note">${S.rumors.length}/10 · 정예·중간 보스의 「비밀 쪽지」</span></h3>
    ${RUMORS.map((r, i) => S.rumors.includes(i) ? `<div class="stat"><span><b>#${i + 1}</b> “${esc(r.line)}”<br><span class="note">${esc(r.npc)} · 최종장에서 켜면: ${esc(r.eff)}</span></span><span></span><span></span></div>` : `<div class="stat"><span><b>#${i + 1}</b> ???</span><span></span><span></span></div>`).join('')}</div>`;
}
function optTab() {
  return `<div class="card"><h3>조작</h3><p>키보드: ←→ 이동 · ↑ 점프 (밧줄 앞에서는 오르기) · ↓ 밧줄 내리기·발판에서 내려가기 · 밧줄에 매달려 ←→ 옆으로 뛰어내리기 · Z 공격(누르고 있으면 연속) · X·Space 점프 · 2차 전직부터 공중에서 한 번 더 점프(2단 점프) · 근거리 직업은 3단 점프(방향키를 누르면 그쪽으로 도약 · 밧줄 없이 금고층까지) · A/S/D/C 스킬 · F 궁극기 · Q 김밥 · W 믹스커피 · NPC 앞에서 Z(공격)·E 대화 · Esc 메뉴<br>휴대폰: 아무 데나 누르고 끌면 이동 · 위로 끌면 점프 (밧줄 앞에서는 오르기) · 아래로 끌면 내려가기 · 밧줄에서 옆으로 끌면 뛰어내리기 · 점프 버튼도 같다 · NPC 앞에서 공격 버튼 = 대화</p></div>
  <div class="card"><h3>소리 · 편의</h3>
    <div class="stat"><span><b>배경음악</b><br><span class="note">맵마다 다른 곡. assets/bgm 에 mp3를 넣으면 그 곡으로 바뀝니다.</span></span><span></span><button class="btn sm ${S.music ? '' : 'ghost'}" data-act="tmusic">${S.music ? '켬' : '끔'}</button></div>
    <div class="stat"><span><b>그래픽</b><br><span class="note">렉이 있으면 「낮음」. 「자동」은 렉을 감지해 스스로 낮춰요${GFX === 'auto' ? ` · 지금 ${['높음', '중간', '낮음'][gfxLevel]}` : ''}</span></span><span></span><span class="row" style="gap:3px;flex-wrap:wrap;justify-content:flex-end">${[['auto', '자동'], ['high', '높음'], ['mid', '중간'], ['low', '낮음']].map(([k, n]) => `<button class="btn sm ${GFX === k ? '' : 'ghost'}" data-gfx="${k}">${n}</button>`).join('')}</span></div>
    <div class="stat"><span><b>조작부 높이</b><br><span class="note">공격·점프 버튼이나 화면 아래가 가리면 「높게」. 이 기기에만 적용</span></span><span></span><span class="row" style="gap:3px;flex-wrap:wrap;justify-content:flex-end">${LIFTS.map(([v, n]) => `<button class="btn sm ${ctrlLift === v ? '' : 'ghost'}" data-lift="${v}">${n}</button>`).join('')}</span></div>
    <div class="stat"><span><b>연령 확인</b><br><span class="note">${isChild() ? '만 14세 미만 · 기기 저장 모드 (계정·결제·제보 전송 없음)' : '만 14세 이상'} · 이 기기에만 저장</span></span><span></span><button class="btn ghost sm" data-act="age">바꾸기</button></div>
    <div class="stat"><span><b>효과음</b></span><span></span><button class="btn sm ${S.sound ? '' : 'ghost'}" data-act="tsound">${S.sound ? '켬' : '끔'}</button></div>
    <div class="stat"><span><b>일반 장비 자동 판매</b><br><span class="note">끼고 있는 것보다 약한 일반 등급은 줍자마자 판매</span></span><span></span><button class="btn sm ${S.autoSell ? '' : 'ghost'}" data-act="tsell">${S.autoSell ? '켬' : '끔'}</button></div></div>
  <div class="card hot"><h3>버그 제보 <span class="note">테스트 v${GAME_VERSION}</span></h3>
    <p class="note">어디서 무엇을 하다가 어떤 문제가 생겼는지 적어 주세요. 기기·진행 상황·최근 오류가 자동으로 붙습니다. 화면 캡처도 같이 보내 주시면 큰 도움이 돼요.</p>
    <textarea id="bug-text" rows="3" placeholder="예: 3-2에서 줄을 타다가 캐릭터가 벽에 끼었어요"></textarea>
    ${isChild() ? '<p class="note">만 14세 미만은 보호자에게 부탁해 보호자의 메일로 보내 주세요.</p>' : '<label class="note" style="display:flex;gap:6px;align-items:flex-start"><input type="checkbox" id="bug-ok" style="margin-top:3px"><span>(선택) 적은 내용과 함께 앱 버전·기기·화면 정보·진행 상황·최근 오류 기록을 운영자에게 보내는 데 동의합니다. 문제 확인에만 쓰고 처리가 끝나면 지웁니다. 동의하지 않아도 게임은 그대로 할 수 있어요.</span></label>'}
    <div class="row wrap">${isChild() ? '' : '<button class="btn sm" data-act="bugsend">제보 보내기 (카톡·메일)</button>'}<button class="btn ghost sm" data-act="savefile">세이브 파일 저장</button>${isKakao() ? '<button class="btn sm" data-act="openext">크롬·사파리로 옮기기</button>' : ''}<label class="btn ghost sm">세이브 불러오기<input type="file" accept=".json,application/json" id="save-in" hidden></label></div></div>
  <div class="card"><h3>프로토타입 정보</h3><p>v${GAME_VERSION}. 아트는 Higgsfield(GPT Image 2.5) 프레임 시트. 음악은 코드로 만든 칩튠. 저장은 이 브라우저에만 됩니다.</p>
  <div class="row wrap"><button class="btn ghost sm" data-act="totitle">타이틀로</button><button class="btn red sm" data-act="reset">이 슬롯 지우기</button></div></div>
  <div class="card"><h3>계정·데이터 삭제</h3><p class="note">이 기기의 모든 슬롯·엔딩 도감·구매 기록·설정을 지웁니다. 되돌릴 수 없어요. 영구 상품은 같은 스토어 계정으로 「구매 복원」하면 다시 받을 수 있지만, 진행과 인지 잔액은 복구되지 않습니다. <a href="${PRIVACY_URL}#delete" target="_blank" rel="noopener" style="color:var(--hl)">개인정보 처리방침</a> 제9조.</p>
    <button class="btn red sm" data-act="wipe">${wipeArm ? '정말 모두 삭제 (되돌릴 수 없음)' : '계정·데이터 삭제'}</button></div>`;
}
// 테스트용: 오류 기록 · 버그 제보 · 세이브 파일 주고받기
const ERRLOG = [];
function logErr(msg) { ERRLOG.push(`${new Date().toLocaleTimeString('ko-KR')} ${msg}`); if (ERRLOG.length > 15) ERRLOG.shift(); }
window.addEventListener('error', (e) => logErr(`${e.message} @${String(e.filename || '').split('/').pop()}:${e.lineno}:${e.colno}`));
window.addEventListener('unhandledrejection', (e) => logErr(`promise: ${e.reason && (e.reason.message || e.reason)}`));
function bugReport(desc) {
  const app = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  return [`[법조인 키우기 버그 제보] v${GAME_VERSION}`, `시간: ${new Date().toLocaleString('ko-KR')}`, `기기: ${window.navigator.userAgent}`,
    `화면: ${window.innerWidth}×${window.innerHeight} · DPR ${window.devicePixelRatio} · ${app ? '앱(홈 화면)' : '브라우저'} · 그래픽 ${GFX}/${['높음', '중간', '낮음'][gfxLevel]}`,
    `진행: 슬롯 ${SLOT} · ${jobName()} Lv.${S.lv} · 사건 ${Object.keys(S.cleared || {}).length}/25${S.ng ? ` · 재심 ${S.ng}회차` : ''} · 지금 ${scene}${W && W.id ? ` ${W.id}` : ''}${W && W.tier ? ` (${TIERS[W.tier].name})` : ''}`,
    `내용: ${desc || '(적지 않음)'}`, `최근 오류: ${ERRLOG.length ? `\n${ERRLOG.join('\n')}` : '없음'}`].join('\n');
}
// 휴대폰은 공유 창(카톡·메일 고르기), 안 되면 복사
async function sendText(text, title) {
  try { if (window.navigator.share) { await window.navigator.share({ title, text }); return 'shared'; } } catch (e) { if (e && e.name === 'AbortError') return 'cancel'; }
  try { await window.navigator.clipboard.writeText(text); return 'copied'; } catch (e) { /* 아래 방법으로 */ }
  const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { /* 무시 */ }
  ta.remove(); return ok ? 'copied' : 'fail';
}
function exportSave() {
  save(); const blob = new window.Blob([JSON.stringify(S)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = window.URL.createObjectURL(blob); a.download = `lawyer-game-slot${SLOT}-lv${S.lv}.json`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => window.URL.revokeObjectURL(a.href), 4000);
  toast('세이브 파일을 저장했어요. 버그 제보와 함께 보내 주세요', 4000);
}
function importSave(file) {
  const r = new window.FileReader();
  r.onload = () => {
    try { const d = JSON.parse(r.result); if (!d || d.v !== 5 || !d.major) throw new Error('형식'); localStorage.setItem(slotKey(SLOT), JSON.stringify(d)); }
    catch (e) { toast('세이브 파일이 아니에요'); return; }
    load(SLOT); ensureLoadout(); checkPassives(); fixJobQuests(); applyOwned(); closeSheet(); enterTown(); toast(`슬롯 ${SLOT}에 세이브 파일을 불러왔어요`);
  };
  r.readAsText(file);
}
// 카카오톡 같은 앱 안 브라우저: 「홈 화면에 추가」가 안 되고 화면도 좁으며 저장도 크롬·사파리와 따로 논다
// → 크롬·사파리로 열면서 세이브(슬롯 전부 + 엔딩·구매)를 주소 뒤(#mig=)에 압축해 실어 보낸다
const UA = window.navigator.userAgent;
const isKakao = () => /KAKAOTALK/i.test(UA);
const inApp = () => isKakao() || /NAVER\(inapp|Instagram|FBAN|FBAV|; wv\)|Line\//i.test(UA);
const b64u = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return window.btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64u = (s) => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const bin = window.atob(s), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return u8; };
async function packSaves() {
  const d = { v: 1, slots: {}, acc: accLoad() };
  for (let n = 1; n <= 6; n++) { const raw = localStorage.getItem(slotKey(n)); if (raw) d.slots[n] = raw; }
  const bytes = new window.TextEncoder().encode(JSON.stringify(d));
  if (!window.CompressionStream) return 'j' + b64u(bytes);
  const zs = new window.Blob([bytes]).stream().pipeThrough(new window.CompressionStream('gzip'));
  return 'z' + b64u(new Uint8Array(await new window.Response(zs).arrayBuffer()));
}
function openExternal() {
  save();
  packSaves().catch(() => '').then((code) => {
    const base = window.location.href.split('#')[0], url = code && code.length < 100000 ? `${base}#mig=${code}` : base;
    if (isKakao()) window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
    else toast('오른쪽 위 메뉴(⋮)에서 「다른 브라우저로 열기」를 눌러 주세요', 5000);
  });
}
async function importMigration(code) {
  try {
    const bytes = unb64u(code.slice(1));
    const json = code[0] === 'z' ? await new window.Response(new window.Blob([bytes]).stream().pipeThrough(new window.DecompressionStream('gzip'))).text() : new window.TextDecoder().decode(bytes);
    const d = JSON.parse(json), a = accLoad(), b = d.acc || {};
    for (const [k, v] of Object.entries(b.endings || {})) a.endings[k] = a.endings[k] || v;
    for (const [k, v] of Object.entries(b.owned || {})) a.owned[k] = a.owned[k] || v;
    if (b.extraSlots) a.extraSlots = Math.max(a.extraSlots || 0, b.extraSlots);
    accSave(a);
    let moved = 0, left = 0;
    for (const [n, raw] of Object.entries(d.slots || {})) {
      let k = +n; if (localStorage.getItem(slotKey(k))) { k = 0; for (let m = 1; m <= slotCount(); m++) if (!localStorage.getItem(slotKey(m))) { k = m; break; } }
      if (k) { localStorage.setItem(slotKey(k), raw); moved++; } else left++;
    }
    toast(moved ? `카카오톡에서 하던 세이브 ${moved}개를 옮겼어요${left ? ` · 빈 슬롯이 없어 ${left}개는 못 옮김` : ''}` : '옮길 세이브가 없어요', 5000);
  } catch (e) { toast('세이브를 옮기지 못했어요. 설정 → 「세이브 파일 저장」으로 옮겨 주세요', 5000); }
  try { window.history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) { /* 무시 */ }
}
const inAppNote = () => (isKakao() ? '<div class="inapp-note">카카오톡 안에서 열려 있어요. 화면이 좁고 「홈 화면에 추가」가 안 되며, 저장도 크롬·사파리와 따로예요.<br><button class="btn sm" id="t-ext">크롬·사파리로 열기 (세이브도 같이)</button></div>'
  : inApp() ? '<div class="inapp-note">앱 안 브라우저에서 열려 있어요. 오른쪽 위 메뉴(⋮)에서 「다른 브라우저로 열기」를 눌러 주세요. 세이브는 설정 → 「세이브 파일 저장」으로 옮길 수 있어요.</div>' : '');
// 특별 사건 · 미결마왕 각하: 김성호(5-5)를 넘으면 사건 게시판 5장에 열린다. 1심 → 항소심 → 상고심 차례로
function kakhaCard() {
  const open = !!S.cleared['5-5'], won = S.kakha || {};
  if (!open) return '<div class="card locked"><h3>특별 사건 · ???</h3><p class="note">50층의 김성호를 넘으면, 그가 20년 동안 막아 온 것이 모습을 드러낸다.</p></div>';
  const btn = (t, name, cls) => `<button class="btn sm ${cls}" data-kakha="${t}">${name}${won[t] ? ' ✓' : ''}</button>`;
  return `<div class="card hot"><div class="row between"><h3>특별 사건 · 미결마왕 각하</h3><span class="note">권장 Lv.${REC[24] + 4}+</span></div>
    <p class="note">읽지 않고 각하하는 미결의 마왕. 도장 낙하 · 붉은 종이 폭풍 · 졸병 소환 · 낙인 충격파 · 순간이동. 처음 이기면 인지 ${[300, 600, 1000].join('/')} · 칭호 · 이야기, 경험치·수임료 2배, 전설 무기 확률 25%.</p>
    <div class="row wrap">${btn(0, '1심', 'red')}${won[0] ? btn(1, '항소심', 'red') : '<span class="note">1심을 이기면 항소심</span>'}${won[1] ? btn(2, '상고심', 'supreme') : ''}</div></div>`;
}
const kakhaChapter = () => ({ ...CHAPTERS[4], boss: 'kakha', stages: CHAPTERS[4].stages.map((n, i) => (i === 4 ? '미결마왕 각하' : n)) });
function enterKakha(tier = 0) {
  enterStage(5, 5, tier); if (!W || W.c !== 5) return;
  W.kakha = true; W.id = 'kakha'; W.ch = kakhaChapter();
  later(0.6, () => showBanner('특별 사건', `미결마왕 각하${tier ? ` · ${TIERS[tier].name}` : ''}`));
}
function kakhaClear() {
  if (W.cleared) return; W.cleared = true; W.ended = true; $('#bossbar').hidden = true;
  for (const k of W.pickups) { k.done = true; collect(k); } W.pickups = [];
  const tier = W.tier || 0; S.kakha = S.kakha || {}; const first = !S.kakha[tier]; S.kakha[tier] = (S.kakha[tier] || 0) + 1;
  const bonus = first ? [300, 600, 1000][tier] : 30; S.inji += bonus;
  const title = ['각하를 각하한 자', '항소 기각의 기각', '미결 제로'][tier]; if (first && !S.titles.includes(title)) S.titles.push(title);
  const w0 = W, finish = () => { if (W === w0 && W.loot) stageResults(first, bonus, 3); };
  if (first && tier === 0) startDialog(kakhaEpilogue(), finish); else finish();
  save();
}
function kakhaEpilogue() {
  return [
    ['미결마왕 각하', 'kakha', '크윽… 읽지도 않고… 각하했는데… 어째서…'],
    ['나', 'hero', '기록은 끝까지 읽는 거야. 그게 변호사야.'],
    ['sys', null, '붉은 종이 폭풍이 잦아들고, 각하가 한 장의 도장 자국으로 줄어든다.'],
    ['김성호 변호사', 'kim', '…잘했어요. 20년 걸린 일을 당신이 끝냈네요.'],
    ...(S.kimTruth ? [['김성호 변호사', 'kim', '이제 각하를 데리고 저 아래로 돌아가야 해요. 거기도 미결 사건이 산더미거든요.'], ['김성호 변호사', 'kim', '…혹시 일손이 필요하면, 그쪽 사건도 맡아 줄래요?']]
      : [['김성호 변호사', 'kim', '내 소문이요? 하하… 소문을 전부 모아서 다시 50층에 와 봐요. 그때 다 말해 줄게요.']]),
    ['해치', 'haechi', '각하는 봉인했지만… 저 아래 「지옥 법정」에 미결 사건이 쌓이고 있대.'],
    ['sys', null, '[2부 예고] 지옥 법정 — 억울한 망자들의 재심이 시작된다.'],
  ];
}
// 직업 변경 (해치)
let dropArm = false, ngArm = false, skArm = false, wipeArm = false;
function jobSheet() {
  dropArm = false; ngArm = false;
  openSheet('진로 상담', [], () => {
    const t2 = S.jobs.filter((j) => JOBS[j].tier >= 2);
    const canDrop = S.job === 'lawschool' && !S.dropout && !t2.length;
    const pool = (S.dropout ? ROUTE_JOBS : TIER2).filter((id) => id !== S.job);
    const path = S.jobs.map((id) => `<span class="${id === S.job ? 'gc4' : ''}">${esc(jobName(id))}</span>`).join(' → ');
    return `<div class="card"><h3>지금까지의 길</h3><p>${path}</p><p class="note">직업은 앞으로만 나아갑니다. 한 번 고른 2차 직업은 바꿀 수 없고, 예전 직업으로 돌아갈 수도 없어요(유료 이직 제외). 예전 직업의 패시브는 이력서에 꽂아 쓸 수 있습니다.</p></div>
    ${t2.length ? `<div class="card"><h3>이직 신청서 <span class="note">인지 800</span></h3><p class="note">다른 ${S.dropout ? '중퇴 루트' : '2차'} 직업으로 옮깁니다. 직업이 하나 늘 때마다 이력서 칸 +1.<br><b>패시브만 가져갑니다.</b> 떠나는 직업의 스킬은 반납하고 모든 스킬이 Lv.1로 초기화되며, 쓴 SP·수임료·비급은 전부 돌려받아요. 승진(3차)했거나 히든 직업이었다면 새 직업도 승진 상태(3차)로 시작합니다.</p>
      <div class="choices">${pool.map((id) => `<button class="choice" data-transfer="${id}" ${S.inji >= 800 ? '' : 'disabled'}><img src="${jobPortrait(id)}" alt=""><span><span class="t">${esc(jobName(id))}</span>${S.jobs.includes(id) ? ' <span class="note">(경력 있음)</span>' : ''}<br><span class="d">${esc(JOBS[id].desc)}</span></span></button>`).join('')}</div></div>` : ''}
    ${canDrop ? `<div class="card"><h3>로스쿨 자퇴</h3><p class="note">되돌릴 수 없습니다. 재입학 불가. 대신 리걸테크 CEO · 정치 신인 · 법률 유튜버의 길이 열립니다.</p>${dropArm ? '<button class="btn red sm" data-act="dropout2">정말 자퇴 (되돌릴 수 없음)</button>' : '<button class="btn red sm" data-act="dropout">자퇴서 제출</button>'}</div>` : ''}
    ${S.dropout ? '' : `<div class="card"><h3>히든 직업</h3>${HIDDEN_JOBS.filter((h) => !S.jobs.includes(h)).map((h) => `<div class="choice" style="opacity:.6"><img src="${jobPortrait(h)}" alt="" style="filter:brightness(0) opacity(.6)"><span><span class="t">???</span><br><span class="d">${esc(HIDDEN_HINTS[h])}</span></span></div>`).join('') || '<p>모두 해금!</p>'}</div>`}
    ${canRetrial() ? `<div class="card hot"><h3>재심 청구 <span class="note">${(S.ng || 0) + 1}회차로</span></h3><p class="note">이 슬롯에서 대학생부터 다시 시작합니다. 진로와 사건 진행만 처음부터, 다른 진로를 골라 다른 엔딩을 볼 수 있어요.</p>
      <p><b>재심 특전</b></p><p class="note">· <b style="color:var(--hl)">이력서 칸 +1</b> (회차마다, 최대 ${resumeCap()} → ${Math.min(10, resumeCap() + 1)}칸)<br>· 지난 2차 이상 직업은 이력서 경력으로 남아 칸이 하나 더 늘고, 그 직업 패시브도 꽂을 수 있어요<br>· 레벨·장비·스탯·법률 상식·동료·코스튬·인지·수임료·칭호·소문 그대로<br>· 스킬은 초기화, 쓴 SP·수임료 전부 환급 (새 진로에 다시 찍기)<br>· 보상 +50% (회차마다) · 대신 몬스터 Lv.+6 · 체력 +80% · 공격 +40%</p>${ngArm ? '<button class="btn red sm" data-act="retrial2">정말 재심 청구 (진로·사건 초기화)</button>' : '<button class="btn sm" data-act="retrial">재심 청구</button>'}</div>` : `<div class="card locked"><h3>재심 청구 <span class="note">잠김</span></h3><p class="note">${S.ng ? `${S.ng}회차 진행 중 · ` : ''}이번 회차에 김성호(5장 5단계)를 넘으면 열려요. 특전: 이력서 칸 +1 · 보상 +50% · 다른 진로로 다른 엔딩.</p></div>`}`;
  }, null, 'jobs');
}

// 사건 게시판
let boardCh = 0;
function openBoard() {
  ensureDaily();
  const open = CHAPTERS.map((c, i) => stageOpen(i + 1, 1));
  boardCh = Math.max(0, open.lastIndexOf(true));
  openSheet('사건 게시판', CHAPTERS.map((c, i) => [String(i), `${i + 1}장`]), boardRender, String(boardCh), 'board');
}
function boardRender(tab) {
  const ci = +tab; const ch = CHAPTERS[ci]; const c = ci + 1;
  const chOpen = stageOpen(c, 1);
  const bossDone = !!S.cleared[sid(c, 5)];
  const drops = QUESTS.filter((q) => qState(q.id) === 'active' && q.drops && q.drops.some((d) => d.ch.includes(c))).map((q) => q.goals.filter((g) => g.k === 'item').map((g) => QITEMS[g.it].name)).flat();
  const daily = S.daily.list.filter((d) => d.prog >= d.n && !d.claimed);
  const survOk = qDone('m4');
  return `
  <div class="card ${survOk ? '' : 'locked'}"><div class="row between"><h3>로스쿨 서바이벌</h3><span class="note">최고 ${S.best.surv}웨이브</span></div><p class="note">끝없이 몰려오는 시험 마물을 버텨라. 웨이브마다 한 단계씩 강해지고 5웨이브마다 시험 감독관(정예). 처치 보상은 30%, 탈락 보상은 웨이브에 비례.</p>${survOk ? '<button class="btn red sm" data-act="surv">도전</button>' : '<span class="note">2장 「도서관의 그림자」 완료 후 열림</span>'}</div>
  ${daily.length ? `<div class="card"><h3>오늘의 의뢰 완료</h3>${daily.map((d) => `<div class="row between"><span>${esc(MOBS[d.m].name)} ${d.n}마리</span><button class="btn sm" data-daily="${d.id}">보상 ₩${fmt(d.gold)} · 인지 ${d.inji}</button></div>`).join('')}</div>` : ''}
  <div class="card"><div class="row between"><h3>${esc(ch.name)}</h3><span class="note">${esc(ch.place)} · ${TYPE_LABEL[ch.type]}</span></div>
    ${c === 5 ? kakhaCard() : ''}
    ${!chOpen && c > 1 && !chapterReqOk(c) && S.cleared[sid(c - 1, 5)] ? `<p style="color:var(--hp)">${esc(ch.req.why)}</p>` : ''}
    ${drops.length ? `<p>이 장에서 모을 수 있는 퀘스트 아이템: <b style="color:var(--exp)">${drops.map(esc).join(', ')}</b></p>` : ''}
    <div class="stages">${ch.stages.map((name, si) => {
      const s = si + 1, id = sid(c, s), g = (c - 1) * 5 + si, op = stageOpen(c, s), cl = S.cleared[id];
      const plan = STAGE_PLAN[si]; const tag = plan.boss ? `원흉 · ${BOSSES[ch.boss].name}` : plan.mid ? `중간 보스 · ${ch.midName}` : `구역 ${plan.zones}`;
      const lvCls = S.lv >= REC[g] ? '' : S.lv >= REC[g] - 2 ? 'warn' : 'danger';
      return `<div class="stage ${op ? '' : 'locked'} ${plan.boss ? 'boss' : plan.mid ? 'mid' : ''}"><div class="sn">${c}-${s}</div><div style="min-width:0"><b>${esc(name)}</b> <span class="stars">${'★'.repeat(cl ? cl.stars : 0)}${'☆'.repeat(3 - (cl ? cl.stars : 0))}</span><br><span class="note">${tag} · <span class="${lvCls}">권장 Lv.${REC[g]}</span>${S.supreme[id] ? ' · 대법원 확정' : S.hard[id] ? ' · 항소심 승소 → 상고 가능' : ''}</span></div>
        <div class="row" style="gap:4px;flex:none">${op ? `<button class="btn sm" data-stage="${id}">입장</button>${bossDone ? `<button class="btn red sm" data-stage="${id}" data-hard="1">항소</button>` : ''}${S.hard[id] ? `<button class="btn sm supreme" data-stage="${id}" data-hard="2">상고</button>` : ''}` : '<span class="note">잠김</span>'}</div></div>`;
    }).join('')}</div>
    <p class="note">★ 해결 · ★ 피격 6회 이하 · ★ 제한 시간 안에 해결. 새 별마다 인지 20. ${S.ng ? `<b style="color:#c48cff">재심 ${S.ng}회차</b> · 몬스터 체력 ×${(1 + 0.8 * S.ng).toFixed(1)} · 공격 ×${(1 + 0.4 * S.ng).toFixed(1)} · 보상 ×${(1 + 0.5 * S.ng).toFixed(1)}<br>` : ''}5단계를 해결하면 항소심(권장 +8레벨·보상 2배), 항소심에서 이긴 단계는 상고심(대법원 · 권장 +18레벨 · 보상 4.5배 · 최고 등급 장비)이 열립니다.</p></div>`;
}
function survivalResults() {
  const wv = W.wave || 0; const inji = wv * 4 + Math.max(0, wv - 10) * 6; const gold = Math.round(SCALE.gold(Math.min(30, wv)) * wv * 6);
  S.inji += inji; S.gold += gold; save();
  openSheet('로스쿨 서바이벌 · 탈락', [], () => `<div class="card"><h3>${wv}웨이브 생존</h3><p>최고 기록 <b style="color:var(--hl)">${S.best.surv}웨이브</b> · 처치 ${W.kills}</p><p>보상: 인지 ${inji} · ₩${fmt(gold)}</p>
    <div class="row wrap"><button class="btn red" data-act="surv">다시 도전</button><button class="btn ghost" data-act="town">마을로</button></div></div>`, null, 'results');
}
function stageResults(first, bonus, stars) {
  const L = W.loot; const c = W.c, s = W.s;
  const nextId = s < 5 ? sid(c, s + 1) : c < 5 ? sid(c + 1, 1) : null;
  const nextOpen = nextId && stageOpen(parseSid(nextId).c, parseSid(nextId).s);
  const ready = QUESTS.filter(questReady);
  const mm = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  openSheet('사건 종결', [], () => `
    <div class="card"><div class="row between"><h3>${c}-${s} ${esc(W.ch.stages[s - 1])} ${W.tier ? `· ${TIERS[W.tier].name}` : ''}</h3><span class="stars big">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span></div>
      <div class="goal ok">★ 사건 해결</div><div class="goal ${W.hits <= 6 ? 'ok' : ''}">${W.hits <= 6 ? '★' : '☆'} 피격 6회 이하 (${W.hits}회)</div><div class="goal ${W.t <= W.par ? 'ok' : ''}">${W.t <= W.par ? '★' : '☆'} ${mm(W.par)} 안에 해결 (${mm(W.t)})</div>
      <table class="tbl"><tr><td>처치</td><td>${W.kills}</td></tr><tr><td>수임료</td><td>₩${fmt(L.gold)}</td></tr><tr><td>경험치</td><td>${fmt(L.exp)}${L.boost ? ` <span class="note" style="color:var(--exp)">(부스터 2배 +${fmt(L.boost)})</span>` : ''}</td></tr>${bonus ? `<tr><td>${first ? '첫 해결·별 보상' : '별 보상'}</td><td>인지 ${bonus}</td></tr>` : ''}
      ${Object.entries(L.books).map(([b, n]) => `<tr><td>${BOOKS[b].name}</td><td>×${n}</td></tr>`).join('')}${Object.entries(L.qitems).map(([it, n]) => `<tr><td>${esc(QITEMS[it].name)}</td><td>×${n}</td></tr>`).join('')}</table>
      ${L.items.length ? `<div class="grid">${L.items.map((it) => `<div class="slot g${it.grade}" title="${esc(it.name)}"><div class="ic" style="${itemIcon(it)}"></div></div>`).join('')}</div>` : '<p>장비 드랍 없음</p>'}
    </div>
    ${ready.length ? `<div class="card"><h3>보고할 퀘스트</h3>${ready.map((q) => `<p>✔ <b>${esc(q.title)}</b> · 마을의 ${esc(NPCS[q.giver].name)}</p>`).join('')}</div>` : ''}
    <div class="row wrap">${nextOpen && !W.hard ? `<button class="btn" data-stage="${nextId}">다음 단계 ▶ ${nextId}</button>` : ''}<button class="btn ${nextOpen && !W.hard ? 'ghost' : ''}" data-act="town">마을로</button><button class="btn ghost" data-act="retry">다시 하기 (파밍)</button></div>`, null, 'results');
}
function kimPrep() {
  const known = S.rumors.slice().sort((a, b) => a - b);
  const renderK = () => `
    <div class="card"><div class="row" style="gap:10px"><img src="assets/boss_kim.png" alt="" style="width:70px;height:90px;object-fit:contain"><p>문 너머에 김성호 변호사가 있다. 소문이 무성하다. <b>믿는 소문만큼 싸움이 소문처럼 변한다.</b> 소문을 켤수록 어렵고, 보상이 커진다.</p></div></div>
    ${(() => { const n = S.rumorOn.filter((i) => S.rumors.includes(i)).length; return `<div class="card"><p class="note">켠 소문 하나마다 <b>보스 체력 +10% · 경험치·수임료 +10% · 인지 +20</b>.<br>${[[3, '3개: 김성호가 소문에 반응한다'], [6, '6개: 마지막 페이즈에 「뿔 그림자」가 드러난다'], [RUMORS.length, `${RUMORS.length}개 전부: 이기면 「소문의 진실」 · 칭호 · 악마 뿔`]].map(([k, t]) => `<span style="color:${n >= k ? 'var(--exp)' : 'var(--mute)'}">${n >= k ? '✔' : '·'} ${t}</span>`).join('<br>')}</p></div>`; })()}
    <div class="card"><h3>소문 레벨 ${S.rumorOn.filter((i) => S.rumors.includes(i)).length}</h3>${known.length ? known.map((i) => `<label class="stat" style="cursor:pointer"><span>“${esc(RUMORS[i].line)}”<br><span class="note">${esc(RUMORS[i].eff)}</span></span><span></span><input type="checkbox" data-rum="${i}" ${S.rumorOn.includes(i) ? 'checked' : ''}></label>`).join('') : '<p>모은 소문이 없다. 정예·중간 보스의 「비밀 쪽지」를 모으면 켤 수 있다.</p>'}</div>
    <button class="btn" data-act="kimgo">50층 대표변호사실로</button>`;
  openSheet('김성호 법률사무소 · 50층', [], renderK, null, 'kim');
}

// ---------- 시트 이벤트 ----------
function onSheetClick(ev) {
  const t = ev.target.closest('button, [data-item], [data-use], [data-buyc], input'); if (!t) return;
  if (t.disabled) return;
  const d = t.dataset;
  const keys = Object.keys(d); if (keys.length && !d.tab) sheetAnchor = { sel: keys.map((k) => `[data-${k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}="${String(d[k]).replace(/["\\]/g, '\\$&')}"]`).join(''), top: t.getBoundingClientRect().top, t: now() };
  if (d.tab) { sheetTab = d.tab; document.querySelectorAll('#sh-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === d.tab)); selItem = null; $('#sh-body').scrollTop = 0; refreshSheet(); return; }
  if (d.law) { const n = Math.min(+d.n, S.pts); S.law[d.law] += n; S.pts -= n; statCache = null; updateBadges(); refreshSheet(); return; }
  if (d.item !== undefined && d.item !== '') { selItem = +d.item; refreshSheet(); return; }
  if (d.wear) { const c = COSMETICS[d.wear], it = S.inv.find((x) => x.cos === d.wear); if (!it) return; S.equip[c.slot] = S.equip[c.slot] === it.uid ? null : it.uid; refreshSheet(); save(); return; }
  if (d.use) { if (player) useCons(d.use); refreshSheet(); return; }
  if (d.buyc) { const c = CONSUMABLES[d.buyc]; const ci = Math.max(0, ...Object.keys(S.cleared).map((k) => parseSid(k).c)) || 1; const pr = c.price(ci); if (S.gold < pr) { toast('수임료가 부족합니다'); return; } S.gold -= pr; S.cons[d.buyc] = (S.cons[d.buyc] || 0) + 1; SFX.play('coin'); refreshSheet(); return; }
  if (d.gacha) { gacha(d.gacha); return; }
  if (d.cosg) { cosGacha(+d.cosg); return; }
  if (d.route) { const id = d.route; closeSheet(); addJob(id); changeJob(id); const rq = { ceo: 'r_ceo', politician: 'r_pol', youtuber: 'r_yt' }[id]; if (rq && questAvail(QMAP[rq])) acceptQuest(QMAP[rq], true); refreshQuestUI(); save(); return; }
  if (d.transfer) { const id = d.transfer; if (S.inji < 800) return; S.inji -= 800; closeSheet(); const r = transferJob(id); toast(`이직 완료: ${esc(jobName(id))} · 이력서 칸 ${resumeSlots()}${r.sp ? ` · 스킬 초기화 SP ${r.sp} · ₩${fmt(r.gold)} 환급` : ''}`, 4500); save(); return; }
  if (d.pslot !== undefined) { pickSlot = +d.pslot; refreshSheet(); return; }
  if (d.equipsk) { const id = d.equipsk, i = pickSlot; if (i >= skillSlots()) return; const was = S.loadout.indexOf(id); if (was >= 0) S.loadout[was] = S.loadout[i] || null; S.loadout[i] = id; pickSlot = Math.min(skillSlots() - 1, i + 1); SFX.play('coin'); updateBadges(); refreshSheet(); return; }
  if (d.res) { if (S.resume.length < resumeSlots() && !S.resume.includes(d.res)) { S.resume.push(d.res); statCache = null; SFX.play('coin'); } updateBadges(); refreshSheet(); return; }
  if (d.unres) { S.resume = S.resume.filter((x) => x !== d.unres); statCache = null; updateBadges(); refreshSheet(); return; }
  if (d.own) { purchase(d.own); return; }
  if (d.pack) { buyInji(d.pack); return; }
  if (d.kakha !== undefined) { closeSheet(); enterKakha(+d.kakha); return; }
  if (d.gfx) { setGfx(d.gfx); refreshSheet(); return; }
  if (d.lift !== undefined) { ctrlLift = +d.lift; try { localStorage.setItem(LIFT_KEY, ctrlLift); } catch (e) { /* 무시 */ } layout(); refreshSheet(); return; }
  if (d.bbook) { const cost = d.bbook === 'b2' ? 300 : 800; if (S.inji < cost) return; S.inji -= cost; S.books[d.bbook]++; toast(`${BOOKS[d.bbook].name} 구매`); SFX.play('coin'); refreshSheet(); return; }
  if (d.stage) { const { c, s } = parseSid(d.stage); closeSheet(); enterStage(c, s, +d.hard || 0); return; }
  if (d.job) { closeSheet(); changeJob(d.job); return; }
  if (d.acc) { const q = QMAP[d.acc]; closeSheet(); acceptQuest(q); return; }
  if (d.learn) { const sk = SKILLS[d.learn], L = sk.learn; if (S.lv < L.lv || !S.books[L.book] || S.gold < L.gold) return; S.books[L.book]--; S.gold -= L.gold; S.skl[d.learn] = 1; ensureLoadout(); SFX.play('level'); showBanner('스킬 습득', sk.name); updateBadges(); refreshSheet(); return; }
  if (d.skup) { const c = skillUpCost(d.skup); if (S.sp < c.sp || S.gold < c.gold || skillLv(d.skup) >= skillCap(d.skup)) return; S.sp -= c.sp; S.gold -= c.gold; S.skl[d.skup]++; { const L = S.skl[d.skup], ev = SKILL_EVO[d.skup] || [], nm = SKILLS[d.skup].name; if (L === 5) showBanner('스킬 강화!', `${nm} · ${ev[0] || ''}`); else if (L === 7) showBanner('스킬 각성!', `${nm} · 새 기능: ${ev[1] || ''}`); else if (L === 10) showBanner('스킬 마스터!', `${nm} · 재사용·커피 −20%`); } checkPassives(); SFX.play('level'); updateBadges(); refreshSheet(); return; }
  if (d.party) { const id = d.party; if (S.party.includes(id)) S.party = S.party.filter((x) => x !== id); else if (S.party.length < S.slots) S.party.push(id); statCache = null; if (W && W.kind === 'stage') buildAllies(); refreshSheet(); return; }
  if (d.cup) { const lv = S.compLv[d.cup] || 1; const cost = Math.round(600 * Math.pow(lv, 1.8)); if (S.gold < cost) return; S.gold -= cost; S.compLv[d.cup] = lv + 1; statCache = null; SFX.play('level'); refreshSheet(); return; }
  if (d.daily) { const x = S.daily.list.find((y) => y.id === d.daily); if (x && !x.claimed && x.prog >= x.n) { x.claimed = true; S.gold += x.gold; S.inji += x.inji; SFX.play('quest'); toast(`오늘의 의뢰 보상 · ₩${fmt(x.gold)} · 인지 ${x.inji}`); } refreshSheet(); return; }
  if (d.ox !== undefined) { const it = quiz.pool[quiz.i]; const ok = (d.ox === '1') === it.a; quiz.answered = ok; if (ok) quiz.ok++; SFX.play(ok ? 'coin' : 'deny'); refreshSheet(); return; }
  if (d.rum !== undefined) { const i = +d.rum; if (t.checked) { if (!S.rumorOn.includes(i)) S.rumorOn.push(i); } else S.rumorOn = S.rumorOn.filter((x) => x !== i); refreshSheet(); return; }
  const a = d.act;
  if (a === 'equip') { const it = S.inv.find((x) => x.uid === selItem); if (it && it.leg && it.leg !== S.job) { toast(`${esc(JOBS[it.leg].name)} 전용 무기입니다`); return; } if (it) { S.equip[it.slot] = it.uid; statCache = null; } refreshSheet(); }
  else if (a === 'unequip') { const it = S.inv.find((x) => x.uid === selItem); if (it) { S.equip[it.slot] = null; statCache = null; } refreshSheet(); }
  else if (a === 'enhance') { const it = S.inv.find((x) => x.uid === selItem); if (!it) return; const cost = enhCost(it); if (S.gold < cost) return; S.gold -= cost; const en = it.en || 0; if (Math.random() < ENH_RATE[en]) { it.en = en + 1; SFX.play('level'); toast(`강화 성공! <b>+${it.en}</b>`); } else { if (en >= 5) it.en = en - 1; SFX.play('deny'); toast(en >= 5 ? `강화 실패… +${it.en}로 내려갔습니다` : '강화 실패 (등급 유지)'); } statCache = null; refreshSheet(); }
  else if (a === 'sell') { const it = S.inv.find((x) => x.uid === selItem); if (it) { S.gold += sellPrice(it); S.inv = S.inv.filter((x) => x !== it); selItem = null; SFX.play('coin'); } refreshSheet(); }
  else if (a === 'sellall') { let g = 0; S.inv = S.inv.filter((x) => { if (x.grade <= 1 && !x.cos && !Object.values(S.equip).includes(x.uid) && !x.en) { g += sellPrice(x); return false; } return true; }); S.gold += g; toast(`₩${fmt(g)} 판매`); refreshSheet(); }
  else if (a === 'respec') { if (S.inji < 100) { toast('인지가 부족합니다'); return; } S.inji -= 100; const base = major().law; let back = 0; for (const k of Object.keys(S.law)) { back += S.law[k] - base[k]; S.law[k] = base[k]; } S.pts += back; statCache = null; refreshSheet(); }
  else if (a === 'jobticket') { closeSheet(); jobSheet(); return; }
  else if (a === 'jobticket_old') { if (S.inji < 500) return; const locked = TIER2.filter((j) => !S.jobs.includes(j)); if (!locked.length) { toast('이미 모든 2차 직업을 해금했습니다'); return; } S.inji -= 500; openSheet('경력 변경권', [], () => `<div class="choices">${locked.map((id) => `<button class="choice" data-unlockjob="${id}"><img src="${jobPortrait(id)}" alt=""><span><span class="t">${JOBS[id].name}</span><br><span class="d">${esc(JOBS[id].desc)}</span></span></button>`).join('')}</div>`, null, 'ticket'); }
  else if (a === 'revive') revive();
  else if (a === 'revcharge') { openMenu('shop'); toCharge(); }
  else if (a === 'exampass') { const q = quiz.q; S.q[q.id].exam = true; closeSheet(); turnIn(q); }
  else if (a === 'examfail') expel(false);
  else if (a === 'dropout') { dropArm = true; refreshSheet(); }
  else if (a === 'retrial') { if (!canRetrial()) return; ngArm = true; refreshSheet(); }
  else if (a === 'retrial2') { if (!canRetrial()) return; ngArm = false; retrial(); const rf = refundSkills((sid) => JOBS[SKILLS[sid].job].tier < 2); closeSheet(); ensureLoadout(true); checkPassives(); statCache = null; enterStage(1, 1); later(0.2, () => showBanner(`재심 ${S.ng}회차`, `특전: 이력서 칸 +1 (지금 ${resumeSlots()}칸) · 스킬 초기화 SP ${rf.sp} 환급`)); }
  else if (a === 'dropout2') expel(true);
  else if (a === 'surv') { closeSheet(); enterSurvival(); }
  else if (a === 'restore') restorePurchases();
  else if (a === 'skreset') {   // 두 번 눌러 확정
    if (!skArm) { skArm = true; setTimeout(() => { skArm = false; if (sheetRender) refreshSheet(); }, 3000); refreshSheet(); return; }
    skArm = false; if (S.inji < 200) return; S.inji -= 200; const r = refundSkills(() => true); ensureLoadout(); S.spSeen = 0; updateBadges();
    toast(`스킬 초기화 · SP ${r.sp} · ₩${fmt(r.gold)} 환급`, 4000); SFX.play('level'); refreshSheet(); save();
  }
  else if (a === 'monthly') buyMonthly();
  else if (a === 'tocharge') toCharge();
  else if (a === 'toshop') openMenu('shop');
  else if (a === 'bugsend') { if (isChild()) return; if (!($('#bug-ok') || {}).checked) { toast('보낼 정보에 동의(체크)해야 보낼 수 있어요'); return; } const desc = (($('#bug-text') || {}).value || '').trim(); sendText(bugReport(desc), '법조인 키우기 버그 제보').then((res) => { if (res === 'copied') toast('제보 내용을 복사했어요. 카톡이나 메일에 붙여 넣어 보내 주세요', 4500); else if (res === 'shared') toast('고마워요! 제보를 보냈어요'); else if (res === 'fail') toast('복사가 막혀 있어요. 화면을 캡처해서 보내 주세요', 4000); }); }
  else if (a === 'savefile') exportSave();
  else if (a === 'openext') openExternal();
  else if (a === 'later') tryCloseSheet();
  else if (a === 'buyai') { if (S.inji < 300) return; S.inji -= 300; S.aiUntil = Math.max(now(), S.aiUntil) + 7 * 864e5; toast('AI 법률비서 7일 · AUTO 공격력 100% + 스킬 사용'); SFX.play('coin'); refreshSheet(); }
  else if (a === 'useboost') { if (!S.boosters) { toast('부스터가 없습니다 · 상점에서 구매'); return; } S.boosters--; S.boostUntil = Math.max(now(), S.boostUntil) + 30 * 60000; boostWas = true; toast(`경험치 2배 켜짐 · 남은 시간 ${mmss(S.boostUntil - now())} (화면 위에 표시)`, 3500); SFX.play('level'); refreshSheet(); save(); }
  else if (a === 'buyboost') { if (S.inji < 150) return; S.inji -= 150; S.boosters++; toast('경험치 부스터 구매 · 메뉴 → 가방에서 「켜기」'); SFX.play('coin'); refreshSheet(); }
  else if (a === 'tmusic') { S.music = !S.music; BGM.setOn(S.music); refreshSheet(); }
  else if (a === 'tsound') { SFX.init(); S.sound = !S.sound; SFX.on = S.sound; refreshSheet(); }
  else if (a === 'tsell') { S.autoSell = !S.autoSell; refreshSheet(); }
  else if (a === 'tobag') openMenu('bag');
  else if (a === 'retry') { const c = W.c, s = W.s, tier = W.tier || 0, kk = W.kakha; closeSheet(); if (kk) enterKakha(tier); else enterStage(c || 1, s || 1, tier); }
  else if (a === 'town') { closeSheet(); enterTown(); }
  else if (a === 'kimgo') startKim();
  else if (a === 'jobs') jobSheet();
  else if (a === 'skills') openMenu('skill');
  else if (a === 'food' || a === 'mall') openMenu('shop');
  else if (a === 'board') openBoard();
  else if (a === 'chat') { const id = sheetNpc; closeSheet(); const n = NPCS[id]; const port = n.img === 'npc_haechi' ? 'haechi' : id; const tl = NPC_TRIVIA[id] || []; const fresh = tl.filter((t) => !S.trivia.includes(t)); const tid = fresh.length && Math.random() < 0.7 ? pick(fresh) : null; if (tid) { const c = TRIVIA[tid]; startDialog([[n.name, port, `그거 알아? ${c.d}`], ['sys', null, `[법률 상식] ${c.law}`]], () => learnTrivia(tid)); } else startDialog([[n.name, port, NPC_CHAT[id] ? NPC_CHAT[id]() : '…']]); }
  else if (a === 'quiznext') { quiz.i++; quiz.answered = null; refreshSheet(); }
  else if (a === 'quizretry') { const q = quiz.q; startQuiz(q); }
  else if (a === 'quizpass') { const q = quiz.q; S.q[q.id].quiz = true; closeSheet(); turnIn(q); }
  else if (a === 'close') closeSheet();
  else if (a === 'totitle') { closeSheet(); save(); showTitle(); }
  else if (a === 'age') { closeSheet(); ageGate(() => { if (player) openMenu('opt'); }); }
  else if (a === 'wipe') { if (!wipeArm) { wipeArm = true; setTimeout(() => { wipeArm = false; if (sheetRender) refreshSheet(); }, 4000); refreshSheet(); return; } wipeArm = false; wipeAll(); }
  else if (a === 'reset') { deleteSlot(SLOT); S = newState(); closeSheet(); showTitle(); }
  else if (a === 'endok') endingDone();
}
function gacha(kind) {
  let n = 1;
  if (kind === 'c') { if (!S.contracts) return; S.contracts--; }
  else { n = +kind; const cost = n === 1 ? 60 : 600; if (S.inji < cost) { toast('인지가 부족합니다'); return; } S.inji -= cost; }
  const lv0 = Math.min(10, 1 + Math.floor(S.eqPulls / 30));
  const out = [];
  for (let i = 0; i < n; i++) {
    const lv = Math.min(10, 1 + Math.floor(S.eqPulls / 30)); const r = gachaRates(lv); let x = Math.random() * 100, g = 0;
    for (; g < 4; g++) { if ((x -= r[g]) < 0) break; }
    const it = g === 4 && LEGENDS[S.job] && Math.random() < 0.3 ? makeLegend(S.job, Math.max(5, S.lv)) : makeItem(pick(EQ_BASES), g, Math.max(5, S.lv)); S.inv.push(it); out.push(it); S.eqPulls++;
  }
  out.forEach(autoEquipIfBetter);
  const best = out.reduce((a, b) => b.grade > a.grade ? b : a, out[0]);
  openSheet('서초 백화점', [], () => `<div class="grid">${out.map((it) => `<div class="slot g${it.grade}" title="${esc(it.name)}"><div class="ic" style="${itemIcon(it)}"></div></div>`).join('')}</div>
    <p>최고: <b class="gc${best.grade}">${GRADES[best.grade]} ${esc(best.name)}</b>${Math.min(10, 1 + Math.floor(S.eqPulls / 30)) > lv0 ? ' · <b>뽑기 레벨 상승!</b>' : ''}</p>
    <div class="row wrap"><button class="btn sm" data-act="mall">상점으로</button></div>`);
  SFX.play('level'); save();
}

// ======================================================================
// 타이틀 · 부팅
// ======================================================================
// 타이틀: 세이브 슬롯 3칸 + 엔딩 도감
let slotArm = 0;
function slotCard(n) {
  const d = readSlot(n);
  if (!d) return `<div class="slot-card empty"><b>슬롯 ${n}</b><span class="note">비어 있음</span><button class="btn sm" data-slot-new="${n}" ${n === firstEmptySlot() ? 'id="t-new"' : ''}>새로 시작</button></div>`;
  const j = JOBS[d.job] || JOBS.student, rk = d.rank && d.rank[d.job] && j.rank ? j.rank.name : j.name;
  const cl = Object.keys(d.cleared || {}).length, ends = Object.keys(d.endSeen || {}).length;
  const when = d.saved ? new Date(d.saved).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) : '';
  const port = j.img ? `assets/${j.img}.png` : frameURL(j.anim[0], j.anim[1], 0);
  return `<div class="slot-card"><img src="${port}" alt=""><div class="info"><b>슬롯 ${n} · Lv.${d.lv} ${esc(rk)}</b><span class="note">${d.ng ? `재심 ${d.ng}회차 · ` : ''}사건 ${cl}/25${d.dropout ? ' · 중퇴 루트' : ''}${ends ? ` · 엔딩 ${ends}` : ''}${when ? ` · ${when}` : ''}</span></div>
    <div class="row" style="gap:4px"><button class="btn sm" data-slot-load="${n}" ${n === firstFullSlot() ? 'id="t-cont"' : ''}>이어하기</button><button class="btn ghost sm ${slotArm === n ? 'armed' : ''}" data-slot-del="${n}">${slotArm === n ? '정말 삭제?' : '삭제'}</button></div></div>`;
}
function firstEmptySlot() { for (let n = 1; n <= slotCount(); n++) if (!readSlot(n)) return n; return 0; }
function firstFullSlot() { for (let n = 1; n <= slotCount(); n++) if (readSlot(n)) return n; return 0; }
const PRIVACY_URL = 'https://ghdakrk.github.io/lawyer-game-play/privacy.html';
// 처음 실행: 연령 확인 (만 14세 미만이면 기기 저장 모드). 자동 테스트(webdriver)에서는 건너뛴다
function ageGate(next) {
  const old = document.getElementById('agegate'); if (old) old.remove();
  const el = document.createElement('div'); el.id = 'agegate';
  el.innerHTML = `<div class="box"><h2>나이를 알려 주세요</h2><p>만 14세 미만이면 <b>기기 저장 모드</b>로 해요. 계정·클라우드 저장·유료 구매 없이, 게임 기록은 이 기기에만 저장되고 아무 데도 보내지 않아요.</p>
    <div class="row wrap" style="justify-content:center"><button class="btn" data-age="adult">만 14세 이상이에요</button><button class="btn ghost" data-age="child">만 14세 미만이에요</button></div>
    <p class="note">답은 이 기기에만 저장되고, 설정 → 연령 확인에서 바꿀 수 있어요. <a href="${PRIVACY_URL}" target="_blank" rel="noopener">개인정보 처리방침</a></p></div>`;
  el.addEventListener('click', (ev) => { const b = ev.target.closest('[data-age]'); if (!b) return; setAge(b.dataset.age); el.remove(); SFX.play('coin'); if (next) next(); });
  document.body.appendChild(el);
}
function wipeAll() {
  saveOff = true; S = newState();
  try { for (let n = 1; n <= 6; n++) deleteSlot(n); for (const k of [ACC_KEY, SAVE_KEY, AGE_KEY]) localStorage.removeItem(k); } catch (e) { /* 무시 */ }
  accRaw = null; accObj = null; toast('이 기기의 계정·게임 데이터를 모두 지웠어요', 3000); setTimeout(() => window.location.reload(), 900);
}
function showTitle() {
  scene = 'title'; W = null; player = null; save();
  const t = $('#title'); t.classList.add('show');
  const heroes = ['student', 'assoc', 'prosecutor', 'judge'].map((id) => jobPortrait(id));
  const acc = accLoad(), got = ENDING_IDS.filter((id) => acc.endings[id]).length;
  t.innerHTML = `<div class="heroes"><img src="${heroes[0]}" alt=""><img src="${heroes[1]}" alt=""><img src="assets/npc_haechi.png" alt="" style="height:clamp(40px,10vw,74px)"><img src="${heroes[2]}" alt=""><img src="${heroes[3]}" alt=""></div>
    <h1>법조인 키우기</h1><p class="sub">로스쿨 서바이벌 · 끝까지 살아남아라</p>
    ${inAppNote()}
    <div class="slots">${Array.from({ length: slotCount() }, (_, i) => slotCard(i + 1)).join('')}</div>
    <div class="row wrap" style="justify-content:center"><button class="btn ghost sm" id="t-ends">엔딩 도감 ${got}/${ENDING_IDS.length}</button></div>
    <p class="note">슬롯마다 다른 직업으로 키워 보세요. 엔딩은 슬롯을 넘어 모입니다. · 전부 무료 · 현직 변호사가 만든 법조인 성장 액션 RPG · v${GAME_VERSION} · 버그 제보: 메뉴 → 설정</p>`;
  BGM.play('title');
  if (!ageMode && !window.navigator.webdriver) ageGate();
  t.onclick = (ev) => {
    const b = ev.target.closest('button'); if (!b) return;
    SFX.init(); BGM.ensure();
    if (b.dataset.slotNew) { SLOT = +b.dataset.slotNew; S = newState(); t.classList.remove('show'); chooseMajor(); }
    else if (b.dataset.slotLoad) { load(+b.dataset.slotLoad); SFX.on = S.sound; BGM.on = S.music !== false; t.classList.remove('show'); ensureLoadout(); checkPassives(); fixJobQuests(); grandfather(); applyOwned(); monthlyTick(); if (Object.keys(S.cleared).length) enterTown(); else enterStage(1, 1); }
    else if (b.dataset.slotDel) { const n = +b.dataset.slotDel; if (slotArm === n) { deleteSlot(n); slotArm = 0; } else { slotArm = n; setTimeout(() => { if (slotArm === n && scene === 'title') { slotArm = 0; showTitle(); } }, 3000); } showTitle(); }
    else if (b.id === 't-ends') endingGallery();
    else if (b.id === 't-ext') openExternal();
  };
}
// 엔딩: 대사 → 일러스트 카드. 슬롯에는 본 엔딩, 계정에는 모은 엔딩
let homeArm = 0;
function returnTown() {
  if (scene !== 'stage' || !W) return;
  if (W.surv) { if (!W.ended) { W.ended = true; player.dead = true; survivalResults(); } return; }
  closeSheet(); enterTown(); save(); toast('사건을 중단하고 마을로 돌아왔어요. 얻은 수임료·경험치·아이템은 그대로예요.', 3200);
}
let endingCb = null;
function playEnding(id, cb) {
  const e = ENDINGS[id]; S.endSeen[id] = now();
  const acc = accLoad(); acc.endings[id] = acc.endings[id] || now(); accSave(acc); save();
  BGM.jingle('job');
  startDialog(e.lines.concat([ENDING_OUTRO]), () => endingSheet(id, cb));
}
function endingSheet(id, cb) {
  const e = ENDINGS[id], acc = accLoad(), got = ENDING_IDS.filter((k) => acc.endings[k]).length;
  endingCb = cb || null;
  openSheet(`엔딩 ${e.n} · ${e.title}`, [], () => `<div class="card ending"><img class="cg" src="assets/${e.img}.jpg" alt="${esc(e.title)}">
    <p class="etitle">「${esc(e.title)}」</p><p>${esc(e.sum)}</p>
    <p class="note">엔딩 수집 ${got}/${ENDING_IDS.length}${got === ENDING_IDS.length ? ' · 모든 소문의 증인!' : ''}</p>
    ${got < ENDING_IDS.length ? `<p class="note">다음 엔딩: ${HIDDEN_OF[id] && !S.jobs.includes(HIDDEN_OF[id]) ? `히든 직업 「${esc(JOBS[HIDDEN_OF[id]].name)}」으로 전직해 김성호를 다시 넘거나, ` : ''}해치의 「진로 상담」에서 <b>재심</b>을 청구해 이 슬롯에서 다른 진로로 다시 해 보세요. 레벨·장비는 그대로예요.</p>` : ''}
    <div class="row wrap"><button class="btn" data-act="endok">계속</button></div></div>`, null, 'ending');
}
function endingDone() { const cb = endingCb; endingCb = null; closeSheet(); if (cb) cb(); }
function endingGallery() {
  const acc = accLoad(), got = ENDING_IDS.filter((k) => acc.endings[k]).length;
  $('#sheet').classList.toggle('top', scene === 'title');
  const hint = { assoc: '어쏘변호사로', prosecutor: '검사로', judge: '판사로', defender: '국선전담변호사(히든)로', special: '특별검사(히든)로', justice: '헌법재판관(히든)으로', ceo: '리걸테크 CEO로', politician: '정치 신인으로', youtuber: '법률 유튜버로' };
  openSheet(`엔딩 도감 ${got}/${ENDING_IDS.length}`, [], () => `<p class="note">김성호를 넘은 직업마다 엔딩이 갈립니다. 모을수록 「지옥에서 온 변호사」의 정체가 드러나요.</p>
    <div class="card"><b>엔딩 9개 모으는 법</b><p class="note">① 기본 직업(어쏘·검사·판사)으로 먼저 김성호를 넘고, 히든 직업으로 전직해 다시 넘으면 한 회차에 엔딩 2개.<br>② 김성호를 넘은 뒤 해치의 「진로 상담」 → <b>재심 청구</b>: 같은 슬롯에서 레벨·장비를 그대로 들고 대학생부터 다른 진로로. 회차마다 이력서 칸 +1. 중퇴 루트(CEO·정치인·유튜버)도 재심으로.<br>③ 지름길: 이직 신청서(인지 800), 추가 세이브 슬롯(상점).</p></div>
    <div class="egrid">${ENDING_IDS.map((k) => { const e = ENDINGS[k]; return acc.endings[k] ? `<div class="ecard"><img src="assets/${e.img}.jpg" alt=""><b>${e.n}. ${esc(e.title)}</b><span class="note">${esc(e.sum)}</span></div>` : `<div class="ecard locked"><div class="ph">?</div><b>${e.n}. ???</b><span class="note">${hint[k]} 김성호를 넘기</span></div>`; }).join('')}</div>`, null, 'gallery');
}
function chooseMajor() {
  openSheet('어느 학부에서 시작할까요?', [], () => `<p class="note">학부는 시작 스탯과 작은 보너스를 정합니다. 어느 학부든 모든 직업이 될 수 있습니다.</p>
    <div class="choices">${MAJORS.map((m) => `<button class="choice" data-major="${m.id}"><img src="assets/hero_student.png" alt=""><span><span class="t">${m.name}</span><br><span class="d">${esc(m.pro)} · 논리력 ${m.law.log} · 멘탈 ${m.law.men} · 집중력 ${m.law.foc} · 순발력 ${m.law.agi}</span></span></button>`).join('')}</div>`, null, 'major');
}
// 화면 아래 안전 영역(제스처 막대 등) 높이: CSS env()는 JS에서 바로 못 읽어서 보이지 않는 요소로 잰다
let safeProbe = null;
function safeBottom() {
  if (!safeProbe) { safeProbe = document.createElement('div'); safeProbe.style.cssText = 'position:fixed;left:0;bottom:0;width:0;height:0;visibility:hidden;pointer-events:none;padding-bottom:env(safe-area-inset-bottom,0px)'; document.body.appendChild(safeProbe); }
  return parseFloat(window.getComputedStyle(safeProbe).paddingBottom) || 0;
}
function layout() {
  // 실제로 쓸 수 있는 크기 = #app 안쪽 (카메라 구멍 등 위쪽 안전 영역을 뺀다)
  const app = $('#app'), cs = window.getComputedStyle(app);
  document.documentElement.style.setProperty('--lift', `${ctrlLift}px`);
  const ww = Math.min(app.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), 1100), wh = app.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const land = ww / wh > 1.25;
  app.classList.toggle('land', land);
  const view = $('#view');
  const dpr = Math.min(gfxLevel >= 2 ? 1.25 : 2, window.devicePixelRatio || 1);
  const HUD = 46;
  let cssScale;
  if (land) { view.style.height = '100%'; cssScale = wh / VH; }
  else {   // 세로: 조작부(버튼 260 + 띄움 높이 + 아래 안전 영역)를 먼저 확보하고, 게임 화면은 남는 만큼. 모자라면 게임 화면을 줄인다
    cssScale = clamp(ww / 330, 0.85, 1.8);
    const vh = Math.round(Math.max(160, Math.min(Math.max(VH * cssScale + HUD, wh * 0.6), wh - 262 - ctrlLift - safeBottom())));
    cssScale = Math.min(cssScale, (vh - HUD) / VH); view.style.height = `${vh}px`;
  }
  const c = $('#game'); const r = view.getBoundingClientRect();
  c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
  scale = cssScale * dpr;
  viewW = c.width / scale;
  offY = c.height - VH * scale;
  ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  fitQtrack();
}
let last = performance.now();
// 자동 그래픽: 사건 중 150프레임 평균이 24ms(약 42fps)보다 느리면 한 단계 낮춘다
const perf = { n: 0, sum: 0 };
function perfWatch(ms) {
  if (GFX !== 'auto' || gfxLevel >= 2 || scene !== 'stage' || sheetOpen() || dialog.active || ms > 250) return;
  perf.n++; perf.sum += ms; if (perf.n < 150) return;
  const avg = perf.sum / perf.n; perf.n = perf.sum = 0; if (avg <= 24) return;
  gfxLevel++; try { localStorage.setItem(GFX_LV_KEY, gfxLevel); } catch (e) { /* 무시 */ }
  layout(); toast(gfxLevel === 1 ? '렉이 감지되어 빛 번짐 효과를 껐어요 (설정 → 그래픽)' : '렉이 감지되어 그래픽을 「낮음」으로 바꿨어요 (설정 → 그래픽)', 4000);
}
function setGfx(k) {
  GFX = k; gfxLevel = k === 'auto' ? 0 : { high: 0, mid: 1, low: 2 }[k]; perf.n = perf.sum = 0;
  try { localStorage.setItem(GFX_KEY, k); localStorage.setItem(GFX_LV_KEY, gfxLevel); } catch (e) { /* 무시 */ }
  layout();
}
function frame(t) {
  const ms = t - last, dt = Math.min(0.05, ms / 1000); last = t; perfWatch(ms);
  dialogTick(dt);
  if (scene === 'stage' || scene === 'town') update(dt);
  if (ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#05060c'; ctx.fillRect(0, 0, $('#game').width, $('#game').height); render(); }
  if (player) renderHud();
  requestAnimationFrame(frame);
}
function init() {
  migrateSave(); if (hotData && hotData.state) load(hotData.slot || 1);
  SFX.on = S.sound; BGM.on = S.music !== false;
  bindInput();
  $('#dialog').addEventListener('click', (ev) => { if (ev.target.id === 'dlg-skip') { dialog.typed = dialog.full.length; endDialog(); return; } dialogNext(); });
  $('#sheet').addEventListener('pointerdown', () => { sheetPD = now(); });
  $('#sheet').addEventListener('change', (ev) => { if (ev.target.id === 'save-in' && ev.target.files && ev.target.files[0]) importSave(ev.target.files[0]); });
  $('#sheet').addEventListener('click', (ev) => {
    if (ghostClick(ev)) return;
    if (ev.target.id === 'sh-close' || ev.target === $('#sheet')) { tryCloseSheet(); return; }
    const mj = ev.target.closest('[data-major]');
    if (mj) { S.major = mj.dataset.major; S.law = { ...MAJORS.find((m) => m.id === S.major).law }; closeSheet(); applyOwned(); autoAcceptNext(); ensureLoadout(); enterStage(1, 1); return; }
    const uj = ev.target.closest('[data-unlockjob]');
    if (uj) { const id = uj.dataset.unlockjob; addJob(id); closeSheet(); changeJob(id); toast(`${JOBS[id].name} 해금`); return; }
    onSheetClick(ev);
  });
  $('#qtrack').addEventListener('click', () => { if (player && !dialog.active) openMenu('quest'); });
  $('#b-menu').addEventListener('click', () => { if (!player) return; openMenu(); });
  $('.cur.inji').addEventListener('click', () => { if (!player || dialog.active) return; openMenu('shop'); toCharge(); });   // 인지 표시를 누르면 충전으로
  // 사건 중 마을 귀환: 두 번 눌러 확정 (얻은 보상은 그대로)
  $('#b-home').addEventListener('click', () => { if (homeArm && now() - homeArm < 2500) { homeArm = 0; returnTown(); } else { homeArm = now(); $('#b-home').textContent = '귀환?'; $('#b-home').classList.add('warn'); setTimeout(() => { if (homeArm && now() - homeArm >= 2400) { homeArm = 0; } $('#b-home').textContent = '귀환'; $('#b-home').classList.remove('warn'); }, 2500); } });
  $('#b-auto').addEventListener('click', () => {
    if (!S.auto && scene === 'stage' && W && (W.surv || !S.cleared[W.id])) { toast(W.surv ? '서바이벌은 직접!' : '처음 해결하는 사건은 직접! AUTO는 해결한 사건에서만 켜집니다'); showGuide('g_auto'); SFX.play('deny'); return; }
    S.auto = !S.auto; resetKeys(); toast(S.auto ? `자동 사냥 켬 · 공격력 ${aiOn() ? '100% · 스킬 사용 (AI 법률비서)' : '80% · 스킬 안 씀'}` : '자동 사냥 끔'); if (S.auto) showGuide('g_auto');
  });
  $('#b-sound').addEventListener('click', () => { SFX.init(); S.sound = !S.sound; SFX.on = S.sound; S.music = S.sound; BGM.setOn(S.music); });
  $('#g-ok').addEventListener('click', closeGuide);
  const unlockAudio = () => { if (SFX.ctx && SFX.ctx.state === 'suspended') SFX.ctx.resume(); }; window.addEventListener('pointerdown', unlockAudio); window.addEventListener('keydown', unlockAudio);
  window.addEventListener('resize', layout); window.addEventListener('orientationchange', () => setTimeout(layout, 200));
  document.addEventListener('visibilitychange', () => {   // 홈으로 나가면 저장하고 소리를 멈춘다 (앱에서 백그라운드 재생 방지)
    if (document.hidden) { save(); if (BGM.el) BGM.el.pause(); if (SFX.ctx && SFX.ctx.state === 'running') SFX.ctx.suspend(); }
    else { if (BGM.el && BGM.on) BGM.el.play().catch(() => { }); if (SFX.ctx && SFX.ctx.state === 'suspended') SFX.ctx.resume(); }
  });
  appHooks();
  setInterval(() => { if (S.major) { save(); monthlyTick(); } }, 10000);
  layout();
  $('#b-hp').insertAdjacentHTML('afterbegin', `<span class="ic" style="${iconStyle('loot', LOOT.gimbap)};width:26px;height:26px;background-size:400% 300%;display:block"></span>`);
  loadAssets((f) => { const el = $('#loading'); if (el) el.textContent = `사건 기록을 불러오는 중… ${Math.round(f * 100)}%`; }).then(() => {
    $('#loading').remove(); showTitle(); requestAnimationFrame(frame);
    if (window.location.hash.startsWith('#mig=')) importMigration(window.location.hash.slice(5)).then(() => { if (scene === 'title') showTitle(); });   // 카카오톡에서 넘어온 세이브
  });
}

// 테스트 훅
window.__game = {
  get S() { return S; }, set S(v) { S = v; }, get W() { return W; }, get player() { return player; }, get scene() { return scene; }, keys, pressed, press, release,
  step(sec, dt = 1 / 60) { for (let t = 0; t < sec; t += dt) { dialogTick(dt); update(dt); } },
  enterStage, enterTown, startDialog, endDialog, dialogNext, get dialog() { return dialog; }, spawnMob, spawnBoss, stats, gainExp, changeJob, kimPrep, closeSheet, openMenu, gacha,
  acceptQuest, turnIn, questReady, questAvail, QMAP, startQuiz, get quiz() { return quiz; }, openBoard, interact, npcSheet, castSkill, castUlt, addJob, buildAllies, get sheetMode() { return sheetMode; }, stageOpen,
  giveRewards, checkPassives, ensureLoadout, showGuide, closeGuide, guideOpen, cosGacha, giveCos, badgeState, get cam() { return cam; }, BGM,
  enterSurvival, learnTrivia, expel, routeSheet, jobSheet, survivalResults, playerPose, navEdges, navTo,
  playEnding, endingSheet, endingGallery, showTitle, returnTown, retrial, slotCount, load, readSlot, accLoad, get SLOT() { return SLOT; }, set SLOT(v) { SLOT = v; }, mobLevel,
  transferJob, fixJobQuests, reqOk, refreshSheet, purchase, claimStarter, ageGate, get ageMode() { return ageMode; }, owns, applyOwned, grandfather, makeLegend, makeItem, autoEquipIfBetter, damageMob, enterKakha, skillCap, refundSkills, revive, playerDied, packSaves, importMigration, buyInji, buyMonthly, monthlyTick, heroPreview, poseOf,
};
const start = (data) => { hotData = data || null; if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init(); };
if (window.claude?.hot?.ready) window.claude.hot.ready(start); else start(window.claude?.hot?.data ?? {});
