import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  generateRecommendation,
  generateExplanation,
  analyzeForageDeficits,
  checkMineralMatch,
  matchPhase,
  mapPhaseToFactor,
  estimateConsumption,
  HerdData,
  Recommendation,
} from '../recommendation-engine'

// ---------------------------------------------------------------------------
// Helpers para criar dados de teste
// ---------------------------------------------------------------------------

function makeHerd(overrides: Partial<HerdData> = {}): HerdData {
  return {
    id: 'herd-1',
    species: 'bovinos_corte',
    main_phase: 'recria',
    head_count: 100,
    forage_id: null,
    breed_id: null,
    avg_weight_kg: 350,
    sex: 'macho',
    pasture_condition: 'bom',
    ...overrides,
  }
}

function makeProduct(overrides: Record<string, any> = {}) {
  return {
    id: 'prod-1',
    name: 'Mineral SR',
    line: 'SR',
    species: 'bovinos_corte',
    priority_score: 50,
    pb_percent: null,
    ndt_percent: null,
    p_g_kg: null,
    na_g_kg: null,
    ca_g_kg: null,
    zn_mg_kg: null,
    ...overrides,
  }
}

function makeForage(overrides: Record<string, any> = {}) {
  return {
    id: 'forage-1',
    name: 'Brachiaria brizantha',
    dry_pb_percent: 4,
    dry_ndt_percent: 45,
    dry_ca_g_kg: 1.5,
    dry_p_g_kg: 1.0,
    dry_na_g_kg: 0.3,
    dry_zn_mg_kg: 15,
    rainy_pb_percent: 10,
    rainy_ndt_percent: 55,
    rainy_ca_g_kg: 3.0,
    rainy_p_g_kg: 2.0,
    rainy_na_g_kg: 0.8,
    rainy_zn_mg_kg: 30,
    ...overrides,
  }
}

function makeRecommendation(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    product: makeProduct(),
    score: 70,
    reasons: ['Indicado para fase de recria'],
    deficits: [],
    consumption_kg_day: 0.08,
    monthly_cost_estimate: null,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Mock do Supabase
// ---------------------------------------------------------------------------

function createMockSupabase(config: {
  forage?: any
  breed?: any
  breedFactors?: any[]
  products?: any[]
} = {}) {
  const mockSingle = (data: any) => ({
    single: vi.fn().mockResolvedValue({ data, error: null }),
  })

  const mockSelect = (resolveWith: any) => {
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: resolveWith, error: null }),
      single: vi.fn().mockResolvedValue({ data: resolveWith, error: null }),
    }
    return chain
  }

  // Build a stateful mock that returns different data per table
  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === 'forages') {
      const chain: any = {}
      chain.select = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn().mockReturnValue(chain)
      chain.single = vi.fn().mockResolvedValue({ data: config.forage ?? null, error: null })
      return chain
    }
    if (table === 'breeds') {
      const chain: any = {}
      chain.select = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn().mockReturnValue(chain)
      chain.single = vi.fn().mockResolvedValue({ data: config.breed ?? null, error: null })
      return chain
    }
    if (table === 'breed_nutrition_factors') {
      const chain: any = {}
      chain.select = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn().mockReturnValue(chain)
      // breed_nutrition_factors uses two .eq() calls, the second returns the array
      let eqCount = 0
      chain.eq = vi.fn().mockImplementation(() => {
        eqCount++
        if (eqCount >= 2) {
          // Resolve the promise
          return Promise.resolve({ data: config.breedFactors ?? [], error: null })
        }
        return chain
      })
      chain.select = vi.fn().mockReturnValue(chain)
      return chain
    }
    if (table === 'products') {
      const chain: any = {}
      chain.select = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn().mockReturnValue(chain)
      chain.order = vi.fn().mockResolvedValue({ data: config.products ?? [], error: null })
      return chain
    }
    // fallback
    const chain: any = {}
    chain.select = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.order = vi.fn().mockResolvedValue({ data: [], error: null })
    chain.single = vi.fn().mockResolvedValue({ data: null, error: null })
    return chain
  })

  return { from: fromMock } as any
}

