import { describe, it, expect } from 'vitest'
import {
  getCollectiveInsight,
  findClosestCluster,
  calculatePercentile,
  CLUSTERS,
  type CollectiveInput,
} from '../collective-intelligence'

// Helper: cria input padrão com overrides
function makeInput(overrides: Partial<CollectiveInput> = {}): CollectiveInput {
  return {
    breed_type: 'zebuino',
    system: 'pasto',
    region: 'oeste',
    my_gmd: 0.60,
    my_cost_arroba: 270,
    my_supplement: 'Mineral',
    my_forage: 'Brachiária Decumbens',
    ...overrides,
  }
}

describe('findClosestCluster', () => {
  it('encontra cluster exato para zebuíno pasto oeste', () => {
    const input = makeInput()
    const cluster = findClosestCluster(input)
    expect(cluster.cluster_id).toBe('z_pasto_oeste')
    expect(cluster.breed_type).toBe('zebuino')
    expect(cluster.system).toBe('pasto')
    expect(cluster.region).toBe('oeste')
  })

  it('faz fallback para região diferente quando não há match exato', () => {
    // Zebuíno pasto sul — não existe, deve cair em zebuíno pasto de outra região
    const input = makeInput({ region: 'sul' })
    const cluster = findClosestCluster(input)
    expect(cluster.breed_type).toBe('zebuino')
    expect(cluster.system).toBe('pasto')
  })

  it('faz fallback por sistema quando raça não encontrada', () => {
    // Taurino pasto — não existe, deve encontrar algum cluster de pasto
    const input = makeInput({ breed_type: 'taurino', system: 'pasto', region: 'norte' })
    const cluster = findClosestCluster(input)
    expect(cluster.system).toBe('pasto')
  })

  it('retorna fallback para perfil totalmente desconhecido', () => {
    const input = makeInput({ breed_type: 'desconhecido', system: 'hidroponia', region: 'leste' })
    const cluster = findClosestCluster(input)
    // Deve retornar o primeiro cluster como fallback
    expect(cluster).toBeDefined()
    expect(cluster.cluster_id).toBe(CLUSTERS[0].cluster_id)
  })
})

describe('calculatePercentile', () => {
  it('retorna percentil entre 0 e 100 para GMD', () => {
    const p = calculatePercentile(0.65, 0.62, 0.88)
    expect(p).toBeGreaterThanOrEqual(0)
    expect(p).toBeLessThanOrEqual(100)
  })

  it('retorna percentil alto para GMD acima do top 10%', () => {
    const p = calculatePercentile(1.0, 0.62, 0.88)
    expect(p).toBeGreaterThanOrEqual(90)
  })

  it('retorna percentil baixo para GMD muito abaixo da média', () => {
    const p = calculatePercentile(0.20, 0.62, 0.88)
    expect(p).toBeLessThan(30)
  })

  it('funciona no modo invertido para custo (menor = melhor)', () => {
    // Custo muito baixo = percentil alto
    const pBaixo = calculatePercentile(180, 265, 215, true)
    expect(pBaixo).toBeGreaterThanOrEqual(90)

    // Custo muito alto = percentil baixo
    const pAlto = calculatePercentile(350, 265, 215, true)
    expect(pAlto).toBeLessThan(50)
  })
})

describe('getCollectiveInsight', () => {
  it('retorna sugestões com pelo menos 3 itens', () => {
    const input = makeInput()
    const result = getCollectiveInsight(input)
    expect(result.suggestions.length).toBeGreaterThanOrEqual(3)
  })

  it('posição percentil está entre 0 e 100', () => {
    const input = makeInput()
    const result = getCollectiveInsight(input)
    expect(result.my_position.gmd_percentile).toBeGreaterThanOrEqual(0)
    expect(result.my_position.gmd_percentile).toBeLessThanOrEqual(100)
    expect(result.my_position.cost_percentile).toBeGreaterThanOrEqual(0)
    expect(result.my_position.cost_percentile).toBeLessThanOrEqual(100)
  })

  it('network stats têm totais razoáveis', () => {
    const input = makeInput()
    const result = getCollectiveInsight(input)
    expect(result.network_stats.total_producers).toBeGreaterThan(100)
    expect(result.network_stats.total_heads).toBeGreaterThan(10000)
    expect(result.network_stats.avg_gmd_network).toBeGreaterThan(0)
    expect(result.network_stats.top10_gmd_network).toBeGreaterThan(
      result.network_stats.avg_gmd_network
    )
  })

  it('sugestões incluem texto de potential_improvement', () => {
    const input = makeInput()
    const result = getCollectiveInsight(input)
    result.suggestions.forEach(s => {
      expect(s.potential_improvement).toBeTruthy()
      expect(typeof s.potential_improvement).toBe('string')
      expect(s.potential_improvement.length).toBeGreaterThan(0)
    })
  })

  it('produtor com GMD baixo recebe sugestão de nutrição', () => {
    const input = makeInput({ my_gmd: 0.30 })
    const result = getCollectiveInsight(input)
    const hasNutricao = result.suggestions.some(s => s.type === 'nutricao')
    expect(hasNutricao).toBe(true)
  })

  it('produtor com custo alto recebe sugestão de redução de custo', () => {
    const input = makeInput({ my_cost_arroba: 350 })
    const result = getCollectiveInsight(input)
    const hasCostSuggestion = result.suggestions.some(
      s => s.potential_improvement.includes('custo') || s.title.toLowerCase().includes('custo')
    )
    expect(hasCostSuggestion).toBe(true)
  })

  it('cada sugestão tem adopted_by_percent', () => {
    const input = makeInput()
    const result = getCollectiveInsight(input)
    result.suggestions.forEach(s => {
      expect(s.adopted_by_percent).toBeGreaterThan(0)
      expect(s.adopted_by_percent).toBeLessThanOrEqual(100)
    })
  })

  it('position_label é gerado corretamente para produtor mediano', () => {
    // GMD próximo da média — deve indicar posição relativa
    const input = makeInput({ my_gmd: 0.62 })
    const result = getCollectiveInsight(input)
    expect(result.my_position.position_label).toBeTruthy()
    expect(typeof result.my_position.position_label).toBe('string')
  })

  it('position_label indica top para produtor com GMD alto', () => {
    const input = makeInput({ my_gmd: 0.95 })
    const result = getCollectiveInsight(input)
    expect(result.my_position.position_label).toContain('Top')
  })

  it('produtor com GMD muito baixo recebe sugestão genética', () => {
    // GMD abaixo de 75% da média do cluster (0.62 * 0.75 = 0.465)
    const input = makeInput({ my_gmd: 0.25 })
    const result = getCollectiveInsight(input)
    const hasGenetica = result.suggestions.some(s => s.type === 'genetica')
    expect(hasGenetica).toBe(true)
  })
})
