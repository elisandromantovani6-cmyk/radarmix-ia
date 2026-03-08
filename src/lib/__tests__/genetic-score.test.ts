import { describe, it, expect } from 'vitest'
import {
  calculateDeclaredScore,
  calculateLearnedScore,
  calculateGeneticScore,
  getGeneticGroup,
  getReferenceGmd,
  classifyGmdPotential,
  emptyGeneticInfo,
  type GeneticInput,
  type GeneticInfo,
  type WeighingHistory,
} from '../genetic-score'

// Helper para criar GeneticInfo com defaults
function makeInfo(overrides: Partial<GeneticInfo> = {}): GeneticInfo {
  return { ...emptyGeneticInfo(), ...overrides }
}

describe('classifyGmdPotential', () => {
  it('retorna baixo para score <= 30', () => {
    expect(classifyGmdPotential(0)).toBe('baixo')
    expect(classifyGmdPotential(30)).toBe('baixo')
  })

  it('retorna medio para score 31-55', () => {
    expect(classifyGmdPotential(31)).toBe('medio')
    expect(classifyGmdPotential(55)).toBe('medio')
  })

  it('retorna alto para score 56-80', () => {
    expect(classifyGmdPotential(56)).toBe('alto')
    expect(classifyGmdPotential(80)).toBe('alto')
  })

  it('retorna elite para score >= 81', () => {
    expect(classifyGmdPotential(81)).toBe('elite')
    expect(classifyGmdPotential(100)).toBe('elite')
  })
})

describe('emptyGeneticInfo', () => {
  it('retorna todos campos null/false', () => {
    const info = emptyGeneticInfo()
    expect(info.origin).toBeNull()
    expect(info.knows_bull).toBe(false)
    expect(info.bull_ceip).toBe(false)
    expect(info.has_dep).toBe(false)
    expect(info.size).toBeNull()
    expect(info.uniformity).toBeNull()
    expect(info.temperament).toBeNull()
  })
})

