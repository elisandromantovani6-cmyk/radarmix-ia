import {
  getPriceRadar,
  generatePriceHistory,
  type PriceRadarResult,
  type PriceItem,
} from '../price-radar'

describe('price-radar', () => {
  // Resultado padrão: março (mês 3), 100 cabeças, 10kg/dia
  let result: PriceRadarResult

  beforeAll(() => {
    result = getPriceRadar(3, 100, 10)
  })

  // =============================================
  // Teste 1: Retorna exatamente 10 itens de preço
  // =============================================
  it('retorna exatamente 10 itens de preço', () => {
    expect(result.items).toHaveLength(10)
  })

  // =============================================
  // Teste 2: Cada item possui histórico de 30 dias
  // =============================================
  it('cada item possui histórico de 30 dias', () => {
    for (const item of result.items) {
      // 31 pontos (dia 0 + 30 dias)
      expect(item.history_30d.length).toBeGreaterThanOrEqual(30)
      expect(item.history_30d.length).toBeLessThanOrEqual(32)
    }
  })

  // =============================================
  // Teste 3: Cada item possui histórico de 90 dias
  // =============================================
  it('cada item possui histórico de 90 dias', () => {
    for (const item of result.items) {
      // 91 pontos (dia 0 + 90 dias)
      expect(item.history_90d.length).toBeGreaterThanOrEqual(90)
      expect(item.history_90d.length).toBeLessThanOrEqual(92)
    }
  })

  // =============================================
  // Teste 4: Variações calculadas corretamente (não NaN)
  // =============================================
  it('variações calculadas como números válidos', () => {
    for (const item of result.items) {
      expect(typeof item.variation_7d_percent).toBe('number')
      expect(typeof item.variation_30d_percent).toBe('number')
      expect(Number.isNaN(item.variation_7d_percent)).toBe(false)
      expect(Number.isNaN(item.variation_30d_percent)).toBe(false)
    }
  })

  // =============================================
  // Teste 5: Tendências são valores válidos (alta/estavel/queda)
  // =============================================
  it('tendências são valores válidos', () => {
    const validTrends = ['alta', 'estavel', 'queda']
    for (const item of result.items) {
      expect(validTrends).toContain(item.trend)
    }
  })

  // =============================================
  // Teste 6: Alertas gerados são do tipo correto
  // =============================================
  it('alertas possuem tipo válido e descrição', () => {
    const validTypes = [
      'oportunidade_compra',
      'oportunidade_venda',
      'queda_preco',
      'alta_preco',
    ]
    for (const alert of result.alerts) {
      expect(validTypes).toContain(alert.type)
      expect(alert.title.length).toBeGreaterThan(0)
      expect(alert.description.length).toBeGreaterThan(0)
    }
  })

  // =============================================
  // Teste 7: Histórico ordenado cronologicamente
  // =============================================
  it('histórico de preços está em ordem cronológica', () => {
    for (const item of result.items) {
      // Verifica histórico de 30 dias
      for (let i = 1; i < item.history_30d.length; i++) {
        expect(item.history_30d[i].date >= item.history_30d[i - 1].date).toBe(true)
      }
      // Verifica histórico de 90 dias
      for (let i = 1; i < item.history_90d.length; i++) {
        expect(item.history_90d[i].date >= item.history_90d[i - 1].date).toBe(true)
      }
    }
  })

  // =============================================
  // Teste 8: Categorias corretas (gado/grao/insumo)
  // =============================================
  it('categorias dos itens são corretas', () => {
    const gadoItems = result.items.filter(i => i.category === 'gado')
    const graoItems = result.items.filter(i => i.category === 'grao')
    const insumoItems = result.items.filter(i => i.category === 'insumo')

    // 3 itens de gado: boi gordo, vaca gorda, bezerro
    expect(gadoItems).toHaveLength(3)
    // 2 itens de grão: milho, soja
    expect(graoItems).toHaveLength(2)
    // 5 itens de insumo: farelo soja, farelo algodão, sal, ureia, caroço
    expect(insumoItems).toHaveLength(5)
  })

  // =============================================
  // Teste 9: Preços são positivos e razoáveis
  // =============================================
  it('preços atuais são positivos e razoáveis', () => {
    for (const item of result.items) {
      expect(item.current_price).toBeGreaterThan(0)
      // Nenhum preço deve ser absurdamente alto ou baixo
      // (verificação de sanidade)
      for (const point of item.history_90d) {
        expect(point.value).toBeGreaterThan(0)
      }
    }
  })

  // =============================================
  // Teste 10: Resultado inclui last_update válido
  // =============================================
  it('last_update é uma data ISO válida', () => {
    expect(result.last_update).toBeTruthy()
    const parsed = new Date(result.last_update)
    expect(parsed.getTime()).not.toBeNaN()
  })

  // =============================================
  // Teste 11: Nomes dos itens corretos
  // =============================================
  it('contém todos os 10 itens esperados', () => {
    const names = result.items.map(i => i.name)
    expect(names).toContain('Arroba do boi gordo')
    expect(names).toContain('Arroba da vaca gorda')
    expect(names).toContain('Bezerro (MS)')
    expect(names).toContain('Milho')
    expect(names).toContain('Soja')
    expect(names).toContain('Farelo de soja')
    expect(names).toContain('Farelo de algodão')
    expect(names).toContain('Sal mineral')
    expect(names).toContain('Ureia pecuária')
    expect(names).toContain('Caroço de algodão')
  })

  // =============================================
  // Teste 12: generatePriceHistory é determinística com seed
  // =============================================
  it('generatePriceHistory gera resultados determinísticos com mesma seed', () => {
    const seasonal = { 1: 1.0, 2: 1.0, 3: 1.0, 4: 1.0, 5: 1.0, 6: 1.0, 7: 1.0, 8: 1.0, 9: 1.0, 10: 1.0, 11: 1.0, 12: 1.0 }
    const h1 = generatePriceHistory(100, 0.01, seasonal, 30, 123)
    const h2 = generatePriceHistory(100, 0.01, seasonal, 30, 123)

    expect(h1).toEqual(h2)
  })

  // =============================================
  // Teste 13: Economia potencial calculada em alertas de compra
  // =============================================
  it('alertas de oportunidade de compra podem incluir economia potencial', () => {
    // Gera com lote grande para maximizar chances de alertas com economia
    const bigResult = getPriceRadar(3, 500, 15)
    const buyAlerts = bigResult.alerts.filter(a => a.type === 'oportunidade_compra')

    // Se houver alertas de compra, verifica que potential_savings é número ou undefined
    for (const alert of buyAlerts) {
      if (alert.potential_savings !== undefined) {
        expect(typeof alert.potential_savings).toBe('number')
        expect(alert.potential_savings).toBeGreaterThan(0)
      }
    }
  })

  // =============================================
  // Teste 14: Unidades corretas para cada categoria
  // =============================================
  it('unidades estão corretas para cada item', () => {
    const unitMap: Record<string, string> = {
      'Arroba do boi gordo': '@',
      'Arroba da vaca gorda': '@',
      'Bezerro (MS)': 'cab',
      'Milho': 'saca 60kg',
      'Soja': 'saca 60kg',
      'Farelo de soja': 'ton',
      'Farelo de algodão': 'ton',
      'Sal mineral': 'kg',
      'Ureia pecuária': 'ton',
      'Caroço de algodão': 'ton',
    }

    for (const item of result.items) {
      expect(item.unit).toBe(unitMap[item.name])
    }
  })
})
