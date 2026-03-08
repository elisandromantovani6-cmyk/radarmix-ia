import { predictProfit, type ProfitInput } from '../profit-predictor'

describe('profit-predictor', () => {
  const baseInput: ProfitInput = {
    current_weight_kg: 380,
    target_weight_kg: 540,
    head_count: 100,
    gmd_estimated: 0.70,
    daily_cost_per_head: 6.35,
    animal_purchase_price: 4200,
    arroba_price: 320,
    carcass_yield: 0.52,
    mortality_rate: 0.015,
    phase: 'engorda',
  }

  describe('predictProfit', () => {
    it('calcula cenários pessimista < provável < otimista', () => {
      const result = predictProfit(baseInput)
      expect(result.scenarios.pessimista.profit_per_head)
        .toBeLessThan(result.scenarios.provavel.profit_per_head)
      expect(result.scenarios.provavel.profit_per_head)
        .toBeLessThan(result.scenarios.otimista.profit_per_head)
    })

    it('calcula probabilidade de lucro entre 0 e 100', () => {
      const result = predictProfit(baseInput)
      expect(result.probability_of_profit).toBeGreaterThanOrEqual(0)
      expect(result.probability_of_profit).toBeLessThanOrEqual(100)
    })

    it('calcula intervalo de confiança com p10 < p50 < p90', () => {
      const result = predictProfit(baseInput)
      expect(result.confidence_interval.p10).toBeLessThanOrEqual(result.confidence_interval.p50)
      expect(result.confidence_interval.p50).toBeLessThanOrEqual(result.confidence_interval.p90)
    })

    it('calcula dias até abate corretamente', () => {
      const result = predictProfit(baseInput)
      // 160kg de ganho / 0.70 kg/dia = ~229 dias
      expect(result.days_to_target).toBe(Math.ceil(160 / 0.70))
    })

    it('calcula ponto de equilíbrio com preço mínimo da @', () => {
      const result = predictProfit(baseInput)
      expect(result.breakeven.min_arroba_price).toBeGreaterThan(0)
      expect(result.breakeven.min_arroba_price).toBeLessThan(baseInput.arroba_price * 2)
    })

    it('calcula GMD mínimo para equilíbrio', () => {
      const result = predictProfit(baseInput)
      expect(result.breakeven.min_gmd).toBeGreaterThan(0)
      expect(result.breakeven.min_gmd).toBeLessThanOrEqual(baseInput.gmd_estimated)
    })

    it('gera comparação de 4 sistemas', () => {
      const result = predictProfit(baseInput)
      expect(result.system_comparison.length).toBe(4)
      expect(result.system_comparison.map(s => s.system)).toContain('confinamento')
      expect(result.system_comparison.map(s => s.system)).toContain('pasto_mineral')
    })

    it('confinamento tem mais dias que pasto', () => {
      const result = predictProfit(baseInput)
      const pasto = result.system_comparison.find(s => s.system === 'pasto_mineral')!
      const conf = result.system_comparison.find(s => s.system === 'confinamento')!
      expect(pasto.days_to_target).toBeGreaterThan(conf.days_to_target)
    })

    it('lucro total considera mortalidade', () => {
      const result = predictProfit(baseInput)
      const profitPerHead = result.scenarios.provavel.profit_per_head
      const expectedTotal = Math.round(profitPerHead * baseInput.head_count * (1 - baseInput.mortality_rate))
      expect(result.expected_profit_total).toBe(expectedTotal)
    })

    it('cenário pessimista usa preço mais baixo', () => {
      const result = predictProfit(baseInput)
      expect(result.scenarios.pessimista.arroba_price)
        .toBeLessThan(result.scenarios.provavel.arroba_price)
    })

    it('cenário otimista usa GMD mais alto', () => {
      const result = predictProfit(baseInput)
      expect(result.scenarios.otimista.gmd)
        .toBeGreaterThan(result.scenarios.provavel.gmd)
    })

    it('funciona com peso inicial próximo do alvo', () => {
      const nearTarget = { ...baseInput, current_weight_kg: 530 }
      const result = predictProfit(nearTarget)
      expect(result.days_to_target).toBeLessThan(20)
    })
  })
})