describe('calculateDeclaredScore', () => {
  it('retorna score base da raca quando sem genetic_info', () => {
    const input: GeneticInput = { breed_name: 'Nelore', genetic_info: null, phase: 'recria' }
    expect(calculateDeclaredScore(input)).toBe(50)
  })

  it('retorna 50 para raca desconhecida', () => {
    const input: GeneticInput = { breed_name: 'Desconhecida', genetic_info: null, phase: 'recria' }
    expect(calculateDeclaredScore(input)).toBe(50)
  })

  it('soma Q1 - origem PO (+15)', () => {
    const input: GeneticInput = {
      breed_name: 'Nelore',
      genetic_info: makeInfo({ origin: 'po' }),
      phase: 'recria',
    }
    expect(calculateDeclaredScore(input)).toBe(65) // 50 + 15
  })

  it('soma Q1 - cruzamento industrial (+12)', () => {
    const input: GeneticInput = {
      breed_name: 'Nelore',
      genetic_info: makeInfo({ origin: 'cruzamento_industrial' }),
      phase: 'recria',
    }
    expect(calculateDeclaredScore(input)).toBe(62) // 50 + 12
  })

  it('soma Q1 - F1 (+10)', () => {
    const input: GeneticInput = {
      breed_name: 'Nelore',
      genetic_info: makeInfo({ origin: 'f1' }),
      phase: 'recria',
    }
    expect(calculateDeclaredScore(input)).toBe(60) // 50 + 10
  })

  it('soma Q1 - meio-sangue (+5)', () => {
    const input: GeneticInput = {
      breed_name: 'Nelore',
      genetic_info: makeInfo({ origin: 'meio_sangue' }),
      phase: 'recria',
    }
    expect(calculateDeclaredScore(input)).toBe(55)
  })

  it('soma Q2 - sabe o touro (+5)', () => {
    const input: GeneticInput = {
      breed_name: 'Nelore',
      genetic_info: makeInfo({ knows_bull: true }),
      phase: 'recria',
    }
    expect(calculateDeclaredScore(input)).toBe(55)
  })

  it('soma Q2 - touro CEIP (+15)', () => {
    const input: GeneticInput = {
      breed_name: 'Nelore',
      genetic_info: makeInfo({ bull_ceip: true }),
      phase: 'recria',
    }
    expect(calculateDeclaredScore(input)).toBe(65)
  })

  it('soma Q2 - tem DEP (+10)', () => {
    const input: GeneticInput = {
      breed_name: 'Nelore',
      genetic_info: makeInfo({ has_dep: true }),
      phase: 'recria',
    }
    expect(calculateDeclaredScore(input)).toBe(60)
  })

  it('soma Q2 - todos os 3 checkboxes (+30)', () => {
    const input: GeneticInput = {
      breed_name: 'Nelore',
      genetic_info: makeInfo({ knows_bull: true, bull_ceip: true, has_dep: true }),
      phase: 'recria',
    }
    expect(calculateDeclaredScore(input)).toBe(80) // 50 + 5 + 15 + 10
  })

  it('soma Q3 - porte grande (+8)', () => {
    const input: GeneticInput = {
      breed_name: 'Nelore',
      genetic_info: makeInfo({ size: 'grande' }),
      phase: 'recria',
    }
    expect(calculateDeclaredScore(input)).toBe(58)
  })

  it('subtrai Q3 - porte pequeno (-5)', () => {
    const input: GeneticInput = {
      breed_name: 'Nelore',
      genetic_info: makeInfo({ size: 'pequeno' }),
      phase: 'recria',
    }
    expect(calculateDeclaredScore(input)).toBe(45)
  })

  it('soma Q3 - uniformidade alta (+10)', () => {
    const input: GeneticInput = {
      breed_name: 'Nelore',
      genetic_info: makeInfo({ uniformity: 'alta' }),
      phase: 'recria',
    }
    expect(calculateDeclaredScore(input)).toBe(60)
  })

  it('soma Q3 - temperamento manso (+5)', () => {
    const input: GeneticInput = {
      breed_name: 'Nelore',
      genetic_info: makeInfo({ temperament: 'manso' }),
      phase: 'recria',
    }
    expect(calculateDeclaredScore(input)).toBe(55)
  })

  it('subtrai Q3 - temperamento arredio (-8)', () => {
    const input: GeneticInput = {
      breed_name: 'Nelore',
      genetic_info: makeInfo({ temperament: 'arredio' }),
      phase: 'recria',
    }
    expect(calculateDeclaredScore(input)).toBe(42)
  })

  it('cenario completo: PO + CEIP + DEP + grande + alta + manso -> clamp 100', () => {
    const input: GeneticInput = {
      breed_name: 'Nelore',
      genetic_info: makeInfo({
        origin: 'po',
        knows_bull: true, bull_ceip: true, has_dep: true,
        size: 'grande', uniformity: 'alta', temperament: 'manso',
      }),
      phase: 'recria',
    }
    expect(calculateDeclaredScore(input)).toBe(100)
  })

  it('cenario ruim: pequeno + baixa + arredio', () => {
    const input: GeneticInput = {
      breed_name: 'Nelore',
      genetic_info: makeInfo({
        size: 'pequeno', uniformity: 'baixa', temperament: 'arredio',
      }),
      phase: 'recria',
    }
    // 50 - 5 - 5 - 8 = 32
    expect(calculateDeclaredScore(input)).toBe(32)
  })

  it('raca nula sem genetic_info -> 50', () => {
    const input: GeneticInput = { breed_name: null, genetic_info: null, phase: 'recria' }
    expect(calculateDeclaredScore(input)).toBe(50)
  })
})

describe('calculateLearnedScore', () => {
  it('retorna null quando sem pesagens', () => {
    expect(calculateLearnedScore([], 0.55)).toBeNull()
  })

  it('retorna null quando referenceGmd <= 0', () => {
    expect(calculateLearnedScore([{ gmd_real: 0.5, date: '2026-01-01' }], 0)).toBeNull()
  })

  it('retorna 50 quando GMD real = referencia', () => {
    const w: WeighingHistory[] = [{ gmd_real: 0.55, date: '2026-01-01' }]
    expect(calculateLearnedScore(w, 0.55)).toBe(50)
  })

  it('retorna 75 quando GMD real = 1.5x referencia', () => {
    const w: WeighingHistory[] = [{ gmd_real: 0.825, date: '2026-01-01' }]
    expect(calculateLearnedScore(w, 0.55)).toBeCloseTo(75, 0)
  })

  it('clamp 100 quando GMD real >= 2x referencia', () => {
    const w: WeighingHistory[] = [{ gmd_real: 1.2, date: '2026-01-01' }]
    expect(calculateLearnedScore(w, 0.55)).toBe(100)
  })

  it('calcula media de multiplas pesagens', () => {
    const w: WeighingHistory[] = [
      { gmd_real: 0.50, date: '2026-01-01' },
      { gmd_real: 0.60, date: '2026-02-01' },
    ]
    expect(calculateLearnedScore(w, 0.55)).toBe(50)
  })
})

