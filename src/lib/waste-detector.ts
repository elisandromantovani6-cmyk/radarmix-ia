/**
 * IA Detectora de Desperdício Financeiro
 *
 * Compara custos do produtor com benchmarks regionais (IMEA-MT, Embrapa)
 * para identificar ineficiências e calcular economia potencial.
 *
 * Referências: IMEA-MT (2025/2026), Embrapa Gado de Corte, Assocon
 */

// Benchmarks regionais MT (R$/cab/dia) - IMEA-MT 2025/2026
const REGIONAL_BENCHMARKS: Record<string, Record<string, { min: number; avg: number; max: number }>> = {
  cria: {
    suplemento: { min: 0.15, avg: 0.25, max: 0.40 },
    pasto: { min: 1.50, avg: 1.80, max: 2.50 },
    mao_obra: { min: 0.80, avg: 1.20, max: 1.80 },
    sanidade: { min: 0.30, avg: 0.45, max: 0.70 },
    outros: { min: 0.40, avg: 0.70, max: 1.20 },
  },
  recria: {
    suplemento: { min: 0.20, avg: 0.32, max: 0.50 },
    pasto: { min: 1.80, avg: 2.20, max: 3.00 },
    mao_obra: { min: 1.00, avg: 1.40, max: 2.00 },
    sanidade: { min: 0.35, avg: 0.50, max: 0.80 },
    outros: { min: 0.50, avg: 0.80, max: 1.30 },
  },
  engorda: {
    suplemento: { min: 0.30, avg: 0.45, max: 0.70 },
    pasto: { min: 2.00, avg: 2.50, max: 3.50 },
    mao_obra: { min: 1.20, avg: 1.60, max: 2.20 },
    sanidade: { min: 0.35, avg: 0.50, max: 0.75 },
    outros: { min: 0.60, avg: 1.00, max: 1.50 },
  },
  engorda_confinamento: {
    suplemento: { min: 2.50, avg: 3.50, max: 5.00 },
    pasto: { min: 0.50, avg: 0.80, max: 1.20 },
    mao_obra: { min: 1.50, avg: 2.00, max: 2.80 },
    sanidade: { min: 0.40, avg: 0.60, max: 0.90 },
    outros: { min: 1.00, avg: 1.50, max: 2.50 },
  },
  lactacao: {
    suplemento: { min: 0.40, avg: 0.60, max: 1.00 },
    pasto: { min: 2.00, avg: 2.50, max: 3.20 },
    mao_obra: { min: 1.50, avg: 2.00, max: 2.80 },
    sanidade: { min: 0.40, avg: 0.60, max: 1.00 },
    outros: { min: 0.80, avg: 1.20, max: 2.00 },
  },
  reproducao: {
    suplemento: { min: 0.20, avg: 0.35, max: 0.55 },
    pasto: { min: 1.80, avg: 2.20, max: 3.00 },
    mao_obra: { min: 1.00, avg: 1.50, max: 2.20 },
    sanidade: { min: 0.40, avg: 0.55, max: 0.85 },
    outros: { min: 0.50, avg: 0.90, max: 1.50 },
  },
}

// GMD esperado por fase (kg/dia) - BR-CORTE / IMEA
const GMD_BENCHMARKS: Record<string, { min: number; avg: number; top: number }> = {
  cria: { min: 0.40, avg: 0.55, top: 0.70 },
  recria: { min: 0.45, avg: 0.60, top: 0.80 },
  engorda: { min: 0.50, avg: 0.70, top: 1.00 },
  engorda_confinamento: { min: 1.00, avg: 1.30, top: 1.80 },
  lactacao: { min: 0.20, avg: 0.35, top: 0.50 },
  reproducao: { min: 0.15, avg: 0.25, top: 0.40 },
}

export type WasteSeverity = 'info' | 'atencao' | 'critico'

export interface WasteItem {
  category: string
  title: string
  description: string
  severity: WasteSeverity
  current_value: number
  benchmark_value: number
  difference_percent: number
  monthly_waste_rs: number
}

