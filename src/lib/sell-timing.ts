/**
 * IA Melhor Momento de Vender o Boi
 *
 * Prevê o momento ideal de venda com base em:
 * - Sazonalidade de preços da @ (CEPEA/IMEA-MT)
 * - Projeção de peso do animal (GMD)
 * - Custo de manutenção acumulado
 * - Cenários: vender agora, 30, 60, 90 dias
 *
 * Referências: CEPEA, IMEA-MT 2025/2026, Scot Consultoria
 */

// Índice de sazonalidade mensal do preço da @ em MT (CEPEA/IMEA referência)
// Entressafra (mai-jul): preços mais altos — oferta menor
// Safra (out-dez): preços mais baixos — oferta maior (descarte de matrizes, boi gordo)
const MONTHLY_PRICE_INDEX: Record<number, number> = {
  1: 0.98,  // Janeiro: médio
  2: 0.97,  // Fevereiro: leve queda
  3: 0.99,  // Março: recupera
  4: 1.02,  // Abril: início entressafra
  5: 1.06,  // Maio: pico entressafra
  6: 1.08,  // Junho: pico
  7: 1.05,  // Julho: começa cair
  8: 1.01,  // Agosto
  9: 0.98,  // Setembro: safra começa
  10: 0.95, // Outubro: pressão de oferta
  11: 0.93, // Novembro: fundo
  12: 0.96, // Dezembro: leve recuperação
}

// Nomes dos meses em português
const MONTH_NAMES: Record<number, string> = {
  1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril',
  5: 'Maio', 6: 'Junho', 7: 'Julho', 8: 'Agosto',
  9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro',
}

// Impostos na venda de gado — MT
const TAXES = {
  funrural: 0.015,        // 1,5% sobre receita bruta
  senar: 0.002,           // 0,2% sobre receita bruta
  fethab_per_head: 14.46, // FETHAB-MT por cabeça transportada
}

export interface SellScenario {
  label: string
  sell_date: string
  days_from_now: number
  projected_weight: number
  projected_arrobas: number
  projected_arroba_price: number
  projected_revenue: number
  total_cost_until_then: number
  projected_profit: number
  roi_percent: number
  recommendation: string
}

export interface SellTimingResult {
  scenarios: SellScenario[] // vender agora, 30, 60, 90 dias
  optimal_window: {
    start_month: string
    end_month: string
    reason: string
  }
  current_market: {
    arroba_price: number
    trend: 'alta' | 'estavel' | 'queda'
    trend_reason: string
  }
  alerts: string[]
  summary: string
}

export interface SellTimingInput {
  current_weight_kg: number
  gmd: number                     // ganho médio diário (kg/dia)
  daily_cost: number              // custo diário por cabeça (R$/cab/dia)
  head_count: number
  carcass_yield: number           // rendimento de carcaça (ex: 0.52)
  arroba_price: number            // preço atual da @ (R$)
  animal_purchase_price: number   // preço de compra por cabeça (R$)
  phase: string
  target_weight_kg?: number       // peso-alvo de abate (padrão: 540kg)
}

/**
 * Calcula a receita líquida de venda (após impostos MT)
 */
function calculateNetRevenue(arrobas: number, arrobaPrice: number): number {
  const grossRevenue = arrobas * arrobaPrice
  const funrural = grossRevenue * TAXES.funrural
  const senar = grossRevenue * TAXES.senar
  const fethab = TAXES.fethab_per_head
  return grossRevenue - funrural - senar - fethab
}

/**
 * Projeta o preço da @ para uma data futura usando índice de sazonalidade
 */
function projectArrobaPrice(currentPrice: number, currentMonth: number, targetMonth: number): number {
  const currentIndex = MONTHLY_PRICE_INDEX[currentMonth] || 1.0
  const targetIndex = MONTHLY_PRICE_INDEX[targetMonth] || 1.0
  // Normaliza o preço atual para a base e aplica o índice do mês-alvo
  const basePrice = currentPrice / currentIndex
  return basePrice * targetIndex
}

/**
 * Determina a tendência de preço com base no mês atual
 */
function detectTrend(currentMonth: number): { trend: 'alta' | 'estavel' | 'queda'; reason: string } {
  const currentIndex = MONTHLY_PRICE_INDEX[currentMonth] || 1.0
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1
  const nextNextMonth = nextMonth === 12 ? 1 : nextMonth + 1
  const nextIndex = MONTHLY_PRICE_INDEX[nextMonth] || 1.0
  const nextNextIndex = MONTHLY_PRICE_INDEX[nextNextMonth] || 1.0

  // Verifica tendência dos próximos 2 meses
  if (nextIndex > currentIndex && nextNextIndex > currentIndex) {
    return {
      trend: 'alta',
      reason: `Preço tende a subir nos próximos meses (${MONTH_NAMES[nextMonth]}/${MONTH_NAMES[nextNextMonth]} com índice maior)`,
    }
  }
  if (nextIndex < currentIndex && nextNextIndex < currentIndex) {
    return {
      trend: 'queda',
      reason: `Preço tende a cair nos próximos meses (${MONTH_NAMES[nextMonth]}/${MONTH_NAMES[nextNextMonth]} com índice menor)`,
    }
  }
  return {
    trend: 'estavel',
    reason: `Preço relativamente estável para os próximos meses`,
  }
}