describe('calculateGeneticScore', () => {
  it('retorna score completo sem pesagens', () => {
    const input: GeneticInput = {
      breed_name: 'Nelore',
      genetic_info: makeInfo({ origin: 'po' }),
      phase: 'recria',
    }
    const result = calculateGeneticScore(input, [])
    expect(result.declared_score).toBe(65)
    expect(result.learned_score).toBeNull()
    expect(result.final_score).toBe(65)
    expect(result.confidence).toBe(30)
    expect(result.weighing_count).toBe(0)
    expect(result.gmd_potential).toBe('alto')
    expect(result.genetic_group).toBe('zebuino')
  })

  it('combina declarado e aprendido com 1 pesagem (70/30)', () => {
    const input: GeneticInput = {
      breed_name: 'Nelore',
      genetic_info: null,
      phase: 'recria',
    }
    const w: WeighingHistory[] = [{ gmd_real: 0.55, date: '2026-01-01' }]
    const result = calculateGeneticScore(input, w)
    expect(result.final_score).toBe(50)
    expect(result.confidence).toBe(42)
    expect(result.gmd_potential).toBe('medio')
  })

  it('inclui gmd_by_phase com recria, engorda, confinamento', () => {
    const input: GeneticInput = {
      breed_name: 'Nelore',
      genetic_info: null,
      phase: 'recria',
    }
    const result = calculateGeneticScore(input, [])
    expect(result.gmd_by_phase).toBeDefined()
    expect(result.gmd_by_phase.recria).toBeGreaterThan(0)
    expect(result.gmd_by_phase.engorda).toBeGreaterThan(0)
    expect(result.gmd_by_phase.confinamento).toBeGreaterThan(0)
  })

  it('gmd_by_phase ajusta pelo score (score 50 = base)', () => {
    const input: GeneticInput = {
      breed_name: 'Nelore',
      genetic_info: null,
      phase: 'recria',
    }
    const result = calculateGeneticScore(input, [])
    expect(result.gmd_by_phase.recria).toBeCloseTo(0.55, 2)
    expect(result.gmd_by_phase.engorda).toBeCloseTo(0.75, 2)
    expect(result.gmd_by_phase.confinamento).toBeCloseTo(1.20, 1)
  })

  it('5+ pesagens: 80% aprendido', () => {
    const input: GeneticInput = {
      breed_name: 'Nelore',
      genetic_info: null,
      phase: 'recria',
    }
    const w: WeighingHistory[] = Array(5).fill(null).map((_, i) => ({
      gmd_real: 0.825,
      date: `2026-0${i + 1}-01`,
    }))
    const result = calculateGeneticScore(input, w)
    expect(result.final_score).toBe(70)
    expect(result.confidence).toBe(90)
    expect(result.gmd_potential).toBe('alto')
  })

  it('retorna carcass_yield e heat_tolerance corretos para taurino', () => {
    const input: GeneticInput = {
      breed_name: 'Angus',
      genetic_info: null,
      phase: 'engorda',
    }
    const result = calculateGeneticScore(input, [])
    expect(result.carcass_yield).toBe(0.56)
    expect(result.heat_tolerance).toBe(0.82)
    expect(result.genetic_group).toBe('taurino')
  })

  it('senepol tem heat_tolerance especial', () => {
    const input: GeneticInput = {
      breed_name: 'Senepol',
      genetic_info: null,
      phase: 'engorda',
    }
    const result = calculateGeneticScore(input, [])
    expect(result.heat_tolerance).toBe(0.97)
  })
})

describe('getGeneticGroup', () => {
  it('nelore = zebuino', () => expect(getGeneticGroup('Nelore')).toBe('zebuino'))
  it('angus = taurino', () => expect(getGeneticGroup('Angus')).toBe('taurino'))
  it('brangus = cruzamento', () => expect(getGeneticGroup('Brangus')).toBe('cruzamento'))
  it('girolando = leite', () => expect(getGeneticGroup('Girolando')).toBe('leite'))
  it('f1 qualquer = cruzamento', () => expect(getGeneticGroup('F1 Limousin')).toBe('cruzamento'))
  it('null = zebuino (fallback MT)', () => expect(getGeneticGroup(null)).toBe('zebuino'))
  it('desconhecida = zebuino', () => expect(getGeneticGroup('Desconhecida')).toBe('zebuino'))
})

describe('getReferenceGmd', () => {
  it('nelore recria = 0.55', () => expect(getReferenceGmd('Nelore', 'recria')).toBe(0.55))
  it('nelore engorda = 0.75', () => expect(getReferenceGmd('Nelore', 'engorda')).toBe(0.75))
  it('nelore confinamento = 1.20', () => expect(getReferenceGmd('Nelore', 'confinamento')).toBe(1.20))
  it('angus engorda = 1.10', () => expect(getReferenceGmd('Angus', 'engorda')).toBe(1.10))
  it('null recria = 0.50 (default)', () => expect(getReferenceGmd(null, 'recria')).toBe(0.50))
  it('null confinamento = 1.10 (default)', () => expect(getReferenceGmd(null, 'confinamento')).toBe(1.10))
  it('fase desconhecida = 0.50 (fallback)', () => expect(getReferenceGmd('Nelore', 'outra')).toBe(0.50))
})
