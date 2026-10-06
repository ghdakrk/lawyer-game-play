/* 법조인 키우기 — 데이터 v3
 * 아틀라스(프레임 애니메이션), 직업·스킬, 몬스터, 25단계 사건, 퀘스트, 스토리, 퀴즈
 * game.js가 이 파일의 전역 상수를 읽는다.
 */
'use strict';

// ======================================================================
// 아틀라스 — Higgsfield 생성 시트를 프레임 띠로 정리한 것 (art/anim)
// cw·ch: 프레임 칸 크기, bh: 0번 프레임 캐릭터 키(px), y: 아틀라스 안 띠의 위쪽
// ======================================================================
const ATLAS = {"atlas_boss":{"w":1692,"h":1002,"frames":{"orc":{"cw":214,"ch":212,"n":6,"bh":190,"y":0},"golem":{"cw":278,"ch":206,"n":6,"bh":200,"y":212},"clock":{"cw":282,"ch":200,"n":6,"bh":190,"y":418},"doppel":{"cw":250,"ch":196,"n":6,"bh":190,"y":618},"kim":{"cw":256,"ch":188,"n":6,"bh":180,"y":814}}},"atlas_comp":{"w":1192,"h":468,"frames":{"pan":{"cw":254,"ch":156,"n":4,"bh":150,"y":0},"kang":{"cw":288,"ch":156,"n":4,"bh":150,"y":156},"yoon":{"cw":298,"ch":156,"n":4,"bh":150,"y":312}}},"atlas_heroes":{"w":2272,"h":940,"frames":{"student":{"cw":242,"ch":180,"n":8,"bh":170,"y":0},"lawschool":{"cw":224,"ch":193,"n":8,"bh":170,"y":180},"assoc":{"cw":242,"ch":180,"n":8,"bh":170,"y":373},"prosecutor":{"cw":216,"ch":185,"n":8,"bh":170,"y":553},"judge":{"cw":284,"ch":202,"n":8,"bh":170,"y":738}}},"atlas_hidden":{"w":2192,"h":548,"frames":{"defender":{"cw":208,"ch":188,"n":8,"bh":170,"y":0},"special":{"cw":274,"ch":176,"n":8,"bh":170,"y":188},"justice":{"cw":262,"ch":184,"n":8,"bh":170,"y":364}}},"atlas_mobs":{"w":1112,"h":1515,"frames":{"paperimp":{"cw":150,"ch":116,"n":4,"bh":110,"y":0},"slime":{"cw":148,"ch":96,"n":4,"bh":90,"y":116},"goblin":{"cw":194,"ch":123,"n":4,"bh":115,"y":212},"ghost":{"cw":148,"ch":121,"n":4,"bh":115,"y":335},"copier":{"cw":182,"ch":121,"n":4,"bh":115,"y":456},"canmimic":{"cw":140,"ch":116,"n":4,"bh":110,"y":577},"stampdevil":{"cw":200,"ch":124,"n":4,"bh":110,"y":693},"phonedemon":{"cw":172,"ch":121,"n":4,"bh":115,"y":817},"bat":{"cw":198,"ch":129,"n":4,"bh":90,"y":938},"hydra":{"cw":218,"ch":146,"n":4,"bh":140,"y":1067},"ogre":{"cw":198,"ch":156,"n":4,"bh":150,"y":1213},"lich":{"cw":278,"ch":146,"n":4,"bh":140,"y":1369}}},"atlas_npc":{"w":594,"h":158,"frames":{"npc":{"cw":99,"ch":158,"n":6,"bh":150,"y":0}}}};
Object.assign(ATLAS, {"atlas_loco1":{"w":876,"h":746,"frames":{"student":{"cw":132,"ch":184,"n":6,"bh":170,"y":0},"lawschool":{"cw":118,"ch":175,"n":6,"bh":170,"y":184},"assoc":{"cw":138,"ch":194,"n":6,"bh":170,"y":359},"prosecutor":{"cw":146,"ch":193,"n":6,"bh":170,"y":553}}},"atlas_loco2":{"w":900,"h":717,"frames":{"judge":{"cw":144,"ch":184,"n":6,"bh":170,"y":0},"defender":{"cw":130,"ch":170,"n":6,"bh":170,"y":184},"special":{"cw":126,"ch":186,"n":6,"bh":170,"y":354},"justice":{"cw":150,"ch":177,"n":6,"bh":170,"y":540}}},"atlas_route":{"w":2080,"h":533,"frames":{"ceo":{"cw":260,"ch":180,"n":8,"bh":170,"y":0},"politician":{"cw":246,"ch":177,"n":8,"bh":170,"y":180},"youtuber":{"cw":252,"ch":176,"n":8,"bh":170,"y":357}}},"atlas_loco3":{"w":1068,"h":537,"frames":{"ceo":{"cw":158,"ch":179,"n":6,"bh":170,"y":0},"politician":{"cw":146,"ch":181,"n":6,"bh":170,"y":179},"youtuber":{"cw":178,"ch":177,"n":6,"bh":170,"y":360}}}});
// 걷기 4프레임 + 밧줄 2프레임 (뒷모습)
const LF = { w1: 0, p1: 1, w2: 2, p2: 3, c1: 4, c2: 5 };
// 발판 띠 (plat_tiles): y·h = 원본 띠 위치, cap = 양 끝 폭, top = 윗면까지 거리, dh = 게임 속 높이
const PLAT_TILES = { books: { y: 0, h: 87, w: 1000, cap: 60, top: 1, dh: 44 }, boxes: { y: 87, h: 64, w: 1000, cap: 60, top: 7, dh: 30 }, marble: { y: 151, h: 70, w: 1000, cap: 60, top: 1, dh: 26 } };
const LOCO = { student: ['atlas_loco1', 'student'], lawschool: ['atlas_loco1', 'lawschool'], assoc: ['atlas_loco1', 'assoc'], prosecutor: ['atlas_loco1', 'prosecutor'], judge: ['atlas_loco2', 'judge'], defender: ['atlas_loco2', 'defender'], special: ['atlas_loco2', 'special'], justice: ['atlas_loco2', 'justice'], ceo: ['atlas_loco3', 'ceo'], politician: ['atlas_loco3', 'politician'], youtuber: ['atlas_loco3', 'youtuber'] };
// 프레임 번호 의미
const HF = { idle: 0, walk1: 1, walk2: 2, jump: 3, wind: 4, strike: 5, cast: 6, hurt: 7 };   // 주인공 8프레임
const MF = { idle: 0, move: 1, atk: 2, hurt: 3 };                                          // 몬스터 4프레임
const BF = { idle: 0, move: 1, wind: 2, atk: 3, special: 4, hurt: 5 };                     // 보스 6프레임
// 주인공 프레임별 머리 위치 [중심 x, 머리 꼭대기 y, 머리 폭] (칸 좌표) — 모자·등 장식을 붙이는 기준
const HEAD = {"atlas_heroes/student":[[122,9,84],[124,5,84],[127,5,85],[138,27,95],[124,14,90],[115,22,82],[118,19,79],[72,15,71]],"atlas_heroes/lawschool":[[102,21,84],[105,17,85],[104,18,84],[98,13,81],[107,5,69],[96,27,83],[97,17,82],[73,27,75]],"atlas_heroes/assoc":[[122,8,84],[120,8,82],[117,8,82],[126,25,84],[126,12,88],[116,27,82],[113,25,80],[92,21,73]],"atlas_heroes/prosecutor":[[109,13,80],[116,8,78],[116,11,82],[123,25,78],[121,19,80],[101,29,77],[106,14,78],[70,17,72]],"atlas_heroes/judge":[[142,30,78],[147,31,78],[150,31,78],[147,16,77],[118,19,56],[131,47,73],[163,7,81],[102,53,61]],"atlas_hidden/defender":[[96,19,82],[97,15,81],[98,16,81],[112,11,81],[83,32,97],[95,40,92],[99,6,112],[65,29,70]],"atlas_hidden/special":[[142,7,80],[150,7,79],[151,9,78],[164,11,85],[155,19,54],[142,49,64],[126,33,66],[104,30,60]],"atlas_hidden/justice":[[129,25,99],[132,35,92],[131,36,94],[157,21,70],[184,5,66],[138,49,66],[149,14,44],[104,49,64]],"atlas_loco1/student":[[65,20,86],[65,19,82],[64,21,83],[63,22,82],[68,7,82],[67,20,76]],"atlas_loco1/lawschool":[[52,11,78],[55,12,78],[53,11,78],[53,14,78],[61,11,81],[58,18,69]],"atlas_loco1/assoc":[[68,29,83],[68,23,79],[67,30,81],[67,28,79],[69,17,82],[65,14,79]],"atlas_loco1/prosecutor":[[73,28,80],[70,23,81],[78,27,81],[71,28,80],[73,16,80],[70,15,79]],"atlas_loco2/judge":[[75,19,76],[72,17,76],[76,21,73],[70,20,71],[74,14,71],[64,16,68]],"atlas_loco2/defender":[[55,6,74],[60,8,72],[58,6,72],[62,10,71],[64,12,68],[55,13,66]],"atlas_loco2/special":[[74,23,76],[66,21,75],[68,25,76],[67,23,74],[66,17,66],[64,18,71]],"atlas_loco2/justice":[[76,23,73],[77,22,75],[76,24,74],[74,23,74],[77,15,77],[68,12,74]],"atlas_route/ceo":[[131,9,84],[133,7,86],[145,8,84],[143,39,90],[139,18,88],[124,39,72],[114,29,73],[85,24,73]],"atlas_route/politician":[[123,7,87],[126,7,86],[126,8,86],[123,22,96],[126,20,81],[122,26,82],[111,23,76],[72,12,73]],"atlas_route/youtuber":[[127,6,81],[125,5,81],[128,6,79],[118,30,72],[130,15,78],[129,18,78],[106,26,72],[82,11,73]],"atlas_loco3/ceo":[[82,6,86],[87,6,84],[94,7,84],[84,16,81],[76,16,68],[75,19,64]],"atlas_loco3/politician":[[75,11,87],[70,11,86],[76,12,86],[74,20,76],[69,15,76],[70,15,71]],"atlas_loco3/youtuber":[[87,6,81],[87,7,80],[91,7,80],[87,9,77],[89,13,77],[88,17,74]]};

// ======================================================================
// 코스튬 (장착하면 모습이 바뀐다) — assets/cosmetics.png 4×3
// sc: 머리 폭 대비 크기, dy: 머리 꼭대기 기준 아래로(머리 폭 비율), float: 떠 있음
// ======================================================================
const COS_ATLAS = { cw: 154, ch: 139, sizes: [[139, 100], [113, 99], [135, 84], [118, 119], [138, 97], [116, 76], [121, 112], [129, 91], [137, 112], [135, 99], [150, 98], [135, 135]] };
const COSMETICS = {
  gradcap: { name: '학사모', slot: 'head', i: 0, grade: 1, sc: 1.15, dy: 0.68, dx: 0.02, st: { exp: 0.05 } },
  crown: { name: '황금 왕관', slot: 'head', i: 1, grade: 4, sc: 0.8, dy: 0.46, dx: 0.04, st: { atkPct: 0.08, gold: 0.05 } },
  headband: { name: '필승 머리띠', slot: 'head', i: 2, grade: 2, sc: 1.1, dy: 0.74, dx: -0.04, st: { spd: 0.05 } },
  catphone: { name: '고양이 헤드폰', slot: 'head', i: 3, grade: 2, sc: 1.15, dy: 0.84, dx: 0, st: { mprPct: 0.15 } },
  halo: { name: '천사 링', slot: 'head', i: 4, grade: 3, sc: 0.9, dy: -0.12, dx: 0, float: true, st: { hpPct: 0.06 } },
  horns: { name: '악마 뿔', slot: 'head', i: 5, grade: 3, sc: 0.95, dy: 0.5, dx: 0.04, st: { crit: 0.04 } },
  wig: { name: '법정 가발', slot: 'head', i: 6, grade: 3, sc: 1.32, dy: 0.95, dx: -0.02, st: { skill: 0.06 } },
  policecap: { name: '경찰 모자', slot: 'head', i: 7, grade: 2, sc: 1.15, dy: 0.68, dx: 0.04, st: { dr: 0.03 } },
  cape: { name: '영웅 망토', slot: 'back', i: 8, grade: 2, sc: 0.95, ox: -0.38, oy: 1.25, st: { hpPct: 0.05 } },
  angel: { name: '천사 날개', slot: 'back', i: 9, grade: 3, sc: 1.25, ox: -0.3, oy: 1.05, flap: true, st: { spd: 0.06 } },
  batwing: { name: '박쥐 날개', slot: 'back', i: 10, grade: 3, sc: 1.3, ox: -0.3, oy: 1.0, flap: true, st: { atkPct: 0.05 } },
  scales: { name: '정의의 저울', slot: 'back', i: 11, grade: 4, sc: 0.72, ox: -0.5, oy: 0.55, float: true, st: { atkPct: 0.05, dr: 0.04 } },
};

// ======================================================================
// 직업 — 사거리 유형(근·중·원)에 따라 멘탈·커피·방어가 다르다
// ======================================================================
const RANGE = {
  melee: { name: '근거리', hp: 1.4, mp: 0.8, dr: 0.12, color: '#ff8a73', d: '멘탈 ×1.4 · 커피 ×0.8 · 피해 감소 +12% · 보스 피해 +15% · 맞아도 덜 밀려난다. 붙어서 싸운다.' },
  mid: { name: '중거리', hp: 1.0, mp: 1.0, dr: 0.03, color: '#ffe45c', d: '균형형. 근접 베기 + 짧은 검기.' },
  ranged: { name: '원거리', hp: 0.85, mp: 1.35, dr: 0, color: '#9ad7ff', d: '멘탈 ×0.85 · 커피 ×1.35. 멀리서 쏜다. 맞으면 아프다.' },
};
const JOBS = {
  student: { name: '대학생', tier: 0, type: 'mid', anim: ['atlas_heroes', 'student'], img: 'hero_student', atk: 1.0, spd: 1.1, crit: 0, dr: 0, color: '#ffe45c',
    basic: { k: 'wave', melee: 54, dist: 120, proj: 'ink', rate: 0.3 }, skills: ['st1', 'st2', 'st3'], ult: 'st_u',
    desc: '형광펜으로 쟁점에 줄을 긋는다. 베기와 함께 잉크 파동이 날아간다.' },
  lawschool: { name: '로스쿨생', tier: 1, type: 'mid', anim: ['atlas_heroes', 'lawschool'], img: 'hero_lawschool', atk: 1.15, spd: 1.0, crit: 0.02, dr: 0, color: '#ffcf5c',
    basic: { k: 'wave', melee: 58, dist: 140, proj: 'page', rate: 0.32 }, skills: ['ls1', 'ls2', 'ls3'], ult: 'ls_u',
    desc: '두꺼운 법전으로 내려친다. 법전을 휘두를 때마다 판례 쪽지가 날아간다.' },
  assoc: { name: '어쏘변호사', tier: 2, type: 'mid', anim: ['atlas_heroes', 'assoc'], img: 'hero_assoc', atk: 1.35, spd: 1.12, crit: 0.04, dr: 0, color: '#ffe45c',
    basic: { k: 'wave', melee: 60, dist: 165, proj: 'slash', rate: 0.34 }, skills: ['as1', 'as2', 'as3'], ult: 'as_u', rank: { name: '파트너 변호사', ult: 'as_u2', q: 'p_assoc' },
    desc: '[중거리] 빠른 형광펜 검술과 검기. 의뢰인 곁에 서는 재야의 길.' },
  prosecutor: { name: '검사', tier: 2, type: 'melee', anim: ['atlas_heroes', 'prosecutor'], img: 'hero_prosecutor', atk: 1.6, spd: 1.04, crit: 0.12, dr: 0, color: '#ff6b5c', mech: 'evidence',
    basic: { k: 'melee', range: 78, rate: 0.34 }, skills: ['pr1', 'pr2', 'pr3'], ult: 'pr_u', rank: { name: '부장검사', ult: 'pr_u2', q: 'p_pros' },
    desc: '[근거리] 직인 철퇴. 때릴 때마다 「증거」가 쌓이고, 5개면 다음 공격이 「기소!」 일격. 빈사의 적은 「구속」으로 즉시 처치하고 멘탈을 회복한다.' },
  judge: { name: '판사', tier: 2, type: 'ranged', anim: ['atlas_heroes', 'judge'], img: 'hero_judge', atk: 1.48, spd: 1.0, crit: 0.03, dr: 0, color: '#c48cff',
    basic: { k: 'shot', dist: 300, proj: 'bolt', rate: 0.38 }, skills: ['jd1', 'jd2', 'jd3'], ult: 'jd_u', rank: { name: '부장판사', ult: 'jd_u2', q: 'p_judge' },
    desc: '[원거리] 의사봉에서 판결 광탄을 쏜다. 커피가 많고 멘탈이 낮다.' },
  defender: { name: '국선전담변호사', tier: 3, hidden: true, type: 'melee', anim: ['atlas_hidden', 'defender'], atk: 1.5, spd: 1.0, crit: 0.04, dr: 0.1, color: '#ffd76b',
    basic: { k: 'melee', range: 72, rate: 0.34 }, skills: ['df1', 'df2', 'df3'], ult: 'df_u',
    desc: '[히든 · 근거리 탱커] 법전 방패로 막고 동료를 지킨다. 받는 피해 −10%.' },
  special: { name: '특별검사', tier: 3, hidden: true, type: 'mid', anim: ['atlas_hidden', 'special'], atk: 1.65, spd: 1.08, crit: 0.1, dr: 0, color: '#d9e2ff', mech: 'evidence',
    basic: { k: 'lash', range: 150, rate: 0.36 }, skills: ['sp1', 'sp2', 'sp3'], ult: 'sp_u',
    desc: '[히든 · 중거리] 수갑 쇠사슬 채찍으로 일직선의 적을 모두 후려친다.' },
  justice: { name: '헌법재판관', tier: 3, hidden: true, type: 'ranged', anim: ['atlas_hidden', 'justice'], atk: 1.5, spd: 0.95, crit: 0.05, dr: 0, color: '#ffd24d',
    basic: { k: 'shot', dist: 340, proj: 'gold', pierce: 1, rate: 0.4 }, skills: ['js1', 'js2', 'js3'], ult: 'js_u',
    desc: '[히든 · 원거리] 황금 지팡이에서 관통 광탄. 결계와 빛기둥으로 전장을 지배한다.' },
  // ---------- 로스쿨 중퇴 루트 (재입학 불가) ----------
  ceo: { name: '리걸테크 CEO', tier: 2, route: true, type: 'melee', anim: ['atlas_route', 'ceo'], atk: 1.7, spd: 1.06, crit: 0.06, dr: 0, color: '#ffd24d', mech: 'card',
    basic: { k: 'melee', range: 82, rate: 0.32 }, skills: ['ce1', 'ce2', 'ce3'], ult: 'ce_u', rank: { name: '유니콘 CEO', ult: 'ce_u2', q: 'p_ceo' },
    desc: '[근거리 · 중퇴 루트] 황금 법인카드로 긁는다. 스킬은 커피 대신 수임료(₩)를 쓴다. 빈사의 적은 「인수합병」해서 돈을 더 번다.' },
  politician: { name: '정치 신인', tier: 2, route: true, type: 'mid', anim: ['atlas_route', 'politician'], atk: 1.52, spd: 1.05, crit: 0.03, dr: 0, color: '#4fd1c5', mech: 'support',
    basic: { k: 'wave', melee: 62, dist: 175, proj: 'sound', rate: 0.3 }, skills: ['po1', 'po2', 'po3'], ult: 'po_u', rank: { name: '국회의원', ult: 'po_u2', q: 'p_pol' },
    desc: '[중거리 · 중퇴 루트] 확성기 음파. 때리면 「지지율」이 오르고 맞으면 떨어진다. 지지율만큼 스킬이 세진다 (최대 +60%).' },
  youtuber: { name: '법률 유튜버', tier: 2, route: true, type: 'ranged', anim: ['atlas_route', 'youtuber'], atk: 1.52, spd: 1.02, crit: 0.05, dr: 0, color: '#c48cff', mech: 'viewers',
    basic: { k: 'shot', dist: 300, proj: 'flash', rate: 0.36 }, skills: ['yt1', 'yt2', 'yt3'], ult: 'yt_u', rank: { name: '골드버튼 유튜버', ult: 'yt_u2', q: 'p_yt' },
    desc: '[원거리 · 중퇴 루트] 셀카봉 플래시. 처치할수록 「시청자」가 늘어 공격력이 오르고 후원금이 들어온다. 맞으면 시청자가 떠난다.' },
};
const ROUTE_JOBS = ['ceo', 'politician', 'youtuber'];
const ROUTE_DIFF = { ceo: '★★☆ 보통 · 돈이 곧 스킬', politician: '★☆☆ 무난 · 동료와 함께', youtuber: '★★★ 어려움 · 유리 대포' };
const MECH_INFO = {
  evidence: { name: '증거 → 기소 · 구속', d: '기본 공격이 맞을 때마다 증거 +1 (최대 5). 5개면 다음 공격이 「기소!」: 주변 공격력 ×4.5 + 1.2초 기절. 체력 18% 이하 일반 몬스터는 기본 공격 한 방에 「구속」(즉시 처치 · 멘탈 2.5% · 커피 +6).' },
  card: { name: '법인카드 · 인수합병', d: '스킬이 커피 대신 수임료를 쓴다 (스킬 커피값 × (0.5 + 레벨×0.12) ₩). 기본 공격이 맞을 때마다 캐시백으로 수임료가 들어온다. 체력 15% 이하 일반 몬스터는 기본 공격 한 방에 「인수합병」(즉시 처치 · 수임료 3배 · 멘탈 3%).' },
  support: { name: '지지율', d: '기본 공격이 맞으면 +2%, 피격 −8%, 서서히 감소. 스킬 피해 × (1 + 지지율×0.6). 지지율 80% 이상이면 궁극기 게이지가 2배로 찬다.' },
  viewers: { name: '시청자', d: '처치 +40명 (3초 안에 연속 처치하면 콤보 배율). 1,000명마다 공격 +5% (최대 +60%), 10초마다 시청자 수에 비례한 후원금과 「응원 댓글」(멘탈 2% + 1,000명당 1%, 최대 8% 회복). 피격 시 15% 이탈.' },
};
const TIER2 = ['assoc', 'prosecutor', 'judge'];
const HIDDEN_JOBS = ['defender', 'special', 'justice'];
const HIDDEN_LOCKED = [
  { name: '사내변호사', hint: '상경대 출신 · 계약서 1,000장 · 다음 업데이트' },
  { name: '법학교수', hint: '엄정한 교수의 마지막 숙제 · 다음 업데이트' },
  { name: '방송인 변호사', hint: '소문을 모두 모은 자 · 다음 업데이트' },
  { name: '군법무관', hint: '사관학교생 · 다음 업데이트' },
  { name: '대법관', hint: '부장판사 · 2부 「대법관 키우기」' },
  { name: '대통령', hint: '??? · 2부' },
];

