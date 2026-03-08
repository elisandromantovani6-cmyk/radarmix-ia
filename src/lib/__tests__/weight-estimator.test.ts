import { describe, it, expect } from 'vitest'
import {
  estimateWeight,
  classifyBodyCondition,
  WeightEstimateInput,
} from '../weight-estimator'

// =============================================================================
// Testes do Estimador de Peso por Medidas Biométricas
// =============================================================================

// Helper para criar entrada padrão de teste
function makeInput(overrides: Partial<WeightEstimateInput> = {}): WeightEstimateInput {
  return {
    chest_perimeter_cm: 180,
    breed_type: 'zebuino',
    sex: 'macho',
    phase: 'engorda',
    ...overrides,
  }
}

describe('estimateWeight', () => {
  it('Nelore 180cm perímetro torácico deve estimar ~450-550kg', () => {
    // Nelore (zebuíno) com PT=180cm
    // Fórmula: PT³ / 10800 = 180³ / 10800 = 5.832.000 / 10800 = 540 kg
    const result = estimateWeight(makeInput())
    expect(result.estimated_weight_kg).toBeGreaterThanOrEqual(450)
    expect(result.estimated_weight_kg).toBeLessThanOrEqual(550)
  })

  it('Angus deve estimar mais pesado que Nelore com mesmas medidas', () => {
    const nelore = estimateWeight(makeInput({ breed_type: 'zebuino' }))
    const angus = estimateWeight(makeInput({ breed_type: 'taurino' }))
    expect(angus.estimated_weight_kg).toBeGreaterThan(nelore.estimated_weight_kg)
  })

  it('fêmea deve estimar menos que macho com mesmas medidas', () => {
    const macho = estimateWeight(makeInput({ sex: 'macho' }))
    const femea = estimateWeight(makeInput({ sex: 'femea' }))
    expect(femea.estimated_weight_kg).toBeLessThan(macho.estimated_weight_kg)
  })

  it('com body_length deve usar método perimetro_comprimento', () => {
    const result = estimateWeight(
      makeInput({ body_length_cm: 150 })
    )
    expect(result.method).toBe('perimetro_comprimento')
  })

  it('com body_length e hip_height deve usar método completo', () => {
    const result = estimateWeight(
      makeInput({ body_length_cm: 150, hip_height_cm: 140 })
    )
    expect(result.method).toBe('completo')
  })

  it('método com body_length deve ter confiança >= 90%', () => {
    const result = estimateWeight(
      makeInput({ body_length_cm: 150 })
    )
    expect(result.confidence_percent).toBeGreaterThanOrEqual(90)
  })

  it('confiança deve estar entre 80 e 95%', () => {
    const result = estimateWeight(makeInput())
    expect(result.confidence_percent).toBeGreaterThanOrEqual(80)
    expect(result.confidence_percent).toBeLessThanOrEqual(95)
  })

  it('deve calcular arrobas corretamente (carcaça / 15)', () => {
    const result = estimateWeight(makeInput())
    // arrobas = peso_carcaça / 15
    const expectedArrobas = Math.round(
      (result.carcass_estimate.carcass_weight_kg / 15) * 100
    ) / 100
    expect(result.carcass_estimate.arrobas).toBeCloseTo(expectedArrobas, 1)
  })

  it('deve calcular valor estimado a R$320/@ ', () => {
    const result = estimateWeight(makeInput())
    const expectedValue = Math.round(result.carcass_estimate.arrobas * 320 * 100) / 100
    expect(result.carcass_estimate.estimated_value).toBeCloseTo(expectedValue, 0)
  })

  it('deve calcular comparação com última pesagem e GMD', () => {
    // Simular pesagem de 30 dias atrás
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const result = estimateWeight(
      makeInput({
        last_real_weight_kg: 480,
        last_real_weight_date: thirtyDaysAgo.toISOString(),
      })
    )

    expect(result.comparison).toBeDefined()
    expect(result.comparison!.last_weight).toBe(480)
    expect(result.comparison!.days_ago).toBeGreaterThanOrEqual(29)
    expect(result.comparison!.days_ago).toBeLessThanOrEqual(31)
    expect(typeof result.comparison!.estimated_gmd).toBe('number')
    expect(typeof result.comparison!.estimated_gain_kg).toBe('number')
  })

  it('sem última pesagem não deve ter comparação', () => {
    const result = estimateWeight(makeInput())
    expect(result.comparison).toBeUndefined()
  })

  it('ECC alto (8) deve aumentar peso estimado vs ECC neutro (5)', () => {
    const neutral = estimateWeight(makeInput({ body_condition_score: 5 }))
    const fat = estimateWeight(makeInput({ body_condition_score: 8 }))
    expect(fat.estimated_weight_kg).toBeGreaterThan(neutral.estimated_weight_kg)
  })
})

describe('classifyBodyCondition', () => {
  it('ECC 1-3 deve ser classificado como "Magro"', () => {
    expect(classifyBodyCondition(1).label).toBe('Magro')
    expect(classifyBodyCondition(2).label).toBe('Magro')
    expect(classifyBodyCondition(3).label).toBe('Magro')
  })

  it('ECC 4-5 deve ser classificado como "Moderado"', () => {
    expect(classifyBodyCondition(4).label).toBe('Moderado')
    expect(classifyBodyCondition(5).label).toBe('Moderado')
  })

  it('ECC 6-7 deve ser classificado como "Bom"', () => {
    expect(classifyBodyCondition(6).label).toBe('Bom')
    expect(classifyBodyCondition(7).label).toBe('Bom')
  })

  it('ECC 8-9 deve ser classificado como "Gordo"', () => {
    expect(classifyBodyCondition(8).label).toBe('Gordo')
    expect(classifyBodyCondition(9).label).toBe('Gordo')
  })

  it('ECC 8-9 deve recomendar redução de energia', () => {
    const result = classifyBodyCondition(8)
    expect(result.recommendation.toLowerCase()).toContain('reduzir')
  })

  it('ECC 1-3 deve recomendar aumento de aporte', () => {
    const result = classifyBodyCondition(2)
    expect(result.recommendation.toLowerCase()).toContain('aumentar')
  })
})