export interface WasteReport {
  total_monthly_waste: number
  total_annual_waste: number
  items: WasteItem[]
  efficiency_score: number // 0-100
  best_practice_tips: string[]
  cost_optimization: {
    current_daily_cost: number
    optimal_daily_cost: number
    savings_percent: number
  }
}

export function detectWaste(
  dailyCosts: Record<string, number>,
  phase: string,
  headCount: number,
  gmdReal: number | null,
  daysInLot: number,
): WasteReport {
  const benchmarks = REGIONAL_BENCHMARKS[phase] || REGIONAL_BENCHMARKS.recria
  const gmdBench = GMD_BENCHMARKS[phase] || GMD_BENCHMARKS.recria

  const items: WasteItem[] = []
  let totalMonthlyWaste = 0

  // 26a + 26b: Comparar cada categoria de custo vs média regional
  const categories = ['suplemento', 'pasto', 'mao_obra', 'sanidade', 'outros'] as const
  const categoryLabels: Record<string, string> = {
    suplemento: 'Nutrição/Suplemento',
    pasto: 'Pasto/Pastagem',
    mao_obra: 'Mão de Obra',
    sanidade: 'Sanidade/Saúde',
    outros: 'Outros Custos',
  }

  for (const cat of categories) {
    const userCost = dailyCosts[cat] || 0
    const bench = benchmarks[cat]
    if (!bench || userCost === 0) continue

    const diffPercent = bench.avg > 0 ? Math.round(((userCost - bench.avg) / bench.avg) * 100) : 0

    if (diffPercent > 10) {
      const wastePerDay = (userCost - bench.avg) * headCount
      const monthlyWaste = wastePerDay * 30

      let severity: WasteSeverity = 'info'
      if (diffPercent > 30) severity = 'critico'
      else if (diffPercent > 15) severity = 'atencao'

      items.push({
        category: cat,
        title: `${categoryLabels[cat]} ${diffPercent}% acima da média regional`,
        description: `Seu custo: R$ ${userCost.toFixed(2)}/cab/dia. Média MT (${phase}): R$ ${bench.avg.toFixed(2)}. Máximo aceitável: R$ ${bench.max.toFixed(2)}.`,
        severity,
        current_value: userCost,
        benchmark_value: bench.avg,
        difference_percent: diffPercent,
        monthly_waste_rs: Math.round(monthlyWaste),
      })

      totalMonthlyWaste += monthlyWaste
    }
  }

  // 26c: Custo ótimo vs atual
  const currentDailyTotal = Object.values(dailyCosts).reduce((sum, v) => sum + (v || 0), 0)
  const optimalDailyTotal = categories.reduce((sum, cat) => {
    const bench = benchmarks[cat]
    return sum + (bench ? bench.avg : 0)
  }, 0)

  // Detectar ineficiência de GMD (custo alto com resultado baixo)
  if (gmdReal !== null && gmdReal > 0) {
    const costPerKgGain = currentDailyTotal / gmdReal
    const optimalCostPerKg = optimalDailyTotal / gmdBench.avg
    const efficiencyDiff = Math.round(((costPerKgGain - optimalCostPerKg) / optimalCostPerKg) * 100)

    if (efficiencyDiff > 20) {
      const monthlyInefficiency = (costPerKgGain - optimalCostPerKg) * gmdReal * headCount * 30
      items.push({
        category: 'eficiencia',
        title: `Custo por kg de ganho ${efficiencyDiff}% acima do ideal`,
        description: `Seu custo: R$ ${costPerKgGain.toFixed(2)}/kg ganho. Benchmark: R$ ${optimalCostPerKg.toFixed(2)}/kg. GMD real: ${gmdReal.toFixed(3)} kg/dia vs média ${gmdBench.avg.toFixed(2)} kg/dia.`,
        severity: efficiencyDiff > 40 ? 'critico' : 'atencao',
        current_value: costPerKgGain,
        benchmark_value: optimalCostPerKg,
        difference_percent: efficiencyDiff,
        monthly_waste_rs: Math.round(monthlyInefficiency),
      })
      totalMonthlyWaste += monthlyInefficiency
    }

    // GMD abaixo do esperado = desperdício de potencial
    if (gmdReal < gmdBench.min) {
      const potentialLossKgDay = gmdBench.avg - gmdReal
      const potentialLossMonthlyKg = potentialLossKgDay * 30 * headCount
      // Converter para R$ (estimativa: 1kg PV ≈ R$ 11 para engorda, baseado em arroba)
      const kgValue = 11
      const monthlyPotentialLoss = potentialLossMonthlyKg * kgValue

      items.push({
        category: 'gmd',
        title: `GMD abaixo do mínimo esperado para ${phase}`,
        description: `GMD real: ${gmdReal.toFixed(3)} kg/dia. Mínimo esperado: ${gmdBench.min.toFixed(2)} kg/dia. Perda de ${potentialLossKgDay.toFixed(2)} kg/cab/dia de potencial de ganho.`,
        severity: 'critico',
        current_value: gmdReal,
        benchmark_value: gmdBench.avg,
        difference_percent: Math.round(((gmdBench.avg - gmdReal) / gmdBench.avg) * 100),
        monthly_waste_rs: Math.round(monthlyPotentialLoss),
      })
      totalMonthlyWaste += monthlyPotentialLoss
    }
  }

  // 26e: Score de eficiência (0-100)
  const savingsPercent = currentDailyTotal > 0
    ? Math.round(((currentDailyTotal - optimalDailyTotal) / currentDailyTotal) * 100)
    : 0

  let efficiencyScore = 100
  for (const item of items) {
    if (item.severity === 'critico') efficiencyScore -= 20
    else if (item.severity === 'atencao') efficiencyScore -= 10
    else efficiencyScore -= 5
  }
  efficiencyScore = Math.max(0, Math.min(100, efficiencyScore))

  // 26d: Dicas de melhoria
  const tips: string[] = []
  const worstItem = items.sort((a, b) => b.monthly_waste_rs - a.monthly_waste_rs)[0]

  if (worstItem) {
    if (worstItem.category === 'suplemento') {
      tips.push('Compare preços de suplemento entre fornecedores locais. Diferenças de 10-20% são comuns.')
      tips.push('Verifique se o consumo real do suplemento está na faixa recomendada pelo fabricante.')
    }
    if (worstItem.category === 'pasto') {
      tips.push('Avalie a capacidade de suporte da pastagem. Superlotação aumenta custo de manutenção.')
      tips.push('Considere divisão de piquetes para pastejo rotacionado — melhora aproveitamento em até 30%.')
    }
    if (worstItem.category === 'mao_obra') {
      tips.push('Avalie automatização de cochos e distribuição de sal/suplemento.')
      tips.push('Mão de obra compartilhada entre lotes pode reduzir custo por cabeça.')
    }
    if (worstItem.category === 'sanidade') {
      tips.push('Manejo preventivo (vacinação em dia) custa 60% menos que tratamento curativo.')
      tips.push('Negocie compras de medicamentos em grupo com vizinhos para volume.')
    }
    if (worstItem.category === 'eficiencia') {
      tips.push('Melhore a conversão alimentar revisando a qualidade da forragem e suplementação.')
      tips.push('Considere análise bromatológica do pasto — investimento de R$ 150 que pode economizar milhares.')
    }
    if (worstItem.category === 'gmd') {
      tips.push('GMD baixo pode indicar problemas nutricionais, sanitários ou de manejo.')
      tips.push('Faça pesagens regulares (a cada 28 dias) para acompanhar a evolução e agir rápido.')
    }
  }

  if (items.length === 0) {
    tips.push('Seus custos estão dentro da faixa regional. Continue monitorando mensalmente.')
    tips.push('Foque em melhorar o GMD para aumentar a rentabilidade sem aumentar custos.')
  }

  return {
    total_monthly_waste: Math.round(totalMonthlyWaste),
    total_annual_waste: Math.round(totalMonthlyWaste * 12),
    items: items.sort((a, b) => b.monthly_waste_rs - a.monthly_waste_rs),
    efficiency_score: efficiencyScore,
    best_practice_tips: tips,
    cost_optimization: {
      current_daily_cost: Math.round(currentDailyTotal * 100) / 100,
      optimal_daily_cost: Math.round(optimalDailyTotal * 100) / 100,
      savings_percent: Math.max(0, savingsPercent),
    },
  }
}