// ======================================================================
// 스킬 — 직업마다 다른 스킬 3개 + 궁극기. 배우려면 레벨·비급·수임료가 필요하다
// learn: 'job' = 전직하면 바로 / 'quest' = 퀘스트 보상 / {lv, book, gold}
// ======================================================================
const SKILLS = {
  // 대학생
  st1: { name: '형광펜 돌진', tag: '돌진', job: 'student', mp: 12, cd: 4, mult: 1.6, learn: 'quest', d: '앞으로 돌진하며 지나간 적을 모두 벤다. 형광 잔상이 남는다.' },
  st2: { name: '밑줄 긋기', tag: '직선 폭발', job: 'student', mp: 18, cd: 7, mult: 2.4, learn: { lv: 4, book: 'b1', gold: 150 }, d: '앞쪽 260px에 형광 밑줄을 긋고, 잠시 뒤 밑줄 전체가 폭발한다.' },
  st3: { name: '벼락치기 연타', tag: '연타', job: 'student', mp: 24, cd: 10, mult: 0.75, learn: { lv: 7, book: 'b2', gold: 400 }, d: '눈앞을 7번 연속 베고 마지막에 올려친다.' },
  st_u: { name: '기말고사', tag: '전체', job: 'student', ult: true, mult: 2.2, d: '하늘에서 시험지가 쏟아지고, F 도장이 찍힌다.' },
  // 로스쿨생
  ls1: { name: '법전 부메랑', tag: '왕복 관통', job: 'lawschool', mp: 14, cd: 4, mult: 1.5, learn: 'job', d: '법전을 던진다. 갔다가 돌아오며 두 번 때린다.' },
  ls2: { name: '판례 소환', tag: '유도', job: 'lawschool', mp: 22, cd: 8, mult: 1.1, learn: { lv: 11, book: 'b1', gold: 600 }, d: '판례 카드 5장이 주위를 돌다가 가까운 적에게 날아간다.' },
  ls3: { name: '사례형 연쇄', tag: '연쇄', job: 'lawschool', mp: 28, cd: 11, mult: 2.0, learn: { lv: 14, book: 'b2', gold: 1200 }, d: '논리의 번개가 적과 적 사이를 6번 튕긴다.' },
  ls_u: { name: '기록형 폭격', tag: '전체', job: 'lawschool', ult: true, mult: 2.4, d: '하늘에서 두꺼운 기록이 쏟아진다.' },
  // 어쏘변호사 (중거리)
  as1: { name: '준비서면', tag: '부채꼴 관통', job: 'assoc', mp: 14, cd: 3.5, mult: 0.95, learn: 'job', d: '관통하는 서면 칼날 5장을 부채꼴로 날린다.' },
  as2: { name: '가압류 딱지', tag: '부착 폭발·기절', job: 'assoc', mp: 24, cd: 8, mult: 2.2, learn: { lv: 18, book: 'b2', gold: 2000 }, d: '빨간 딱지를 적에게 붙인다. 1초 뒤 폭발하며 2초 기절.' },
  as3: { name: '증거 제출', tag: '후퇴·낙하', job: 'assoc', mp: 30, cd: 11, mult: 1.3, learn: { lv: 22, book: 'b3', gold: 4000 }, d: '뒤로 물러나며 증거 상자 6개를 앞쪽에 떨어뜨린다.' },
  as_u: { name: '준비서면 폭격', tag: '전체', job: 'assoc', ult: true, mult: 2.3, d: '화면을 가로지르는 서면 폭풍.' },
  // 검사 (근거리)
  pr1: { name: '압수수색 돌격', tag: '돌진·내려찍기', job: 'prosecutor', mp: 12, cd: 4, mult: 2.4, learn: 'job', d: '어깨로 돌진해 적을 밀어붙이고 내려찍는다.' },
  pr2: { name: '수갑 체인', tag: '끌어오기·기절', job: 'prosecutor', mp: 20, cd: 7, mult: 1.6, learn: { lv: 18, book: 'b2', gold: 2000 }, d: '쇠사슬을 던져 앞의 적들을 끌어오고 기절시킨다.' },
  pr3: { name: '공소 제기', tag: '충격파 광역', job: 'prosecutor', mp: 26, cd: 10, mult: 3.6, learn: { lv: 22, book: 'b3', gold: 4000 }, d: '올려친 뒤 땅을 내려찍어 양쪽으로 충격파를 보낸다.' },
  pr_u: { name: '구속영장', tag: '전체 기절', job: 'prosecutor', ult: true, mult: 3.2, d: '거대한 직인이 떨어진다. 화면 전체 기절.' },
  // 판사 (원거리)
  jd1: { name: '판결 광선', tag: '관통 광선', job: 'judge', mp: 18, cd: 4, mult: 0.7, learn: 'job', d: '앞으로 긴 보라색 광선을 쏜다. 닿는 적 모두 연속 피해.' },
  jd2: { name: '감치', tag: '감옥·기절', job: 'judge', mp: 26, cd: 9, mult: 0.5, learn: { lv: 18, book: 'b2', gold: 2000 }, d: '앞쪽에 빛의 철창을 내린다. 갇힌 적은 3초간 기절하고 계속 피해를 입는다.' },
  jd3: { name: '정숙!', tag: '충격파 3연', job: 'judge', mp: 30, cd: 11, mult: 2.0, learn: { lv: 22, book: 'b3', gold: 4000 }, d: '의사봉을 세 번 두드린다. 충격파가 세 번 땅을 타고 퍼진다.' },
  jd_u: { name: '판결 선고', tag: '단일 극딜', job: 'judge', ult: true, mult: 6, d: '하늘에서 거대한 의사봉이 떨어진다.' },
  // 국선전담변호사 (히든 · 근거리)
  df1: { name: '변론 방패', tag: '방어 버프', job: 'defender', mp: 14, cd: 5, mult: 1.8, learn: 'job', d: '방패로 밀쳐 내고 2초간 받는 피해 −70%.' },
  df2: { name: '무료 변론', tag: '회복', job: 'defender', mp: 30, cd: 14, mult: 0, learn: 'job', d: '멘탈을 35% 회복한다(레벨마다 +2%). 주변 적은 밀려난다.' },
  df3: { name: '끝까지 변호', tag: '반사·끌어오기', job: 'defender', mp: 28, cd: 12, mult: 1.2, learn: { lv: 30, book: 'b3', gold: 8000 }, d: '적을 끌어모으고 4초간 받은 피해를 되돌려 준다.' },
  df_u: { name: '무죄 추정', tag: '무적', job: 'defender', ult: true, mult: 3, d: '6초간 무적. 황금 기둥이 솟는다.' },
  // 특별검사 (히든 · 중거리)
  sp1: { name: '특검 출두', tag: '순간 돌진', job: 'special', mp: 14, cd: 4, mult: 2.0, learn: 'job', d: '순간이동하듯 적을 꿰뚫고 지나간다. 지나간 자리를 모두 벤다.' },
  sp2: { name: '쇠사슬 회전', tag: '회전 광역', job: 'special', mp: 22, cd: 8, mult: 0.6, learn: 'job', d: '3초간 쇠사슬을 휘돌려 주위를 계속 때린다.' },
  sp3: { name: '증거 폭탄', tag: '투척 폭발', job: 'special', mp: 28, cd: 10, mult: 2.6, learn: { lv: 30, book: 'b3', gold: 8000 }, d: '증거 폴더 3개를 던진다. 떨어진 곳에서 폭발한다.' },
  sp_u: { name: '전원 소환', tag: '전체 속박', job: 'special', ult: true, mult: 3.4, d: '하늘에서 쇠사슬이 내려와 모든 적을 묶는다.' },
  // 헌법재판관 (히든 · 원거리)
  js1: { name: '위헌 결정', tag: '폭발 구체', job: 'justice', mp: 18, cd: 4.5, mult: 2.6, learn: 'job', d: '느리게 나아가는 황금 구체. 끝에서 크게 폭발한다.' },
  js2: { name: '기본권 결계', tag: '장판·회복', job: 'justice', mp: 28, cd: 12, mult: 0.35, learn: 'job', d: '5초간 결계. 안의 적은 느려지고 피해를 입는다. 나는 회복한다.' },
  js3: { name: '9인의 결정', tag: '광선 9연', job: 'justice', mp: 36, cd: 13, mult: 1.6, learn: { lv: 32, book: 'b3', gold: 9000 }, d: '하늘에서 황금 광선 9줄기가 차례로 떨어진다.' },
  js_u: { name: '헌법 수호', tag: '전체·회복', job: 'justice', ult: true, mult: 3.2, d: '화면 전체에 황금 기둥. 멘탈 완전 회복.' },
  // 3차 전직(승진) 각성 궁극기
  as_u2: { name: '대형 로펌의 습격', tag: '각성 전체', job: 'assoc', ult: true, awak: true, mult: 3.0, d: '[각성] 황금 서류가방이 쏟아지고 서면 폭풍이 세 번 몰아친다.' },
  pr_u2: { name: '특별수사본부', tag: '각성 전체', job: 'prosecutor', ult: true, awak: true, mult: 3.6, d: '[각성] 거대한 직인 세 개가 연달아 떨어지고 쇠사슬이 모두를 묶는다.' },
  jd_u2: { name: '전원합의체', tag: '각성 전체', job: 'judge', ult: true, awak: true, mult: 3.4, d: '[각성] 의사봉 13개가 비처럼 쏟아진 뒤 거대한 의사봉이 판결한다.' },
  // 리걸테크 CEO (근거리 · 스킬에 수임료 사용)
  ce1: { name: '법인카드 긁기', tag: '돌진·관통', job: 'ceo', mp: 12, cd: 4, mult: 2.6, learn: 'job', d: '황금 카드로 앞을 길게 긁으며 돌진한다. 지나간 적 모두 피해.' },
  ce2: { name: '투자 유치', tag: '투척 광역', job: 'ceo', mp: 20, cd: 8, mult: 1.8, learn: { lv: 14, book: 'b1', gold: 1500 }, d: '돈가방을 던진다. 떨어진 곳에서 터져 금화가 사방으로 튄다.' },
  ce3: { name: '적대적 M&A', tag: '끌어오기·처형', job: 'ceo', mp: 28, cd: 11, mult: 3.2, learn: { lv: 20, book: 'b2', gold: 3000 }, d: '주변 적을 앞으로 끌어와 벤다. 체력 30% 이하 일반 몬스터는 즉시 인수(처치)하고 수임료를 번다.' },
  ce_u: { name: '상장 (IPO)', tag: '전체', job: 'ceo', ult: true, mult: 3.0, d: '주가 그래프가 화면을 뚫고 치솟은 뒤 금화가 쏟아진다.' },
  ce_u2: { name: '유니콘 등극', tag: '각성 전체', job: 'ceo', ult: true, awak: true, mult: 3.4, d: '[각성] 주가 그래프가 두 번 연달아 화면을 뚫고, 금화 폭우가 쏟아진다.' },
  // 정치 신인 (중거리 · 지지율)
  po1: { name: '가두 연설', tag: '부채꼴·밀치기', job: 'politician', mp: 14, cd: 4, mult: 1.5, learn: 'job', d: '확성기로 음파 세 겹을 앞으로 퍼뜨린다. 맞은 적은 밀려난다.' },
  po2: { name: '공약 남발', tag: '투척 폭발', job: 'politician', mp: 22, cd: 8, mult: 1.7, learn: { lv: 14, book: 'b1', gold: 1500 }, d: '알록달록한 공약 전단 5장을 뿌린다. 떨어진 곳마다 폭발.' },
  po3: { name: '유세 차량', tag: '소환 돌진', job: 'politician', mp: 30, cd: 12, mult: 2.8, learn: { lv: 20, book: 'b2', gold: 3000 }, d: '유세 차량이 화면을 가로지르며 앞의 적을 모두 들이받는다.' },
  po_u: { name: '당선 확정', tag: '전체 기절', job: 'politician', ult: true, mult: 3.2, d: '꽃가루와 폭죽. 화면 안 모든 적 기절. 지지율이 높을수록 세다.' },
  po_u2: { name: '본회의 가결', tag: '각성 전체 기절', job: 'politician', ult: true, awak: true, mult: 3.6, d: '[각성] 「가결」 의사봉 도장 세 개가 떨어지고 화면 전체가 기절한다. 지지율이 100%가 된다.' },
  // 법률 유튜버 (원거리 · 시청자)
  yt1: { name: '라이브 플래시', tag: '관통 광선', job: 'youtuber', mp: 16, cd: 4, mult: 0.55, learn: 'job', d: '셀카봉에서 하얀 플래시 광선을 쏜다. 닿는 적 모두 연속 피해.' },
  yt2: { name: '구독 폭탄', tag: '부착 폭발·기절', job: 'youtuber', mp: 22, cd: 8, mult: 2.3, learn: { lv: 14, book: 'b1', gold: 1500 }, d: '하트 폭탄 3개를 붙인다. 1초 뒤 터지며 기절.' },
  yt3: { name: '알고리즘 떡상', tag: '유도 낙하', job: 'youtuber', mp: 28, cd: 11, mult: 1.6, learn: { lv: 20, book: 'b2', gold: 3000 }, d: '「좋아요」 빛기둥 6줄기가 화면의 적에게 떨어진다. 적이 적으면 한 적에게 여러 번.' },
  yt_u: { name: '구독자 100만', tag: '전체', job: 'youtuber', ult: true, mult: 3.0, d: '황금 트로피와 하트가 쏟아진다. 시청자 +3,000.' },
  yt_u2: { name: '골드버튼 언박싱', tag: '각성 전체', job: 'youtuber', ult: true, awak: true, mult: 3.4, d: '[각성] 거대한 골드버튼을 뜯는다. 하트 폭우와 두 번의 충격파. 시청자 +6,000.' },
};
// 스킬 레벨 5·10에서 모양이 바뀐다 (강화·각성)
const SKILL_EVO = {
  st1: ['돌진 거리 +25%', '끝에서 형광 폭발'], st2: ['밑줄 두 줄', '타오르는 잉크 장판'], st3: ['10연타', '마지막에 충격파'],
  ls1: ['법전 2권', '법전 3권'], ls2: ['카드 7장', '카드 9장·관통'], ls3: ['8번 튕김', '10번 튕김·기절'],
  ce1: ['돌진 거리 +25%', '끝에서 금화 폭발'], ce2: ['돈가방 2개', '돈가방 3개·기절'], ce3: ['끌어오기 범위↑', '처형 기준 40%'],
  po1: ['음파 네 겹', '음파 다섯 겹·기절'], po2: ['전단 7장', '전단 9장·불바다'], po3: ['차량 2대', '차량 3대'],
  yt1: ['광선 2줄', '광선 3줄'], yt2: ['하트 4개', '하트 5개·범위↑'], yt3: ['8명', '10명·기절'],
  as1: ['칼날 7장', '칼날 9장·관통↑'], as2: ['딱지 4장', '딱지 5장·폭발 범위↑'], as3: ['상자 8개', '상자 10개'],
  pr1: ['돌진 거리 +25%', '두 번 내려찍기'], pr2: ['쇠사슬 2줄', '쇠사슬 3줄'], pr3: ['충격파 강화', '세 번 내려찍기'],
  jd1: ['광선 두께 1.5배', '광선 2줄·지속↑'], jd2: ['철창 폭 확대', '철창 2개'], jd3: ['4연타', '5연타'],
  df1: ['보호 3초', '앞으로 충격파'], df2: ['밀쳐 내는 범위↑', '회복 뒤 2초 무적'], df3: ['반사 6초', '끌어오기 범위↑'],
  sp1: ['거리 +30%', '왕복 관통'], sp2: ['범위 확대', '지속 4.5초'], sp3: ['폴더 4개', '폴더 5개'],
  js1: ['폭발 범위↑', '구체 2개'], js2: ['결계 확대', '지속 7초'], js3: ['빛줄기 12개', '빛줄기 15개'],
};
// 스킬은 커피를 더 먹는다 (커피는 때려서 채운다)
for (const sk of Object.values(SKILLS)) if (!sk.ult) sk.mp = Math.round(sk.mp * 1.5);

