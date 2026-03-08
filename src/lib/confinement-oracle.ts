/**
 * Oráculo do Confinamento
 *
 * Modelo preditivo que combina:
 * - Genética (raça, score genético)
 * - Nutrição (dieta, suplementação, forragem)
 * - Clima (ITU, estação, estresse)
 * - Manejo (lotação, pesagens, sanitário)
 * - Mercado (preço da @, tendência)
 *
 * Para prever:
 * - GMD nos próximos 30/60/90 dias
 * - Peso final no momento do abate
 * - Custo total até o abate
 * - Lucro provável por cabeça
 * - Risco de prejuízo (%)
 *
 * Referências: BR-CORTE 4ª ed. (2023), IMEA-MT, Thom (1959), Hahn (1999)
 */

// ============================
// Interfaces de entrada e saída
// ============================

export interface OracleInput {
  // Dados do animal
  current_weight_kg: number
  target_weight_kg: number
  breed_type: string       // 'zebuino' | 'taurino' | 'cruzado_f1' | etc
  gmd_current: number      // GMD atual medido (kg/dia)
  phase: string            // 'cria' | 'recria' | 'engorda' | etc

  // Nutrição
  supplement_line: string | null  // 'mineral', 'proteico', 'rk', 'concentrado', etc
  forage_quality: 'boa' | 'media' | 'ruim'

  // Clima
  itu_current: number
  season: string           // 'seca' | 'aguas'
  stress_days_forecast: number  // dias de estresse térmico previstos nos próximos 30 dias

  // Manejo
  head_count: number
  stocking_rate: number | null   // UA/ha (null se confinamento)
  days_since_last_weighing: number

  // Mercado
  arroba_price: number
  daily_cost: number             // custo diário por cabeça (R$/cab/dia)
  animal_purchase_price: number  // preço de compra por cabeça (R$)
  carcass_yield: number          // rendimento de carcaça (ex: 0.52)
}

export interface OraclePrediction {
  // GMD projetado para 30, 60 e 90 dias
  gmd_projected: {
    d30: number
    d60: number
    d90: number
    factors: string[]  // fatores que influenciam a projeção
  }

  // Peso projetado para 30, 60 e 90 dias
  weight_projected: {
    d30: number
    d60: number
    d90: number
    days_to_target: number  // dias estimados até atingir peso de abate
  }

  // Análise financeira projetada
  financial: {
    total_cost_at_target: number       // custo total até atingir peso de abate
    projected_revenue: number          // receita projetada na venda
    projected_profit_per_head: number  // lucro projetado por cabeça
    risk_of_loss_percent: number       // risco de prejuízo (0-100)
    breakeven_arroba: number           // preço mínimo da @ para empatar
  }

  // Cenários "e se?"
  scenarios: Array<{
    name: string           // nome do cenário
    gmd: number            // GMD projetado neste cenário
    days_to_target: number // dias até peso de abate
    profit_per_head: number // lucro por cabeça
    description: string    // descrição em linguagem natural
  }>

  // Insights do oráculo em linguagem natural
  oracle_says: string[]

  // Nível de confiança da predição
  confidence_level: 'baixa' | 'media' | 'alta'

  // Score de qualidade dos dados (0-100)
  data_quality_score: number
}

// ============================
// Constantes de ajuste
// ============================

// Fator de redução do GMD por qualidade da forragem
const FORAGE_QUALITY_FACTOR: Record<string, number> = {
  boa: 1.0,
  media: 0.90,   // forragem média reduz 10% do GMD
  ruim: 0.75,    // forragem ruim reduz 25% do GMD
}

// Fator de ajuste por tipo de suplementação
const SUPPLEMENT_FACTOR: Record<string, number> = {
  mineral: 1.0,         // suplementação mineral é base
  proteico: 1.10,       // proteico melhora 10% o GMD
  'prot.energ': 1.18,   // proteico-energético melhora 18%
  fazcarne: 1.22,       // FazCarne melhora 22%
  rk: 1.30,             // RK melhora 30% (semi-confinamento)
  concentrado: 1.40,    // concentrado melhora 40% (confinamento)
}

// Fator de redução por estação seca
const SEASON_FACTOR: Record<string, number> = {
  seca: 0.90,    // seca reduz 10% do GMD
  aguas: 1.0,    // águas é base
}

