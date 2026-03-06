const CACHE_NAME = 'radarmix-v1';
const STATIC_ASSETS = [
  '/dashboard',
  '/login',
  '/chat',
  '/marketplace',
  '/ranking',
];

// Install - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API requests (always go to network)
  if (request.url.includes('/api/')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline - serve from cache
        return caches.match(request).then((cached) => {
          if (cached) return cached;

          // Fallback offline page for navigation
          if (request.mode === 'navigate') {
            return new Response(
              `<!DOCTYPE html>
              <html lang="pt-BR">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>RADARMIX IA - Offline</title>
                <style>
                  * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Outfit', sans-serif; }
                  body { background: #050506; color: #fff; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
                  .container { text-align: center; padding: 40px; }
                  .icon { font-size: 64px; margin-bottom: 20px; }
                  h1 { font-size: 24px; font-weight: 800; margin-bottom: 8px; }
                  h1 span { color: #F97316; }
                  p { color: #71717A; font-size: 14px; margin-bottom: 24px; }
                  button { background: linear-gradient(135deg, #F97316, #EA580C); color: white; border: none; padding: 12px 32px; border-radius: 12px; font-weight: 700; font-size: 14px; cursor: pointer; }
                  .status { margin-top: 16px; padding: 12px; background: rgba(249,115,22,0.1); border: 1px solid rgba(249,115,22,0.2); border-radius: 12px; }
                  .status p { color: #FB923C; margin: 0; font-size: 12px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="icon">📡</div>
                  <h1>RADAR<span>MIX</span> IA</h1>
                  <p>Você está sem conexão com a internet.</p>
                  <button onclick="location.reload()">Tentar novamente</button>
                  <div class="status">
                    <p>Os dados dos seus lotes foram salvos localmente. Quando a conexão voltar, tudo será sincronizado automaticamente.</p>
                  </div>
                </div>
              </body>
              </html>`,
              { headers: { 'Content-Type': 'text/html' } }
            );
          }

          return new Response('Offline', { status: 503 });
        });
      })
  );
});
