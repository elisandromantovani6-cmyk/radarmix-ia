// ============================================================
// Radar de Preços Agro — "Bloomberg Rural"
// Dados simulados com base em padrões reais CEPEA/IMEA
// Pode ser substituído por APIs reais no futuro
// ============================================================

// Ponto de preço no histórico
export interface PricePoint {
  date: string
  value: number
}

// Item monitorado no radar
export interface PriceItem {
  name: string
  unit: string // '@', 'saca 60kg', 'ton', 'kg', 'cab'
  category: 'gado' | 'grao' | 'insumo'
  current_price: number
  history_30d: PricePoint[]
  history_90d: PricePoint[]
  variation_7d_percent: number
  variation_30d_percent: number
  trend: 'alta' | 'estavel' | 'queda'
}

// Alerta gerado pela IA de mercado
export interface PriceAlert {
  type: 'oportunidade_compra' | 'oportunidade_venda' | 'queda_preco' | 'alta_preco'
  title: string
  description: string
  potential_savings?: number
}

// Resultado completo do radar
export interface PriceRadarResult {
  items: PriceItem[]
  alerts: PriceAlert[]
  last_update: string
}

// ============================================================
// Índices de sazonalidade por mês (jan=1 ... dez=12)
// Baseados em padrões históricos CEPEA/IMEA para MT
// ============================================================

// Arroba do boi gordo: pico mai-jul, queda out-dez
const SEASONAL_BOI: Record<number, number> = {
  1: 0.98, 2: 0.97, 3: 1.00, 4: 1.02, 5: 1.05, 6: 1.07,
  7: 1.06, 8: 1.03, 9: 1.00, 10: 0.96, 11: 0.94, 12: 0.92,
}

// Vaca gorda: segue padrão semelhante ao boi com desconto
const SEASONAL_VACA: Record<number, number> = {
  1: 0.97, 2: 0.96, 3: 1.00, 4: 1.01, 5: 1.04, 6: 1.06,
  7: 1.05, 8: 1.02, 9: 0.99, 10: 0.95, 11: 0.93, 12: 0.91,
}

// Bezerro: alta na seca (demanda de reposição)
const SEASONAL_BEZERRO: Record<number, number> = {
  1: 0.96, 2: 0.95, 3: 0.97, 4: 1.00, 5: 1.03, 6: 1.06,
  7: 1.07, 8: 1.05, 9: 1.02, 10: 0.98, 11: 0.96, 12: 0.95,
}

// Milho: entressafra jan-mar mais caro, safra jun-ago mais barato
const SEASONAL_MILHO: Record<number, number> = {
  1: 1.08, 2: 1.10, 3: 1.06, 4: 1.02, 5: 0.98, 6: 0.93,
  7: 0.91, 8: 0.92, 9: 0.95, 10: 0.98, 11: 1.02, 12: 1.05,
}

// Soja: colheita fev-abr, preços mais baixos
const SEASONAL_SOJA: Record<number, number> = {
  1: 1.03, 2: 0.97, 3: 0.95, 4: 0.96, 5: 0.99, 6: 1.01,
  7: 1.02, 8: 1.03, 9: 1.04, 10: 1.02, 11: 1.00, 12: 1.01,
}

// Farelo de soja: acompanha soja com lag
const SEASONAL_FARELO_SOJA: Record<number, number> = {
  1: 1.02, 2: 1.00, 3: 0.96, 4: 0.95, 5: 0.97, 6: 1.00,
  7: 1.02, 8: 1.03, 9: 1.04, 10: 1.03, 11: 1.01, 12: 1.02,
}

// Insumos com sazonalidade mais suave
const SEASONAL_FLAT: Record<number, number> = {
  1: 1.00, 2: 1.00, 3: 1.00, 4: 1.01, 5: 1.01, 6: 1.02,
  7: 1.02, 8: 1.01, 9: 1.00, 10: 0.99, 11: 0.99, 12: 0.98,
}

// ============================================================
// Definição dos itens rastreados
// ============================================================

interface ItemDef {
  name: string
  unit: string
  category: 'gado' | 'grao' | 'insumo'
  basePrice: number       // preço base referência março 2026
  volatility: number      // volatilidade diária (0.005 = 0.5%)
  seasonal: Record<number, number>
}