// ======================================================================
// 패시브 — 현재 직업 패시브는 항상 켜짐. 예전 직업 패시브는 「이력서」 칸에 꽂아서 들고 다닌다.
// 이력서 칸 = 얻은 직업 수 − 1 (최대 5) → 이직할수록 강해진다
// unlock: 'job' 직업을 얻으면 / {skill, lv} 그 직업 1번 스킬을 Lv.5까지 키우면
// ======================================================================
const PASSIVES = {
  st_p1: { job: 'student', name: '벼락치기 체질', d: '공격 속도 +6%', eff: { spd: 0.06 }, unlock: 'job' },
  st_p2: { job: 'student', name: '밤샘 체력', d: '최대 멘탈 +8%', eff: { hpPct: 0.08 }, unlock: { skill: 'st1', lv: 5 } },
  ls_p1: { job: 'lawschool', name: '판례 암기', d: '스킬 피해 +8%', eff: { skill: 0.08 }, unlock: 'job' },
  ls_p2: { job: 'lawschool', name: '기록 정독', d: '경험치 +10%', eff: { exp: 0.1 }, unlock: { skill: 'ls1', lv: 5 } },
  as_p1: { job: 'assoc', name: '의뢰인 응대', d: '수임료 +12%', eff: { gold: 0.12 }, unlock: 'job' },
  as_p2: { job: 'assoc', name: '서면 달인', d: '스킬 재사용 −8%', eff: { cdr: 0.08 }, unlock: { skill: 'as1', lv: 5 } },
  pr_p1: { job: 'prosecutor', name: '수사 본능', d: '결정타 +6%', eff: { crit: 0.06 }, unlock: 'job' },
  pr_p2: { job: 'prosecutor', name: '강철 멘탈', d: '받는 피해 −6%', eff: { dr: 0.06 }, unlock: { skill: 'pr1', lv: 5 } },
  jd_p1: { job: 'judge', name: '경청', d: '커피 회복 +25%', eff: { mprPct: 0.25 }, unlock: 'job' },
  jd_p2: { job: 'judge', name: '판결의 위엄', d: '보스·중간 보스 피해 +12%', eff: { boss: 0.12 }, unlock: { skill: 'jd1', lv: 5 } },
  df_p1: { job: 'defender', name: '끝까지 곁에', d: '김밥 회복량 +30%', eff: { heal: 0.3 }, unlock: 'job' },
  df_p2: { job: 'defender', name: '무료 변론 정신', d: '동료 공격 +25%', eff: { comp: 0.25 }, unlock: { skill: 'df1', lv: 5 } },
  sp_p1: { job: 'special', name: '특검의 집념', d: '결정타 피해 +25%', eff: { critDmg: 0.25 }, unlock: 'job' },
  sp_p2: { job: 'special', name: '압박 수사', d: '적 기절 시간 +30%', eff: { stun: 0.3 }, unlock: { skill: 'sp1', lv: 5 } },
  js_p1: { job: 'justice', name: '헌법 수호', d: '받는 피해 −5%, 최대 멘탈 +5%', eff: { dr: 0.05, hpPct: 0.05 }, unlock: 'job' },
  js_p2: { job: 'justice', name: '9인의 지혜', d: '궁극기 충전 +30%', eff: { ult: 0.3 }, unlock: { skill: 'js1', lv: 5 } },
  rk_assoc: { job: 'assoc', name: '파트너의 인맥', d: '동료 공격 +15%, 수임료 +10%', eff: { comp: 0.15, gold: 0.1 }, unlock: 'rank' },
  rk_prosecutor: { job: 'prosecutor', name: '부장의 결재', d: '스킬 피해 +10%', eff: { skill: 0.1 }, unlock: 'rank' },
  rk_judge: { job: 'judge', name: '부장의 경륜', d: '스킬 재사용 −8%, 최대 커피 +10%', eff: { cdr: 0.08, mpPct: 0.1 }, unlock: 'rank' },
  rk_ceo: { job: 'ceo', name: '유니콘의 자금력', d: '수임료 +20%, 보스 피해 +10%', eff: { gold: 0.2, boss: 0.1 }, unlock: 'rank' },
  rk_politician: { job: 'politician', name: '보좌진', d: '동료 공격 +20%, 스킬 재사용 −8%', eff: { comp: 0.2, cdr: 0.08 }, unlock: 'rank' },
  rk_youtuber: { job: 'youtuber', name: '알고리즘의 축복', d: '스킬 피해 +10%, 결정타 +5%', eff: { skill: 0.1, crit: 0.05 }, unlock: 'rank' },
  ce_p1: { job: 'ceo', name: '법인 절세', d: '수임료 +25%', eff: { gold: 0.25 }, unlock: 'job' },
  ce_p2: { job: 'ceo', name: '스톡옵션', d: '결정타 피해 +30%', eff: { critDmg: 0.3 }, unlock: { skill: 'ce1', lv: 5 } },
  po_p1: { job: 'politician', name: '악수 회전', d: '공격 속도 +8%', eff: { spd: 0.08 }, unlock: 'job' },
  po_p2: { job: 'politician', name: '면책특권', d: '받는 피해 −8%', eff: { dr: 0.08 }, unlock: { skill: 'po1', lv: 5 } },
  yt_p1: { job: 'youtuber', name: '편집 감각', d: '스킬 재사용 −10%', eff: { cdr: 0.1 }, unlock: 'job' },
  yt_p2: { job: 'youtuber', name: '썸네일 장인', d: '경험치 +15%', eff: { exp: 0.15 }, unlock: { skill: 'yt1', lv: 5 } },
};
const BOOKS = { b1: { name: '비급 · 초급', d: '2번째 스킬을 배울 때 필요' }, b2: { name: '비급 · 중급', d: '3번째(2차 직업은 2번째) 스킬에 필요' }, b3: { name: '비급 · 고급', d: '2차·히든 직업의 마지막 스킬에 필요' } };

const MAJORS = [
  { id: 'law', name: '법대생', pro: '스킬 피해 +8%', law: { log: 2, men: 1, foc: 2, agi: 1 }, mods: { skill: 0.08 } },
  { id: 'eng', name: '공대생', pro: '공격 속도 +8%', law: { log: 1, men: 1, foc: 2, agi: 2 }, mods: { spd: 0.08 } },
  { id: 'biz', name: '상경대생', pro: '수임료 +12%', law: { log: 2, men: 1, foc: 1, agi: 2 }, mods: { gold: 0.12 } },
  { id: 'police', name: '경찰대생', pro: '결정타 +4%, 형사 사건 피해 +8%', law: { log: 3, men: 2, foc: 0, agi: 1 }, mods: { crit: 0.04, criminal: 0.08 } },
  { id: 'army', name: '사관학교생', pro: '최대 멘탈 +10%', law: { log: 1, men: 3, foc: 1, agi: 1 }, mods: { hp: 0.1 } },
];
// 스탯 4종 — 이름이 곧 효과. 레벨업마다 3점
const LAWS = [
  { id: 'log', name: '논리력', eff: '공격', d: '공격력 +2', per: (n) => `공격력 +${n * 2}` },
  { id: 'men', name: '멘탈', eff: '체력', d: '최대 멘탈 +15 · 받는 피해 −0.2% (최대 20%)', per: (n) => `멘탈 +${n * 15} · 피해 −${Math.min(20, n * 0.2).toFixed(1)}%` },
  { id: 'foc', name: '집중력', eff: '스킬', d: '최대 커피 +3 · 스킬 피해 +1.5% · 스킬 재사용 대기 −0.3% (최대 15%)', per: (n) => `커피 +${n * 3} · 스킬 +${(n * 1.5).toFixed(1)}% · 쿨타임 −${Math.min(15, n * 0.3).toFixed(1)}%` },
  { id: 'agi', name: '순발력', eff: '속도', d: '공격 속도 +1% · 결정타 +0.4%', per: (n) => `공속 +${n}% · 결정타 +${(n * 0.4).toFixed(1)}%` },
];

// ======================================================================
// 몬스터
// ======================================================================
const MOBS = {
  paperimp: { name: '서류 임프', h: 44, hp: 1, spd: 52, ai: 'walker', dmg: 1, desc: '구겨진 서류에서 태어난 꼬마 악마. 억울함 냄새를 맡으면 몰려든다.' },
  slime: { name: '쟁점 슬라임', h: 32, hp: 0.9, spd: 0, ai: 'hopper', dmg: 0.9, desc: '정리되지 않은 쟁점이 뭉친 젤리. 층간소음 다툼에서 자주 태어난다.' },
  goblin: { name: '마감 고블린', h: 48, hp: 1.1, spd: 64, ai: 'charger', dmg: 1.2, desc: '알람시계를 단 고블린. 몸을 떨면 곧 돌진한다.' },
  ghost: { name: '야근 유령', h: 50, hp: 1.0, spd: 40, ai: 'flyer', dmg: 1.0, desc: '퇴근을 잊은 직장인의 혼. 연장근로엔 가산수당이 붙는다는 걸 모른다.' },
  copier: { name: '복사기 미믹', h: 50, hp: 1.6, spd: 22, ai: 'shooter', proj: 'paper', dmg: 1.0, desc: '종이 걸림의 원한이 깃든 복사기. 서류를 뱉어 쏜다.' },
  canmimic: { name: '깡통 미믹', h: 44, hp: 1.3, spd: 0, ai: 'hopper', dmg: 1.2, desc: '전세사기 피해자들의 억울함이 빚어낸 깡통 집. 열쇠 혀로 할퀸다.' },
  stampdevil: { name: '각하 도장 악마', h: 46, hp: 1.2, spd: 58, ai: 'walker', dmg: 1.4, desc: '서류를 읽지도 않고 빨간 도장을 찍는 악마. 각하의 졸병.' },
  phonedemon: { name: '보이스피싱 폰데몬', h: 50, hp: 1.1, spd: 44, ai: 'flyer', proj: 'wave', dmg: 1.1, desc: '“엄마, 나 폰 고장 났어.” 거짓 목소리 파동을 쏜다.' },
  bat: { name: '악플 박쥐', h: 32, hp: 0.6, spd: 78, ai: 'flyer', dmg: 0.8, desc: '익명 뒤에 숨어 떼로 몰려다닌다. 하나하나는 약하다.' },
  hydra: { name: '다단계 히드라', h: 64, hp: 2.2, spd: 18, ai: 'shooter', proj: 'coin', dmg: 1.2, desc: '“한 명만 데려오면 돼.” 금화를 던져 유혹한다.' },
  ogre: { name: '갑질 오우거', h: 70, hp: 2.8, spd: 34, ai: 'charger', dmg: 1.8, desc: '“내가 누군지 알아?” 금시계를 찬 거구. 돌진이 매우 위험하다.' },
  lich: { name: '소멸시효 리치', h: 60, hp: 1.8, spd: 28, ai: 'shooter', proj: 'orb', dmg: 1.3, desc: '권리 위에 잠자는 자의 권리를 훔쳐 가는 해골. 모래시계가 다 떨어지면 끝이다.' },
};
const BOSSES = {
  orc: { name: '무임승차 오크 조장', h: 112, hp: 110, dmg: 2.0, desc: '조별과제의 원흉. 조원을 앞세우고 이름만 올린다. 조원이 셋 이상이면 피해를 거의 받지 않는다.' },
  golem: { name: '기록 3천 쪽 골렘', h: 124, hp: 125, dmg: 2.2, desc: '아무도 끝까지 읽지 않은 기록이 뭉친 골렘. 시간이 지날수록 단단해진다.' },
  clock: { name: '23:59 마감 데몬', h: 120, hp: 130, dmg: 2.2, desc: '전자소송 마감 1분 전의 공포. 자정이 되면 바닥이 불탄다. 발판 위로 피하라.' },
  doppel: { name: '진술 번복 도플갱어', h: 112, hp: 140, dmg: 1.9, desc: '어제의 진술을 오늘 뒤집는다. 분신 중 진짜만 피해를 입는다.' },
  kakha: { name: '미결마왕 각하', h: 132, hp: 300, dmg: 1.9, desc: '읽지도 않고 각하하는 미결의 마왕. 20년 전 김성호가 50층에 봉인했지만, 문이 열린 틈에 빠져나왔다.' },
  kim: { name: '김성호 변호사', h: 104, hp: 100, dmg: 1.5, desc: '평범한 동네 변호사. 20년 동안 50층에서 「각하」의 봉인을 지켜 왔다. “그럼, 기록부터 볼까요?”' },
};

// ======================================================================
// 사건 (5장 × 5단계) — 5단계는 원흉(보스), 3단계는 중간 보스
// ======================================================================
const CHAPTERS = [
  { id: 1, name: '1장 · 서류폭풍', place: '대학가', bg: 'bg_campus', mirror: true, type: 'civil', ground: ['#4a3a4a', '#2c2230'],
    mobs: ['paperimp', 'slime', 'goblin'], mid: 'paperimp', midName: '서류 임프 대장', boss: 'orc', rumors: [0, 8],
    stages: ['기말고사 마지막 날', '캠퍼스 정문', '조별과제실', '중앙도서관 앞', '대강당'], req: null },
  { id: 2, name: '2장 · 끝나지 않는 기록', place: '로스쿨 도서관', bg: 'bg_library', mirror: true, type: 'civil', ground: ['#5a3b26', '#33210f'],
    mobs: ['paperimp', 'ghost', 'goblin', 'lich'], mid: 'ghost', midName: '야근 유령 반장', boss: 'golem', rumors: [4, 2],
    stages: ['열람실', '판례 서고', '야간 자습실', '기록 보관소', '도서관 최심부'], req: { tier: 1, why: '로스쿨생이 되어야 들어갈 수 있습니다 (퀘스트 「로스쿨 입학 원서」)' } },
  { id: 3, name: '3장 · 자정의 마감', place: '법조타운', bg: 'bg_town', mirror: false, type: 'civil', ground: ['#3b4058', '#22263a'],
    mobs: ['copier', 'canmimic', 'stampdevil', 'goblin'], mid: 'canmimic', midName: '깡통 미믹 집주인', boss: 'clock', rumors: [3, 6],
    stages: ['법원 앞 골목', '복사실 거리', '깡통 주택가', '등기소 앞', '23:59 법원 광장'], req: { tier: 2, why: '변호사시험에 합격하고 진로(어쏘·검사·판사)를 정해야 합니다' } },
  { id: 4, name: '4장 · 번복된 진술', place: '수사 구역', bg: 'bg_alley', mirror: true, type: 'criminal', ground: ['#2a2e3e', '#141724'],
    mobs: ['phonedemon', 'bat', 'hydra', 'ogre'], mid: 'phonedemon', midName: '폰데몬 콜센터장', boss: 'doppel', rumors: [1, 5],
    stages: ['폴리스라인', '콜센터 아지트', '다단계 설명회장', '갑질 빌딩 로비', '취조실'], req: { quest: 'm8', why: '메인 퀘스트 「자정의 마감」을 완료해야 합니다' } },
  { id: 5, name: '최종장 · 김성호 법률사무소', place: '50층 빌딩', bg: 'bg_office', mirror: true, type: 'all', ground: ['#5b3a22', '#2e1d10'],
    mobs: ['paperimp', 'stampdevil', 'lich', 'ogre', 'phonedemon', 'copier'], mid: 'ogre', midName: '갑질 오우거 회장', boss: 'kim', rumors: [7, 9],
    stages: ['10층', '20층', '30층', '40층', '50층 대표변호사실'], req: { quest: 'm9', why: '메인 퀘스트 「번복된 진술」을 완료해야 합니다' } },
];
const TYPE_LABEL = { civil: '민사', criminal: '형사', all: '전 분야' };
// 권장 레벨 (25단계)
const REC = [1, 2, 3, 4, 6, 8, 9, 10, 11, 13, 15, 16, 17, 18, 20, 22, 23, 24, 25, 27, 29, 30, 31, 32, 34];
// 단계 구성: 구역 수, 구역당 몬스터, 정예, 중간보스, 보스
const STAGE_PLAN = [
  { zones: 2, per: 4, elites: [] },
  { zones: 3, per: 5, elites: [2] },
  { zones: 3, per: 5, elites: [], mid: true },
  { zones: 4, per: 6, elites: [1, 3], safe: true },
  { zones: 2, per: 5, elites: [1], boss: true },
];
// 단계 g(0~24)의 몬스터 기본값
// 공격력은 초반엔 약하고 갈수록 가파르다 / 경험치: 초반엔 금방 오르고 갈수록 느려진다
const SCALE = { hp: (g) => 44 * Math.pow(1.21, g) * (g > 10 ? Math.pow(1.03, g - 10) : 1), dmg: (g) => 8 * Math.pow(1.17, g) * (1 + 1.5 * (1 - Math.exp(-g / 5))), exp: (g) => 4 * Math.pow(1.16, g), gold: (g) => 3 * Math.pow(1.17, g) };
const expReq = (L) => Math.floor(40 + 30 * Math.pow(1.2, L - 1));

