import { describe, it, expect } from 'vitest'
import {
  calculateDeclaredScore,
  calculateLearnedScore,
  calculateGeneticScore,
  getGeneticGroup,
  getReferenceGmd,
  type GeneticInput,
  type WeighingHistory,
} from '../genetic-score'

// ============================================================================
// 1. calculateDeclaredScore
// ============================================================================
describe('calculateDeclaredScore', () => {
  it('retorna 50 quando sem raca', () => {
    const input: GeneticInput = { breed_name: null, genetic_pattern: null, bull_quality: null, phase: 'recria' }
    expect(calculateDeclaredScore(input)).toBe(50)
  })

  it('Nelore puro retorna ~50', () => {
    const input: GeneticInput = { breed_name: 'Nelore', genetic_pattern: 'puro', bull_quality: null, phase: 'recria' }
    expect(calculateDeclaredScore(input)).toBe(50)
  })

  it('Angus puro CEIP retorna ~95', () => {
    const input: GeneticInput = { breed_name: 'Angus', genetic_pattern: 'puro', bull_quality: 'ceip', phase: 'engorda' }
    expect(calculateDeclaredScore(input)).toBe(95)
  })

  it('F1 cruzamento provado retorna ~90', () => {
    const input: GeneticInput = { breed_name: 'F1 Angus x Nelore', genetic_pattern: 'cruzamento', bull_quality: 'provado', phase: 'engorda' }
    // base 70 + cruzamento 10 + provado 10 = 90
    expect(calculateDeclaredScore(input)).toBe(90)
  })

  it('bull_quality ceip adiciona +15', () => {
    const base: GeneticInput = { breed_name: 'Nelore', genetic_pattern: 'puro', bull_quality: null, phase: 'recria' }
    const ceip: GeneticInput = { ...base, bull_quality: 'ceip' }
    expect(calculateDeclaredScore(ceip) - calculateDeclaredScore(base)).toBe(15)
  })

  it('bull_quality provado adiciona +10', () => {
    const base: GeneticInput = { breed_name: 'Nelore', genetic_pattern: 'puro', bull_quality: null, phase: 'recria' }
    const provado: GeneticInput = { ...base, bull_quality: 'provado' }
    expect(calculateDeclaredScore(provado) - calculateDeclaredScore(base)).toBe(10)
  })

  it('genetic_pattern anelorado subtrai -5', () => {
    const base: GeneticInput = { breed_name: 'Nelore', genetic_pattern: null, bull_quality: null, phase: 'recria' }
    const anelorado: GeneticInput = { ...base, genetic_pattern: 'anelorado' }
    expect(calculateDeclaredScore(anelorado) - calculateDeclaredScore(base)).toBe(-5)
  })

  it('clamp entre 0 e 100', () => {
    const input: GeneticInput = { breed_name: 'Charolais', genetic_pattern: 'cruzamento', bull_quality: 'ceip', phase: 'engorda' }
    // base 82 + 10 + 15 = 107 -> clamp to 100
    expect(calculateDeclaredScore(input)).toBe(100)
  })
})

// ============================================================================
// 2. calculateLearnedScore
// ============================================================================
describe('calculateLearnedScore', () => {
  it('retorna null sem pesagens', () => {
    expect(calculateLearnedScore([], 0.55)).toBeNull()
  })

  it('GMD igual a referencia retorna ~50', () => {
    const weighings: WeighingHistory[] = [
      { gmd_real: 0.55, date: '2026-01-15' },
    ]
    expect(calculateLearnedScore(weighings, 0.55)).toBeCloseTo(50, 0)
  })

  it('GMD 50% acima retorna ~75', () => {
    const weighings: WeighingHistory[] = [
      { gmd_real: 0.825, date: '2026-01-15' },
    ]
    // ratio = 0.825 / 0.55 = 1.5 -> score = 1.5 * 50 = 75
    expect(calculateLearnedScore(weighings, 0.55)).toBeCloseTo(75, 0)
  })

  it('GMD 50% abaixo retorna ~25', () => {
    const weighings: WeighingHistory[] = [
      { gmd_real: 0.275, date: '2026-01-15' },
    ]
    // ratio = 0.275 / 0.55 = 0.5 -> score = 0.5 * 50 = 25
    expect(calculateLearnedScore(weighings, 0.55)).toBeCloseTo(25, 0)
  })

  it('media de multiplas pesagens', () => {
    const weighings: WeighingHistory[] = [
      { gmd_real: 0.55, date: '2026-01-15' },
      { gmd_real: 0.825, date: '2026-02-15' },
    ]
    // media = (0.55 + 0.825) / 2 = 0.6875
    // ratio = 0.6875 / 0.55 = 1.25 -> score = 62.5
    expect(calculateLearnedScore(weighings, 0.55)).toBeCloseTo(62.5, 0)
  })

  it('clamp no maximo 100', () => {
    const weighings: WeighingHistory[] = [
      { gmd_real: 1.5, date: '2026-01-15' },
    ]
    // ratio = 1.5 / 0.55 = 2.727 -> score = 136 -> clamp to 100
    expect(calculateLearnedScore(weighings, 0.55)).toBe(100)
  })
})