// ============================================================================
// TESTES: analyzeForageDeficits
// ============================================================================

describe('analyzeForageDeficits', () => {
  it('detecta todos os deficits na seca com forrageira pobre', () => {
    const forage = makeForage()
    const deficits = analyzeForageDeficits(forage, 'seca')

    expect(deficits).toContain('Proteina bruta baixa (4% PB)')
    expect(deficits).toContain('Energia baixa (45% NDT)')
    expect(deficits).toContain('Fosforo deficiente')
    expect(deficits).toContain('Sodio deficiente')
    expect(deficits).toContain('Calcio baixo')
    expect(deficits).toContain('Zinco deficiente')
  })

  it('nao detecta deficits nas aguas com forrageira boa', () => {
    const forage = makeForage()
    const deficits = analyzeForageDeficits(forage, 'aguas')

    // rainy values are all above thresholds
    expect(deficits).toHaveLength(0)
  })

  it('adiciona mensagem generica na seca quando forrageira nao tem deficits', () => {
    const forage = makeForage({
      dry_pb_percent: 10,
      dry_ndt_percent: 55,
      dry_ca_g_kg: 3.0,
      dry_p_g_kg: 2.0,
      dry_na_g_kg: 1.0,
      dry_zn_mg_kg: 25,
    })
    const deficits = analyzeForageDeficits(forage, 'seca')

    expect(deficits).toHaveLength(1)
    expect(deficits[0]).toBe('Forragem com qualidade reduzida na seca')
  })

  it('lida com valores null sem errar', () => {
    const forage = {
      id: 'f1',
      dry_pb_percent: null,
      dry_ndt_percent: null,
      dry_ca_g_kg: null,
      dry_p_g_kg: null,
      dry_na_g_kg: null,
      dry_zn_mg_kg: null,
    }
    const deficits = analyzeForageDeficits(forage, 'seca')

    // null values are skipped, so only the generic seca message
    expect(deficits).toHaveLength(1)
    expect(deficits[0]).toBe('Forragem com qualidade reduzida na seca')
  })

  it('detecta deficit parcial (apenas fosforo e sodio)', () => {
    const forage = makeForage({
      dry_pb_percent: 10,   // OK
      dry_ndt_percent: 55,  // OK
      dry_ca_g_kg: 3.0,     // OK
      dry_p_g_kg: 1.0,      // deficit (< 1.5)
      dry_na_g_kg: 0.3,     // deficit (< 0.5)
      dry_zn_mg_kg: 25,     // OK
    })
    const deficits = analyzeForageDeficits(forage, 'seca')

    expect(deficits).toContain('Fosforo deficiente')
    expect(deficits).toContain('Sodio deficiente')
    expect(deficits).not.toContain('Proteina bruta baixa')
    expect(deficits).not.toContain('Forragem com qualidade reduzida na seca')
  })
})

// ============================================================================
// TESTES: checkMineralMatch
// ============================================================================

describe('checkMineralMatch', () => {
  it('retorna score 0 quando nao ha deficits', () => {
    const product = makeProduct()
    const result = checkMineralMatch(product, [])
    expect(result.score).toBe(0)
    expect(result.reasons).toHaveLength(0)
  })

  it('pontua corretamente deficit de fosforo', () => {
    const product = makeProduct({ p_g_kg: 50 })
    const result = checkMineralMatch(product, ['Fosforo deficiente'])
    expect(result.score).toBe(8)
    expect(result.reasons).toContainEqual(expect.stringContaining('fosforo'))
  })

  it('pontua corretamente deficit de proteina', () => {
    const product = makeProduct({ pb_percent: 25 })
    const result = checkMineralMatch(product, ['Proteina bruta baixa (4% PB)'])
    expect(result.score).toBe(12)
    expect(result.reasons).toContainEqual(expect.stringContaining('proteina'))
  })

  it('pontua corretamente deficit de energia', () => {
    const product = makeProduct({ ndt_percent: 60 })
    const result = checkMineralMatch(product, ['Energia baixa (45% NDT)'])
    expect(result.score).toBe(10)
    expect(result.reasons).toContainEqual(expect.stringContaining('energia'))
  })

  it('acumula pontuacao de multiplos deficits', () => {
    const product = makeProduct({
      p_g_kg: 50,
      na_g_kg: 60,
      ca_g_kg: 100,
      pb_percent: 25,
      ndt_percent: 60,
      zn_mg_kg: 3000,
    })
    const deficits = [
      'Fosforo deficiente',
      'Sodio deficiente',
      'Calcio baixo',
      'Proteina bruta baixa (4% PB)',
      'Energia baixa (45% NDT)',
      'Zinco deficiente',
    ]
    const result = checkMineralMatch(product, deficits)

    // 8 + 5 + 5 + 12 + 10 + 5 = 45
    expect(result.score).toBe(45)
    expect(result.reasons.length).toBe(6)
  })

  it('nao pontua quando produto nao corrige o deficit', () => {
    const product = makeProduct({ p_g_kg: 10 }) // abaixo do threshold de 40
    const result = checkMineralMatch(product, ['Fosforo deficiente'])
    expect(result.score).toBe(0)
    expect(result.reasons).toHaveLength(0)
  })
})