// ======================================================================
// 소문 (김성호 최종전 난도)
// ======================================================================
const RUMORS = [
  { npc: '고시원 총무', line: '승소를 위해서라면 물불 안 가린다던데?', eff: '물·불 탄막이 번갈아 쏟아진다' },
  { npc: '개인택시 기사', line: '지옥에서 온 변호사라던데?', eff: '바닥에 지옥불 장판이 생긴다' },
  { npc: '빌딩 경비원', line: '사무실 불 꺼진 걸 본 사람이 없대. 잠을 안 잔대.', eff: '보스가 서서히 회복한다' },
  { npc: '김밥집 사장', line: '상대방이 이름만 듣고 소를 취하했대.', eff: '시작할 때 커피가 바닥난다' },
  { npc: '로스쿨 야간 사서', line: '기록을 한 번 보면 쪽수까지 외운대.', eff: '같은 스킬을 연달아 쓰면 피해 −40%' },
  { npc: '복사실 장인', line: '서면이 너무 두꺼워서 법원 엘리베이터가 멈췄대.', eff: '거대한 서면 뭉치가 떨어진다' },
  { npc: '카페 사장', line: '커피를 하루에 스무 잔 마신대.', eff: '보스 공격 속도 1.6배' },
  { npc: '법원 경위', line: '판사들도 그 앞에선 긴장한대.', eff: '보스가 받는 피해 −15%' },
  { npc: '컴공 조교', line: '사실 사람이 아니라 AI라던데?', eff: '보스가 내 마지막 스킬을 따라 한다' },
  { npc: '은퇴한 노법관', line: '한 번 맡은 사건은 지구 끝까지 쫓아간대.', eff: '보스가 순간이동해 따라온다' },
];

// ======================================================================
// 장비 · 소모품 · 수집품
// ======================================================================
const LOOT = { coffee: 0, americano: 1, energy: 2, gimbap: 3, inji: 4, coin: 5, card: 6, shard: 7, contract: 8, key: 9, safe: 10, note: 11 };
const EQ_BASES = [
  { i: 0, name: '형광펜', slot: 'weapon' }, { i: 1, name: '법전', slot: 'weapon' }, { i: 2, name: '만년필', slot: 'weapon' }, { i: 5, name: '직인', slot: 'weapon' }, { i: 7, name: '의사봉', slot: 'weapon' },
  { i: 3, name: '정장', slot: 'armor' },
  { i: 6, name: '배지', slot: 'acc' }, { i: 9, name: '넥타이', slot: 'acc' }, { i: 10, name: '시계', slot: 'acc' }, { i: 11, name: '안경', slot: 'acc' },
  { i: 4, name: '서류가방', slot: 'gear' }, { i: 8, name: '노트북', slot: 'gear' },
];
const SLOT_NAME = { weapon: '무기', armor: '옷', acc: '장신구', gear: '소지품' };
// 직업 전용 전설 무기 · 피흡(가한 피해의 4%를 멘탈로 흡수, 1초에 최대 멘탈의 6%까지). 아이콘은 legend.png(4×3)의 i번
const LEGENDS = {
  student: { i: 0, name: '밤샘의 피땀 형광펜', d: '시험 전날 밤의 집념이 잉크에 배어 있다.', st: { spd: 0.08 } },
  lawschool: { i: 1, name: '피로 쓴 기본서', d: '밑줄마다 누군가의 피, 땀, 눈물.', st: { skill: 0.1 } },
  assoc: { i: 2, name: '타임시트 흡혈 만년필', d: '6분 단위로 상대의 기력을 청구한다.', st: { crit: 0.06 } },
  prosecutor: { i: 3, name: '피의자 신문 직인', d: '찍을 때마다 진술과 함께 기력을 빼앗는다.', st: { crit: 0.08 } },
  judge: { i: 4, name: '선고의 붉은 의사봉', d: '땅! 소리와 함께 생기가 법정으로 몰수된다.', st: { atkPct: 0.08 } },
  defender: { i: 5, name: '국선의 핏빛 방패 법전', d: '의뢰인 대신 맞은 만큼 되돌려 받는다.', st: { dr: 0.06 } },
  special: { i: 6, name: '흡혈 수갑 사슬', d: '묶인 자의 기력은 특검의 것.', st: { spd: 0.08 } },
  justice: { i: 7, name: '진홍의 헌법 지팡이', d: '위헌의 기운을 빨아들여 질서로 바꾼다.', st: { cdr: 0.08 } },
  ceo: { i: 8, name: '무한 흡혈 법인카드', d: '한도 없음. 상대의 체력도 결제된다.', st: { gold: 0.15 } },
  politician: { i: 9, name: '민심 흡수 확성기', d: '외칠수록 표와 기력이 모인다.', st: { atkPct: 0.06 } },
  youtuber: { i: 10, name: '조회수 흡혈 셀카봉', d: '시청 시간만큼 생기를 빨아들인다.', st: { exp: 0.1 } },
};
const GRADES = ['일반', '고급', '희귀', '영웅', '전설'];
const GRADE_MULT = [1, 1.5, 2.2, 3.2, 4.6];
const PREFIX = [['낡은', '평범한'], ['쓸만한', '단정한'], ['날카로운', '맞춤'], ['명품', '전관급'], ['전설의', '김성호의']];
const ENH_RATE = [1, 0.95, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2];
const CONSUMABLES = {
  gimbap: { name: '김밥', icon: LOOT.gimbap, d: '멘탈 40% 회복', price: (c) => 40 + c * 60 },
  coffee: { name: '믹스커피', icon: LOOT.coffee, d: '커피 50% 회복', price: (c) => 30 + c * 40 },
  americano: { name: '아이스 아메리카노', icon: LOOT.americano, d: '커피 가득 + 20초간 공격 속도 +20%', price: (c) => 120 + c * 100 },
  energy: { name: '에너지 드링크', icon: LOOT.energy, d: '30초간 피해 +20%, 이동 속도 +15%', price: (c) => 180 + c * 120 },
};
// 퀘스트 수집품 (아이콘: [시트, 칸])
const QITEMS = {
  admit: { name: '입학 서류', icon: ['loot', LOOT.contract] },
  pnote: { name: '판례 노트', icon: ['loot', LOOT.card] },
  retainer: { name: '수임 계약서', icon: ['loot', LOOT.contract] },
  record: { name: '수사 기록 조각', icon: ['loot', LOOT.shard] },
  gavel: { name: '의사봉 조각', icon: ['equip', 7] },
  deed: { name: '등기권리증', icon: ['loot', LOOT.key] },
  ledger: { name: '비리 장부', icon: ['loot', LOOT.safe] },
  petition: { name: '헌법 소원서', icon: ['loot', LOOT.contract] },
};

// ======================================================================
// 동료
// ======================================================================
const COMPANIONS = {
  pan: { name: '한판례', anim: ['atlas_comp', 'pan'], type: 'ranged', atk: 0.45, cd: 1.6, range: 230, passive: { skill: 0.08 }, pd: '스킬 피해 +8%', attack: 'cards',
    desc: '판례 덕후 로스쿨 동기. 작년에 시험에 떨어졌지만 판례는 누구보다 많이 안다. 판례 카드를 던진다.' },
  kang: { name: '강철민', anim: ['atlas_comp', 'kang'], type: 'melee', atk: 0.7, cd: 1.4, range: 46, passive: { hp: 0.1 }, pd: '최대 멘탈 +10%', attack: 'baton',
    desc: '경찰대를 그만두고 온 동기. 놓친 사기범을 법으로 잡겠다고 한다. 진압봉으로 기절시킨다.' },
  yoon: { name: '윤수익', anim: ['atlas_comp', 'yoon'], type: 'mid', atk: 0.4, cd: 1.5, range: 150, passive: { gold: 0.15 }, pd: '수임료 +15%', attack: 'coins',
    desc: '상경대 출신. 부모님이 다단계에 돈을 잃은 뒤로 숫자는 절대 안 틀린다. 금화를 던진다.' },
  kim: { name: '김성호', anim: ['atlas_boss', 'kim'], boss: true, type: 'mid', atk: 1.0, cd: 1.5, range: 200, passive: { all: 0.05 }, pd: '모든 능력 +5%', attack: 'files',
    desc: '평범한 동네 변호사. 1부를 끝까지 깬 사람만 함께할 수 있다.' },
};

// ======================================================================
// 마을 사람들 — f: atlas_npc 프레임, img: 단독 이미지
// ======================================================================
const NPCS = {
  haechi: { name: '해치', img: 'npc_haechi', h: 46, x: 380, fn: 'haechi' },
  gosiwon: { name: '고시원 총무', img: 'npc_gosiwon', body: 'npc_gosiwon_body', h: 60, x: 130 },
  tenant: { name: '세입자 민우', f: 1, h: 58, x: 250 },
  gimbap: { name: '김밥집 사장', img: 'npc_gimbap', body: 'npc_gimbap_body', h: 62, x: 520, fn: 'food' },
  parttime: { name: '알바생 지은', f: 2, h: 56, x: 640 },
  prof: { name: '엄정한 교수', f: 0, h: 60, x: 770 },
  grandma: { name: '순자 할머니', f: 3, h: 52, x: 900 },
  mall: { name: '서초 백화점', h: 70, x: 1030, fn: 'mall', prop: true },
  webtoon: { name: '웹툰 작가 하늘', f: 4, h: 56, x: 1150 },
  board: { name: '사건 게시판', h: 70, x: 1270, fn: 'board', prop: true },
  office: { name: '김 대리', f: 5, h: 58, x: 1390 },
  pan: { name: '한판례', comp: 'pan', h: 58, x: 1500 },
  kang: { name: '강철민', comp: 'kang', h: 62, x: 1580 },
  yoon: { name: '윤수익', comp: 'yoon', h: 60, x: 1660 },
};
const TOWN_LEN = 1760;

// 대화 초상화
const PORTRAIT = {
  haechi: 'img:npc_haechi', gosiwon: 'img:npc_gosiwon', gimbap: 'img:npc_gimbap', kim: 'img:boss_kim', kakha: 'img:boss_kakha',
  orc: 'img:boss_orc', golem: 'img:boss_golem', clock: 'img:boss_clock', doppel: 'img:boss_doppel',
  prof: 'npc:0', tenant: 'npc:1', parttime: 'npc:2', grandma: 'npc:3', webtoon: 'npc:4', office: 'npc:5',
  pan: 'comp:pan', kang: 'comp:kang', yoon: 'comp:yoon',
  yeomra: 'img:npc_yeomra', saja: 'img:npc_saja', imp: 'img:mob_paperimp',
  paperimp: 'img:mob_paperimp', ghost: 'img:mob_ghost', canmimic: 'img:mob_canmimic', phonedemon: 'img:mob_phonedemon', ogre: 'img:mob_ogre',
};

// ======================================================================
// 스토리 대사 — [화자 이름, 초상화 키 | 'hero' | null, 대사]
// ======================================================================
const STORY = {
  intro: [
    ['sys', null, '4학년 2학기, 기말고사 마지막 날. 졸업은 코앞인데 뭘 해야 할지 모르겠다.'],
    ['나', 'hero', '취업? 대학원? 공무원? …다 모르겠다. 일단 집에나 가자.'],
    ['sys', null, '그때 법조타운 쪽 하늘이 하얗게 변한다. 종이가… 쏟아진다.'],
    ['서류 임프', 'paperimp', '끼히히! 억울함 냄새다! 맛있겠다!'],
    ['???', 'kim', '거기, 학생. 뒤로 물러나 있어요.'],
    ['sys', null, '카디건 차림의 아저씨가 형광펜 하나로 임프에게 쓱 줄을 긋자, 임프가 종이로 돌아간다.'],
    ['지나가던 변호사', 'kim', '놀랐죠? 처리 안 된 사건들이 가끔 이렇게 돼요. 「미결마물」이라고 해요.'],
    ['나', 'hero', '아저씨… 누구세요?'],
    ['지나가던 변호사', 'kim', '그냥 동네 변호사예요. 아까 시험장에서 봤는데, 답안지를 끝까지 다 쓰더군요. 끝까지 쓰는 사람, 귀해요.'],
    ['지나가던 변호사', 'kim', '진로 고민 중이면 로스쿨 한번 가 봐요. 법은 결국 사람을 지키는 일이거든요.'],
    ['지나가던 변호사', 'kim', '아, 그리고 이 친구 좀 맡아 줄래요? 저는 급한 기록이 있어서.'],
    ['???', 'haechi', '강아지 아니고 해치야! …잠깐, 진짜 이 학생이에요?'],
    ['지나가던 변호사', 'kim', '기록을 끝까지 읽을 사람이에요. 부탁해요. (커피를 들고 사라진다)'],
    ['sys', null, '[법조인 육성 시스템이 활성화되었습니다]'],
    ['해치', 'haechi', '…일단 살아남자! 형광펜으로 쟁점에 줄을 그어! Z 공격, X 점프. 휴대폰은 화면 아무 데나 누르고 끌면 움직여!'],
  ],
  town_first: [
    ['해치', 'haechi', '여기가 법조타운이야. 서류폭풍이 처음 시작된 곳이지.'],
    ['고시원 총무', 'gosiwon', '어머, 학생! 그 소문 들었어? 서초동 꼭대기 사무실에 「지옥에서 온 변호사」가 산대.'],
    ['해치', 'haechi', '(…움찔) 아, 아무튼! 머리 위에 「!」가 뜬 사람은 부탁이 있는 거야. 「?」는 부탁을 다 들어줬다는 뜻이고.'],
    ['해치', 'haechi', '사건 게시판에서 다음 사건을 골라. 사건마다 1단계부터 5단계까지 있고, 5단계엔 그 사건의 원흉이 있어.'],
    ['해치', 'haechi', '자, 첫 사건 보고부터 받을게. 나한테 말을 걸어 줘!'],
  ],
  pre_2: [['sys', null, '로스쿨 도서관. 변호사시험까지 D-300. 밤이 되자 책장이 속삭이기 시작한다.']],
  pre_3: [['sys', null, '법조타운의 밤. 복사기 불빛이 깜빡이고, 빈 깡통 집들이 열쇠 혀를 날름거린다.']],
  pre_4: [['sys', null, '수사 구역. 노란 폴리스라인 너머로 휴대폰 벨소리가 끝없이 울린다.']],
  pre_5: [['sys', null, '김성호 법률사무소. 엘리베이터는 고장. 10층마다 마물이 기록을 지키고 있다.']],
  mid_1: [['서류 임프 대장', 'paperimp', '조장님이 시켰다! 우린 이름만 빌려줬을 뿐이라고!']],
  mid_2: [['야근 유령 반장', 'ghost', '퇴근? 그게 뭐지? 다 같이 남아…']],
  mid_3: [['깡통 미믹 집주인', 'canmimic', '보증금? 집이 깡통인데 무슨 보증금이야!']],
  mid_4: [['폰데몬 콜센터장', 'phonedemon', '고객님~ 안전계좌로 이체하셔야 합니다~']],
  mid_5: [['갑질 오우거 회장', 'ogre', '내가 이 빌딩 회장이야! 내가 누군지 알아?!']],
  boss_1: [
    ['무임승차 오크 조장', 'orc', '조별과제? 내 이름만 올려. 발표는 너희가 하고.'],
    ['나', 'hero', '…이건 좀 개인적으로 화나네.'],
    ['해치', 'haechi', '조원이 셋 이상 붙어 있으면 공격이 거의 안 먹혀! 조원부터 정리해!'],
  ],
  boss_2: [
    ['기록 3천 쪽 골렘', 'golem', '나를… 끝까지… 읽은 자는… 없다…'],
    ['나', 'hero', '목차부터 읽으면 돼!'],
    ['해치', 'haechi', '시간이 지날수록 단단해져! 스킬과 궁극기로 한 번에 몰아쳐!'],
  ],
  boss_3: [
    ['23:59 마감 데몬', 'clock', '제출… 버튼을… 눌러라… 서버는… 이미… 느리다…'],
    ['나', 'hero', '1분이면 충분해!'],
    ['해치', 'haechi', '자정 카운트다운이 끝나면 바닥이 불타! 서류철 발판 위로 올라가!'],
  ],
  boss_4: [
    ['진술 번복 도플갱어', 'doppel', '어제 한 말? 기억 안 나는데. 내가 언제 그랬지?'],
    ['나', 'hero', '녹취록 있어.'],
    ['해치', 'haechi', '분신은 진짜가 아니야! 반짝이는 진짜를 노려!'],
  ],
  boss_5: [
    ['sys', null, '띵. 50층. 서류 산더미 너머, 책상 위의 스탠드만 켜져 있다.'],
    ['김성호 변호사', 'kim', '어서 와요. 정말 로스쿨에 갔네요.'],
    ['나', 'hero', '…그때 그 아저씨?! 아저씨가 지옥에서 온 변호사…?'],
    ['김성호 변호사', 'kim', '소문이요? 허허, 다 과장이에요. 평범한 동네 변호사예요.'],
    ['김성호 변호사', 'kim', '다만 이 문 너머엔 「각하」가 있어요. 나를 넘지 못하면, 각하도 못 넘어요.'],
    ['김성호 변호사', 'kim', '그럼, 기록부터 볼까요?'],
  ],
  post_1: [
    ['sys', null, '오크 조장이 종이로 흩어지며, 붉은 끈 한 가닥이 떨어진다.'],
    ['해치', 'haechi', '이건… 붉은 끈? (작게) 설마.'],
    ['나', 'hero', '해치, 왜 그래?'],
    ['해치', 'haechi', '아, 아무것도 아냐! 미결마물이 이렇게 커질 리가 없는데… 누군가 억울함을 모으고 있어.'],
  ],
  post_2: [
    ['sys', null, '흩어진 기록 사이로 낡은 메모 한 장이 떨어진다. 「3,000쪽 완독. — 김」'],
    ['해치', 'haechi', '(작게) …역시 그 사람이네.'],
    ['나', 'hero', '혹시 그때 그 카디건 아저씨?'],
    ['해치', 'haechi', '언젠가 다시 만나게 될 거야. 그보다 이제 시험 준비해야지!'],
  ],
  post_3: [
    ['sys', null, '자정이 지나고, 시계 데몬이 멈춘다. 그때 어디선가 도장 찍는 소리가 울린다. 쾅.'],
    ['???', 'kakha', '…제출 기한 도과. 각하(却下).'],
    ['나', 'hero', '누구야!'],
    ['???', 'kakha', '억울함은 쌓일수록 달콤하지. 이 도시의 모든 사건은… 읽지 않고 각하한다.'],
    ['해치', 'haechi', '(떨며) 미결마왕… 「각하」. 20년 전에 봉인된 줄 알았는데.'],
  ],
  post_4: [
    ['진술 번복 도플갱어', 'doppel', '…각하님이… 50층에서… 깨어나신다…'],
    ['해치', 'haechi', '……이제 말해야겠다.'],
    ['해치', 'haechi', '20년 전, 각하를 봉인한 변호사가 있었어. 김성호. 그 사람은 봉인을 지키려고 50층 사무실에서 밤마다 마물과 싸워 왔어.'],
    ['해치', 'haechi', '사람들이 그를 「지옥에서 온 변호사」라고 부르는 건, 밤새 지옥 같은 놈들과 싸우는 걸 봤기 때문이야.'],
    ['해치', 'haechi', '나는 그 사람의 파트너야. 봉인이 약해지자, 그가 나를 보냈어. 각하를 막을 다음 사람을 찾으라고.'],
    ['나', 'hero', '그게… 나라고?'],
    ['해치', 'haechi', '그건 그 사람이 정할 거야. 50층으로 가자.'],
  ],
  post_5: [
    ['김성호 변호사', 'kim', '…졌네요. 오랜만이에요, 이런 기분.'],
    ['김성호 변호사', 'kim', '특별한 비결은 없어요. 기록을 끝까지 읽었을 뿐이에요.'],
    ['sys', null, '쩍— 대표변호사실 안쪽 문의 봉인에 금이 간다.'],
    ['미결마왕 각하', 'kakha', '크크… 드디어 문이 열렸군. 고맙다, 애송이.'],
    ['김성호 변호사', 'kim', '이런. 나랑 싸우느라 봉인이 약해졌네요. 미안해요.'],
    ['미결마왕 각하', 'kakha', '이 도시의 모든 억울함을… 각하한다!'],
    ['sys', null, '각하가 붉은 종이 폭풍과 함께 창밖으로 사라진다.'],
    ['김성호 변호사', 'kim', '괜찮아요. 이번엔 혼자가 아니니까. 같이 갑시다, 후배님.'],
    ['sys', null, '[칭호 획득: 김성호를 넘은 자] · 김성호 변호사가 동료가 되었다.'],
    ['해치', 'haechi', '그리고… 내일부터 야근이래.'],
    ['나', 'hero', '……네?'],
  ],
};
// 각하는 한 장짜리 그림을 움직여 그린다 (boss_kakha.png)
ATLAS.boss_kakha = { w: 288, h: 300, frames: { kakha: { cw: 288, ch: 300, n: 1, bh: 292, y: 0 } } };
const KAKHA_PRE = [
  ['해치', 'haechi', '각하의 기운이야! 붉은 종이 폭풍이 50층 옥상에 다시 모이고 있어.'],
  ['미결마왕 각하', 'kakha', '…제출 기한 도과. 네 사건도 각하한다.'],
  ['나', 'hero', '읽지도 않고? 그건 재판이 아니지.'],
];
// 소문 10개를 모두 켜고 김성호를 이기면: 소문의 진실
const KIM_TRUTH = [
  ['김성호 변호사', 'kim', '…소문, 전부 들고 왔네요. 그럼 숨길 수가 없지.'],
  ['sys', null, '김성호의 그림자에 붉은 뿔이 돋아난다.'],
  ['김성호 변호사', 'kim', '맞아요. 지옥에서 왔어요. 20년 전, 각하를 쫓아 올라왔죠. 저 아래에서도 각하는 미결 사건만 쌓아 두는 놈이었거든요.'],
  ['김성호 변호사', 'kim', '밤에 불이 안 꺼진 것도, 잠을 안 잔 것도 사실이에요. 봉인을 지키느라.'],
  ['해치', 'haechi', '…그래서 내가 파트너였던 거야. 정의의 수호수는 지옥에서 온 변호사를 감시하는 역할이었어.'],
  ['김성호 변호사', 'kim', '이제 알았으니, 각하를 잡으러 가요. 사건 게시판 5장에 올려 둘게요.'],
];
const KIM_PHASE_LINES = ['', '그럼, 기록부터 볼까요?', '여기, 빈틈이 있네요.', '기본권부터 지키고 갑시다.', '끝까지 갑니다.'];

