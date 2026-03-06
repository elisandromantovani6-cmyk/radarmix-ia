/**
 * Rate Limiter em memoria para proteger rotas que chamam a API do Claude (Anthropic).
 *
 * Funciona com um Map que conta requests por userId dentro de uma janela de tempo.
 * Limpa automaticamente entradas expiradas a cada 5 minutos.
 */

interface RateLimitEntry {
  count: number
  windowStart: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetIn: number
}

// Map: chave = `${userId}:${endpoint}`, valor = contagem + inicio da janela
const rateLimitMap = new Map<string, RateLimitEntry>()

// Defaults por tipo de rota
export const RATE_LIMITS = {
  chat: { limit: 30, windowMs: 60 * 60 * 1000 },       // 30 requests por hora
  default: { limit: 20, windowMs: 60 * 60 * 1000 },     // 20 requests por hora
} as const

/**
 * Verifica se o usuario pode fazer mais uma request.
 *
 * @param userId - ID do usuario (do Supabase auth)
 * @param limit - Maximo de requests na janela (default: 20)
 * @param windowMs - Tamanho da janela em milissegundos (default: 1 hora)
 * @returns Objeto com allowed, remaining e resetIn
 */
export function checkRateLimit(
  userId: string,
  limit: number = RATE_LIMITS.default.limit,
  windowMs: number = RATE_LIMITS.default.windowMs,
): RateLimitResult {
  const now = Date.now()
  const key = `${userId}:${limit}:${windowMs}`

  const entry = rateLimitMap.get(key)

  // Se nao tem entrada ou a janela expirou, cria nova
  if (!entry || (now - entry.windowStart) >= windowMs) {
    rateLimitMap.set(key, { count: 1, windowStart: now })
    return {
      allowed: true,
      remaining: limit - 1,
      resetIn: windowMs,
    }
  }

  // Janela ainda ativa
  const elapsed = now - entry.windowStart
  const resetIn = windowMs - elapsed

  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetIn,
    }
  }

  // Incrementa contador
  entry.count += 1
  return {
    allowed: true,
    remaining: limit - entry.count,
    resetIn,
  }
}

// Limpeza automatica de entradas expiradas a cada 5 minutos
const CLEANUP_INTERVAL = 5 * 60 * 1000

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap.entries()) {
    // Extrair windowMs do key (formato: userId:limit:windowMs)
    const parts = key.split(':')
    const windowMs = parseInt(parts[parts.length - 1], 10) || RATE_LIMITS.default.windowMs
    if ((now - entry.windowStart) >= windowMs) {
      rateLimitMap.delete(key)
    }
  }
}, CLEANUP_INTERVAL)

// Evitar que o setInterval impeca o processo de encerrar
if (typeof globalThis !== 'undefined' && typeof (globalThis as any)[Symbol.for('rateLimitCleanup')] === 'undefined') {
  (globalThis as any)[Symbol.for('rateLimitCleanup')] = true
}