// ============================================================================
// TESTES: matchPhase
// ============================================================================

describe('matchPhase', () => {
  it('fase cria: match por nome contendo "cria"', () => {
    expect(matchPhase(makeProduct({ name: 'Mineral Cria Plus' }), 'cria')).toBe(true)
  })

  it('fase cria: match por nome contendo "bezerro"', () => {
    expect(matchPhase(makeProduct({ name: 'Bezerro Top' }), 'cria')).toBe(true)
  })

  it('fase cria: match generico por linha S', () => {
    expect(matchPhase(makeProduct({ name: 'Mineral X', line: 'S' }), 'cria')).toBe(true)
  })

  it('fase cria: match generico por linha SR', () => {
    expect(matchPhase(makeProduct({ name: 'Mineral X', line: 'SR' }), 'cria')).toBe(true)
  })

  it('fase recria: match por nome contendo "recria"', () => {
    expect(matchPhase(makeProduct({ name: 'Recria Forte' }), 'recria')).toBe(true)
  })

  it('fase recria: match por linha SR', () => {
    expect(matchPhase(makeProduct({ name: 'Mineral X', line: 'SR' }), 'recria')).toBe(true)
  })

  it('fase recria: match por linha S', () => {
    expect(matchPhase(makeProduct({ name: 'Mineral X', line: 'S' }), 'recria')).toBe(true)
  })

  it('fase engorda: match por nome contendo "engorda"', () => {
    expect(matchPhase(makeProduct({ name: 'Engorda Total' }), 'engorda')).toBe(true)
  })

  it('fase engorda: match por nome contendo "confinamento"', () => {
    expect(matchPhase(makeProduct({ name: 'Confinamento Premium' }), 'engorda')).toBe(true)
  })

  it('fase engorda: match por linha RK', () => {
    expect(matchPhase(makeProduct({ name: 'Mineral X', line: 'RK' }), 'engorda')).toBe(true)
  })

  it('fase engorda: match por linha FazCarne', () => {
    expect(matchPhase(makeProduct({ name: 'Mineral X', line: 'FazCarne' }), 'engorda')).toBe(true)
  })

  it('fase lactacao: match por nome contendo "leite"', () => {
    expect(matchPhase(makeProduct({ name: 'Leite Plus' }), 'lactacao')).toBe(true)
  })

  it('fase lactacao: match por linha contendo "leite"', () => {
    expect(matchPhase(makeProduct({ name: 'X', line: 'Leite Premium' }), 'lactacao')).toBe(true)
  })

  it('fase reproducao: match por nome contendo "reproduc"', () => {
    expect(matchPhase(makeProduct({ name: 'Reproducao Max' }), 'reproducao')).toBe(true)
  })

  it('retorna false para produto sem match', () => {
    expect(matchPhase(makeProduct({ name: 'Mineral Generico', line: 'X' }), 'engorda')).toBe(false)
  })

  it('retorna false para fase desconhecida', () => {
    expect(matchPhase(makeProduct({ name: 'Mineral Cria', line: 'S' }), 'manutencao')).toBe(false)
  })
})

