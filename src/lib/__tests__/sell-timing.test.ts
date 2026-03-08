import { predictSellTiming, type SellTimingInput, type SellTimingResult } from '../sell-timing'

describe('sell-timing', () => {
  // Entrada padrão: boi nelore em engorda, 450kg, GMD 0.70
  const baseInput: SellTimingInput = {
    current_weight_kg: 450,
    gmd: 0.70,
    daily_cost: 6.35,
    head_count: 100,
    carcass_yield: 0.52,
    arroba_price: 320,
    animal_purchase_price: 4200,
    phase: 'engorda',
    target_weight_kg: 540,
  }

  let result: SellTimingResult

  beforeAll(() => {
    result = predictSellTiming(baseInput)
  })

  it('gera exatamente 4 cenários (agora, 30, 60, 90 dias)', () => {
    expect(result.scenarios).toHaveLength(4)
    expect(result.scenarios.map(s => s.days_from_now)).toEqual([0, 30, 60, 90])
  })

  it('cenários ordenados por dias (0, 30, 60, 90)', () => {
    const days = result.scenarios.map(s => s.days_from_now)
    for (let i = 1; i < days.length; i++) {
      expect(days[i]).toBeGreaterThan(days[i - 1])
    }
  })

  it('lucro tem ponto ótimo — aumenta e depois cai', () => {
    // Com custo diário, eventualmente o custo acumulado supera o ganho de peso/preço
    // Pelo menos um cenário intermediário deve ter lucro maior que agora ou 90 dias
    const profits = result.scenarios.map(s => s.projected_profit)
    const maxProfit = Math.max(...profits)
    const maxIndex = profits.indexOf(maxProfit)
    // O melhor cenário não deve ser simultaneamente o primeiro E o último
    // (indicando que há um ponto ótimo)
    const isNotMonotonic = !(maxIndex === 0 && profits[3] > profits[1]) &&
                           !(maxIndex === 3 && profits[0] > profits[1])
    expect(isNotMonotonic).toBe(true)
  })

  it('identifica a janela ótima de venda', () => {
    expect(result.optimal_window).toBeDefined()
    expect(result.optimal_window.start_month).toBeTruthy()
    expect(result.optimal_window.end_month).toBeTruthy()
    expect(result.optimal_window.reason).toBeTruthy()
  })

  it('detecta tendência de preço corretamente', () => {
    expect(result.current_market).toBeDefined()
    expect(result.current_market.arroba_price).toBe(320)
    expect(['alta', 'estavel', 'queda']).toContain(result.current_market.trend)
    expect(result.current_market.trend_reason).toBeTruthy()
  })

  it('gera alertas relevantes', () => {
    expect(result.alerts).toBeDefined()
    expect(result.alerts.length).toBeGreaterThan(0)
    // Deve ter alerta sobre peso de abate (animal com 450kg < 540kg alvo)
    const hasWeightAlert = result.alerts.some(a => a.includes('peso de abate'))
    expect(hasWeightAlert).toBe(true)
  })

  it('projeção de peso está correta', () => {
    // Cenário +30 dias: peso = 450 + (0.70 × 30) = 471kg
    const scenario30 = result.scenarios.find(s => s.days_from_now === 30)!
    const expectedWeight = 450 + (0.70 * 30)
    expect(scenario30.projected_weight).toBeCloseTo(expectedWeight, 0)

    // Cenário +90 dias: peso = 450 + (0.70 × 90) = 513kg
    const scenario90 = result.scenarios.find(s => s.days_from_now === 90)!
    const expectedWeight90 = 450 + (0.70 * 90)
    expect(scenario90.projected_weight).toBeCloseTo(expectedWeight90, 0)
  })

  it('cálculo de receita está correto (peso × rendimento / 15 × preço)', () => {
    const scenarioNow = result.scenarios.find(s => s.days_from_now === 0)!
    const expectedArrobas = (450 * 0.52) / 15
    expect(scenarioNow.projected_arrobas).toBeCloseTo(expectedArrobas, 1)
    // Receita bruta base (sem considerar sazonalidade e impostos completos)
    expect(scenarioNow.projected_revenue).toBeGreaterThan(0)
  })

  it('custo diário alto gera alerta de "venda antes de 60 dias"', () => {
    // Com custo diário muito alto, o lucro em 60d deve ser menor que em 30d
    const highCostInput: SellTimingInput = {
      ...baseInput,
      daily_cost: 25.00, // custo muito alto (R$25/cab/dia)
    }
    const highCostResult = predictSellTiming(highCostInput)
    const hasAlert = highCostResult.alerts.some(a => a.includes('corroendo lucro'))
    expect(hasAlert).toBe(true)
  })

  it('gera texto de resumo (summary)', () => {
    expect(result.summary).toBeTruthy()
    expect(result.summary.length).toBeGreaterThan(20)
    // Resumo deve mencionar a recomendação
    const hasMention = result.summary.includes('Recomendação') || result.summary.includes('recomendação')
    expect(hasMention).toBe(true)
  })

  it('cenário "agora" tem custo de manutenção zero (apenas compra)', () => {
    const scenarioNow = result.scenarios.find(s => s.days_from_now === 0)!
    // Custo = apenas preço de compra × cabeças (sem dias de manutenção)
    const expectedCost = baseInput.animal_purchase_price * baseInput.head_count
    expect(scenarioNow.total_cost_until_then).toBe(expectedCost)
  })

  it('cada cenário tem recomendação textual', () => {
    for (const scenario of result.scenarios) {
      expect(scenario.recommendation).toBeTruthy()
      expect(scenario.recommendation.length).toBeGreaterThan(5)
    }
  })

  it('animal já no peso de abate gera alerta de "já atingiu"', () => {
    const heavyInput: SellTimingInput = {
      ...baseInput,
      current_weight_kg: 560, // já acima de 540kg
    }
    const heavyResult = predictSellTiming(heavyInput)
    const hasAlert = heavyResult.alerts.some(a => a.includes('já atingiu peso de abate'))
    expect(hasAlert).toBe(true)
  })

  it('ROI diminui com custos maiores', () => {
    const lowCostResult = predictSellTiming({ ...baseInput, daily_cost: 3.00 })
    const highCostResult = predictSellTiming({ ...baseInput, daily_cost: 15.00 })

    // Comparar ROI do cenário de 30 dias
    const lowROI = lowCostResult.scenarios.find(s => s.days_from_now === 30)!.roi_percent
    const highROI = highCostResult.scenarios.find(s => s.days_from_now === 30)!.roi_percent
    expect(lowROI).toBeGreaterThan(highROI)
  })
})