// ======================================================================
// 퀘스트
// type: main 메인 · job 전직 · comp 동료 · client 의뢰인 · hidden 히든
// req: { q:[선행], lv, tier, jobs:[하나라도 해금], client:n, law:{con:n}, any:[하나라도 완료] }
// goals: kill{m,n} · clear{st,hard?} · item{it,n} · lv{n} · pay{n} · quiz · law{law,n}
// drops: [{it, ch:[장], rate, from:'all'|'elite'|'safe'}] — 퀘스트를 받았을 때만 떨어진다
// ======================================================================
const QUESTS = [
  // ---------- 메인 ----------
  { id: 'm1', type: 'main', title: '서류폭풍', giver: 'haechi', auto: true, req: {}, goals: [{ k: 'clear', st: '1-1' }],
    start: [], end: [['해치', 'haechi', '첫 사건 해결 축하해! 근데 그 형광펜, 휘두르기만 하면 아깝다.'], ['해치', 'haechi', '앞으로 쭉 그으면서 돌진하는 법을 알려 줄게. 「형광펜 돌진」! 스킬은 커피를 쓰는데, 커피는 적을 때릴수록 차올라.']],
    rew: { exp: 40, gold: 120, skill: 'st1' } },
  { id: 'm2', type: 'main', title: '조별과제의 악몽', giver: 'haechi', req: { q: ['m1'] }, goals: [{ k: 'clear', st: '1-3' }],
    start: [['해치', 'haechi', '대학가 조별과제실에서 이상한 기운이 느껴져. 조원들이 하나둘 서류 임프로 변하고 있대.'], ['나', 'hero', '조별과제가… 괴물을 만든다고?'], ['해치', 'haechi', '무임승차만큼 억울한 게 없거든. 3단계의 「서류 임프 대장」부터 잡아!']],
    end: [['해치', 'haechi', '임프 대장이 “조장님이 시켰다”고 했지? 진짜 원흉은 조장이야.'], ['해치', 'haechi', '이건 「비급」이야. 스킬을 배울 때 필요해. 메뉴 → 스킬에서 배워 봐.']],
    rew: { exp: 75, gold: 200, items: { b1: 1 } } },
  { id: 'm3', type: 'main', title: '무임승차 오크 조장', giver: 'haechi', req: { q: ['m2'] }, goals: [{ k: 'clear', st: '1-5' }],
    start: [['해치', 'haechi', '대강당에 조장이 있어. 이름만 올리고 발표는 남한테 떠넘기는 녀석이지.'], ['해치', 'haechi', '권장 레벨은 6이야. 부족하면 앞 단계를 다시 돌면서 레벨과 장비를 챙겨!']],
    end: [['해치', 'haechi', '해냈어! 그런데 이대로는 부족해. 서류폭풍을 막으려면 법을 제대로 배워야 해.'], ['나', 'hero', '그 아저씨도 로스쿨 가 보라고 했었지…'], ['해치', 'haechi', '그래, 로스쿨에 가자! 원서 준비는 내가 도와줄게.']],
    rew: { exp: 130, gold: 500, inji: 50 } },
  { id: 'j1', type: 'job', title: '로스쿨 입학 원서', giver: 'haechi', req: { q: ['m3'] }, goals: [{ k: 'item', it: 'admit', n: 5 }, { k: 'lv', n: 7 }],
    drops: [{ it: 'admit', ch: [1], rate: 0.07 }],
    start: [['해치', 'haechi', '원서에 필요한 서류가 폭풍에 다 날아갔어. 대학가 마물들이 「입학 서류」를 물고 다니더라.'], ['해치', 'haechi', '다섯 장 모아 와. 그리고 레벨 7은 돼야 면접에서 안 떨어지겠지?']],
    end: [['해치', 'haechi', '합격이야! 오늘부터 로스쿨생!'], ['sys', null, '[전직: 로스쿨생] 법전을 휘두르면 판례 쪽지가 날아간다. 스킬 「법전 부메랑」 습득.'], ['해치', 'haechi', '로스쿨 도서관(2장)이 열렸어. 마을에 새로 오신 교수님께도 인사드려!']],
    rew: { exp: 100, job: 'lawschool', cos: 'gradcap' } },
  { id: 'm4', type: 'main', title: '도서관의 그림자', giver: 'prof', req: { q: ['j1'] }, goals: [{ k: 'clear', st: '2-1' }],
    start: [['엄정한 교수', 'prof', '자네가 해치가 데려온 신입생인가. 나는 민사법을 가르치는 엄정한이네.'], ['엄정한 교수', 'prof', '요즘 도서관에 밤마다 괴물이 나온다더군. 기록을 끝까지 읽지 않은 원념이지. 한번 둘러보게.']],
    end: [['엄정한 교수', 'prof', '혼자서는 무리야. 로스쿨은 스터디가 생명이지.'], ['엄정한 교수', 'prof', '마을 동쪽 스터디 카페에 쓸 만한 친구들이 있더군. 가서 이야기해 보게.']],
    rew: { exp: 150, gold: 600 } },
  { id: 'c1', type: 'comp', title: '잃어버린 판례 노트', giver: 'pan', req: { q: ['m4'] }, goals: [{ k: 'item', it: 'pnote', n: 6 }],
    drops: [{ it: 'pnote', ch: [2], rate: 0.08 }],
    start: [['한판례', 'pan', '저기… 혹시 도서관에서 노트 못 보셨어요? 3년 치 판례를 정리한 건데, 폭풍에 날아갔어요.'], ['한판례', 'pan', '작년에 변호사시험 떨어지고… 그 노트가 제 전부거든요.'], ['나', 'hero', '찾아올게. 대신 스터디 같이 하자.']],
    end: [['한판례', 'pan', '찾았다…! 정말 고마워요. 이제 판례는 제가 책임질게요!'], ['sys', null, '[동료 합류: 한판례] 판례 카드를 던져 원거리에서 돕는다. 스킬 피해 +8%. (메뉴 → 동료)']],
    rew: { exp: 175, comp: 'pan' } },
  { id: 'c2', type: 'comp', title: '체력도 실력이다', giver: 'kang', req: { q: ['m4'] }, goals: [{ k: 'kill', m: 'goblin', n: 25 }],
    start: [['강철민', 'kang', '법 공부도 체력이 기본입니다! 경찰대 다니다 왔습니다.'], ['강철민', 'kang', '마감 고블린 스물다섯 마리, 같이 잡으면 인정하겠습니다. 스터디 들어가겠습니다!']],
    end: [['강철민', 'kang', '좋습니다! 오늘부터 스터디 체력 담당입니다.'], ['강철민', 'kang', '…사실 경찰대를 그만둔 건, 끝내 못 잡은 사기범 때문입니다. 이번엔 법으로 잡겠습니다.'], ['sys', null, '[동료 합류: 강철민] 진압봉으로 근접 공격, 적을 기절시킨다. 최대 멘탈 +10%.']],
    rew: { exp: 175, comp: 'kang' } },
  { id: 'c3', type: 'comp', title: '장학금 계산기', giver: 'yoon', req: { q: ['m4'] }, goals: [{ k: 'kill', m: 'ghost', n: 15 }, { k: 'pay', n: 1500 }],
    start: [['윤수익', 'yoon', '스터디요? 좋죠. 근데 저 상경대 출신이라 계산은 확실히 합니다.'], ['윤수익', 'yoon', '야근 유령 열다섯 마리만 정리해 주시고, 스터디룸 보증금 ₩1,500… 전액 부탁드립니다. 하하.']],
    end: [['윤수익', 'yoon', '계산 끝! 투자 대비 수익률 최고네요.'], ['윤수익', 'yoon', '부모님이 다단계에 돈을 날린 뒤로, 숫자 하나는 절대 안 틀리기로 했거든요.'], ['sys', null, '[동료 합류: 윤수익] 금화를 던진다. 수임료 +15%.']],
    rew: { exp: 175, comp: 'yoon' } },
  { id: 'c4', type: 'comp', title: '스터디 결성', giver: 'prof', req: { q: ['c1', 'c2', 'c3'] }, goals: [{ k: 'clear', st: '2-3', fresh: true }],
    start: [['엄정한 교수', 'prof', '셋 다 모았군. 이제 함께 싸워 보게. 도서관 3단계의 「야근 유령 반장」을 쓰러뜨려 오면 스터디로 인정하지.']],
    end: [['엄정한 교수', 'prof', '훌륭하군. 이제 동료 둘을 함께 데려갈 수 있을 걸세.'], ['sys', null, '[동료 슬롯 2칸] 메뉴 → 동료에서 두 명을 함께 데려갈 수 있습니다.']],
    rew: { exp: 250, slots: 2, items: { b2: 1 } } },
  { id: 'm4b', type: 'main', title: '로스쿨 서바이벌: 1학기 중간고사', giver: 'prof', req: { q: ['m4'], lv: 9, path: 'law' }, goals: [{ k: 'exam' }],
    start: [['엄정한 교수', 'prof', '중간고사일세. OX 6문제, 3문제 이상 맞히면 통과.'], ['엄정한 교수', 'prof', '떨어지면… 학칙대로 제적이네. 재입학은 없어. 로스쿨은 서바이벌이야.'], ['나', 'hero', '(꿀꺽)']],
    end: [['엄정한 교수', 'prof', '통과일세. 살아남았군. 이제 2학기, 진짜 시작이야.']],
    rew: { exp: 260, gold: 900, items: { b1: 1 } } },
  // 중퇴 루트 첫 퀘스트 (직업마다 하나)
  { id: 'r_ceo', type: 'job', title: '창업: 사업자등록', giver: 'yoon', req: { route: 'ceo' }, goals: [{ k: 'pay', n: 1000 }, { k: 'clear', st: '2-2', fresh: true }],
    start: [['윤수익', 'yoon', '퇴학? 오히려 좋아. 법 아는 사람이 만드는 리걸테크, 내가 투자할게.'], ['윤수익', 'yoon', '사업자등록비 ₩1,000부터 내고, 도서관 2단계 다시 정리해서 실력 보여 줘.'], ['윤수익', 'yoon', '참고로 주식회사는 최저자본금 없이도 세울 수 있어. 1주 액면은 100원 이상이고.']],
    end: [['윤수익', 'yoon', '법인 설립 완료! 대표님, 이제 돈으로 해결하는 법을 배워 보시죠.'], ['sys', null, '[법률 상식] 주식회사 최저자본금 제도는 폐지되었다 (상법 제329조: 액면주식 1주는 100원 이상).']],
    rew: { exp: 400, gold: 1500, items: { b1: 1 }, trivia: 't39' } },
  { id: 'r_pol', type: 'job', title: '출마 선언', giver: 'gimbap', req: { route: 'politician' }, goals: [{ k: 'kill', m: 'paperimp', n: 30 }],
    start: [['김밥집 사장', 'gimbap', '학교에서 잘렸다며? 그럼 출마해! 이 동네 억울한 사람들 목소리 대신 내 줘.'], ['김밥집 사장', 'gimbap', '민심부터 들어야지. 서류 임프 서른 마리 잡으면서 사람들 하소연 좀 들어 봐.'], ['김밥집 사장', 'gimbap', '국회의원 피선거권은 만 18세부터야. 나이는 충분해!']],
    end: [['김밥집 사장', 'gimbap', '확성기 받아! 오늘부터 정치 신인이야.'], ['sys', null, '[법률 상식] 18세 이상 국민은 국회의원 피선거권이 있다 (공직선거법 제16조 제2항).']],
    rew: { exp: 400, gold: 1000, items: { b1: 1 }, trivia: 't38' } },
  { id: 'r_yt', type: 'job', title: '첫 영상 업로드', giver: 'pan', req: { route: 'youtuber' }, goals: [{ k: 'item', it: 'clip', n: 5 }],
    drops: [{ it: 'clip', ch: [1, 2], rate: 0.08 }],
    start: [['한판례', 'pan', '퇴학당했다고요? …그럼 같이 판례 리뷰 채널 해요! 제가 대본, 당신이 얼굴.'], ['한판례', 'pan', '촬영 소스가 필요해요. 마물들이 「촬영 클립」을 물고 다니더라고요. 다섯 개!'], ['한판례', 'pan', '남의 영상은 함부로 쓰면 안 돼요. 공정이용 요건을 따져야 해요.']],
    end: [['한판례', 'pan', '업로드 완료! 조회수 37… 시작이 반이에요!'], ['sys', null, '[법률 상식] 저작물은 통상적 이용과 충돌하지 않고 저작자 이익을 부당하게 해치지 않으면 공정이용될 수 있다 (저작권법 제35조의5).']],
    rew: { exp: 400, gold: 1000, items: { b1: 1 }, trivia: 't43' } },
  { id: 'm5', type: 'main', title: '끝나지 않는 기록', giver: 'prof', req: { q: ['m4b'] }, goals: [{ k: 'clear', st: '2-5' }],
    start: [['엄정한 교수', 'prof', '도서관 깊은 곳에 기록 3천 쪽이 뭉친 골렘이 있네. 아무도 끝까지 읽지 않은 기록이지.'], ['엄정한 교수', 'prof', '아, 예전에 그걸 끝까지 읽은 사람이 딱 한 명 있었지. 이름이… 김 뭐였는데.']],
    end: [['엄정한 교수', 'prof', '해냈군! 이제 시험만 남았네. 레벨 15가 되면 찾아오게.']],
    rew: { exp: 350, gold: 1500, items: { b1: 1 } } },
  { id: 'm6', type: 'main', title: '변호사시험', giver: 'prof', req: { q: ['m5'], lv: 15, path: 'law' }, goals: [{ k: 'quiz' }],
    start: [['엄정한 교수', 'prof', '이제 시험이네. 다섯 문제 중 네 문제를 맞히면 합격이야.'], ['엄정한 교수', 'prof', '법조인은 결국 정확해야 하네. 준비되면 다시 말을 걸게.']],
    end: [['엄정한 교수', 'prof', '합격일세! 축하하네, 변호사님.'], ['엄정한 교수', 'prof', '이제 진로를 정해야지. 해치에게 가 보게. 길은 셋이네. 변호사, 검사, 판사.']],
    rew: { exp: 450, title: '변호사시험 합격', items: { b2: 1 }, cos: 'headband' } },
  { id: 'j2a', type: 'job', title: '변호사의 길: 첫 수임', giver: 'haechi', req: { q: ['m6'], free2: true }, goals: [{ k: 'item', it: 'retainer', n: 5 }],
    drops: [{ it: 'retainer', ch: [2], rate: 0.065 }],
    start: [['해치', 'haechi', '변호사는 의뢰인 곁에 서는 사람이야. [중거리 · 균형형 · 난이도 ★★☆]'], ['해치', 'haechi', '도서관 마물들이 삼킨 「수임 계약서」 다섯 장을 찾아와.']],
    end: [['해치', 'haechi', '첫 의뢰인이 생겼어! 어쏘변호사로 일할 수 있어.'], ['sys', null, '[직업 해금: 어쏘변호사] 해치에게서 언제든 이 직업으로 바꿀 수 있습니다.']],
    rew: { exp: 300, unlock: 'assoc' } },
  { id: 'j2b', type: 'job', title: '검사의 길: 수사 기록', giver: 'haechi', req: { q: ['m6'], free2: true }, goals: [{ k: 'item', it: 'record', n: 5 }],
    drops: [{ it: 'record', ch: [2], rate: 0.065 }],
    start: [['해치', 'haechi', '검사는 증거로 말하는 사람이야. [근거리 · 멘탈↑ 커피↓ · 2단 도약 · 난이도 ★☆☆]'], ['해치', 'haechi', '흩어진 「수사 기록 조각」 다섯 개를 모아 와.']],
    end: [['해치', 'haechi', '기록이 완성됐어. 검사로 일할 수 있어!'], ['sys', null, '[직업 해금: 검사] 해치에게서 언제든 이 직업으로 바꿀 수 있습니다.']],
    rew: { exp: 300, unlock: 'prosecutor' } },
  { id: 'j2c', type: 'job', title: '판사의 길: 의사봉 조각', giver: 'haechi', req: { q: ['m6'], free2: true }, goals: [{ k: 'item', it: 'gavel', n: 5 }],
    drops: [{ it: 'gavel', ch: [2], rate: 0.065 }],
    start: [['해치', 'haechi', '판사는 끝까지 듣고 판단하는 사람이야. [원거리 · 커피↑ 멘탈↓ · 난이도 ★★★]'], ['해치', 'haechi', '부서진 「의사봉 조각」 다섯 개를 모아 와. 의사봉이 다시 울리면, 넌 판사야.']],
    end: [['해치', 'haechi', '땅땅땅! 판사로 일할 수 있어.'], ['sys', null, '[직업 해금: 판사] 해치에게서 언제든 이 직업으로 바꿀 수 있습니다.']],
    rew: { exp: 300, unlock: 'judge' } },
  { id: 'm7', type: 'main', title: '법조타운의 밤', giver: 'gimbap', req: { tier: 2, q: ['m5'] }, goals: [{ k: 'clear', st: '3-1' }],
    start: [['김밥집 사장', 'gimbap', '왔구먼, 변호사 양반! 요즘 법조타운 밤거리가 영 이상해. 복사기가 사람을 물고, 빈 깡통이 집 행세를 해.'], ['김밥집 사장', 'gimbap', '손님들이 다 억울한 사람들이라 장사가 안 돼. 좀 봐 주게.']],
    end: [['김밥집 사장', 'gimbap', '고마워! 근데 그 깡통 집들… 전세사기 당한 사람들 억울함이 뭉친 거래.'], ['김밥집 사장', 'gimbap', '마을에 억울한 사람들이 하나둘 찾아오고 있어. 이야기 좀 들어 줘.']],
    rew: { exp: 450, gold: 2000 } },
  { id: 'm8', type: 'main', title: '자정의 마감', giver: 'haechi', req: { q: ['m7'] }, goals: [{ k: 'clear', st: '3-5' }],
    start: [['해치', 'haechi', '23시 59분마다 법원 앞에 시계 머리 마물이 나타나. 전자소송 마감을 놓친 억울함이 뭉친 거야.'], ['해치', 'haechi', '권장 레벨 20. 자정 카운트다운이 끝나면 바닥이 불타니까 발판 위로 피해!']],
    end: [['해치', 'haechi', '방금 그 목소리… 각하. 봉인이 약해지고 있어.'], ['해치', 'haechi', '이 고급 비급을 줄게. 마지막 스킬을 익혀 둬.']],
    rew: { exp: 750, gold: 3000, items: { b3: 1 } } },
  { id: 'm9', type: 'main', title: '번복된 진술', giver: 'kang', req: { q: ['m8'] }, goals: [{ k: 'clear', st: '4-5' }],
    start: [['강철민', 'kang', '수사 구역에 보이스피싱 조직이 있습니다. 제가 놓쳤던 바로 그놈들입니다.'], ['강철민', 'kang', '배후에 「진술 번복 도플갱어」가 있답니다. 같이 가 주십시오!']],
    end: [['강철민', 'kang', '잡았습니다… 드디어. 감사합니다.'], ['해치', 'haechi', '이제 50층으로 가야 해. 김성호 법률사무소가 열렸어.']],
    rew: { exp: 1200, gold: 5000, items: { b3: 1 } } },
  { id: 'm10', type: 'main', title: '지옥에서 온 변호사', giver: 'haechi', req: { q: ['m9'] }, goals: [{ k: 'clear', st: '5-5' }],
    start: [['해치', 'haechi', '50층, 김성호 법률사무소. 층마다 마물이 지키고 있어. 권장 레벨 34.'], ['해치', 'haechi', '그리고… 정예 마물이 떨어뜨리는 「비밀 쪽지」를 모아 봐. 김성호에 대한 소문이 적혀 있어.']],
    end: [['해치', 'haechi', '1부 끝! 고생했어. 하지만 각하는 아직 이 도시 어딘가에 있어.'], ['해치', 'haechi', '항소심(고난도)으로 더 강해져 두자.']],
    rew: { exp: 2000, gold: 10000, inji: 500, comp: 'kim', title: '김성호를 넘은 자', cos: 'crown' } },
  { id: 'm11', type: 'main', title: '항소심', giver: 'haechi', req: { q: ['m10'] }, goals: [{ k: 'clear', st: '5-5', hard: true }],
    start: [['해치', 'haechi', '모든 원흉이 항소했어! 더 강해져서 돌아왔지. 50층 항소심까지 이겨 봐.']],
    end: [['해치', 'haechi', '항소 기각! 이제 2부를 기다리자.']],
    rew: { inji: 1000, title: '항소 기각' } },

  // ---------- 의뢰인 ----------
  { id: 'q_gosiwon', type: 'client', title: '층간소음 쟁점 정리', giver: 'gosiwon', req: { q: ['m2'] }, goals: [{ k: 'kill', m: 'slime', n: 25 }],
    start: [['고시원 총무', 'gosiwon', '학생, 고시원 위아래 층이 매일 쿵쿵거린다고 싸워. 쟁점이 하도 꼬여서 슬라임이 됐다니까!'], ['고시원 총무', 'gosiwon', '쟁점 슬라임 스물다섯 마리만 정리해 줘.']],
    end: [['고시원 총무', 'gosiwon', '조용해졌어! 고마워. 그리고 이건 진짜 비밀인데…'], ['고시원 총무', 'gosiwon', '그 변호사, 사무실 불 꺼진 걸 본 사람이 없대. 잠을 안 잔대!']],
    rew: { exp: 100, gold: 400, rumor: 2 } },
  { id: 'q_office', type: 'client', title: '야근 수당', giver: 'office', req: { q: ['m4'] }, goals: [{ k: 'kill', m: 'ghost', n: 20 }],
    start: [['김 대리', 'office', '매일 밤 열한 시까지 일하는데 수당은 0원이에요. 야근 유령들이 꼭 제 영혼 같아요…']],
    end: [['김 대리', 'office', '연장근로에는 통상임금의 50% 이상을 가산해서 줘야 한다는 걸 이제 알았어요! 회사에 말해 볼게요.']],
    rew: { exp: 250, gold: 1200, items: { b1: 1 } } },
  { id: 'q_prof2', type: 'client', title: '교수님의 숙제', giver: 'prof', req: { q: ['m5'] }, goals: [{ k: 'kill', m: 'lich', n: 12 }],
    start: [['엄정한 교수', 'prof', '소멸시효 리치를 아나? 시간이 지나면 권리를 훔쳐 가는 해골이지.'], ['엄정한 교수', 'prof', '권리 위에 잠자는 자는 보호받지 못한다. 열두 마리를 정리하고 오게.']],
    end: [['엄정한 교수', 'prof', '좋아. 일반 민사채권의 소멸시효는 10년이지만, 시효는 기다려 주지 않네. 기억하게.']],
    rew: { exp: 300, gold: 1000, items: { b1: 1 } } },
  { id: 'q_tenant', type: 'client', title: '깡통전세', giver: 'tenant', req: { q: ['m7'] }, goals: [{ k: 'kill', m: 'canmimic', n: 20 }],
    start: [['세입자 민우', 'tenant', '계약이 끝났는데 집주인이 보증금을 안 돌려줘요. 알고 보니 집값보다 보증금이 더 많은 깡통전세래요.'], ['세입자 민우', 'tenant', '깡통 미믹들을 볼 때마다 숨이 막혀요…']],
    end: [['세입자 민우', 'tenant', '임차권등기명령을 신청했어요! 등기가 되면 이사를 가도 대항력이 유지된대요.'], ['세입자 민우', 'tenant', '변호사님 덕분에 버틸 힘이 생겼어요.']],
    rew: { exp: 550, gold: 2500, items: { b1: 1 } } },
  { id: 'q_parttime', type: 'client', title: '체불임금', giver: 'parttime', req: { q: ['m7'] }, goals: [{ k: 'kill', m: 'stampdevil', n: 20 }],
    start: [['알바생 지은', 'parttime', '석 달 치 월급을 못 받았어요. 노동청에 내려고 했는데 서류가 자꾸 반려됐대요.'], ['알바생 지은', 'parttime', '빨간 도장 악마들이 읽지도 않고 다 찍어 버린대요!']],
    end: [['알바생 지은', 'parttime', '임금체불 진정이 접수됐어요! 고마워요, 변호사님.']],
    rew: { exp: 550, gold: 2500 } },
  { id: 'q_gimbap', type: 'client', title: '잃어버린 등기권리증', giver: 'gimbap', req: { q: ['m7'] }, goals: [{ k: 'item', it: 'deed', n: 1 }],
    drops: [{ it: 'deed', ch: [3], rate: 0.5, from: 'safe' }],
    start: [['김밥집 사장', 'gimbap', '가게 건물 등기권리증이 폭풍에 날아갔어. 법조타운 어딘가 「서류 금고」에 들어갔을 거야.']],
    end: [['김밥집 사장', 'gimbap', '찾았구먼! 사실 잃어버려도 등기가 사라지진 않지만… 그래도 기분이 다르지!'], ['김밥집 사장', 'gimbap', '김밥 다섯 줄 가져가게. 공짜야.']],
    rew: { exp: 400, cons: { gimbap: 5 } } },
  { id: 'q_grandma', type: 'client', title: '할머니의 전화', giver: 'grandma', req: { q: ['m8'] }, goals: [{ k: 'kill', m: 'phonedemon', n: 20 }],
    start: [['순자 할머니', 'grandma', '아들이라고 전화가 와서 돈을 보냈는데… 아들이 아니었어.'], ['순자 할머니', 'grandma', '그 보라색 전화기 괴물들이 또 누굴 속일까 봐 무서워.']],
    end: [['순자 할머니', 'grandma', '바로 은행에 지급정지를 신청하면 돌려받을 수도 있다며? 고마워, 젊은이.']],
    rew: { exp: 900, gold: 4000, items: { b2: 1 } } },
  { id: 'q_webtoon', type: 'client', title: '악플과의 전쟁', giver: 'webtoon', req: { q: ['m8'] }, goals: [{ k: 'kill', m: 'bat', n: 30 }],
    start: [['웹툰 작가 하늘', 'webtoon', '연재 시작하고 매일 악플이 수백 개예요. 익명이라 어쩔 수 없대요…']],
    end: [['웹툰 작가 하늘', 'webtoon', '정보통신망을 이용한 명예훼손도 고소할 수 있다는 걸 알게 됐어요. 다시 그릴 힘이 나요!']],
    rew: { exp: 900, gold: 4000 } },
  { id: 'q_parttime2', type: 'client', title: '갑질 신고', giver: 'parttime', req: { q: ['q_parttime', 'm8'] }, goals: [{ k: 'kill', m: 'ogre', n: 12 }],
    start: [['알바생 지은', 'parttime', '새로 옮긴 가게 사장님이… “내가 누군지 알아?”래요. 매일 소리를 질러요.']],
    end: [['알바생 지은', 'parttime', '직장 내 괴롭힘도 신고할 수 있대요. 이젠 안 참아요!']],
    rew: { exp: 1000, gold: 4500 } },
  { id: 'q_yoon2', type: 'client', title: '다단계 탈출', giver: 'yoon', req: { q: ['c3', 'm8'] }, goals: [{ k: 'kill', m: 'hydra', n: 15 }],
    start: [['윤수익', 'yoon', '부모님 돈을 가져간 그 다단계… 히드라가 되어 수사 구역에 있대요. 같이 가 주실래요?']],
    end: [['윤수익', 'yoon', '끝났네요. 숫자로는 다 못 갚아도, 마음은 좀 갚은 것 같아요.']],
    rew: { exp: 1000, gold: 3000, items: { b2: 1 } } },

  // ---------- 히든 직업 ----------
  { id: 'h_defender', type: 'hidden', title: '국선의 밤', giver: 'haechi', req: { q: ['m9'], jobs: ['assoc'], client: 7, trivia: 12 }, goals: [{ k: 'clear', st: '4-4', hard: true, fresh: true }],
    start: [['해치', 'haechi', '돈이 없어도 변호받을 권리가 있어. 그걸 지키는 사람이 국선전담변호사야.'], ['해치', 'haechi', '넌 의뢰인을 많이 도왔지. 수사 구역 4단계의 항소심, 아무도 변호하지 않으려는 사건이 있어. 맡아 줄래?']],
    end: [['해치', 'haechi', '끝까지 곁에 있어 줬구나.'], ['sys', null, '[히든 직업 해금: 국선전담변호사] 법전 방패로 막고 동료를 지킨다.']],
    rew: { exp: 1500, unlock: 'defender', cos: 'halo' } },
  { id: 'h_special', type: 'hidden', title: '특별검사 임명', giver: 'kang', req: { q: ['m9'], jobs: ['prosecutor'] }, goals: [{ k: 'item', it: 'ledger', n: 3 }],
    drops: [{ it: 'ledger', ch: [4, 5], rate: 0.18, from: 'elite' }],
    start: [['강철민', 'kang', '도플갱어가 남긴 장부에 이상한 이름들이 있었습니다. 제대로 파헤치려면 특검이 필요합니다.'], ['강철민', 'kang', '정예 마물들이 「비리 장부」를 숨기고 있습니다. 세 권 모아 주십시오.']],
    end: [['강철민', 'kang', '이 정도면 특검 임명은 확실합니다!'], ['sys', null, '[히든 직업 해금: 특별검사] 수갑 쇠사슬 채찍으로 일직선의 적을 후려친다.']],
    rew: { exp: 1500, unlock: 'special', cos: 'policecap' } },
  { id: 'h_justice', type: 'hidden', title: '헌법의 수호자', giver: 'prof', req: { q: ['m9'], jobs: ['judge'], trivia: 20 }, goals: [{ k: 'item', it: 'petition', n: 5 }],
    drops: [{ it: 'petition', ch: [4, 5], rate: 0.045 }],
    start: [['엄정한 교수', 'prof', '법률이 헌법에 어긋나면, 누가 바로잡겠나?'], ['엄정한 교수', 'prof', '억울한 사람들의 「헌법 소원서」가 폭풍에 흩어졌네. 다섯 장을 모아 오게.']],
    end: [['엄정한 교수', 'prof', '헌법은 결국 사람을 지키기 위한 약속이네. 잊지 말게.'], ['sys', null, '[히든 직업 해금: 헌법재판관] 황금 지팡이와 결계로 전장을 지배한다.']],
    rew: { exp: 1500, unlock: 'justice', cos: 'scales' } },
];
// 3차 전직(승진) 퀘스트 — 해당 직업으로 Lv.30
QUESTS.push(
  { id: 'p_assoc', type: 'job', title: '파트너 승진 심사', giver: 'gimbap', req: { q: ['m9'], lv: 30, jobs: ['assoc'] }, goals: [{ k: 'item', it: 'promo', n: 3 }, { k: 'clear', st: '5-3', fresh: true }],
    drops: [{ it: 'promo', ch: [4, 5], rate: 0.2, from: 'elite' }],
    start: [['김밥집 사장', 'gimbap', '어이, 변호사 양반. 단골 로펌 대표가 자네를 파트너로 추천하고 싶대. 정예 마물한테서 「승진 추천서」 세 장 받아 오고, 30층 회장님도 정리해 보라고.']],
    end: [['김밥집 사장', 'gimbap', '축하하네, 파트너 변호사님! 오늘 김밥은 내가 쏜다!'], ['sys', null, '[3차 전직: 파트너 변호사] 각성 궁극기 「대형 로펌의 습격」 · 공격 +15% · 패시브 「파트너의 인맥」']],
    rew: { exp: 3000, rank: 'assoc' } },
  { id: 'p_pros', type: 'job', title: '부장검사 승진 심사', giver: 'kang', req: { q: ['m9'], lv: 30, jobs: ['prosecutor'] }, goals: [{ k: 'item', it: 'promo', n: 3 }, { k: 'clear', st: '5-3', fresh: true }],
    drops: [{ it: 'promo', ch: [4, 5], rate: 0.2, from: 'elite' }],
    start: [['강철민', 'kang', '선배님, 부장검사 승진 심사가 열렸습니다! 「승진 추천서」 세 장과 30층 회장 사건 해결이 조건입니다.']],
    end: [['강철민', 'kang', '부장검사님! 앞으로 모시겠습니다!'], ['sys', null, '[3차 전직: 부장검사] 각성 궁극기 「특별수사본부」 · 공격 +15% · 패시브 「부장의 결재」']],
    rew: { exp: 3000, rank: 'prosecutor' } },
  { id: 'p_judge', type: 'job', title: '부장판사 승진 심사', giver: 'prof', req: { q: ['m9'], lv: 30, jobs: ['judge'] }, goals: [{ k: 'item', it: 'promo', n: 3 }, { k: 'clear', st: '5-3', fresh: true }],
    drops: [{ it: 'promo', ch: [4, 5], rate: 0.2, from: 'elite' }],
    start: [['엄정한 교수', 'prof', '제자가 부장판사 후보라니. 「승진 추천서」 세 장을 받아 오고, 30층 사건도 판단해 보게.']],
    end: [['엄정한 교수', 'prof', '부장판사님이라 불러야겠군. 자랑스럽네.'], ['sys', null, '[3차 전직: 부장판사] 각성 궁극기 「전원합의체」 · 공격 +15% · 패시브 「부장의 경륜」']],
    rew: { exp: 3000, rank: 'judge' } },
  { id: 'p_ceo', type: 'job', title: '유니콘 심사: 시리즈 C', giver: 'yoon', req: { q: ['m9'], lv: 30, jobs: ['ceo'] }, goals: [{ k: 'item', it: 'promo', n: 3 }, { k: 'clear', st: '5-3', fresh: true }],
    drops: [{ it: 'promo', ch: [4, 5], rate: 0.2, from: 'elite' }],
    start: [['윤수익', 'yoon', '대표님, 기업가치 1조 심사가 잡혔습니다. 정예 마물한테서 「투자 확약서」, 아니 「승진 추천서」 세 장. 그리고 30층 회장 건 정리하시죠.'], ['윤수익', 'yoon', '참, 온라인으로 판 물건은 원칙적으로 7일 안에 청약철회가 됩니다. 환불 정책 꼭 챙기세요.']],
    end: [['윤수익', 'yoon', '유니콘입니다, 대표님! 퇴학이 신의 한 수였네요.'], ['sys', null, '[3차 전직: 유니콘 CEO] 각성 궁극기 「유니콘 등극」 · 공격 +15% · 패시브 「유니콘의 자금력」']],
    rew: { exp: 3000, rank: 'ceo', trivia: 't41' } },
  { id: 'p_pol', type: 'job', title: '총선 출마: 국회의원', giver: 'gimbap', req: { q: ['m9'], lv: 30, jobs: ['politician'] }, goals: [{ k: 'item', it: 'promo', n: 3 }, { k: 'clear', st: '5-3', fresh: true }],
    drops: [{ it: 'promo', ch: [4, 5], rate: 0.2, from: 'elite' }],
    start: [['김밥집 사장', 'gimbap', '총선이다! 정예 마물한테서 「추천서」 세 장 받아 오고, 30층 회장 사건으로 존재감 좀 보여 줘.'], ['김밥집 사장', 'gimbap', '국회의원이 되면 회기 중엔 현행범 아니면 국회 동의 없이 체포 못 한대. 그렇다고 막 살면 안 된다?']],
    end: [['김밥집 사장', 'gimbap', '당선 축하해, 의원님! 우리 가게 김밥이 선거 김밥이었어!'], ['sys', null, '[3차 전직: 국회의원] 각성 궁극기 「본회의 가결」 · 공격 +15% · 패시브 「보좌진」']],
    rew: { exp: 3000, rank: 'politician', trivia: 't36' } },
  { id: 'p_yt', type: 'job', title: '골드버튼 도전', giver: 'pan', req: { q: ['m9'], lv: 30, jobs: ['youtuber'] }, goals: [{ k: 'item', it: 'promo', n: 3 }, { k: 'clear', st: '5-3', fresh: true }],
    drops: [{ it: 'promo', ch: [4, 5], rate: 0.2, from: 'elite' }],
    start: [['한판례', 'pan', '구독자 99만! 정예 마물한테서 「협찬 제안서」… 아니, 「추천서」 세 장, 그리고 30층 회장 사건 라이브로 가요!'], ['한판례', 'pan', '악플러 고소할 때 알아 둬요. 비방 목적으로 인터넷에 사실을 퍼뜨려도 처벌될 수 있어요.']],
    end: [['한판례', 'pan', '골드버튼 도착! 언박싱 각이에요!'], ['sys', null, '[3차 전직: 골드버튼 유튜버] 각성 궁극기 「골드버튼 언박싱」 · 공격 +15% · 패시브 「알고리즘의 축복」']],
    rew: { exp: 3000, rank: 'youtuber', trivia: 't44' } },
);
QITEMS.promo = { name: '승진 추천서', icon: ['loot', LOOT.contract] };
QITEMS.clip = { name: '촬영 클립', icon: ['loot', LOOT.energy] };