const ITEM_DEFS: ItemDef[] = [
  { name: 'Arroba do boi gordo', unit: '@', category: 'gado', basePrice: 320, volatility: 0.008, seasonal: SEASONAL_BOI },
  { name: 'Arroba da vaca gorda', unit: '@', category: 'gado', basePrice: 285, volatility: 0.008, seasonal: SEASONAL_VACA },
  { name: 'Bezerro (MS)', unit: 'cab', category: 'gado', basePrice: 2200, volatility: 0.006, seasonal: SEASONAL_BEZERRO },
  { name: 'Milho', unit: 'saca 60kg', category: 'grao', basePrice: 58, volatility: 0.012, seasonal: SEASONAL_MILHO },
  { name: 'Soja', unit: 'saca 60kg', category: 'grao', basePrice: 128, volatility: 0.010, seasonal: SEASONAL_SOJA },
  { name: 'Farelo de soja', unit: 'ton', category: 'insumo', basePrice: 2100, volatility: 0.007, seasonal: SEASONAL_FARELO_SOJA },
  { name: 'Farelo de algodão', unit: 'ton', category: 'insumo', basePrice: 1600, volatility: 0.006, seasonal: SEASONAL_FLAT },
  { name: 'Sal mineral', unit: 'kg', category: 'insumo', basePrice: 3.80, volatility: 0.004, seasonal: SEASONAL_FLAT },
  { name: 'Ureia pecuária', unit: 'ton', category: 'insumo', basePrice: 2500, volatility: 0.005, seasonal: SEASONAL_FLAT },
  { name: 'Caroço de algodão', unit: 'ton', category: 'insumo', basePrice: 1200, volatility: 0.007, seasonal: SEASONAL_FLAT },
]

// ============================================================
// Gerador de semente determinística (para testes reproduzíveis)
// Usa um PRNG simples baseado em mulberry32
// ============================================================

function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6D2B79F5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ============================================================
// Gera histórico de preços com sazonalidade e volatilidade
// ============================================================

export function generatePriceHistory(
  basePrice: number,
  volatility: number,
  seasonalIndex: Record<number, number>,
  days: number,
  seed: number = 42,
): PricePoint[] {
  const rng = mulberry32(seed)
  const points: PricePoint[] = []
  const today = new Date()

  // Preço inicial = base ajustado pela sazonalidade do mês mais antigo
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - days)
  const startMonth = startDate.getMonth() + 1
  let price = basePrice * (seasonalIndex[startMonth] || 1.0)

  for (let i = days; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const month = date.getMonth() + 1

    // Ajuste sazonal gradual
    const targetSeasonal = seasonalIndex[month] || 1.0
    const seasonalTarget = basePrice * targetSeasonal

    // Random walk com tendência à média sazonal
    const meanReversion = (seasonalTarget - price) * 0.02 // 2% de reversão à média
    const randomShock = (rng() - 0.5) * 2 * volatility * price
    price = price + meanReversion + randomShock

    // Impede preço negativo
    price = Math.max(price * 0.1, price)

    const dateStr = date.toISOString().split('T')[0]
    points.push({
      date: dateStr,
      value: Math.round(price * 100) / 100,
    })
  }

  return points
}

// ============================================================
// Detecta tendência comparando média recente vs anterior
// ============================================================

function detectTrend(history: PricePoint[]): 'alta' | 'estavel' | 'queda' {
  if (history.length < 10) return 'estavel'

  // Compara média dos últimos 5 dias vs 5 dias anteriores
  const recent = history.slice(-5)
  const previous = history.slice(-10, -5)

  const avgRecent = recent.reduce((s, p) => s + p.value, 0) / recent.length
  const avgPrevious = previous.reduce((s, p) => s + p.value, 0) / previous.length

  const change = (avgRecent - avgPrevious) / avgPrevious

  if (change > 0.015) return 'alta'    // > 1.5% = alta
  if (change < -0.015) return 'queda'  // < -1.5% = queda
  return 'estavel'
}

// ============================================================
// Calcula variação percentual entre dois pontos
// ============================================================

function calcVariation(history: PricePoint[], daysBack: number): number {
  if (history.length <= daysBack) return 0

  const current = history[history.length - 1].value
  const past = history[history.length - 1 - daysBack].value

  if (past === 0) return 0
  return Math.round(((current - past) / past) * 10000) / 100 // 2 casas decimais
}

// ============================================================
// Calcula média de um período do histórico
// ============================================================

function calcAverage(history: PricePoint[]): number {
  if (history.length === 0) return 0
  return history.reduce((sum, p) => sum + p.value, 0) / history.length
}