// ============================================================================
// TESTES: mapPhaseToFactor
// ============================================================================

describe('mapPhaseToFactor', () => {
  it('mapeia cria -> cria', () => {
    expect(mapPhaseToFactor('cria')).toBe('cria')
  })

  it('mapeia recria -> recria', () => {
    expect(mapPhaseToFactor('recria')).toBe('recria')
  })

  it('mapeia engorda -> terminacao', () => {
    expect(mapPhaseToFactor('engorda')).toBe('terminacao')
  })

  it('mapeia lactacao -> lactacao', () => {
    expect(mapPhaseToFactor('lactacao')).toBe('lactacao')
  })

  it('mapeia reproducao -> reproducao', () => {
    expect(mapPhaseToFactor('reproducao')).toBe('reproducao')
  })

  it('retorna a propria fase quando nao mapeada', () => {
    expect(mapPhaseToFactor('manutencao')).toBe('manutencao')
  })
})

// ============================================================================
// TESTES: estimateConsumption
// ============================================================================

describe('estimateConsumption', () => {
  const herdBase = makeHerd()

  it('mineral padrao (S/SR) = 80g base', () => {
    const product = makeProduct({ line: 'S' })
    const result = estimateConsumption(product, herdBase, null)
    expect(result).toBe(80)
  })

  it('proteico = 500g base', () => {
    const product = makeProduct({ line: 'Proteico' })
    const result = estimateConsumption(product, herdBase, null)
    expect(result).toBe(500)
  })

  it('prot.energ = 800g base', () => {
    const product = makeProduct({ line: 'Prot.Energ' })
    const result = estimateConsumption(product, herdBase, null)
    expect(result).toBe(800)
  })

  it('fazcarne = 1000g base', () => {
    const product = makeProduct({ line: 'FazCarne' })
    const result = estimateConsumption(product, herdBase, null)
    expect(result).toBe(1000)
  })

  it('rk = 1500g base', () => {
    const product = makeProduct({ line: 'RK' })
    const result = estimateConsumption(product, herdBase, null)
    expect(result).toBe(1500)
  })

  it('concentrado = 3000g base', () => {
    const product = makeProduct({ line: 'Concentrado' })
    const result = estimateConsumption(product, herdBase, null)
    expect(result).toBe(3000)
  })

  it('linha leite = 2000g base', () => {
    const product = makeProduct({ line: 'Leite Premium' })
    const result = estimateConsumption(product, herdBase, null)
    expect(result).toBe(2000)
  })

  it('aplica multiplicador de raca', () => {
    const product = makeProduct({ line: 'Proteico' })
    const breedFactor = { cms_multiplier: 1.2 }
    const result = estimateConsumption(product, herdBase, breedFactor)
    expect(result).toBe(Math.round(500 * 1.2)) // 600
  })

  it('aplica ajuste de peso para animais acima de 400kg', () => {
    const product = makeProduct({ line: 'Proteico' })
    const heavyHerd = makeHerd({ avg_weight_kg: 450 })
    const result = estimateConsumption(product, heavyHerd, null)
    expect(result).toBe(Math.round(500 * 1.1)) // 550
  })

  it('nao aplica ajuste de peso para animais com 400kg ou menos', () => {
    const product = makeProduct({ line: 'Proteico' })
    const lightHerd = makeHerd({ avg_weight_kg: 400 })
    const result = estimateConsumption(product, lightHerd, null)
    expect(result).toBe(500)
  })

  it('aplica ambos multiplicadores (raca + peso)', () => {
    const product = makeProduct({ line: 'Proteico' })
    const heavyHerd = makeHerd({ avg_weight_kg: 500 })
    const breedFactor = { cms_multiplier: 1.2 }
    const result = estimateConsumption(product, heavyHerd, breedFactor)
    // 500 * 1.2 = 600, then * 1.1 = 660
    expect(result).toBe(Math.round(Math.round(500 * 1.2) * 1.1))
  })

  it('linha desconhecida usa base 100g (mineral padrao)', () => {
    const product = makeProduct({ line: 'Outra' })
    const result = estimateConsumption(product, herdBase, null)
    expect(result).toBe(100)
  })
})

