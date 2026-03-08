import { detectWaste } from '../waste-detector'

describe('waste-detector', () => {
  const normalCosts = {
    suplemento: 0.32,
    pasto: 2.20,
    mao_obra: 1.40,
    sanidade: 0.50,
    outros: 0.80,
  }

  describe('detectWaste', () => {
    it('retorna score alto quando custos estão na média', () => {
      const report = detectWaste(normalCosts, 'recria', 100, 0.60, 90)
      expect(report.efficiency_score).toBeGreaterThanOrEqual(80)
      expect(report.total_monthly_waste).toBe(0)
    })

    it('detecta custo de pasto acima da média', () => {
      const highPasto = { ...normalCosts, pasto: 4.00 } // muito acima
      const report = detectWaste(highPasto, 'recria', 100, 0.60, 90)
      const pastoItem = report.items.find(i => i.category === 'pasto')
      expect(pastoItem).toBeDefined()
      expect(pastoItem!.severity).toBe('critico')
      expect(pastoItem!.monthly_waste_rs).toBeGreaterThan(0)
    })

    it('detecta custo de suplemento acima da média', () => {
      const highSupp = { ...normalCosts, suplemento: 0.80 }
      const report = detectWaste(highSupp, 'recria', 200, 0.60, 90)
      const suppItem = report.items.find(i => i.category === 'suplemento')
      expect(suppItem).toBeDefined()
      expect(suppItem!.difference_percent).toBeGreaterThan(100)
    })

    it('detecta GMD abaixo do mínimo', () => {
      const report = detectWaste(normalCosts, 'engorda', 100, 0.30, 90)
      const gmdItem = report.items.find(i => i.category === 'gmd')
      expect(gmdItem).toBeDefined()
      expect(gmdItem!.severity).toBe('critico')
    })

    it('calcula economia anual corretamente', () => {
      const highCosts = { suplemento: 1.00, pasto: 4.00, mao_obra: 3.00, sanidade: 1.50, outros: 2.00 }
      const report = detectWaste(highCosts, 'recria', 100, 0.50, 90)
      expect(report.total_annual_waste).toBe(report.total_monthly_waste * 12)
    })

    it('gera dicas de melhoria', () => {
      const report = detectWaste(normalCosts, 'recria', 100, 0.60, 90)
      expect(report.best_practice_tips.length).toBeGreaterThan(0)
    })

    it('calcula custo ótimo vs atual', () => {
      const report = detectWaste(normalCosts, 'recria', 100, 0.60, 90)
      expect(report.cost_optimization.current_daily_cost).toBeGreaterThan(0)
      expect(report.cost_optimization.optimal_daily_cost).toBeGreaterThan(0)
    })

    it('funciona com custos zerados', () => {
      const zeroCosts = { suplemento: 0, pasto: 0, mao_obra: 0, sanidade: 0, outros: 0 }
      const report = detectWaste(zeroCosts, 'recria', 50, null, 30)
      expect(report.efficiency_score).toBe(100)
      expect(report.items.length).toBe(0)
    })

    it('funciona sem GMD real', () => {
      const report = detectWaste(normalCosts, 'engorda', 100, null, 60)
      expect(report).toBeDefined()
      const gmdItem = report.items.find(i => i.category === 'gmd')
      expect(gmdItem).toBeUndefined()
    })

    it('diferencia fases corretamente', () => {
      // Confinamento tem benchmark de suplemento muito mais alto
      const highSupp = { ...normalCosts, suplemento: 3.00 }
      const reportRecria = detectWaste(highSupp, 'recria', 100, null, 90)
      const reportConf = detectWaste(highSupp, 'engorda_confinamento', 100, null, 90)
      // Em recria, 3.00 é absurdo. Em confinamento, é normal
      const recriaItem = reportRecria.items.find(i => i.category === 'suplemento')
      const confItem = reportConf.items.find(i => i.category === 'suplemento')
      expect(recriaItem).toBeDefined()
      expect(confItem).toBeUndefined() // 3.00 está abaixo da média de confinamento
    })

    it('score diminui com mais itens críticos', () => {
      const allHigh = { suplemento: 2.00, pasto: 5.00, mao_obra: 4.00, sanidade: 2.00, outros: 3.00 }
      const report = detectWaste(allHigh, 'recria', 100, 0.20, 90)
      expect(report.efficiency_score).toBeLessThan(60)
    })
  })
})