// Limiar de ITU para redução do GMD
// Referência: Hahn (1999), adaptado para zebuínos
const ITU_THRESHOLDS = {
  normal: 72,    // sem impacto
  alert: 79,     // alerta: -8% GMD
  danger: 89,    // perigo: -15% GMD
}

// Redução do GMD por nível de estresse térmico (ITU)
const ITU_GMD_REDUCTION: Record<string, number> = {
  normal: 0,
  alert: 0.08,
  danger: 0.15,
  emergency: 0.30,
}

// Fator de lotação — superlotação reduz GMD
const STOCKING_RATE_THRESHOLD = 3.0 // UA/ha — acima disso, há impacto

// Impostos MT (mesmo padrão do profit-predictor)
const FUNRURAL_RATE = 0.015
const SENAR_RATE = 0.002
const FETHAB_FIXED = 14.46

// ============================
// Funções auxiliares
// ============================

/**
 * Determina o nível de estresse térmico com base no ITU.
 * Referência: Thom (1959), Hahn (1999)
 */
function getITULevel(itu: number): 'normal' | 'alert' | 'danger' | 'emergency' {
  if (itu < ITU_THRESHOLDS.normal) return 'normal'
  if (itu < ITU_THRESHOLDS.alert) return 'alert'
  if (itu < ITU_THRESHOLDS.danger) return 'danger'
  return 'emergency'
}

/**
 * Calcula o fator de redução do GMD pelo estresse térmico.
 * Considera dias de estresse previstos nos próximos 30 dias.
 */
function calculateClimateFactor(itu: number, stressDaysForecast: number): number {
  const level = getITULevel(itu)
  const reduction = ITU_GMD_REDUCTION[level]

  // Proporção de dias com estresse nos próximos 30 dias
  const stressRatio = Math.min(stressDaysForecast / 30, 1.0)

  // Fator final: combinação do estresse atual com a previsão
  return 1.0 - (reduction * 0.5 + reduction * stressRatio * 0.5)
}

/**
 * Calcula o fator de ajuste por lotação (UA/ha).
 * Superlotação acima de 3.0 UA/ha causa competição por alimento.
 */
function calculateStockingFactor(stockingRate: number | null): number {
  if (stockingRate === null) return 1.0 // confinamento, sem efeito
  if (stockingRate <= STOCKING_RATE_THRESHOLD) return 1.0
  // Cada UA/ha acima do limiar reduz 5% do GMD
  const excess = stockingRate - STOCKING_RATE_THRESHOLD
  return Math.max(0.70, 1.0 - excess * 0.05)
}

/**
 * Projeta o GMD para um período futuro, considerando mudança de estação.
 * Se estamos em águas e o período cai na seca (maio-setembro), ajusta.
 */
function projectGMDForPeriod(
  baseGmd: number,
  currentSeason: string,
  daysAhead: number,
): number {
  // Mês atual
  const now = new Date()
  const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)
  const futureMonth = futureDate.getMonth() + 1 // 1-12

  // Verificar se o período futuro cai na seca (maio a setembro)
  const futureSeason = (futureMonth >= 5 && futureMonth <= 9) ? 'seca' : 'aguas'

  // Se a estação muda, aplicar fator de transição
  if (currentSeason === 'aguas' && futureSeason === 'seca') {
    return baseGmd * SEASON_FACTOR.seca
  }
  if (currentSeason === 'seca' && futureSeason === 'aguas') {
    return baseGmd / SEASON_FACTOR.seca // melhora ao entrar nas águas
  }

  return baseGmd
}

/**
 * Calcula a receita líquida da venda (com impostos MT).
 * Referência: IMEA-MT, legislação tributária MT
 */
function calculateNetRevenue(weightKg: number, carcassYield: number, arrobaPrice: number): number {
  const carcassWeight = weightKg * carcassYield
  const arrobas = carcassWeight / 15
  const grossRevenue = arrobas * arrobaPrice

  // Descontos de impostos
  const funrural = grossRevenue * FUNRURAL_RATE
  const senar = grossRevenue * SENAR_RATE

  return grossRevenue - funrural - senar - FETHAB_FIXED
}

