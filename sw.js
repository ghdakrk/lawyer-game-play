// 법조인 키우기 오프라인 캐시 (0.7.11-test). 빌드할 때마다 이름이 바뀌어 예전 캐시는 지워진다
const CACHE = 'lg-0.7.11-test-a0e0a925';
const FILES = ["./", "index.html", "manifest.webmanifest", "data.js", "music.js", "core.js", "skills.js", "ui.js", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "assets/atlas_boss.png", "assets/atlas_comp.png", "assets/atlas_heroes.png", "assets/atlas_hidden.png", "assets/atlas_loco1.png", "assets/atlas_loco2.png", "assets/atlas_loco3.png", "assets/atlas_mobs.png", "assets/atlas_npc.png", "assets/atlas_route.png", "assets/bg_alley.jpg", "assets/bg_campus.jpg", "assets/bg_library.jpg", "assets/bg_office.jpg", "assets/bg_town.jpg", "assets/boss_clock.png", "assets/boss_doppel.png", "assets/boss_golem.png", "assets/boss_kakha.png", "assets/boss_kim.png", "assets/boss_orc.png", "assets/cosmetics.png", "assets/end_assoc.jpg", "assets/end_ceo.jpg", "assets/end_defender.jpg", "assets/end_judge.jpg", "assets/end_justice.jpg", "assets/end_politician.jpg", "assets/end_prosecutor.jpg", "assets/end_special.jpg", "assets/end_youtuber.jpg", "assets/hero_assoc.png", "assets/hero_judge.png", "assets/hero_lawschool.png", "assets/hero_prosecutor.png", "assets/hero_student.png", "assets/items_equip.png", "assets/items_loot.png", "assets/legend.png", "assets/mob_bat.png", "assets/mob_canmimic.png", "assets/mob_copier.png", "assets/mob_ghost.png", "assets/mob_goblin.png", "assets/mob_hydra.png", "assets/mob_lich.png", "assets/mob_ogre.png", "assets/mob_paperimp.png", "assets/mob_phonedemon.png", "assets/mob_slime.png", "assets/mob_stampdevil.png", "assets/npc_gimbap.png", "assets/npc_gimbap_body.png", "assets/npc_gosiwon.png", "assets/npc_gosiwon_body.png", "assets/npc_haechi.png", "assets/npc_saja.png", "assets/npc_yeomra.png", "assets/plat_tiles.png"];
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(FILES.map((f) => c.add(f).catch(() => null)))));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
const put = (req, res) => { if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); } return res; };
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (/\.apk$/.test(url.pathname)) return;   // 앱 설치 파일은 캐시하지 않는다 (늘 최신)
  const code = req.mode === 'navigate' || /\.(js|html|webmanifest)$/.test(url.pathname);
  if (code) {   // 코드는 새로 받고, 끊겼으면 캐시
    e.respondWith(fetch(req).then((r) => put(req, r)).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then((r) => r || fetch(req).then((res) => put(req, res))));
});