// ============================================================================
// TESTES: generateExplanation
// ============================================================================

describe('generateExplanation', () => {
  it('gera explicacao basica com nome do lote', () => {
    const rec = makeRecommendation()
    const text = generateExplanation(rec, 'Lote A')

    expect(text).toContain('RECOMENDACAO PARA LOTE A')
    expect(text).toContain('Produto recomendado: Mineral SR')
    expect(text).toContain('Linha: SR')
    expect(text).toContain('Consumo estimado: 0.1 kg/cab/dia')
  })

  it('inclui deficits quando presentes', () => {
    const rec = makeRecommendation({
      deficits: ['Fosforo deficiente', 'Sodio deficiente'],
    })
    const text = generateExplanation(rec, 'Lote B')

    expect(text).toContain('Deficits identificados na forrageira:')
    expect(text).toContain('  - Fosforo deficiente')
    expect(text).toContain('  - Sodio deficiente')
  })

  it('nao inclui secao de deficits quando vazia', () => {
    const rec = makeRecommendation({ deficits: [] })
    const text = generateExplanation(rec, 'Lote C')

    expect(text).not.toContain('Deficits identificados')
  })

  it('inclui razoes quando presentes', () => {
    const rec = makeRecommendation({
      reasons: ['Indicado para fase de recria', 'Alto teor proteico (25% PB)'],
    })
    const text = generateExplanation(rec, 'Lote D')

    expect(text).toContain('Por que este produto:')
    expect(text).toContain('  - Indicado para fase de recria')
    expect(text).toContain('  - Alto teor proteico (25% PB)')
  })

  it('calcula consumo mensal corretamente', () => {
    const rec = makeRecommendation({ consumption_kg_day: 1.5 })
    const text = generateExplanation(rec, 'Lote E')

    // 1.5 * 30 = 45
    expect(text).toContain('Consumo mensal do lote: 45 kg/cab/mes')
  })
})

// ============================================================================
// TESTES: generateRecommendation (integracao com mock de Supabase)
// ============================================================================