/**
 * Gera label em português para o cenário
 */
function getScenarioLabel(days: number): string {
  if (days === 0) return 'Vender agora'
  return `Esperar ${days} dias`
}

/**
 * Gera recomendação textual para o cenário
 */
function generateRecommendation(
  scenario: { days: number; profit: number; roi: number; weight: number; targetWeight: number },
  bestProfit: number,
): string {
  if (scenario.days === 0 && scenario.profit === bestProfit) {
    return 'Melhor cenário — venda imediata recomendada'
  }
  if (scenario.profit === bestProfit) {
    return `Melhor cenário — lucro máximo em ${scenario.days} dias`
  }
  if (scenario.profit < 0) {
    return 'Prejuízo neste cenário — não recomendado'
  }
  if (scenario.weight < scenario.targetWeight) {
    return `Animal ainda abaixo do peso ideal (${Math.round(scenario.weight)}kg vs ${scenario.targetWeight}kg)`
  }
  const diff = bestProfit - scenario.profit
  return `R$ ${Math.round(diff).toLocaleString('pt-BR')} a menos que o melhor cenário`
}

/**
 * Prevê o melhor momento de venda do boi
 *
 * Analisa 4 cenários (agora, +30d, +60d, +90d) considerando:
 * - Projeção de peso via GMD
 * - Sazonalidade do preço da @
 * - Custo acumulado de manutenção
 * - Impostos MT (Funrural, SENAR, FETHAB)
 */