// ============================================================================
// 3. calculateGeneticScore (integracao)
// ============================================================================
describe('calculateGeneticScore', () => {
  it('0 pesagens: 100% declarado', () => {
    const input: GeneticInput = { breed_name: 'Nelore', genetic_pattern: 'puro', bull_quality: null, phase: 'recria' }
    const result = calculateGeneticScore(input, [])
    expect(result.final_score).toBe(result.declared_score)
    expect(result.learned_score).toBeNull()
    expect(result.confidence).toBe(30)
  })

  it('1 pesagem: 70%/30% mix', () => {
    const input: GeneticInput = { breed_name: 'Nelore', genetic_pattern: 'puro', bull_quality: null, phase: 'recria' }
    const weighings: WeighingHistory[] = [{ gmd_real: 0.55, date: '2026-01-15' }]
    const result = calculateGeneticScore(input, weighings)

    // declared = 50, learned = 50 (gmd matches reference)
    // final = 0.7 * 50 + 0.3 * 50 = 50
    expect(result.final_score).toBeCloseTo(50, 0)
    expect(result.confidence).toBe(42) // 30 + 12
    expect(result.weighing_count).toBe(1)
  })

  it('5 pesagens: 20%/80% mix', () => {
    const input: GeneticInput = { breed_name: 'Nelore', genetic_pattern: 'puro', bull_quality: null, phase: 'recria' }
    const weighings: WeighingHistory[] = Array.from({ length: 5 }, (_, i) => ({
      gmd_real: 0.825, // 1.5x referencia
      date: `2026-0${i + 1}-15`,
    }))
    const result = calculateGeneticScore(input, weighings)

    // declared = 50, learned = 75 (1.5x)
    // final = 0.2 * 50 + 0.8 * 75 = 10 + 60 = 70
    expect(result.final_score).toBeCloseTo(70, 0)
    expect(result.confidence).toBe(90) // 30 + 60
    expect(result.weighing_count).toBe(5)
  })

  it('confianca sobe com pesagens', () => {
    const input: GeneticInput = { breed_name: 'Nelore', genetic_pattern: null, bull_quality: null, phase: 'recria' }

    const r0 = calculateGeneticScore(input, [])
    const r1 = calculateGeneticScore(input, [{ gmd_real: 0.55, date: '2026-01-15' }])
    const r3 = calculateGeneticScore(input, Array.from({ length: 3 }, () => ({ gmd_real: 0.55, date: '2026-01-15' })))
    const r5 = calculateGeneticScore(input, Array.from({ length: 5 }, () => ({ gmd_real: 0.55, date: '2026-01-15' })))

    expect(r0.confidence).toBe(30)
    expect(r1.confidence).toBe(42)
    expect(r3.confidence).toBe(66)
    expect(r5.confidence).toBe(90)
  })

  it('gmd_adjusted baseado no score final', () => {
    const input: GeneticInput = { breed_name: 'Nelore', genetic_pattern: 'puro', bull_quality: null, phase: 'recria' }
    const result = calculateGeneticScore(input, [])
    // score 50 = referencia, gmd_adjusted = gmd_reference * (50/50) = gmd_reference
    expect(result.gmd_adjusted).toBeCloseTo(result.gmd_reference, 2)
  })

  it('retorna carcass_yield e heat_tolerance corretos', () => {
    const nelore: GeneticInput = { breed_name: 'Nelore', genetic_pattern: null, bull_quality: null, phase: 'engorda' }
    const angus: GeneticInput = { breed_name: 'Angus', genetic_pattern: null, bull_quality: null, phase: 'engorda' }

    const rNelore = calculateGeneticScore(nelore, [])
    const rAngus = calculateGeneticScore(angus, [])

    expect(rNelore.carcass_yield).toBe(0.52) // zebuino
    expect(rAngus.carcass_yield).toBe(0.56)  // taurino
    expect(rNelore.heat_tolerance).toBe(1.0) // zebuino
    expect(rAngus.heat_tolerance).toBe(0.82) // taurino
  })
})

// ============================================================================
// 4. getGeneticGroup
// ============================================================================
describe('getGeneticGroup', () => {
  it('nelore -> zebuino', () => {
    expect(getGeneticGroup('Nelore')).toBe('zebuino')
  })

  it('angus -> taurino', () => {
    expect(getGeneticGroup('Angus')).toBe('taurino')
  })

  it('f1_angus_nelore -> cruzamento', () => {
    expect(getGeneticGroup('F1 Angus x Nelore')).toBe('cruzamento')
  })

  it('girolando -> leite', () => {
    expect(getGeneticGroup('Girolando')).toBe('leite')
  })

  it('null -> zebuino (padrao MT)', () => {
    expect(getGeneticGroup(null)).toBe('zebuino')
  })

  it('raca desconhecida -> zebuino (padrao MT)', () => {
    expect(getGeneticGroup('Raca Qualquer')).toBe('zebuino')
  })

  it('senepol -> taurino', () => {
    expect(getGeneticGroup('Senepol')).toBe('taurino')
  })

  it('brangus -> cruzamento', () => {
    expect(getGeneticGroup('Brangus')).toBe('cruzamento')
  })

  it('jersey -> leite', () => {
    expect(getGeneticGroup('Jersey')).toBe('leite')
  })
})

// ============================================================================
// 5. getReferenceGmd
// ============================================================================
describe('getReferenceGmd', () => {
  it('nelore recria -> 0.55', () => {
    expect(getReferenceGmd('Nelore', 'recria')).toBe(0.55)
  })

  it('angus engorda -> 1.10', () => {
    expect(getReferenceGmd('Angus', 'engorda')).toBe(1.10)
  })

  it('raca desconhecida -> default', () => {
    expect(getReferenceGmd('Desconhecida', 'recria')).toBe(0.50)
  })

  it('null -> default', () => {
    expect(getReferenceGmd(null, 'engorda')).toBe(0.70)
  })

  it('f1_angus_nelore cria -> 0.40', () => {
    expect(getReferenceGmd('F1 Angus x Nelore', 'cria')).toBe(0.40)
  })

  it('holandesa recria -> 0.48', () => {
    expect(getReferenceGmd('Holandesa', 'recria')).toBe(0.48)
  })

  it('fase desconhecida usa fallback default', () => {
    expect(getReferenceGmd('Nelore', 'lactacao')).toBe(0.50)
  })
})
