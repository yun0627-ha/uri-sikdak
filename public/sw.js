// 앱 설치용 최소 서비스 워커: 저장(캐시)은 하지 않고, 인터넷이 끊겼을 때만 안내를 보여 줘요
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(() => new Response(
    '<meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:sans-serif;text-align:center;padding:40vh 20px 0;color:#4a524b">인터넷 연결을 확인해 주세요 🙏</body>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
});