// 성장 안내 (조건을 만족하면 한 번씩 뜬다)
const GUIDES = {
  g_stat: { title: '성장 포인트가 생겼어요!', body: '레벨이 오르면 스탯 3점(논리력=공격, 멘탈=체력, 집중력=스킬, 순발력=속도)과 스킬 포인트 1점이 생겨요. 메뉴 버튼의 빨간 점을 눌러 바로 찍어 보세요. 안 찍으면 계속 알려 줄게요.' },
  g_job1: { title: '1차 전직: 로스쿨생', body: 'Lv.7을 넘기고 1장(대학가)을 끝내면 해치의 「로스쿨 입학 원서」 퀘스트로 1차 전직! 로스쿨생은 법전을 휘두르고 판례 쪽지를 날립니다.' },
  g_keep: { title: '예전 스킬도 그대로', body: '전직해도 배운 스킬은 사라지지 않아요. 메뉴 → 스킬에서 원하는 스킬을 A·S·D 칸에 넣어 쓰세요. (다른 직업 스킬은 위력 90%)\n새 직업 첫 스킬은 예전 스킬 레벨의 절반에서 시작합니다.' },
  g_resume: { title: '이력서 = 이직할수록 강해진다', body: '직업을 하나 얻을 때마다 「이력서」 칸이 1칸 늘어요. 예전 직업의 패시브를 꽂아 들고 다닐 수 있어요. 여러 직업을 거칠수록 다채롭게 성장합니다! (메뉴 → 이력서)' },
  g_job2: { title: '2차 전직 예고', body: 'Lv.15에 변호사시험! 합격하면 2차 전직:\n· 검사 — 근거리 · 2단 도약 · 증거→기소 ★☆☆ 입문\n· 어쏘변호사 — 중거리 · 균형 ★★☆\n· 판사 — 원거리 · 커피↑ 멘탈↓ ★★★\n셋 중 하나만 고를 수 있어요 (바꾸려면 「이직 신청서」). 2차 전직 시 스킬 칸 +1!' },
  g_slow: { title: '이제부터는 한 걸음씩', body: '레벨이 오를수록 필요 경험치가 크게 늘어요. 앞 단계 반복(파밍), 오늘의 의뢰, 장비 강화, 동료 레벨업으로 성장하세요. 상점의 경험치 부스터를 쓰면 30분간 경험치 2배!' },
  g_hidden: { title: '히든 직업이 있다?', body: '조건을 채우면 히든 직업을 체험할 수 있어요.\n· 국선전담변호사 — 어쏘변호사 해금 + 의뢰인 퀘스트 7개 + 법률 상식 카드 12장 + 4장 해결\n· 특별검사 — 검사 해금 + 4장 해결… 강철민이 뭔가 알고 있다\n· 헌법재판관 — ??? (도감에 단서)' },
  g_job3: { title: '3차 전직: 승진', body: 'Lv.30부터 2차 직업별 승진 심사!\n· 어쏘변호사 → 파트너 변호사\n· 검사 → 부장검사\n· 판사 → 부장판사\n· CEO → 유니콘 CEO · 정치 신인 → 국회의원 · 유튜버 → 골드버튼 유튜버\n각성 궁극기와 승진 패시브가 열립니다.' },
  g_death: { title: '번아웃…', body: '장비 강화, 스킬 레벨, 동료, 스탯(논리력=공격), 이력서 패시브를 점검하세요. 앞 단계를 다시 돌며 파밍하는 것도 방법입니다. (그 자리 부활: 사건당 4번 · 인지 50→100→200→300)' },
  g_cos: { title: '꾸미기', body: '코스튬은 모습을 바꾸는 수집품이에요. 입든 안 입든 모으기만 해도 능력치가 붙어요(수집 효과). 메뉴 → 「코디」에서 갈아입고, 퀘스트 보상·보스 드롭·상점의 「코스튬 뽑기」로 모으세요.' },
};
const HIDDEN_HINTS = {
  defender: '어쏘변호사 · 의뢰인을 많이 도운 자 · 법률 상식 카드 12장',
  special: '검사 · 수사 구역을 정리한 자 · 강철민이 무언가 알고 있다',
  justice: '판사 · 법률 상식 카드 20장 · 엄정한 교수의 마지막 수업',
};

