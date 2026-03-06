const CACHE_NAME = 'radarmix-v2'
const STATIC_CACHE = 'radarmix-static-v2'

const APP_PAGES = [
  '/',
  '/login',
  '/dashboard',
  '/chat',
  '/marketplace',
  '/ranking',
  '/checklist',
  '/marketplace/fornecedor',
]

const STATIC_ASSETS = [
  '/logo-radarmix.jpg',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
]

// Instalar: cachear páginas e assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(cache => cache.addAll(APP_PAGES)),
      caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS)),
    ]).then(() => self.skipWaiting())
  )
})

// Ativar: limpar caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME && key !== STATIC_CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

// Fetch: estratégia inteligente
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Ignorar requests não-GET (POST, PUT etc vão direto pra rede)
  if (event.request.method !== 'GET') return

  // Ignorar API calls (não cachear dados dinâmicos da API)
  if (url.pathname.startsWith('/api/')) return

  // Assets estáticos: Cache First
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2|ttf)$/) ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(STATIC_CACHE).then(cache => cache.put(event.request, clone))
          }
          return response
        }).catch(() => new Response('', { status: 404 }))
      })
    )
    return
  }

  // Páginas: Network First, Cache Fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => {
        return caches.match(event.request).then(cached => {
          if (cached) return cached
          // Fallback: tenta a página principal do dashboard
          return caches.match('/dashboard') || caches.match('/')
        })
      })
  )
})