/**
 * Calcula o preço mínimo da @ para empatar (breakeven).
 */
function calculateBreakevenArroba(totalCost: number, weightKg: number, carcassYield: number): number {
  const carcassWeight = weightKg * carcassYield
  const arrobas = carcassWeight / 15
  if (arrobas <= 0) return 0

  // totalCost = arrobas * price * (1 - FUNRURAL - SENAR) - FETHAB
  // totalCost + FETHAB = arrobas * price * (1 - 0.017)
  return (totalCost + FETHAB_FIXED) / (arrobas * (1 - FUNRURAL_RATE - SENAR_RATE))
}

/**
 * Avalia a qualidade dos dados disponíveis.
 * Mais dados = maior confiança na predição.
 */
function assessDataQuality(input: OracleInput): number {
  let score = 0

  // Peso atual informado (básico, vale 15 pontos)
  if (input.current_weight_kg > 0) score += 15

  // GMD medido (não estimado) — vale 20 pontos
  if (input.gmd_current > 0) score += 20

  // Pesagem recente (quanto mais recente, melhor)
  if (input.days_since_last_weighing <= 7) score += 15
  else if (input.days_since_last_weighing <= 15) score += 10
  else if (input.days_since_last_weighing <= 30) score += 5

  // Dados de clima disponíveis — vale 10 pontos
  if (input.itu_current > 0) score += 10

  // Suplementação definida — vale 10 pontos
  if (input.supplement_line) score += 10

  // Custo diário informado — vale 10 pontos
  if (input.daily_cost > 0) score += 10

  // Taxa de lotação informada — vale 5 pontos
  if (input.stocking_rate !== null) score += 5

  // Preço da arroba informado — vale 5 pontos
  if (input.arroba_price > 0) score += 5

  return Math.min(100, score)
}

/**
 * Determina o nível de confiança com base no score de qualidade.
 */
function getConfidenceLevel(dataQualityScore: number): 'baixa' | 'media' | 'alta' {
  if (dataQualityScore >= 70) return 'alta'
  if (dataQualityScore >= 40) return 'media'
  return 'baixa'
}

// ============================
// Função principal: consultOracle
// ============================

/**
 * Consulta o Oráculo do Confinamento.
 *
 * Recebe dados do lote (animal, nutrição, clima, manejo, mercado)
 * e retorna predições de GMD, peso, financeiro, cenários e insights.
 */
