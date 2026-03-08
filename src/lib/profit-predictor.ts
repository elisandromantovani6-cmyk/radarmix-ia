/**
 * IA Previsão de Lucro com Probabilidade
 *
 * Usa simulação Monte Carlo simplificada para calcular:
 * - Probabilidade de lucro (%)
 * - Intervalo de confiança
 * - Ponto de equilíbrio (preço mínimo da @)
 * - Projeção de dias até peso de abate
 * - Cenários: otimista, provável, pessimista
 *
 * Referências: IMEA-MT 2025/2026, BR-CORTE 4ª ed., CEPEA
 */

// Variação histórica do preço da @ em MT (%)
const ARROBA_VOLATILITY = 0.12 // ±12% ao longo do ciclo
// Variação do GMD (%)
const GMD_VOLATILITY = 0.20 // ±20%
// Variação de custos (%)
const COST_VOLATILITY = 0.10 // ±10%

const ITERATIONS = 500 // Número de simulações Monte Carlo

export interface ProfitInput {
  current_weight_kg: number
  target_weight_kg: number // peso de abate (geralmente 540-570kg para nelore)
  head_count: number
  gmd_estimated: number // GMD estimado (kg/dia)
  daily_cost_per_head: number // custo operacional diário total (R$/cab/dia)
  animal_purchase_price: number // preço de compra por cabeça (R$)
  arroba_price: number // preço atual da @ (R$)
  carcass_yield: number // rendimento de carcaça (ex: 0.52)
  mortality_rate: number // taxa de mortalidade (ex: 0.02 = 2%)
  phase: string
}

export interface ScenarioResult {
  label: string
  arroba_price: number
  gmd: number
  days_to_target: number
  total_cost: number
  revenue: number
  profit_per_head: number
  roi_percent: number
  margin_percent: number
}

export interface ProfitPrediction {
  // Cenários determinísticos
  scenarios: {
    pessimista: ScenarioResult
    provavel: ScenarioResult
    otimista: ScenarioResult
  }
  // Monte Carlo
  probability_of_profit: number // 0-100%
  confidence_interval: {
    p10: number // 10% chance de lucro ser menor que isso
    p50: number // mediana
    p90: number // 90% chance de lucro ser menor que isso
  }
  // Ponto de equilíbrio
  breakeven: {
    min_arroba_price: number // preço mínimo da @ para não ter prejuízo
    min_gmd: number // GMD mínimo para não ter prejuízo
    max_days: number // máximo de dias que pode ficar sem prejuízo
  }
  // Projeção
  days_to_target: number
  expected_profit_total: number
  expected_roi: number
  // Comparação de sistemas
  system_comparison: SystemComparison[]
}

export interface SystemComparison {
  system: string
  label: string
  gmd: number
  daily_cost: number
  days_to_target: number
  total_cost: number
  profit_per_head: number
  roi_percent: number
}

// Pseudo-random com distribuição normal (Box-Muller)
function randomNormal(mean: number, stddev: number, seed: number): number {
  // Simple seeded random
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  const u1 = x - Math.floor(x)
  const y = Math.sin((seed + 1) * 12.9898 + 78.233) * 43758.5453
  const u2 = y - Math.floor(y)
  const z = Math.sqrt(-2 * Math.log(Math.max(u1, 0.0001))) * Math.cos(2 * Math.PI * u2)
  return mean + stddev * z
}

function calculateScenario(
  label: string,
  input: ProfitInput,
  arrobaPrice: number,
  gmd: number,
  costMultiplier: number,
): ScenarioResult {
  const gainNeeded = input.target_weight_kg - input.current_weight_kg
  const daysToTarget = gmd > 0 ? Math.ceil(gainNeeded / gmd) : 999

  const dailyCost = input.daily_cost_per_head * costMultiplier
  const totalOperationalCost = dailyCost * daysToTarget
  const totalCost = input.animal_purchase_price + totalOperationalCost

  const finalWeight = input.target_weight_kg
  const carcassWeight = finalWeight * input.carcass_yield
  const arrobas = carcassWeight / 15
  const grossRevenue = arrobas * arrobaPrice

  // Impostos MT
  const funrural = grossRevenue * 0.015
  const senar = grossRevenue * 0.002
  const fethab = 14.46
  const netRevenue = grossRevenue - funrural - senar - fethab

  const profitPerHead = netRevenue - totalCost
  const roi = totalCost > 0 ? (profitPerHead / totalCost) * 100 : 0
  const margin = netRevenue > 0 ? (profitPerHead / netRevenue) * 100 : 0

  return {
    label,
    arroba_price: arrobaPrice,
    gmd,
    days_to_target: daysToTarget,
    total_cost: Math.round(totalCost),
    revenue: Math.round(netRevenue),
    profit_per_head: Math.round(profitPerHead),
    roi_percent: Math.round(roi * 10) / 10,
    margin_percent: Math.round(margin * 10) / 10,
  }
}

// Sistemas de produção para comparação
const SYSTEMS: Array<{ system: string; label: string; gmd: number; costMultiplier: number }> = [
  { system: 'pasto_mineral', label: 'Pasto + Mineral', gmd: 0.45, costMultiplier: 0.7 },
  { system: 'pasto_proteico', label: 'Pasto + Proteico', gmd: 0.65, costMultiplier: 0.85 },
  { system: 'semi_confinamento', label: 'Semi-confinamento', gmd: 1.00, costMultiplier: 1.3 },
  { system: 'confinamento', label: 'Confinamento', gmd: 1.50, costMultiplier: 2.5 },
]