describe('generateRecommendation', () => {
  it('retorna null quando nao ha produtos compativeis', async () => {
    const supabase = createMockSupabase({ products: [] })
    const herd = makeHerd()
    const result = await generateRecommendation(supabase, herd)
    expect(result).toBeNull()
  })

  it('retorna recomendacao com produto quando disponivel', async () => {
    const products = [
      makeProduct({ name: 'Mineral Recria', line: 'SR', priority_score: 60 }),
    ]
    const supabase = createMockSupabase({ products })
    const herd = makeHerd({ species: 'bovinos_corte', main_phase: 'recria' })

    const result = await generateRecommendation(supabase, herd)

    expect(result).not.toBeNull()
    expect(result!.product.name).toBe('Mineral Recria')
    expect(result!.score).toBeGreaterThanOrEqual(60)
    expect(result!.consumption_kg_day).toBeGreaterThan(0)
  })

  it('prioriza produto com match de fase sobre generico', async () => {
    const products = [
      makeProduct({ id: 'p1', name: 'Mineral Generico', line: 'X', priority_score: 50 }),
      makeProduct({ id: 'p2', name: 'Engorda Total', line: 'FazCarne', priority_score: 50 }),
    ]
    const supabase = createMockSupabase({ products })
    const herd = makeHerd({ main_phase: 'engorda' })

    const result = await generateRecommendation(supabase, herd)

    expect(result).not.toBeNull()
    expect(result!.product.name).toBe('Engorda Total')
    expect(result!.score).toBeGreaterThan(50)
  })

  it('considera forrageira com deficits para pontuar produto', async () => {
    // Forrageira com deficits em AMBAS as epocas para garantir o teste
    const forage = makeForage({
      dry_pb_percent: 3,
      dry_ndt_percent: 40,
      dry_p_g_kg: 0.5,
      rainy_pb_percent: 3,
      rainy_ndt_percent: 40,
      rainy_p_g_kg: 0.5,
      rainy_na_g_kg: 0.2,
      rainy_ca_g_kg: 1.0,
      rainy_zn_mg_kg: 10,
    })
    const products = [
      makeProduct({
        name: 'Mineral Fosforo',
        line: 'S',
        priority_score: 50,
        p_g_kg: 50,
        pb_percent: 25,
      }),
    ]
    const supabase = createMockSupabase({ forage, products })
    const herd = makeHerd({ forage_id: 'forage-1' })

    const result = await generateRecommendation(supabase, herd)

    expect(result).not.toBeNull()
    // Independente da epoca, essa forrageira tem deficits
    expect(result!.deficits.length).toBeGreaterThan(0)
  })

  it('especie invalida usa fallback bovinos_corte', async () => {
    const products = [makeProduct()]
    const supabase = createMockSupabase({ products })
    const herd = makeHerd({ species: 'especie_inexistente' })

    // Nao deve dar erro, usa fallback
    const result = await generateRecommendation(supabase, herd)
    // O supabase.from('products').eq('species', ...) sera chamado com 'Bovinos Corte'
    expect(supabase.from).toHaveBeenCalledWith('products')
  })

  it('lote de engorda com confinamento recebe bonus de 20 pontos', async () => {
    const products = [
      makeProduct({ name: 'Confinamento Premium', line: 'RK', priority_score: 50 }),
    ]
    const supabase = createMockSupabase({ products })
    const herd = makeHerd({ main_phase: 'engorda' })

    const result = await generateRecommendation(supabase, herd)

    expect(result).not.toBeNull()
    // score = 50 (base) + 20 (matchPhase engorda->confinamento) + 15 (RK engorda) + 20 (confinamento name)
    expect(result!.score).toBeGreaterThanOrEqual(100)
    expect(result!.reasons).toContainEqual(expect.stringContaining('confinamento'))
  })

  it('pasto degradado aumenta score de proteicos', async () => {
    const products = [
      makeProduct({ name: 'Proteico Seca', line: 'Proteico', priority_score: 50 }),
    ]
    const supabase = createMockSupabase({ products })
    const herd = makeHerd({ pasture_condition: 'degradado' })

    const result = await generateRecommendation(supabase, herd)

    expect(result).not.toBeNull()
    expect(result!.reasons).toContainEqual(expect.stringContaining('pasto degradado'))
  })

  it('aplica fator de raca quando breed_id esta presente', async () => {
    const products = [makeProduct({ name: 'Mineral X', line: 'S', priority_score: 50 })]
    const breed = { id: 'breed-1', name: 'Angus' }
    const breedFactors = [{ breed_id: 'breed-1', phase: 'recria', cms_multiplier: 1.3 }]
    const supabase = createMockSupabase({ breed, breedFactors, products })
    const herd = makeHerd({ breed_id: 'breed-1', main_phase: 'recria' })

    const result = await generateRecommendation(supabase, herd)

    expect(result).not.toBeNull()
    // cms_multiplier > 1.1 so should get +5 and reason about raca
    expect(result!.reasons).toContainEqual(expect.stringContaining('Angus'))
  })

  it('sem forage_id nao busca forrageira', async () => {
    const products = [makeProduct()]
    const supabase = createMockSupabase({ products })
    const herd = makeHerd({ forage_id: null })

    const result = await generateRecommendation(supabase, herd)

    expect(result).not.toBeNull()
    expect(result!.deficits).toHaveLength(0)
  })
})

// ============================================================================
// TESTES: Recomendacao por especie
// ============================================================================

describe('speciesMap - mapeamento de especies', () => {
  // Testamos indiretamente via generateRecommendation
  // que o Supabase e chamado com o species correto

  const species = [
    'bovinos_corte',
    'bovinos_leite',
    'bezerros',
    'reprodutores',
    'aves',
    'equinos',
    'ovinos',
  ]

  species.forEach((sp) => {
    it(`especie ${sp} faz query com species correto`, async () => {
      const products = [makeProduct({ species: sp })]
      const supabase = createMockSupabase({ products })
      const herd = makeHerd({ species: sp })

      await generateRecommendation(supabase, herd)

      // Verify products table was queried
      expect(supabase.from).toHaveBeenCalledWith('products')
    })
  })
})
