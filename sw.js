// 테스트판 종료(2026-10-24 정식 출시): 예전 오프라인 캐시를 지우고 이 서비스 워커를 해제한 뒤 화면을 새로 연다
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) await caches.delete(k);
    await self.registration.unregister();
    for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate(c.url);
  })());
});