// ======================================================================
// 변호사시험 (OX) — 실제 법령 기준
// ======================================================================
const QUIZ = [
  { q: '민법상 사람은 19세로 성년에 이른다.', a: true, why: '민법 제4조.' },
  { q: '형사피고인은 유죄 판결이 확정될 때까지는 무죄로 추정된다.', a: true, why: '헌법 제27조 제4항.' },
  { q: '민사소송을 제기하려면 반드시 변호사를 선임해야 한다.', a: false, why: '민사소송은 본인이 직접 할 수 있다(본인소송).' },
  { q: '헌법재판소는 9인의 재판관으로 구성된다.', a: true, why: '헌법 제111조 제2항.' },
  { q: '일반 민사채권의 소멸시효는 10년이다.', a: true, why: '민법 제162조 제1항.' },
  { q: '누구든지 체포 또는 구속을 당한 때에는 즉시 변호인의 조력을 받을 권리를 가진다.', a: true, why: '헌법 제12조 제4항.' },
  { q: '주택 임차인은 주민등록(전입신고)을 하지 않아도 대항력을 가진다.', a: false, why: '주택의 인도와 주민등록을 마친 다음 날부터 대항력이 생긴다(주택임대차보호법 제3조).' },
  { q: '14세가 되지 아니한 자의 행위는 형법상 벌하지 아니한다.', a: true, why: '형법 제9조.' },
  { q: '제1심 판결에 불복하여 상급법원에 다시 판단을 구하는 것을 「항소」라고 한다.', a: true, why: '항소 → 상고 순서.' },
  { q: '임금은 매월 1회 이상 일정한 날짜를 정하여 지급하여야 한다.', a: true, why: '근로기준법 제43조 제2항.' },
  { q: '대통령의 임기는 5년이며, 중임할 수 없다.', a: true, why: '헌법 제70조.' },
  { q: '보이스피싱으로 송금했다면 법적으로 할 수 있는 일이 전혀 없다.', a: false, why: '즉시 금융회사에 지급정지를 신청할 수 있다.' },
  { q: '체포한 피의자를 구속하려면 체포한 때부터 48시간 이내에 구속영장을 청구해야 한다.', a: true, why: '형사소송법 제200조의2 제5항.' },
  { q: '모욕죄는 피해자의 고소가 없어도 공소를 제기할 수 있다.', a: false, why: '모욕죄는 친고죄다(형법 제312조 제1항).' },
  { q: '민사 판결에 대한 항소는 판결서를 송달받은 날부터 2주 안에 해야 한다.', a: true, why: '민사소송법 제396조 제1항.' },
  { q: '형사 판결에 대한 항소기간은 14일이다.', a: false, why: '7일이다(형사소송법 제358조).' },
  { q: '대법관의 수는 대법원장을 포함하여 14명이다.', a: true, why: '법원조직법 제4조 제2항.' },
  { q: '법률의 위헌결정은 재판관 과반수(5인)의 찬성으로 충분하다.', a: false, why: '6인 이상의 찬성이 필요하다(헌법 제113조 제1항).' },
  { q: '음식점의 음식료 채권은 1년의 단기소멸시효에 걸린다.', a: true, why: '민법 제164조 제1호.' },
  { q: '진실한 사실을 적시한 명예훼손은 형법상 처벌되지 않는다.', a: false, why: '사실 적시도 처벌될 수 있다(형법 제307조 제1항). 진실하고 오로지 공공의 이익을 위한 때는 벌하지 않는다(제310조).' },
  { q: '상속을 포기하려면 상속개시 있음을 안 날부터 3개월 안에 해야 한다.', a: true, why: '민법 제1019조 제1항.' },
  { q: '국회의원의 임기는 5년이다.', a: false, why: '4년이다(헌법 제42조).' },
  { q: '통신판매로 산 물건은 원칙적으로 7일 안에 청약을 철회할 수 있다.', a: true, why: '전자상거래법 제17조 제1항.' },
  { q: '사람을 살해한 범죄로 사형에 해당하는 범죄에는 공소시효가 적용되지 않는다.', a: true, why: '형사소송법 제253조의2.' },
];