export function consultOracle(input: OracleInput): OraclePrediction {
  // -------------------------------------------------
  // 1. Calcular GMD base ajustado por todos os fatores
  // -------------------------------------------------

  const forageFactor = FORAGE_QUALITY_FACTOR[input.forage_quality] ?? 1.0
  const supplementFactor = SUPPLEMENT_FACTOR[input.supplement_line ?? 'mineral'] ?? 1.0
  const seasonFactor = SEASON_FACTOR[input.season] ?? 1.0
  const climateFactor = calculateClimateFactor(input.itu_current, input.stress_days_forecast)
  const stockingFactor = calculateStockingFactor(input.stocking_rate)

  // GMD base = GMD atual ajustado por todos os fatores
  const gmdBase = input.gmd_current * forageFactor * supplementFactor * seasonFactor * climateFactor * stockingFactor

  // Coletar fatores que influenciam a predição
  const factors: string[] = []
  if (forageFactor < 1.0) factors.push(`Forragem ${input.forage_quality} (${Math.round((1 - forageFactor) * 100)}% redução)`)
  if (supplementFactor > 1.0) factors.push(`Suplementação ${input.supplement_line} (+${Math.round((supplementFactor - 1) * 100)}% GMD)`)
  if (seasonFactor < 1.0) factors.push('Período seco (-10% GMD)')
  if (climateFactor < 1.0) factors.push(`Estresse térmico ITU ${input.itu_current} (-${Math.round((1 - climateFactor) * 100)}% GMD)`)
  if (stockingFactor < 1.0) factors.push(`Superlotação ${input.stocking_rate} UA/ha (-${Math.round((1 - stockingFactor) * 100)}% GMD)`)

  // -------------------------------------------------
  // 2. Projetar GMD para 30, 60 e 90 dias
  // -------------------------------------------------

  // Considerar mudança de estação ao projetar para frente
  const gmdD30 = projectGMDForPeriod(gmdBase, input.season, 30)
  const gmdD60 = projectGMDForPeriod(gmdBase, input.season, 60)
  const gmdD90 = projectGMDForPeriod(gmdBase, input.season, 90)

  // Arredondar para 3 casas decimais
  const gmdProjected = {
    d30: Math.round(gmdD30 * 1000) / 1000,
    d60: Math.round(gmdD60 * 1000) / 1000,
    d90: Math.round(gmdD90 * 1000) / 1000,
    factors,
  }

  // -------------------------------------------------
  // 3. Projetar peso para 30, 60 e 90 dias
  // -------------------------------------------------

  const weightD30 = Math.round(input.current_weight_kg + gmdD30 * 30)
  const weightD60 = Math.round(input.current_weight_kg + gmdD60 * 60)
  const weightD90 = Math.round(input.current_weight_kg + gmdD90 * 90)

  // Calcular dias até o peso alvo usando GMD base médio
  const gainNeeded = input.target_weight_kg - input.current_weight_kg
  const gmdAvg = (gmdD30 + gmdD60 + gmdD90) / 3
  const daysToTarget = gmdAvg > 0 ? Math.ceil(gainNeeded / gmdAvg) : 999

  const weightProjected = {
    d30: weightD30,
    d60: weightD60,
    d90: weightD90,
    days_to_target: Math.max(0, daysToTarget),
  }

  // -------------------------------------------------
  // 4. Análise financeira
  // -------------------------------------------------

  // Custo total até atingir peso de abate
  const totalCostAtTarget = input.animal_purchase_price + (input.daily_cost * daysToTarget)

  // Receita projetada na venda
  const projectedRevenue = calculateNetRevenue(input.target_weight_kg, input.carcass_yield, input.arroba_price)

  // Lucro projetado por cabeça
  const projectedProfitPerHead = Math.round(projectedRevenue - totalCostAtTarget)

  // Preço mínimo da @ para empatar
  const breakevenArroba = calculateBreakevenArroba(totalCostAtTarget, input.target_weight_kg, input.carcass_yield)

  // Risco de prejuízo — estimativa simplificada baseada na margem
  // Se margem é estreita, risco é alto
  const margin = projectedRevenue > 0 ? projectedProfitPerHead / projectedRevenue : -1
  let riskOfLoss: number
  if (margin < 0) riskOfLoss = 85    // margem negativa: alto risco
  else if (margin < 0.05) riskOfLoss = 65  // margem < 5%: risco moderado-alto
  else if (margin < 0.10) riskOfLoss = 40  // margem 5-10%: risco moderado
  else if (margin < 0.20) riskOfLoss = 20  // margem 10-20%: risco baixo
  else riskOfLoss = 10                     // margem > 20%: risco muito baixo

  const financial = {
    total_cost_at_target: Math.round(totalCostAtTarget),
    projected_revenue: Math.round(projectedRevenue),
    projected_profit_per_head: projectedProfitPerHead,
    risk_of_loss_percent: riskOfLoss,
    breakeven_arroba: Math.round(breakevenArroba * 100) / 100,
  }

  // -------------------------------------------------
  // 5. Cenários "e se?"
  // -------------------------------------------------

  // Cenário 1: Melhorar dieta (+20% GMD)
  const gmdBetterDiet = gmdBase * 1.20
  const daysBetterDiet = gmdBetterDiet > 0 ? Math.ceil(gainNeeded / gmdBetterDiet) : 999
  const costBetterDiet = input.animal_purchase_price + (input.daily_cost * 1.15 * daysBetterDiet) // custo sobe 15% com dieta melhor
  const revenueBetterDiet = calculateNetRevenue(input.target_weight_kg, input.carcass_yield, input.arroba_price)
  const profitBetterDiet = Math.round(revenueBetterDiet - costBetterDiet)

  // Cenário 2: Clima piora (-15% GMD)
  const gmdWorseCimate = gmdBase * 0.85
  const daysWorseClimate = gmdWorseCimate > 0 ? Math.ceil(gainNeeded / gmdWorseCimate) : 999
  const costWorseClimate = input.animal_purchase_price + (input.daily_cost * daysWorseClimate)
  const revenueWorseClimate = calculateNetRevenue(input.target_weight_kg, input.carcass_yield, input.arroba_price)
  const profitWorseClimate = Math.round(revenueWorseClimate - costWorseClimate)

  // Cenário 3: Manter atual
  const profitCurrent = projectedProfitPerHead

  const scenarios = [
    {
      name: 'Se melhorar dieta',
      gmd: Math.round(gmdBetterDiet * 1000) / 1000,
      days_to_target: Math.max(0, daysBetterDiet),
      profit_per_head: profitBetterDiet,
      description: `Com dieta melhorada (+20% GMD), o lote chega ao peso de abate em ${daysBetterDiet} dias com lucro de R$ ${profitBetterDiet}/cab.`,
    },
    {
      name: 'Se piorar clima',
      gmd: Math.round(gmdWorseCimate * 1000) / 1000,
      days_to_target: Math.max(0, daysWorseClimate),
      profit_per_head: profitWorseClimate,
      description: `Com piora climática (-15% GMD), o lote levará ${daysWorseClimate} dias e o lucro cai para R$ ${profitWorseClimate}/cab.`,
    },
    {
      name: 'Se manter atual',
      gmd: Math.round(gmdBase * 1000) / 1000,
      days_to_target: Math.max(0, daysToTarget),
      profit_per_head: profitCurrent,
      description: `Mantendo as condições atuais, o lote atinge peso de abate em ${daysToTarget} dias com lucro de R$ ${profitCurrent}/cab.`,
    },
  ]

  // -------------------------------------------------
  // 6. Insights do oráculo
  // -------------------------------------------------

  const oracleSays: string[] = []

  // Insight sobre tempo até abate
  if (daysToTarget < 999 && daysToTarget > 0) {
    oracleSays.push(`Seu lote atingirá peso de abate em ${daysToTarget} dias se mantiver o GMD atual de ${gmdProjected.d30} kg/dia.`)
  }

  // Insight sobre risco financeiro
  if (riskOfLoss >= 65) {
    oracleSays.push(`Atenção: risco de prejuízo é ${riskOfLoss}%. Considere melhorar a dieta ou aguardar alta no preço da @.`)
  } else if (riskOfLoss <= 20) {
    oracleSays.push(`Cenário financeiro favorável com risco de prejuízo de apenas ${riskOfLoss}%.`)
  }

  // Insight sobre breakeven
  oracleSays.push(`O preço mínimo da @ para empatar é R$ ${financial.breakeven_arroba}. Atualmente a @ está em R$ ${input.arroba_price}.`)

  // Insight sobre clima
  if (input.itu_current >= ITU_THRESHOLDS.alert) {
    oracleSays.push(`ITU atual de ${input.itu_current} está causando estresse térmico. Providencie sombra e água extra.`)
  }

  // Insight sobre forragem
  if (input.forage_quality === 'ruim') {
    oracleSays.push('Qualidade da forragem ruim está reduzindo significativamente o GMD. Considere suplementação proteica.')
  }

  // Garantir pelo menos 3 insights
  if (oracleSays.length < 3) {
    if (input.supplement_line && SUPPLEMENT_FACTOR[input.supplement_line] && SUPPLEMENT_FACTOR[input.supplement_line] > 1.0) {
      oracleSays.push(`A suplementação ${input.supplement_line} está contribuindo com +${Math.round((SUPPLEMENT_FACTOR[input.supplement_line] - 1) * 100)}% no GMD.`)
    } else {
      oracleSays.push('Suplementação mineral básica. Avaliar linhas proteicas ou energéticas pode melhorar o resultado.')
    }
  }

  // -------------------------------------------------
  // 7. Qualidade dos dados e confiança
  // -------------------------------------------------

  const dataQualityScore = assessDataQuality(input)
  const confidenceLevel = getConfidenceLevel(dataQualityScore)

  // -------------------------------------------------
  // 8. Montar resultado final
  // -------------------------------------------------

  return {
    gmd_projected: gmdProjected,
    weight_projected: weightProjected,
    financial,
    scenarios,
    oracle_says: oracleSays,
    confidence_level: confidenceLevel,
    data_quality_score: dataQualityScore,
  }
}
