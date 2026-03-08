/**
 * Testes do Oraculo do Confinamento
 *
 * Verifica predicoes de GMD, peso, financeiro, cenarios e insights.
 */

import { describe, it, expect } from 'vitest'
import { consultOracle, type OracleInput } from '../confinement-oracle'

// Input base para reutilizar nos testes
// Nelore tipico em engorda, condicoes normais
function createBaseInput(overrides: Partial<OracleInput> = {}): OracleInput {
  return {
    current_weight_kg: 420,
    target_weight_kg: 540,
    breed_type: 'zebuino',
    gmd_current: 1.0,
    phase: 'engorda',
    supplement_line: 'mineral',
    forage_quality: 'boa',
    itu_current: 65,
    season: 'aguas',
    stress_days_forecast: 0,
    head_count: 100,
    stocking_rate: 2.0,
    days_since_last_weighing: 7,
    arroba_price: 320,
    daily_cost: 6.35,
    animal_purchase_price: 4200,
    carcass_yield: 0.52,
    ...overrides,
  }
}

describe('consultOracle', () => {
  // -----------------------------------------------
  // Teste 1: Estrutura basica de saida (todos os campos presentes)
  // -----------------------------------------------
  it('deve retornar estrutura completa com todos os campos obrigatorios', () => {
    const result = consultOracle(createBaseInput())

    // gmd_projected
    expect(result.gmd_projected).toBeDefined()
    expect(typeof result.gmd_projected.d30).toBe('number')
    expect(typeof result.gmd_projected.d60).toBe('number')
    expect(typeof result.gmd_projected.d90).toBe('number')
    expect(Array.isArray(result.gmd_projected.factors)).toBe(true)

    // weight_projected
    expect(result.weight_projected).toBeDefined()
    expect(typeof result.weight_projected.d30).toBe('number')
    expect(typeof result.weight_projected.d60).toBe('number')
    expect(typeof result.weight_projected.d90).toBe('number')
    expect(typeof result.weight_projected.days_to_target).toBe('number')

    // financial
    expect(result.financial).toBeDefined()
    expect(typeof result.financial.total_cost_at_target).toBe('number')
    expect(typeof result.financial.projected_revenue).toBe('number')
    expect(typeof result.financial.projected_profit_per_head).toBe('number')
    expect(typeof result.financial.risk_of_loss_percent).toBe('number')
    expect(typeof result.financial.breakeven_arroba).toBe('number')

    // scenarios, oracle_says, confidence, data_quality
    expect(Array.isArray(result.scenarios)).toBe(true)
    expect(Array.isArray(result.oracle_says)).toBe(true)
    expect(['baixa', 'media', 'alta']).toContain(result.confidence_level)
    expect(typeof result.data_quality_score).toBe('number')
  })

  // -----------------------------------------------
  // Teste 2: GMD projetado afetado pela qualidade da forragem
  // -----------------------------------------------
  it('deve reduzir GMD com forragem de qualidade ruim e media', () => {
    const boa = consultOracle(createBaseInput({ forage_quality: 'boa' }))
    const media = consultOracle(createBaseInput({ forage_quality: 'media' }))
    const ruim = consultOracle(createBaseInput({ forage_quality: 'ruim' }))

    // boa > media > ruim
    expect(boa.gmd_projected.d30).toBeGreaterThan(media.gmd_projected.d30)
    expect(media.gmd_projected.d30).toBeGreaterThan(ruim.gmd_projected.d30)

    // Forragem ruim deve registrar fator nos motivos
    expect(ruim.gmd_projected.factors.some(f => f.includes('Forragem'))).toBe(true)

    // Fator media = 0.90, ruim = 0.75 (relativo a boa = 1.0)
    // Com GMD base 1.0 e sem outros fatores negativos:
    expect(media.gmd_projected.d30).toBeCloseTo(boa.gmd_projected.d30 * 0.90, 2)
    expect(ruim.gmd_projected.d30).toBeCloseTo(boa.gmd_projected.d30 * 0.75, 2)
  })

  // -----------------------------------------------
  // Teste 3: GMD projetado afetado pela suplementacao
  // -----------------------------------------------
  it('deve melhorar GMD com suplementacao de maior nivel', () => {
    const mineral = consultOracle(createBaseInput({ supplement_line: 'mineral' }))
    const proteico = consultOracle(createBaseInput({ supplement_line: 'proteico' }))
    const rk = consultOracle(createBaseInput({ supplement_line: 'rk' }))
    const concentrado = consultOracle(createBaseInput({ supplement_line: 'concentrado' }))

    // mineral < proteico < rk < concentrado
    expect(proteico.gmd_projected.d30).toBeGreaterThan(mineral.gmd_projected.d30)
    expect(rk.gmd_projected.d30).toBeGreaterThan(proteico.gmd_projected.d30)
    expect(concentrado.gmd_projected.d30).toBeGreaterThan(rk.gmd_projected.d30)

    // Concentrado deve registrar fator nos motivos
    expect(concentrado.gmd_projected.factors.some(f => f.includes('concentrado'))).toBe(true)

    // Verificar fatores: proteico=1.10, rk=1.30, concentrado=1.40
    expect(proteico.gmd_projected.d30).toBeCloseTo(mineral.gmd_projected.d30 * 1.10, 2)
    expect(rk.gmd_projected.d30).toBeCloseTo(mineral.gmd_projected.d30 * 1.30, 2)
    expect(concentrado.gmd_projected.d30).toBeCloseTo(mineral.gmd_projected.d30 * 1.40, 2)
  })

  // -----------------------------------------------
  // Teste 4: Fator de estacao afeta GMD (seca vs aguas)
  // -----------------------------------------------
  it('deve aplicar fator de estacao no calculo do GMD base', () => {
    const aguas = consultOracle(createBaseInput({ season: 'aguas' }))
    const seca = consultOracle(createBaseInput({ season: 'seca' }))

    // O season factor (seca=0.90) é aplicado ao GMD base.
    // O projectGMDForPeriod pode compensar se o mês calendário muda de estação,
    // mas os days_to_target na seca devem ser maiores (mais lento para ganhar peso)
    expect(seca.weight_projected.days_to_target).toBeGreaterThanOrEqual(aguas.weight_projected.days_to_target)
  })

  // -----------------------------------------------
  // Teste 5: Estresse termico (ITU) reduz GMD
  // -----------------------------------------------
  it('deve reduzir GMD projetado em condicoes de estresse termico (ITU elevado)', () => {
    const normal = consultOracle(createBaseInput({ itu_current: 65, stress_days_forecast: 0 }))
    const alerta = consultOracle(createBaseInput({ itu_current: 75, stress_days_forecast: 15 }))
    const perigo = consultOracle(createBaseInput({ itu_current: 85, stress_days_forecast: 20 }))
    const emergencia = consultOracle(createBaseInput({ itu_current: 92, stress_days_forecast: 25 }))

    // normal > alerta > perigo > emergencia
    expect(alerta.gmd_projected.d30).toBeLessThan(normal.gmd_projected.d30)
    expect(perigo.gmd_projected.d30).toBeLessThan(alerta.gmd_projected.d30)
    expect(emergencia.gmd_projected.d30).toBeLessThan(perigo.gmd_projected.d30)

    // Estresse deve registrar fator nos motivos
    expect(perigo.gmd_projected.factors.some(f => f.includes('Estresse'))).toBe(true)
  })

  // -----------------------------------------------
  // Teste 6: Impacto da taxa de lotacao
  // -----------------------------------------------
  it('deve reduzir GMD em caso de superlotacao (acima de 3 UA/ha)', () => {
    const normal = consultOracle(createBaseInput({ stocking_rate: 2.0 }))
    const limite = consultOracle(createBaseInput({ stocking_rate: 3.0 }))
    const superlotado = consultOracle(createBaseInput({ stocking_rate: 5.0 }))
    const confinamento = consultOracle(createBaseInput({ stocking_rate: null }))

    // Ate 3.0 UA/ha nao tem impacto
    expect(limite.gmd_projected.d30).toBe(normal.gmd_projected.d30)

    // Acima de 3.0 UA/ha reduz GMD (-5% por UA excedente)
    expect(superlotado.gmd_projected.d30).toBeLessThan(normal.gmd_projected.d30)

    // Confinamento (null) nao tem efeito de lotacao
    expect(confinamento.gmd_projected.d30).toBe(normal.gmd_projected.d30)

    // Superlotacao deve registrar fator nos motivos
    expect(superlotado.gmd_projected.factors.some(f => f.includes('Superlotacao') || f.includes('lotacao') || f.includes('UA/ha'))).toBe(true)
  })

  // -----------------------------------------------
  // Teste 7: Calculos financeiros (receita, lucro, custos)
  // -----------------------------------------------
  it('deve calcular receita, custo total e lucro projetado corretamente', () => {
    const input = createBaseInput()
    const result = consultOracle(input)

    // Custo total = preco de compra + (custo diario * dias ate o alvo)
    const expectedTotalCost = input.animal_purchase_price + (input.daily_cost * result.weight_projected.days_to_target)
    expect(result.financial.total_cost_at_target).toBe(Math.round(expectedTotalCost))

    // Receita = (peso_alvo * rendimento_carcaca / 15) * preco_arroba - impostos
    const carcassWeight = input.target_weight_kg * input.carcass_yield
    const arrobas = carcassWeight / 15
    const grossRevenue = arrobas * input.arroba_price
    const funrural = grossRevenue * 0.015
    const senar = grossRevenue * 0.002
    const expectedRevenue = grossRevenue - funrural - senar - 14.46
    expect(result.financial.projected_revenue).toBe(Math.round(expectedRevenue))

    // Lucro = receita - custo total
    expect(result.financial.projected_profit_per_head).toBe(
      Math.round(result.financial.projected_revenue - result.financial.total_cost_at_target)
    )
  })

  // -----------------------------------------------
  // Teste 8: Calculo do breakeven da arroba
  // -----------------------------------------------
  it('deve calcular preco de breakeven da arroba corretamente', () => {
    const input = createBaseInput()
    const result = consultOracle(input)

    // Breakeven deve ser positivo
    expect(result.financial.breakeven_arroba).toBeGreaterThan(0)

    // Verificar formula: (totalCost + FETHAB) / (arrobas * (1 - FUNRURAL - SENAR))
    const carcassWeight = input.target_weight_kg * input.carcass_yield
    const arrobas = carcassWeight / 15
    const expectedBreakeven = (result.financial.total_cost_at_target + 14.46) / (arrobas * (1 - 0.015 - 0.002))
    expect(result.financial.breakeven_arroba).toBeCloseTo(expectedBreakeven, 1)

    // Se preco atual > breakeven, ha lucro
    if (input.arroba_price > result.financial.breakeven_arroba) {
      expect(result.financial.projected_profit_per_head).toBeGreaterThan(0)
    }
  })

  // -----------------------------------------------
  // Teste 9: Risco de prejuizo baseado na margem
  // -----------------------------------------------
  it('deve calcular risco de prejuizo baseado na margem de lucro', () => {
    // Custo muito alto = margem negativa = risco 85%
    const prejuizo = consultOracle(createBaseInput({ daily_cost: 50.00, animal_purchase_price: 8000 }))
    expect(prejuizo.financial.risk_of_loss_percent).toBe(85)

    // Custo baixo = margem alta = risco baixo (10 ou 20%)
    const lucrativo = consultOracle(createBaseInput({ daily_cost: 2.00, animal_purchase_price: 2000, arroba_price: 400 }))
    expect(lucrativo.financial.risk_of_loss_percent).toBeLessThanOrEqual(20)

    // Risco deve estar entre 0 e 100
    const result = consultOracle(createBaseInput())
    expect(result.financial.risk_of_loss_percent).toBeGreaterThanOrEqual(0)
    expect(result.financial.risk_of_loss_percent).toBeLessThanOrEqual(100)
  })

  // -----------------------------------------------
  // Teste 10: Calculo do score de qualidade dos dados
  // -----------------------------------------------
  it('deve calcular data quality score com base nos dados disponiveis', () => {
    // Dados completos: 15 + 20 + 15 + 10 + 10 + 10 + 5 + 5 = 90
    const completo = consultOracle(createBaseInput({
      current_weight_kg: 420,
      gmd_current: 1.0,
      days_since_last_weighing: 5,
      itu_current: 70,
      supplement_line: 'proteico',
      daily_cost: 6.35,
      stocking_rate: 2.0,
      arroba_price: 320,
    }))
    expect(completo.data_quality_score).toBe(90)

    // Dados minimos: peso=0 (0), gmd=0 (0), pesagem>30 (0), itu=0 (0),
    // suplemento=null (0), custo=0 (0), lotacao=null (0), arroba=0 (0) = 0
    const minimo = consultOracle(createBaseInput({
      current_weight_kg: 0,
      gmd_current: 0,
      days_since_last_weighing: 90,
      itu_current: 0,
      supplement_line: null,
      daily_cost: 0,
      stocking_rate: null,
      arroba_price: 0,
    }))
    expect(minimo.data_quality_score).toBe(0)

    // Pesagem de 7 dias = 15 pontos, pesagem de 15 dias = 10, pesagem de 30 dias = 5
    const pesagem7 = consultOracle(createBaseInput({ days_since_last_weighing: 7 }))
    const pesagem15 = consultOracle(createBaseInput({ days_since_last_weighing: 15 }))
    const pesagem30 = consultOracle(createBaseInput({ days_since_last_weighing: 30 }))
    expect(pesagem7.data_quality_score).toBeGreaterThan(pesagem15.data_quality_score)
    expect(pesagem15.data_quality_score).toBeGreaterThan(pesagem30.data_quality_score)
  })

  // -----------------------------------------------
  // Teste 11: Mapeamento do nivel de confianca
  // -----------------------------------------------
  it('deve mapear nivel de confianca corretamente (alta >= 70, media >= 40, baixa < 40)', () => {
    // Score >= 70 = alta
    const alta = consultOracle(createBaseInput({
      current_weight_kg: 420,
      gmd_current: 1.0,
      days_since_last_weighing: 5,
      itu_current: 70,
      supplement_line: 'proteico',
      daily_cost: 6.35,
      stocking_rate: 2.0,
      arroba_price: 320,
    }))
    expect(alta.confidence_level).toBe('alta')
    expect(alta.data_quality_score).toBeGreaterThanOrEqual(70)

    // Score entre 40 e 69 = media
    const media = consultOracle(createBaseInput({
      current_weight_kg: 420,
      gmd_current: 1.0,
      days_since_last_weighing: 7,
      itu_current: 0,
      supplement_line: null,
      daily_cost: 0,
      stocking_rate: null,
      arroba_price: 0,
    }))
    // 15 (peso) + 20 (gmd) + 15 (pesagem 7d) = 50
    expect(media.data_quality_score).toBe(50)
    expect(media.confidence_level).toBe('media')

    // Score < 40 = baixa
    const baixa = consultOracle(createBaseInput({
      current_weight_kg: 420,
      gmd_current: 0,
      days_since_last_weighing: 90,
      itu_current: 0,
      supplement_line: null,
      daily_cost: 0,
      stocking_rate: null,
      arroba_price: 0,
    }))
    // 15 (peso) + 0 + 0 + 0 + 0 + 0 + 0 + 0 = 15
    expect(baixa.data_quality_score).toBe(15)
    expect(baixa.confidence_level).toBe('baixa')
  })

  // -----------------------------------------------
  // Teste 12: Tres cenarios sao gerados corretamente
  // -----------------------------------------------
  it('deve gerar exatamente 3 cenarios com estrutura completa', () => {
    const result = consultOracle(createBaseInput())

    expect(result.scenarios).toHaveLength(3)
    expect(result.scenarios[0].name).toBe('Se melhorar dieta')
    expect(result.scenarios[1].name).toBe('Se piorar clima')
    expect(result.scenarios[2].name).toBe('Se manter atual')

    // Cada cenario deve ter todos os campos
    for (const scenario of result.scenarios) {
      expect(typeof scenario.name).toBe('string')
      expect(typeof scenario.gmd).toBe('number')
      expect(typeof scenario.days_to_target).toBe('number')
      expect(typeof scenario.profit_per_head).toBe('number')
      expect(typeof scenario.description).toBe('string')
      expect(scenario.description.length).toBeGreaterThan(10)
      expect(scenario.days_to_target).toBeGreaterThanOrEqual(0)
    }

    // Melhorar dieta tem GMD maior que manter atual
    expect(result.scenarios[0].gmd).toBeGreaterThan(result.scenarios[2].gmd)
    // Piorar clima tem GMD menor que manter atual
    expect(result.scenarios[1].gmd).toBeLessThan(result.scenarios[2].gmd)
  })

  // -----------------------------------------------
  // Teste 13: Insights do oraculo sao gerados (minimo 3)
  // -----------------------------------------------
  it('deve gerar pelo menos 3 insights do oraculo com conteudo relevante', () => {
    const result = consultOracle(createBaseInput())

    expect(result.oracle_says.length).toBeGreaterThanOrEqual(3)

    // Cada insight deve ser uma string nao vazia com conteudo significativo
    result.oracle_says.forEach(insight => {
      expect(typeof insight).toBe('string')
      expect(insight.length).toBeGreaterThan(10)
    })

    // Com forragem ruim, deve ter insight sobre forragem
    const ruim = consultOracle(createBaseInput({ forage_quality: 'ruim' }))
    expect(ruim.oracle_says.some(s => s.includes('forragem') || s.includes('Forragem'))).toBe(true)

    // Com ITU alto, deve ter insight sobre estresse termico
    const estresse = consultOracle(createBaseInput({ itu_current: 85, stress_days_forecast: 20 }))
    expect(estresse.oracle_says.some(s => s.includes('ITU') || s.includes('estresse'))).toBe(true)
  })

  // -----------------------------------------------
  // Teste 14: Projecoes de peso sao consistentes com GMD
  // -----------------------------------------------
  it('deve projetar peso consistente com GMD (peso atual + GMD * dias)', () => {
    const input = createBaseInput()
    const result = consultOracle(input)

    // Peso em 30 dias = peso atual + (GMD projetado 30d * 30)
    const expectedWeight30 = Math.round(input.current_weight_kg + result.gmd_projected.d30 * 30)
    expect(result.weight_projected.d30).toBe(expectedWeight30)

    // Peso em 60 dias = peso atual + (GMD projetado 60d * 60)
    const expectedWeight60 = Math.round(input.current_weight_kg + result.gmd_projected.d60 * 60)
    expect(result.weight_projected.d60).toBe(expectedWeight60)

    // Peso em 90 dias = peso atual + (GMD projetado 90d * 90)
    const expectedWeight90 = Math.round(input.current_weight_kg + result.gmd_projected.d90 * 90)
    expect(result.weight_projected.d90).toBe(expectedWeight90)

    // Pesos devem ser crescentes (GMD > 0)
    expect(result.weight_projected.d30).toBeGreaterThan(input.current_weight_kg)
    expect(result.weight_projected.d60).toBeGreaterThanOrEqual(result.weight_projected.d30)
    expect(result.weight_projected.d90).toBeGreaterThanOrEqual(result.weight_projected.d60)
  })

  // -----------------------------------------------
  // Teste 15: Dias ate o alvo e razoavel
  // -----------------------------------------------
  it('deve calcular dias ate o alvo de forma razoavel e nao negativo', () => {
    // Caso normal: 120kg de ganho com GMD ~1.0 = ~120 dias
    const normal = consultOracle(createBaseInput({
      current_weight_kg: 420,
      target_weight_kg: 540,
      gmd_current: 1.0,
    }))
    expect(normal.weight_projected.days_to_target).toBeGreaterThan(100)
    expect(normal.weight_projected.days_to_target).toBeLessThan(150)
    expect(normal.weight_projected.days_to_target).toBeGreaterThanOrEqual(0)

    // Caso rapido: pouco ganho necessario
    const rapido = consultOracle(createBaseInput({
      current_weight_kg: 530,
      target_weight_kg: 540,
      gmd_current: 1.0,
    }))
    expect(rapido.weight_projected.days_to_target).toBeLessThan(20)
    expect(rapido.weight_projected.days_to_target).toBeGreaterThanOrEqual(0)

    // Caso ja atingiu o alvo (peso atual >= alvo)
    const atingido = consultOracle(createBaseInput({
      current_weight_kg: 550,
      target_weight_kg: 540,
    }))
    expect(atingido.weight_projected.days_to_target).toBe(0)
  })
})