// ======================================================================
// 법률 상식 카드 — 몬스터 대사·NPC 대화·전직·퀘스트에서 모은다. 4장마다 스탯 포인트 +1
// ======================================================================
const TRIVIA = {
  t1: { t: '성년은 19세', d: '사람은 19세로 성년에 이른다.', law: '민법 제4조' },
  t2: { t: '미성년자의 계약', d: '미성년자가 법정대리인의 동의 없이 한 법률행위는 취소할 수 있다.', law: '민법 제5조' },
  t3: { t: '소멸시효 10년', d: '일반 채권은 10년 동안 행사하지 않으면 소멸시효가 완성된다.', law: '민법 제162조 제1항' },
  t4: { t: '상사시효 5년', d: '상행위로 생긴 채권의 소멸시효는 원칙적으로 5년이다.', law: '상법 제64조' },
  t5: { t: '밥값 시효는 1년', d: '음식점·숙박업소의 음식료·숙박료 채권의 소멸시효는 1년이다.', law: '민법 제164조 제1호' },
  t6: { t: '무죄 추정', d: '형사피고인은 유죄 판결이 확정될 때까지 무죄로 추정된다.', law: '헌법 제27조 제4항' },
  t7: { t: '진술거부권', d: '누구든지 형사상 자기에게 불리한 진술을 강요당하지 아니한다.', law: '헌법 제12조 제2항' },
  t8: { t: '변호인의 조력', d: '체포 또는 구속을 당하면 즉시 변호인의 조력을 받을 권리가 있다.', law: '헌법 제12조 제4항' },
  t9: { t: '48시간', d: '체포한 피의자를 구속하려면 체포한 때부터 48시간 이내에 구속영장을 청구해야 한다.', law: '형사소송법 제200조의2 제5항' },
  t10: { t: '형사미성년자', d: '14세가 되지 아니한 자의 행위는 벌하지 아니한다.', law: '형법 제9조' },
  t11: { t: '정당방위', d: '현재의 부당한 침해를 막기 위한 행위는 상당한 이유가 있으면 벌하지 않는다.', law: '형법 제21조 제1항' },
  t12: { t: '이중처벌 금지', d: '모든 국민은 동일한 범죄에 대하여 거듭 처벌받지 아니한다.', law: '헌법 제13조 제1항' },
  t13: { t: '사실 적시 명예훼손', d: '공연히 사실을 적시해 명예를 훼손해도 처벌될 수 있다. 진실이고 오로지 공공의 이익을 위한 때는 벌하지 않는다.', law: '형법 제307조 제1항·제310조' },
  t14: { t: '모욕죄는 친고죄', d: '모욕죄는 피해자의 고소가 있어야 공소를 제기할 수 있다.', law: '형법 제312조 제1항' },
  t15: { t: '민사 항소 2주', d: '민사 판결에 대한 항소는 판결서를 송달받은 날부터 2주 안에 해야 한다.', law: '민사소송법 제396조 제1항' },
  t16: { t: '형사 항소 7일', d: '형사 판결에 대한 항소기간은 7일이다.', law: '형사소송법 제358조' },
  t17: { t: '소액사건', d: '소송목적의 값이 3,000만 원 이하인 민사사건은 소액사건심판절차로 처리된다.', law: '소액사건심판규칙 제1조의2' },
  t18: { t: '대항력은 다음 날부터', d: '주택 임차인은 주택을 인도받고 주민등록(전입신고)을 마치면 그 다음 날부터 대항력이 생긴다.', law: '주택임대차보호법 제3조 제1항' },
  t19: { t: '확정일자와 우선변제', d: '대항요건과 확정일자를 갖춘 임차인은 경매 때 후순위 권리자보다 먼저 보증금을 받을 수 있다.', law: '주택임대차보호법 제3조의2 제2항' },
  t20: { t: '계약갱신요구권', d: '주택 임차인은 계약갱신요구권을 1회 행사할 수 있고, 갱신되는 임대차의 존속기간은 2년이다.', law: '주택임대차보호법 제6조의3' },
  t21: { t: '연장근로 가산', d: '연장근로에는 통상임금의 50% 이상을 가산해 지급해야 한다 (상시 5명 이상 사업장).', law: '근로기준법 제56조 제1항' },
  t22: { t: '월급날', d: '임금은 매월 1회 이상 일정한 날짜를 정하여 지급해야 한다.', law: '근로기준법 제43조 제2항' },
  t23: { t: '해고 예고', d: '근로자를 해고하려면 적어도 30일 전에 예고해야 한다 (예외 있음).', law: '근로기준법 제26조' },
  t24: { t: '주휴일', d: '1주 동안 소정근로일을 개근한 근로자에게는 1주에 평균 1회 이상의 유급휴일을 줘야 한다 (1주 15시간 이상).', law: '근로기준법 제55조 제1항 · 시행령 제30조' },
  t25: { t: '상속 포기 3개월', d: '상속을 포기하거나 한정승인하려면 상속개시 있음을 안 날부터 3개월 안에 해야 한다.', law: '민법 제1019조 제1항' },
  t26: { t: '헌법재판관 9인', d: '헌법재판소는 법관의 자격을 가진 9인의 재판관으로 구성된다.', law: '헌법 제111조 제2항' },
  t27: { t: '위헌은 6인', d: '법률의 위헌결정, 탄핵 결정 등에는 재판관 6인 이상의 찬성이 있어야 한다.', law: '헌법 제113조 제1항' },
  t28: { t: '대법관 14명', d: '대법관의 수는 대법원장을 포함하여 14명이다.', law: '법원조직법 제4조 제2항' },
  t29: { t: '법관 임기 10년', d: '대법원장과 대법관이 아닌 법관의 임기는 10년이며, 연임할 수 있다.', law: '헌법 제105조 제3항' },
  t30: { t: '공익의 대표자', d: '검사는 공익의 대표자로서 범죄수사, 공소 제기와 그 유지 등의 직무와 권한이 있다.', law: '검찰청법 제4조 제1항' },
  t31: { t: '국선변호인', d: '구속된 피고인에게 변호인이 없으면 법원은 직권으로 변호인을 선정해야 한다.', law: '형사소송법 제33조 제1항' },
  t32: { t: '5년 5회', d: '변호사시험은 법학전문대학원 석사학위를 취득한 달의 말일부터 5년 내에 5회만 응시할 수 있다.', law: '변호사시험법 제7조 제1항' },
  t34: { t: '국회의원 임기 4년', d: '국회의원의 임기는 4년으로 한다.', law: '헌법 제42조' },
  t35: { t: '면책특권', d: '국회의원은 국회에서 직무상 행한 발언과 표결에 관하여 국회 외에서 책임을 지지 아니한다.', law: '헌법 제45조' },
  t36: { t: '불체포특권', d: '국회의원은 현행범인 경우를 제외하고는 회기 중 국회의 동의 없이 체포 또는 구금되지 아니한다.', law: '헌법 제44조 제1항' },
  t37: { t: '대통령은 40세부터', d: '대통령으로 선거될 수 있는 자는 국회의원 피선거권이 있고 선거일 현재 40세에 달하여야 한다.', law: '헌법 제67조 제4항' },
  t38: { t: '국회의원은 18세부터', d: '18세 이상의 국민은 국회의원의 피선거권이 있다.', law: '공직선거법 제16조 제2항' },
  t39: { t: '1원 창업?', d: '주식회사 최저자본금 제도는 폐지되었다. 액면주식 1주의 금액은 100원 이상이어야 한다.', law: '상법 제329조' },
  t40: { t: '이사의 충실의무', d: '이사는 법령과 정관의 규정에 따라 회사를 위하여 그 직무를 충실하게 수행하여야 한다.', law: '상법 제382조의3' },
  t41: { t: '7일 청약철회', d: '통신판매로 산 물건은 원칙적으로 계약서를 받은 날(늦게 받았으면 공급받은 날)부터 7일 안에 청약을 철회할 수 있다.', law: '전자상거래법 제17조 제1항' },
  t42: { t: '저작권 사후 70년', d: '저작재산권은 원칙적으로 저작자가 생존하는 동안과 사망한 후 70년간 존속한다.', law: '저작권법 제39조 제1항' },
  t43: { t: '공정이용', d: '저작물의 통상적 이용 방법과 충돌하지 않고 저작자의 정당한 이익을 부당하게 해치지 않으면 공정이용이 인정될 수 있다.', law: '저작권법 제35조의5' },
  t44: { t: '악플과 명예훼손', d: '사람을 비방할 목적으로 정보통신망을 통해 사실을 드러내 명예를 훼손하면 3년 이하의 징역 등으로 처벌된다.', law: '정보통신망법 제70조 제1항' },
  t45: { t: '뒷광고', d: '협찬 등 경제적 이해관계를 숨긴 추천·보증 광고는 기만적 광고로 제재받을 수 있다.', law: '표시·광고의 공정화에 관한 법률' },
  t46: { t: '보이스피싱 지급정지', d: '전기통신금융사기 피해자는 금융회사에 피해구제를 신청해 사기 계좌의 지급정지를 요청할 수 있다.', law: '통신사기피해환급법 제3조·제4조' },
  t47: { t: '다단계 과다 부담 금지', d: '다단계판매원 등록이나 자격 유지 조건으로 과다한 재화 구입 등 부담을 지게 하는 행위는 금지된다.', law: '방문판매법 제22조' },
  t48: { t: '공소시효 없는 범죄', d: '사람을 살해한 범죄로 사형에 해당하는 범죄에는 공소시효가 적용되지 않는다.', law: '형사소송법 제253조의2' },
  t49: { t: '0.03%', d: '혈중알코올농도 0.03% 이상이면 술에 취한 상태로 본다.', law: '도로교통법 제44조 제4항' },
  t51: { t: '직장 내 괴롭힘 금지', d: '직장에서의 지위·관계 우위를 이용해 업무상 적정범위를 넘어 다른 근로자에게 고통을 주어서는 안 된다.', law: '근로기준법 제76조의2' },
  t52: { t: '내용증명', d: '내용증명은 어떤 내용의 문서를 언제 누구에게 보냈는지 우체국이 증명하는 제도다. 그 자체로 새 법적 효력이 생기지는 않는다.', law: '우편법 시행규칙' },
};
// 몬스터 대사 — 악당 말투로 법을 흘린다 (처음 들으면 카드 획득)
const MOB_BARKS = {
  paperimp: [['끼히히! 10년 동안 안 받아 가면 그 돈은 끝이야!', 't3'], ['내용증명? 보냈다는 증명일 뿐이지, 끼히히!', 't52']],
  slime: [['전입신고 안 했지? 대항력도 없지~ 말랑말랑~', 't18'], ['확정일자? 그게 뭔데 말랑~', 't19']],
  goblin: [['월급날? 그런 거 꼭 정해야 해?! 째깍째깍!', 't22'], ['항소는 2주 안에! 늦으면 끝이다, 째깍!', 't15']],
  ghost: [['야근… 수당… 50% 더… 받는 거였어…?', 't21'], ['개근했는데… 주휴일은… 어디에…', 't24']],
  copier: [['복사 복사! 남의 영상도 막 쓰면 되지! …안 되나?', 't43'], ['저작권? 작가 죽고 70년이면 내 거다, 위잉!', 't42']],
  canmimic: [['갱신? 한 번은 해 줘야 한다며? 칫…', 't20'], ['확정일자 받은 놈은 순서가 앞이라더군. 깡깡!', 't19']],
  stampdevil: [['위헌? 9명 중에 6명이 찬성해야 하거든! 각하!', 't27'], ['같은 걸로 또 처벌? 그건 안 된다던데. 각하!', 't12']],
  phonedemon: [['엄마, 나 폰 고장… 뭐? 지급정지 신청했다고?!', 't46'], ['체포했으면 48시간 안에 영장! 그 전에 튀어야지!', 't9']],
  bat: [['악플은 익명이니까 괜찮… 3년 이하 징역?!', 't44'], ['모욕은 고소 없으면 처벌 못 한다지? 끽끽!', 't14']],
  hydra: [['한 명만 데려와! 가입비는 조금만… 과다 부담은 금지라고?', 't47'], ['환불? 7일 지났어! …안 지났다고?', 't41']],
  ogre: [['내가 누군지 알아?! …직장 내 괴롭힘이라고?', 't51'], ['내일부터 나오지 마! …30일 전에 예고해야 한다고?', 't23']],
  lich: [['권리 위에 잠자는 자여… 장사 빚은 5년이면 끝이다…', 't4'], ['밥값은 1년이면 소멸이지… 크크크…', 't5']],
};
// NPC 대화에 섞이는 상식
const NPC_TRIVIA = {
  prof: ['t6', 't7', 't8', 't28', 't29', 't26'], haechi: ['t26', 't27', 't12'], gimbap: ['t5', 't21', 't22'], pan: ['t15', 't16', 't32', 't43'],
  kang: ['t9', 't10', 't11', 't49', 't48'], yoon: ['t4', 't39', 't40', 't47'], grandma: ['t25', 't46'], tenant: ['t18', 't19', 't20'],
  parttime: ['t22', 't24', 't21'], webtoon: ['t42', 't43', 't44'], office: ['t51', 't23'], gosiwon: ['t17', 't52', 't1', 't2'],
};
// 전직할 때 알려 주는 상식
const JOB_TRIVIA = { lawschool: 't32', assoc: 't17', prosecutor: 't30', judge: 't29', defender: 't31', special: 't48', justice: 't27', ceo: 't40', politician: 't35', youtuber: 't45' };
// 성장 안내 추가
Object.assign(GUIDES, {
  g_lock: { title: '진로는 한 번뿐', body: '2차 직업은 한 번 고르면 바꿀 수 없어요. 대학생·로스쿨생으로 돌아갈 수도 없습니다.\n다른 길이 궁금하면 상점의 「이직 신청서」(유료)로만 옮길 수 있어요. 옮길 때마다 이력서 칸이 늘어요.' },
  g_auto: { title: '자동 사냥은 해결한 사건만', body: '처음 해결하는 사건은 직접 싸워야 해요. 한 번 해결한 사건만 AUTO로 반복할 수 있습니다.\nAUTO는 공격력 80%, 스킬을 쓰지 않아요(피하기와 줍기는 해요). 상점의 「AI 법률비서」를 쓰면 공격력 100%에 스킬도 씁니다.' },
  g_dj: { title: '근거리 2단 점프', body: '근거리 직업은 공중에서 점프(X·↑)를 한 번 더 누르면 누른 쪽으로 「도약」해요.\n멀리 붙고, 탄을 피하고, 발판 사이를 건너요.\n높이는 조금만 오르니 2·3층은 밧줄로!' },
  g_snipe: { title: '위층 저격수', body: '책을 쏘는 몬스터(리치·복사기·히드라)는 위층에서 내려오지 않아요.\n점프로 발판을 밟고 올라가 처리하세요. 원거리는 아래에서 비스듬히 쏠 수도 있어요.\n밧줄은 맨 위 보물 금고로만 이어져요.' },
  g_evidence: { title: '증거 → 기소 · 구속', body: '검사는 기본 공격이 맞을 때마다 「증거」가 쌓여요(머리 위 빨간 도장).\n5개가 모이면 다음 공격이 「기소!」 — 주변을 크게 내려찍고 기절시킵니다.\n체력이 18% 이하인 일반 몬스터는 기본 공격 한 방에 「구속」! 멘탈과 커피가 찹니다.' },
  g_drop: { title: '퇴학… 그리고 새 길', body: '로스쿨은 다시 들어갈 수 없어요. 대신 세 갈래 길이 열렸습니다.\n· 리걸테크 CEO — 근거리, 스킬에 돈을 쓴다\n· 정치 신인 — 중거리, 지지율이 힘\n· 법률 유튜버 — 원거리, 시청자가 힘' },
  g_trivia: { title: '법률 상식 카드', body: '몬스터 대사, 마을 사람들 대화, 전직 때 법률 상식 카드를 모아요. 4장마다 스탯 포인트 +1!\n메뉴 → 도감에서 모은 카드를 볼 수 있어요. 히든 직업 조건에도 쓰입니다.' },
  g_surv: { title: '로스쿨 서바이벌', body: '사건 게시판의 「로스쿨 서바이벌」: 끝없이 몰려오는 시험 마물을 버티는 모드예요. 5웨이브마다 중간 보스, 갈수록 강해집니다. 최고 기록에 도전하세요!' },
});

// ======================================================================
// 직업별 엔딩 — 김성호를 넘은 직업에 따라 갈린다. 9개를 모으면 소문의 전모가 드러난다
// ======================================================================
const ENDINGS = {
  assoc: { n: 1, title: '저승 당직 변호사', img: 'end_assoc', sum: '낮에는 대형 로펌 파트너, 밤에는 망자의 변호인. 오늘도 50층의 불은 꺼지지 않는다.', lines: [
    ['김성호 변호사', 'kim', '후배님, 우리 사무소 50층이 왜 밤마다 불이 켜져 있는지 알아요?'],
    ['김성호 변호사', 'kim', '자정이 넘으면 이 층은 저승 명부전(冥府殿) 출장소가 돼요. 억울하게 떠난 사람들, 미결로 남은 사건들이 줄을 서죠.'],
    ['해치', 'haechi', '그래서 맨날 야근이었던 거야.'],
    ['김성호 변호사', 'kim', '각하가 빠져나간 지금, 당직이 한 명 더 필요해요. 이 열쇠, 받아 줄래요?'],
    ['나', 'hero', '…야근 수당은요?'],
    ['김성호 변호사', 'kim', '연장근로는 통상임금의 50% 이상 가산(근로기준법 제56조). 저승 노잣돈으로 드릴게요.'],
  ] },
  prosecutor: { n: 2, title: '저승 특수부', img: 'end_prosecutor', sum: '이승과 저승 최초의 공조수사본부. 첫 수배자는 미결마왕 각하.', lines: [
    ['김성호 변호사', 'kim', '(검은 옥패를 꺼내며) 사실 저도 수사기관 소속이에요. 저승 쪽.'],
    ['저승사자', 'saja', '형님! 이분이 그 검사님? 실물이 낫네.'],
    ['김성호 변호사', 'kim', '염라대왕님 직속 특별수사관이에요. 각하 같은 놈 잡는 게 본업이고, 변호사는… 부업?'],
    ['나', 'hero', '변호사가 부업이라고요?!'],
    ['김성호 변호사', 'kim', '검사는 공익의 대표자잖아요(검찰청법 제4조). 이승 공익, 저승 공익. 둘 다 부탁해요.'],
  ] },
  judge: { n: 3, title: '열한 번째 시왕', img: 'end_judge', sum: '낮에는 법원, 밤에는 저승 법정. 판결문이 두 배로 늘었다.', lines: [
    ['sys', null, '그날 밤, 꿈속에서 열 명의 왕이 나를 내려다보고 있었다.'],
    ['염라대왕', 'yeomra', '저승 시왕(十王)이 판결을 못 따라가고 있다. 밀린 사건이 3천 년 치다.'],
    ['김성호 변호사', 'kim', '(변호인석에서) 추천서는 제가 썼어요. 이 사람, 기록을 끝까지 읽습니다.'],
    ['염라대왕', 'yeomra', '좋다. 오늘부터 열한 번째 시왕이다. 법관 임기는 10년이랬지(헌법 제105조 제3항)… 이승 기준으로.'],
    ['나', 'hero', '저승 기준으로는요?'],
    ['염라대왕', 'yeomra', '영원.'],
  ] },
  defender: { n: 4, title: '지옥 국선변호인', img: 'end_defender', sum: '첫 의뢰인: 서류 임프 외 999마리. 수임료 없음. 보람 무한.', lines: [
    ['김성호 변호사', 'kim', '각하는 도망갔지만, 남은 마물들은 재판을 받아야 해요. 그런데 아무도 변호를 안 맡으려 하네요.'],
    ['서류 임프', 'imp', '(울먹) 저… 저도 변호사 선임할 수 있나요…?'],
    ['나', 'hero', '누구든지 체포·구속을 당한 때에는 즉시 변호인의 조력을 받을 권리를 가진다. 헌법 제12조 제4항.'],
    ['김성호 변호사', 'kim', '「누구든지」. 마물도 들어가는지는 판례가 없네요. 그럼 우리가 만들죠.'],
    ['서류 임프', 'imp', '변호사님…! (서류를 흩날리며 운다)'],
  ] },
  special: { n: 5, title: '소문의 진상', img: 'end_special', sum: '수사 결과는 봉인되었다. 「혐의 없음 — 단, 그림자에 뿔이 있음」.', lines: [
    ['나', 'hero', '(낡은 사진을 내밀며) 1925년 경성 법원 앞. 여기 이 사람, 변호사님이죠?'],
    ['김성호 변호사', 'kim', '…눈썰미 좋네요.'],
    ['나', 'hero', '「지옥에서 온 변호사」. 그건 소문이 아니었어요.'],
    ['김성호 변호사', 'kim', '(커피를 홀짝) 정확히는 지옥에서 「탈주한」 변호사예요. 거기 법정은 기록을 안 읽거든요. 그게 싫어서 나왔어요.'],
    ['김성호 변호사', 'kim', '공소시효가 없는 건 사형에 해당하는 살인죄뿐이잖아요(형사소송법 제253조의2). 탈주는… 지났겠죠?'],
    ['sys', null, '벽에 비친 그의 그림자에, 아주 잠깐 뿔이 보였다.'],
  ] },
  justice: { n: 6, title: '저승 헌법재판소', img: 'end_justice', sum: '3천 년 만의 첫 위헌 결정. 망자들에게 최후진술권이 생겼다.', lines: [
    ['염라대왕', 'yeomra', '저승법 제1조. 망자는 변론할 수 없다.'],
    ['나', 'hero', '그 조항, 위헌입니다. 누구에게나 자기 말을 할 기회가 있어야 해요.'],
    ['김성호 변호사', 'kim', '재판관 9명 중 6명 이상 찬성이면 위헌 결정이죠(헌법 제113조 제1항). 저승 재판관은 몇 분이세요?'],
    ['염라대왕', 'yeomra', '…나 혼자다.'],
    ['나', 'hero', '그럼 9명으로 늘리는 것부터 하시죠.'],
    ['염라대왕', 'yeomra', '(팔짱) …흥. 위헌.'],
  ] },
  ceo: { n: 7, title: '저승 유니콘', img: 'end_ceo', sum: '「명부 클라우드」 상장. 사외이사 김성호, 최대 고객 염라대왕.', lines: [
    ['김성호 변호사', 'kim', '축하해요, 대표님. 그런데 우리 사무소 저승 고객 명부… 종이로 3천 년 치예요.'],
    ['나', 'hero', '클라우드로 옮기시죠. 「명부(冥簿) 클라우드」, 월 구독.'],
    ['염라대왕', 'yeomra', '(화상회의로) 짐도 구독하겠다. 법인카드 되나?'],
    ['윤수익', 'yoon', '대표님! 기업가치 10조 원! 고객이 전부 망자라 이탈률 0%예요!'],
    ['김성호 변호사', 'kim', '통신판매 청약철회는 7일이에요(전자상거래법 제17조). 저승 고객도 똑같이요.'],
  ] },
  politician: { n: 8, title: '흑막의 설계도', img: 'end_politician', sum: '특별법 제1조 「모든 사건은 읽고 판단한다」. 대표 발의: 당신. 설계: ???', lines: [
    ['sys', null, '당선 축하 파티가 끝난 새벽, 김성호가 커피 두 잔을 들고 왔다.'],
    ['김성호 변호사', 'kim', '축하해요, 의원님. 로스쿨 중간고사… 아팠죠?'],
    ['나', 'hero', '…그걸 어떻게 아세요?'],
    ['김성호 변호사', 'kim', '그 시험, 제가 출제위원이었어요. (안경이 번쩍인다)'],
    ['김성호 변호사', 'kim', '각하를 영원히 막으려면 법이 필요했어요. 「미결사건 신속처리 특별법」. 법은 국회가 만드니까요.'],
    ['나', 'hero', '처음부터… 전부 계획이었어요?'],
    ['김성호 변호사', 'kim', '흑막이라뇨. 저는 그냥 기록을 끝까지 읽었을 뿐이에요.'],
  ] },
  youtuber: { n: 9, title: '조회수 지옥', img: 'end_youtuber', sum: '영상 「지옥에서 온 변호사 실존?! (CG 아님)」 조회수 1,000만. 댓글 1위: 「저 사람 저승 국선 아님?」', lines: [
    ['나', 'hero', '구독자 여러분! 오늘은 그 유명한 「지옥에서 온 변호사」 김성호 변호사님 모셨습니다!'],
    ['김성호 변호사', 'kim', '안녕하세요. 소문은… 대부분 과장이에요.'],
    ['sys', null, '그 순간, 창문에 비친 김성호의 그림자에 뿔이 돋는다. 채팅창이 폭발한다.'],
    ['한판례', 'pan', '실시간 1위! 조회수 1,000만 돌파!'],
    ['김성호 변호사', 'kim', '(카메라 밖에서 윙크) 협찬 받았으면 꼭 표시하세요. 뒷광고는 표시광고법 위반이에요.'],
  ] },
};
const ENDING_IDS = Object.keys(ENDINGS);
const HIDDEN_OF = { assoc: 'defender', prosecutor: 'special', judge: 'justice' };   // 기본 직업 → 히든 직업 (엔딩 2개 동선)
const ENDING_OUTRO = ['sys', null, '— 1부 완결. 엔딩을 모을수록 「지옥에서 온 변호사」의 진짜 정체가 드러난다. 항소심·상고심과 다른 직업의 엔딩이 기다린다. —'];
