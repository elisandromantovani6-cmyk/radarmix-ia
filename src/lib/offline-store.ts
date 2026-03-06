'use client'

const DB_NAME = 'radarmix-offline'
const DB_VERSION = 1
const STORES = {
  queue: 'sync-queue',       // fila de operações pendentes
  cache: 'data-cache',       // cache de dados já carregados
}

// Abrir/criar banco IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORES.queue)) {
        db.createObjectStore(STORES.queue, { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains(STORES.cache)) {
        db.createObjectStore(STORES.cache, { keyPath: 'key' })
      }
    }
  })
}

// ============ FILA DE SYNC ============

export interface QueueItem {
  id?: number
  url: string
  method: string
  body: any
  timestamp: number
  description: string
  status: 'pending' | 'synced' | 'error'
  errorMessage?: string
}

// Adicionar operação na fila (quando offline)
export async function addToQueue(item: Omit<QueueItem, 'id' | 'timestamp' | 'status'>): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORES.queue, 'readwrite')
  const store = tx.objectStore(STORES.queue)
  store.add({ ...item, timestamp: Date.now(), status: 'pending' })
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Buscar itens pendentes da fila
export async function getPendingQueue(): Promise<QueueItem[]> {
  const db = await openDB()
  const tx = db.transaction(STORES.queue, 'readonly')
  const store = tx.objectStore(STORES.queue)
  const request = store.getAll()
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve((request.result || []).filter((i: QueueItem) => i.status === 'pending'))
    request.onerror = () => reject(request.error)
  })
}

// Buscar TODOS os itens da fila (para exibir histórico)
export async function getAllQueue(): Promise<QueueItem[]> {
  const db = await openDB()
  const tx = db.transaction(STORES.queue, 'readonly')
  const store = tx.objectStore(STORES.queue)
  const request = store.getAll()
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

// Marcar item como sincronizado
export async function markSynced(id: number): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORES.queue, 'readwrite')
  const store = tx.objectStore(STORES.queue)
  const request = store.get(id)
  request.onsuccess = () => {
    const item = request.result
    if (item) {
      item.status = 'synced'
      store.put(item)
    }
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Marcar item como erro
export async function markError(id: number, errorMessage: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORES.queue, 'readwrite')
  const store = tx.objectStore(STORES.queue)
  const request = store.get(id)
  request.onsuccess = () => {
    const item = request.result
    if (item) {
      item.status = 'error'
      item.errorMessage = errorMessage
      store.put(item)
    }
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Limpar itens já sincronizados
export async function clearSynced(): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORES.queue, 'readwrite')
  const store = tx.objectStore(STORES.queue)
  const request = store.getAll()
  request.onsuccess = () => {
    const items = request.result || []
    items.forEach((item: QueueItem) => {
      if (item.status === 'synced') store.delete(item.id!)
    })
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ============ CACHE DE DADOS ============

// Salvar dados no cache local
export async function cacheData(key: string, data: any): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORES.cache, 'readwrite')
  const store = tx.objectStore(STORES.cache)
  store.put({ key, data, updatedAt: Date.now() })
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Buscar dados do cache
export async function getCachedData(key: string): Promise<any | null> {
  const db = await openDB()
  const tx = db.transaction(STORES.cache, 'readonly')
  const store = tx.objectStore(STORES.cache)
  const request = store.get(key)
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result?.data || null)
    request.onerror = () => reject(request.error)
  })
}

// ============ FETCH COM OFFLINE ============

// Fetch inteligente: tenta online, se falhar enfileira e retorna cache
export async function offlineFetch(
  url: string,
  options: RequestInit & { description?: string; cacheKey?: string } = {}
): Promise<Response> {
  const { description = 'Operação', cacheKey, ...fetchOptions } = options

  // Se é GET e tem cache key, tenta online e cacheia, ou retorna cache
  if (!fetchOptions.method || fetchOptions.method === 'GET') {
    try {
      const res = await fetch(url, fetchOptions)
      if (res.ok && cacheKey) {
        const data = await res.clone().json()
        await cacheData(cacheKey, data)
      }
      return res
    } catch {
      // Offline - retorna cache se tiver
      if (cacheKey) {
        const cached = await getCachedData(cacheKey)
        if (cached) {
          return new Response(JSON.stringify(cached), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'X-From-Cache': 'true' }
          })
        }
      }
      return new Response(JSON.stringify({ error: 'Sem conexão e sem dados em cache' }), { status: 503 })
    }
  }

  // POST/PUT/DELETE: tenta online, se falhar enfileira
  try {
    const res = await fetch(url, fetchOptions)
    return res
  } catch {
    // Offline - adiciona na fila
    await addToQueue({
      url,
      method: fetchOptions.method || 'POST',
      body: fetchOptions.body ? JSON.parse(fetchOptions.body as string) : null,
      description,
    })
    return new Response(JSON.stringify({
      offline: true,
      message: 'Salvo offline. Será sincronizado quando houver conexão.'
    }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// ============ SINCRONIZAÇÃO ============

export async function syncQueue(): Promise<{ synced: number; errors: number }> {
  const pending = await getPendingQueue()
  let synced = 0
  let errors = 0

  for (const item of pending) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
        body: item.body ? JSON.stringify(item.body) : undefined,
      })
      if (res.ok) {
        await markSynced(item.id!)
        synced++
      } else {
        const data = await res.json().catch(() => ({}))
        await markError(item.id!, data.error || `Erro ${res.status}`)
        errors++
      }
    } catch {
      await markError(item.id!, 'Sem conexão')
      errors++
    }
  }

  if (synced > 0) await clearSynced()
  return { synced, errors }
}

// Verificar se está online
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}