export function predictProfit(input: ProfitInput): ProfitPrediction {
  // Cenários determinísticos
  const pessimista = calculateScenario(
    'Pessimista',
    input,
    input.arroba_price * 0.90,
    input.gmd_estimated * 0.80,
    1.10,
  )
  const provavel = calculateScenario(
    'Provável',
    input,
    input.arroba_price,
    input.gmd_estimated,
    1.0,
  )
  const otimista = calculateScenario(
    'Otimista',
    input,
    input.arroba_price * 1.10,
    input.gmd_estimated * 1.15,
    0.95,
  )

  // Monte Carlo
  const profits: number[] = []
  for (let i = 0; i < ITERATIONS; i++) {
    const simArroba = randomNormal(input.arroba_price, input.arroba_price * ARROBA_VOLATILITY, i * 3)
    const simGmd = randomNormal(input.gmd_estimated, input.gmd_estimated * GMD_VOLATILITY, i * 3 + 1)
    const simCostMult = randomNormal(1.0, COST_VOLATILITY, i * 3 + 2)

    const clampedGmd = Math.max(0.1, simGmd)
    const clampedArroba = Math.max(100, simArroba)
    const clampedCost = Math.max(0.7, Math.min(1.5, simCostMult))

    const result = calculateScenario('mc', input, clampedArroba, clampedGmd, clampedCost)
    profits.push(result.profit_per_head)
  }

  profits.sort((a, b) => a - b)
  const profitCount = profits.filter(p => p > 0).length
  const probabilityOfProfit = Math.round((profitCount / ITERATIONS) * 100)

  const p10 = profits[Math.floor(ITERATIONS * 0.10)]
  const p50 = profits[Math.floor(ITERATIONS * 0.50)]
  const p90 = profits[Math.floor(ITERATIONS * 0.90)]

  // Ponto de equilíbrio
  const gainNeeded = input.target_weight_kg - input.current_weight_kg
  const daysToTarget = input.gmd_estimated > 0 ? Math.ceil(gainNeeded / input.gmd_estimated) : 999
  const totalCost = input.animal_purchase_price + (input.daily_cost_per_head * daysToTarget)
  const carcassWeight = input.target_weight_kg * input.carcass_yield
  const arrobas = carcassWeight / 15

  // Preço mínimo da @ = (custo total + impostos) / arrobas
  // netRevenue = arrobas * price - arrobas*price*0.017 - 14.46 = totalCost
  // arrobas * price * (1 - 0.017) = totalCost + 14.46
  const minArrobaPrice = arrobas > 0 ? (totalCost + 14.46) / (arrobas * (1 - 0.017)) : 0

  // GMD mínimo: encontrar iterativamente
  let minGmd = 0.1
  for (let testGmd = 0.1; testGmd <= 2.0; testGmd += 0.01) {
    const testDays = Math.ceil(gainNeeded / testGmd)
    const testCost = input.animal_purchase_price + (input.daily_cost_per_head * testDays)
    const testRevenue = arrobas * input.arroba_price
    const testNet = testRevenue * (1 - 0.017) - 14.46
    if (testNet >= testCost) {
      minGmd = testGmd
      break
    }
  }

  // Máximo de dias (custo não pode exceder receita)
  const netRevenue = arrobas * input.arroba_price * (1 - 0.017) - 14.46
  const maxDays = input.daily_cost_per_head > 0
    ? Math.floor((netRevenue - input.animal_purchase_price) / input.daily_cost_per_head)
    : 999

  // Comparação de sistemas (18g)
  const systemComparison: SystemComparison[] = SYSTEMS.map(sys => {
    const sysDays = sys.gmd > 0 ? Math.ceil(gainNeeded / sys.gmd) : 999
    const sysDailyCost = input.daily_cost_per_head * sys.costMultiplier
    const sysTotalCost = input.animal_purchase_price + (sysDailyCost * sysDays)
    const sysNet = arrobas * input.arroba_price * (1 - 0.017) - 14.46

    return {
      system: sys.system,
      label: sys.label,
      gmd: sys.gmd,
      daily_cost: Math.round(sysDailyCost * 100) / 100,
      days_to_target: sysDays,
      total_cost: Math.round(sysTotalCost),
      profit_per_head: Math.round(sysNet - sysTotalCost),
      roi_percent: Math.round(((sysNet - sysTotalCost) / sysTotalCost) * 1000) / 10,
    }
  })

  return {
    scenarios: { pessimista, provavel, otimista },
    probability_of_profit: probabilityOfProfit,
    confidence_interval: {
      p10: Math.round(p10),
      p50: Math.round(p50),
      p90: Math.round(p90),
    },
    breakeven: {
      min_arroba_price: Math.round(minArrobaPrice * 100) / 100,
      min_gmd: Math.round(minGmd * 100) / 100,
      max_days: Math.max(0, maxDays),
    },
    days_to_target: daysToTarget,
    expected_profit_total: Math.round(provavel.profit_per_head * input.head_count * (1 - input.mortality_rate)),
    expected_roi: provavel.roi_percent,
    system_comparison: systemComparison,
  }
}