// ============================================================
// Gera alertas inteligentes baseados nos preços
// ============================================================

function generateAlerts(
  items: PriceItem[],
  headCount: number,
  dailyConsumptionKg: number,
): PriceAlert[] {
  const alerts: PriceAlert[] = []

  for (const item of items) {
    // Alerta de queda de preço > 5% em 7 dias
    if (item.variation_7d_percent < -5) {
      alerts.push({
        type: 'queda_preco',
        title: `${item.name} em queda`,
        description: `${item.name} caiu ${Math.abs(item.variation_7d_percent).toFixed(1)}% nos últimos 7 dias. Acompanhe a tendência.`,
      })
    }

    // Alerta de alta de preço > 5% em 7 dias
    if (item.variation_7d_percent > 5) {
      alerts.push({
        type: 'alta_preco',
        title: `${item.name} em alta`,
        description: `${item.name} subiu ${item.variation_7d_percent.toFixed(1)}% nos últimos 7 dias.`,
      })
    }

    // Oportunidade de compra: preço atual abaixo da média de 90 dias
    const avg90 = calcAverage(item.history_90d)
    if (item.current_price < avg90 * 0.95 && item.category !== 'gado') {
      // Calcula economia potencial para insumos
      let savings: number | undefined
      if (item.unit === 'ton' && headCount > 0 && dailyConsumptionKg > 0) {
        // Economia mensal estimada: diferença de preço * consumo mensal em toneladas
        const monthlyConsumptionTon = (headCount * dailyConsumptionKg * 30) / 1000
        const priceDiff = avg90 - item.current_price
        savings = Math.round(monthlyConsumptionTon * priceDiff)
      } else if (item.unit === 'saca 60kg' && headCount > 0) {
        // Para grãos: estima consumo mensal em sacas
        const monthlySacas = (headCount * dailyConsumptionKg * 30) / 60
        const priceDiff = avg90 - item.current_price
        savings = Math.round(monthlySacas * priceDiff)
      }

      alerts.push({
        type: 'oportunidade_compra',
        title: `Oportunidade: ${item.name} abaixo da média`,
        description: `${item.name} está R$ ${(avg90 - item.current_price).toFixed(2)} abaixo da média de 90 dias.` +
          (savings ? ` Comprar agora economiza R$ ${savings.toLocaleString('pt-BR')} no lote.` : ''),
        potential_savings: savings,
      })
    }

    // Oportunidade de venda: preço do gado acima da média de 90 dias
    if (item.current_price > avg90 * 1.05 && item.category === 'gado') {
      alerts.push({
        type: 'oportunidade_venda',
        title: `Oportunidade de venda: ${item.name}`,
        description: `${item.name} está R$ ${(item.current_price - avg90).toFixed(2)} acima da média de 90 dias. Boa janela para venda.`,
      })
    }
  }

  return alerts
}

// ============================================================
// Função principal: retorna o radar completo de preços
// ============================================================

export function getPriceRadar(
  currentMonth: number = new Date().getMonth() + 1,
  headCount: number = 100,
  dailyConsumptionKg: number = 10,
  seed: number = 42,
): PriceRadarResult {
  const items: PriceItem[] = []

  for (const def of ITEM_DEFS) {
    // Semente única para cada item (garante diversidade)
    const itemSeed = seed + ITEM_DEFS.indexOf(def) * 1000

    // Gera histórico de 90 dias
    const history90 = generatePriceHistory(
      def.basePrice,
      def.volatility,
      def.seasonal,
      90,
      itemSeed,
    )

    // Últimos 30 dias do histórico de 90
    const history30 = history90.slice(-31)

    // Preço atual = último ponto
    const currentPrice = history90[history90.length - 1].value

    // Variações
    const var7d = calcVariation(history90, 7)
    const var30d = calcVariation(history90, 30)

    // Tendência
    const trend = detectTrend(history90)

    items.push({
      name: def.name,
      unit: def.unit,
      category: def.category,
      current_price: currentPrice,
      history_30d: history30,
      history_90d: history90,
      variation_7d_percent: var7d,
      variation_30d_percent: var30d,
      trend,
    })
  }

  // Gera alertas
  const alerts = generateAlerts(items, headCount, dailyConsumptionKg)

  return {
    items,
    alerts,
    last_update: new Date().toISOString(),
  }
}