export function predictSellTiming(input: SellTimingInput): SellTimingResult {
  const targetWeight = input.target_weight_kg || 540
  const today = new Date()
  const currentMonth = today.getMonth() + 1 // 1-12

  // Cenários: vender agora, +30, +60, +90 dias
  const dayOptions = [0, 30, 60, 90]

  const scenarios: SellScenario[] = dayOptions.map(days => {
    // Projetar peso futuro
    const projectedWeight = input.current_weight_kg + (input.gmd * days)

    // Calcular arrobas (peso × rendimento carcaça / 15kg por @)
    const projectedArrobas = (projectedWeight * input.carcass_yield) / 15

    // Projetar mês da venda
    const sellDate = new Date(today)
    sellDate.setDate(sellDate.getDate() + days)
    const sellMonth = sellDate.getMonth() + 1

    // Projetar preço da @ com sazonalidade
    const projectedArrobaPrice = projectArrobaPrice(input.arroba_price, currentMonth, sellMonth)

    // Receita líquida (após impostos)
    const projectedRevenue = calculateNetRevenue(projectedArrobas, projectedArrobaPrice)

    // Custo total até a data de venda (compra + manutenção diária acumulada)
    const maintenanceCost = input.daily_cost * days * input.head_count
    const purchaseCost = input.animal_purchase_price * input.head_count
    const totalCost = purchaseCost + maintenanceCost

    // Receita total do lote
    const totalRevenue = projectedRevenue * input.head_count

    // Lucro projetado
    const projectedProfit = totalRevenue - totalCost

    // ROI (%)
    const roiPercent = totalCost > 0 ? (projectedProfit / totalCost) * 100 : 0

    return {
      label: getScenarioLabel(days),
      sell_date: sellDate.toISOString().split('T')[0],
      days_from_now: days,
      projected_weight: Math.round(projectedWeight * 10) / 10,
      projected_arrobas: Math.round(projectedArrobas * 100) / 100,
      projected_arroba_price: Math.round(projectedArrobaPrice * 100) / 100,
      projected_revenue: Math.round(totalRevenue * 100) / 100,
      total_cost_until_then: Math.round(totalCost * 100) / 100,
      projected_profit: Math.round(projectedProfit * 100) / 100,
      roi_percent: Math.round(roiPercent * 10) / 10,
      recommendation: '', // preenchido abaixo
    }
  })

  // Encontrar o cenário com maior lucro
  const bestProfit = Math.max(...scenarios.map(s => s.projected_profit))

  // Preencher recomendações
  for (const scenario of scenarios) {
    scenario.recommendation = generateRecommendation(
      {
        days: scenario.days_from_now,
        profit: scenario.projected_profit,
        roi: scenario.roi_percent,
        weight: scenario.projected_weight,
        targetWeight,
      },
      bestProfit,
    )
  }

  // Determinar janela ótima de venda
  // Encontra os meses com maior índice de preço E onde o animal atinge peso-alvo
  const daysToTarget = input.current_weight_kg >= targetWeight
    ? 0
    : Math.ceil((targetWeight - input.current_weight_kg) / input.gmd)

  const targetDate = new Date(today)
  targetDate.setDate(targetDate.getDate() + daysToTarget)
  const targetMonth = targetDate.getMonth() + 1

  // Buscar os 3 meses com melhor índice a partir do mês que o animal atinge peso-alvo
  const monthsAfterTarget: Array<{ month: number; index: number }> = []
  for (let i = 0; i < 6; i++) {
    const m = ((targetMonth - 1 + i) % 12) + 1
    monthsAfterTarget.push({ month: m, index: MONTHLY_PRICE_INDEX[m] || 1.0 })
  }
  monthsAfterTarget.sort((a, b) => b.index - a.index)
  const bestMonths = monthsAfterTarget.slice(0, 3).sort((a, b) => {
    // Ordenar cronologicamente
    const aOffset = a.month >= targetMonth ? a.month : a.month + 12
    const bOffset = b.month >= targetMonth ? b.month : b.month + 12
    return aOffset - bOffset
  })

  const optimalWindow = {
    start_month: MONTH_NAMES[bestMonths[0].month],
    end_month: MONTH_NAMES[bestMonths[bestMonths.length - 1].month],
    reason: `Meses com melhor índice de preço da @ após o animal atingir peso de abate (${targetWeight}kg)`,
  }

  // Detectar tendência atual do mercado
  const { trend, reason: trendReason } = detectTrend(currentMonth)

  const currentMarket = {
    arroba_price: input.arroba_price,
    trend,
    trend_reason: trendReason,
  }

  // Gerar alertas inteligentes
  const alerts: string[] = []

  // Alerta de tendência de alta
  if (trend === 'alta') {
    alerts.push('Preço em tendência de alta — considere esperar para maximizar receita')
  }

  // Alerta de tendência de queda
  if (trend === 'queda') {
    alerts.push('Preço em tendência de queda — considere antecipar a venda')
  }

  // Alerta de peso de abate
  if (daysToTarget > 0) {
    alerts.push(`Animal atingirá peso de abate (${targetWeight}kg) em ${daysToTarget} dias`)
  } else {
    alerts.push(`Animal já atingiu peso de abate (${Math.round(input.current_weight_kg)}kg ≥ ${targetWeight}kg)`)
  }

  // Alerta de custo corroendo lucro
  // Se o cenário de 60 dias tem lucro menor que o de 30 dias, custo está alto demais
  const profit30 = scenarios.find(s => s.days_from_now === 30)?.projected_profit || 0
  const profit60 = scenarios.find(s => s.days_from_now === 60)?.projected_profit || 0
  if (profit60 < profit30 && profit30 > 0) {
    alerts.push('Custo de manutenção está corroendo lucro — venda antes de 60 dias')
  }

  // Alerta de entressafra próxima (meses 5, 6, 7 são pico)
  const peakMonths = [5, 6, 7]
  const monthsUntilPeak = peakMonths
    .map(m => m >= currentMonth ? m - currentMonth : m + 12 - currentMonth)
    .filter(d => d > 0 && d <= 4)

  if (monthsUntilPeak.length > 0) {
    const minMonths = Math.min(...monthsUntilPeak)
    alerts.push(`Entressafra em ${minMonths} ${minMonths === 1 ? 'mês' : 'meses'} — preço tende a subir`)
  }

  // Alerta de prejuízo iminente
  const scenarioNow = scenarios.find(s => s.days_from_now === 0)
  if (scenarioNow && scenarioNow.projected_profit < 0) {
    alerts.push('Operação com prejuízo no cenário atual — revise custos ou aguarde valorização')
  }

  // Gerar resumo textual
  const bestScenario = scenarios.reduce((best, s) =>
    s.projected_profit > best.projected_profit ? s : best
  )
  const worstScenario = scenarios.reduce((worst, s) =>
    s.projected_profit < worst.projected_profit ? s : worst
  )

  let summary = ''
  if (bestScenario.days_from_now === 0) {
    summary = `Recomendação: vender agora. Lucro estimado de R$ ${Math.round(bestScenario.projected_profit).toLocaleString('pt-BR')} (ROI ${bestScenario.roi_percent}%). `
  } else {
    summary = `Recomendação: esperar ${bestScenario.days_from_now} dias. Lucro estimado de R$ ${Math.round(bestScenario.projected_profit).toLocaleString('pt-BR')} (ROI ${bestScenario.roi_percent}%). `
  }
  summary += `Janela ótima: ${optimalWindow.start_month} a ${optimalWindow.end_month}. `
  summary += `Mercado em tendência de ${trend}.`

  return {
    scenarios,
    optimal_window: optimalWindow,
    current_market: currentMarket,
    alerts,
    summary,
  }
}
