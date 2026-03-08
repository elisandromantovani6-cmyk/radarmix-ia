import { describe, it, expect } from 'vitest'
import { calculatePastureScore, PastureInput } from '../pasture-score'

describe('pasture-score', () => {
  // Entrada base para testes — fazenda em Tangará da Serra, águas (janeiro)
  const baseInput: PastureInput = {
    lat: -14.6229,
    lon: -57.4983,
    city: 'Tangará da Serra',
    forage_type: 'brachiaria_brizantha',
    area_ha: 100,
    head_count: 200,
    rain_last_30d_mm: 150,
    month: 1,
  }

  // ─── 1. Estrutura básica do retorno ──────────────────────────────
  it('retorna objeto com todas as propriedades esperadas', () => {
    const result = calculatePastureScore(baseInput)

    expect(result).toHaveProperty('ndvi')
    expect(result).toHaveProperty('ndvi_label')
    expect(result).toHaveProperty('ms_kg_ha_day')
    expect(result).toHaveProperty('ms_total_kg_day')
    expect(result).toHaveProperty('ms_kg_animal_day')
    expect(result).toHaveProperty('quality')
    expect(result.quality).toHaveProperty('pb_percent')
    expect(result.quality).toHaveProperty('ndt_percent')
    expect(result.quality).toHaveProperty('fdn_percent')
    expect(result.quality).toHaveProperty('label')
    expect(result).toHaveProperty('carrying_capacity')
    expect(result.carrying_capacity).toHaveProperty('ua_per_ha')
    expect(result.carrying_capacity).toHaveProperty('current_stocking')
    expect(result.carrying_capacity).toHaveProperty('status')
    expect(result.carrying_capacity).toHaveProperty('max_heads')
    expect(result).toHaveProperty('overall_score')
    expect(result).toHaveProperty('score_label')
    expect(result).toHaveProperty('suggestions')
    expect(Array.isArray(result.suggestions)).toBe(true)
    expect(result).toHaveProperty('next_month')
    expect(result.next_month).toHaveProperty('ndvi_projected')
    expect(result.next_month).toHaveProperty('trend')
    expect(result.next_month).toHaveProperty('action')
  })

  // ─── 2. NDVI varia por mês (águas vs seca) ──────────────────────
  it('NDVI na época das águas é maior que na seca', () => {
    const aguas = calculatePastureScore({ ...baseInput, month: 2 })
    const seca = calculatePastureScore({ ...baseInput, month: 8 })

    expect(aguas.ndvi).toBeGreaterThan(seca.ndvi)
    expect(aguas.ndvi).toBeGreaterThan(0.5)
    expect(seca.ndvi).toBeLessThan(0.4)
  })

  // ─── 3. Mapeamento de cidade para região ────────────────────────
  it('Tangará da Serra (oeste) tem NDVI diferente de Cuiabá (centro)', () => {
    const oeste = calculatePastureScore({
      ...baseInput,
      city: 'Tangará da Serra',
      month: 2,
      rain_last_30d_mm: null,
    })
    const centro = calculatePastureScore({
      ...baseInput,
      city: 'Cuiabá',
      month: 2,
      rain_last_30d_mm: null,
    })

    // Tabela NDVI: oeste fev=0.72, centro fev=0.68
    expect(oeste.ndvi).toBeGreaterThan(centro.ndvi)
    expect(oeste.ndvi).toBe(0.72)
    expect(centro.ndvi).toBe(0.68)
  })

  // ─── 4. Chuva ajusta NDVI ───────────────────────────────────────
  it('chuva acima de 200mm aumenta NDVI em +0.08 e abaixo de 20mm reduz em -0.06', () => {
    // Usando mês 6 (seca), cidade Cuiabá (centro), NDVI base = 0.33
    const muitaChuva = calculatePastureScore({
      ...baseInput,
      city: 'Cuiabá',
      month: 6,
      rain_last_30d_mm: 250,
    })
    const semChuva = calculatePastureScore({
      ...baseInput,
      city: 'Cuiabá',
      month: 6,
      rain_last_30d_mm: 10,
    })
    const semDadoChuva = calculatePastureScore({
      ...baseInput,
      city: 'Cuiabá',
      month: 6,
      rain_last_30d_mm: null,
    })

    // Base NDVI centro mês 6 = 0.33
    // Com muita chuva: 0.33 + 0.08 = 0.41
    expect(muitaChuva.ndvi).toBe(0.41)
    // Sem chuva: 0.33 - 0.06 = 0.27
    expect(semChuva.ndvi).toBe(0.27)
    // Sem dado: mantém base 0.33
    expect(semDadoChuva.ndvi).toBe(0.33)
  })

  // ─── 5. Fator de forragem (mombaça produz mais) ─────────────────
  it('mombaça produz mais matéria seca que brachiaria brizantha', () => {
    const mombaca = calculatePastureScore({
      ...baseInput,
      forage_type: 'mombaça',
    })
    const brizantha = calculatePastureScore({
      ...baseInput,
      forage_type: 'brachiaria_brizantha',
    })

    // mombaça fator 1.35, brizantha fator 1.0
    expect(mombaca.ms_kg_ha_day).toBeGreaterThan(brizantha.ms_kg_ha_day)
    // A razão deve ser ~1.35
    const razao = mombaca.ms_kg_ha_day / brizantha.ms_kg_ha_day
    expect(razao).toBeCloseTo(1.35, 1)
  })

  // ─── 6. Labels de qualidade (Alta/Média/Baixa baseado no PB) ───
  it('classifica qualidade como Alta quando PB >= 10%, Média >= 7%, Baixa caso contrário', () => {
    // Águas com NDVI alto → PB alto → Alta
    const aguasAlto = calculatePastureScore({
      ...baseInput,
      city: 'Sinop',
      month: 2,
      rain_last_30d_mm: 250,
    })
    // PB = 4 + ndvi*10 + 2 (águas). Com NDVI ~0.82 → PB ~14.2 → Alta
    expect(aguasAlto.quality.label).toBe('Alta')

    // Seca profunda com NDVI baixo → PB baixo → Baixa
    const secaBaixo = calculatePastureScore({
      ...baseInput,
      city: 'Rondonópolis',
      month: 8,
      rain_last_30d_mm: 10,
    })
    // PB = 4 + ndvi*10 - 1.5 (seca). Com NDVI ~0.13 → PB ~3.8 → Baixa
    expect(secaBaixo.quality.label).toBe('Baixa')
  })

  // ─── 7. Cálculo de capacidade de suporte ────────────────────────
  it('calcula UA/ha como MS_por_ha_dia dividido por 11.25', () => {
    const result = calculatePastureScore({
      ...baseInput,
      month: 2,
      head_count: 100,
      area_ha: 50,
      rain_last_30d_mm: null,
    })

    // UA/ha = ms_kg_ha_day / 11.25
    const expectedUaPerHa = Math.round((result.ms_kg_ha_day / 11.25) * 100) / 100
    expect(result.carrying_capacity.ua_per_ha).toBe(expectedUaPerHa)

    // current_stocking = head_count / area_ha
    expect(result.carrying_capacity.current_stocking).toBeCloseTo(100 / 50, 2)

    // max_heads = floor(ua_per_ha * area_ha)
    expect(result.carrying_capacity.max_heads).toBe(
      Math.floor(result.carrying_capacity.ua_per_ha * 50)
    )
  })

  // ─── 8. Status de lotação (superlotado/adequado/sublotado) ──────
  it('classifica lotação como superlotado quando acima de 1.15x e sublotado abaixo de 0.70x', () => {
    // Superlotado: muitas cabeças na seca
    const superlotado = calculatePastureScore({
      ...baseInput,
      head_count: 800,
      area_ha: 100,
      month: 8,
      rain_last_30d_mm: null,
    })
    expect(superlotado.carrying_capacity.status).toBe('superlotado')
    expect(superlotado.carrying_capacity.current_stocking).toBeGreaterThan(
      superlotado.carrying_capacity.ua_per_ha * 1.15
    )

    // Sublotado: poucas cabeças nas águas
    const sublotado = calculatePastureScore({
      ...baseInput,
      head_count: 10,
      area_ha: 100,
      month: 2,
      rain_last_30d_mm: null,
    })
    expect(sublotado.carrying_capacity.status).toBe('sublotado')
    expect(sublotado.carrying_capacity.current_stocking).toBeLessThan(
      sublotado.carrying_capacity.ua_per_ha * 0.70
    )

    // Adequado: lotação proporcional à capacidade
    const adequado = calculatePastureScore({
      ...baseInput,
      head_count: Math.round(superlotado.carrying_capacity.ua_per_ha * 100),
      area_ha: 100,
      month: 8,
      rain_last_30d_mm: null,
    })
    expect(adequado.carrying_capacity.status).toBe('adequado')
  })

  // ─── 9. Classificação do score label ────────────────────────────
  it('score label segue faixas: Excelente>=80, Bom>=60, Regular>=40, Ruim>=20, Crítico<20', () => {
    // Cenário bom: águas, pouca lotação, muita chuva
    const bom = calculatePastureScore({
      ...baseInput,
      month: 2,
      head_count: 100,
      rain_last_30d_mm: 250,
    })

    // Verifica consistência
    if (bom.overall_score >= 80) expect(bom.score_label).toBe('Excelente')
    else if (bom.overall_score >= 60) expect(bom.score_label).toBe('Bom')
    else if (bom.overall_score >= 40) expect(bom.score_label).toBe('Regular')
    else if (bom.overall_score >= 20) expect(bom.score_label).toBe('Ruim')
    else expect(bom.score_label).toBe('Crítico')

    // Cenário ruim: seca, superlotado, sem chuva
    const ruim = calculatePastureScore({
      ...baseInput,
      month: 8,
      head_count: 800,
      rain_last_30d_mm: 0,
    })

    if (ruim.overall_score >= 80) expect(ruim.score_label).toBe('Excelente')
    else if (ruim.overall_score >= 60) expect(ruim.score_label).toBe('Bom')
    else if (ruim.overall_score >= 40) expect(ruim.score_label).toBe('Regular')
    else if (ruim.overall_score >= 20) expect(ruim.score_label).toBe('Ruim')
    else expect(ruim.score_label).toBe('Crítico')
  })

  // ─── 10. Sugestões para superlotação ────────────────────────────
  it('gera sugestão sobre superlotação quando status é superlotado', () => {
    const result = calculatePastureScore({
      ...baseInput,
      month: 8,
      head_count: 800,
    })

    expect(result.carrying_capacity.status).toBe('superlotado')
    expect(result.suggestions.some(s => s.includes('superlotada'))).toBe(true)
    expect(result.suggestions.some(s =>
      s.includes('reduzir') || s.includes('suplementar')
    )).toBe(true)
  })

  // ─── 11. Sugestões para NDVI baixo ──────────────────────────────
  it('gera sugestão de degradação quando NDVI < 0.3', () => {
    const result = calculatePastureScore({
      ...baseInput,
      city: 'Rondonópolis',
      month: 8,
      rain_last_30d_mm: 10,
    })

    // NDVI sul mês 8 = 0.19, com chuva <20mm: 0.19 - 0.06 = 0.13
    expect(result.ndvi).toBeLessThan(0.3)
    expect(result.suggestions.some(s =>
      s.includes('NDVI muito baixo') || s.includes('degradado')
    )).toBe(true)
  })

  // ─── 12. Tendência do próximo mês ───────────────────────────────
  it('projeta tendência melhorando, piorando ou estável conforme diferença de NDVI', () => {
    // Abril → Maio: NDVI cai (início seca) → piorando
    const abrilMaio = calculatePastureScore({
      ...baseInput,
      month: 4,
      rain_last_30d_mm: null,
    })
    // oeste abr=0.62, mai=0.48 → diff = -0.14 < -0.05 → piorando
    expect(abrilMaio.next_month.trend).toBe('piorando')

    // Outubro → Novembro: NDVI sobe (início águas) → melhorando
    const outNov = calculatePastureScore({
      ...baseInput,
      month: 10,
      rain_last_30d_mm: null,
    })
    // oeste out=0.38, nov=0.52 → diff = 0.14 > 0.05 → melhorando
    expect(outNov.next_month.trend).toBe('melhorando')

    // Janeiro → Fevereiro: NDVI sobe pouco → pode ser estável ou melhorando
    const janFev = calculatePastureScore({
      ...baseInput,
      month: 1,
      rain_last_30d_mm: null,
    })
    // oeste jan=0.68, fev=0.72 → diff = 0.04, |diff| < 0.05 → estavel
    expect(janFev.next_month.trend).toBe('estavel')
  })

  // ─── 13. Score está sempre entre 0 e 100 ────────────────────────
  it('score geral está sempre entre 0 e 100 em cenários extremos', () => {
    const cenarios: PastureInput[] = [
      { ...baseInput, month: 2, head_count: 50 },
      { ...baseInput, month: 8, head_count: 1000 },
      { ...baseInput, month: 6, head_count: 0 },
      { ...baseInput, month: 12, rain_last_30d_mm: 300 },
      { ...baseInput, month: 8, rain_last_30d_mm: 0 },
      { ...baseInput, area_ha: 1, head_count: 500 },
      { ...baseInput, forage_type: 'capim_elefante', month: 2 },
    ]

    for (const cenario of cenarios) {
      const result = calculatePastureScore(cenario)
      expect(result.overall_score).toBeGreaterThanOrEqual(0)
      expect(result.overall_score).toBeLessThanOrEqual(100)
    }
  })

  // ─── 14. Cidade desconhecida usa região centro ──────────────────
  it('cidade desconhecida usa valores da região centro como padrão', () => {
    const desconhecida = calculatePastureScore({
      ...baseInput,
      city: 'Cidade Inexistente',
      month: 2,
      rain_last_30d_mm: null,
    })
    const centro = calculatePastureScore({
      ...baseInput,
      city: 'Cuiabá',
      month: 2,
      rain_last_30d_mm: null,
    })

    // Ambas devem usar a tabela 'centro'
    expect(desconhecida.ndvi).toBe(centro.ndvi)
  })

  // ─── 15. Labels de NDVI correspondem às faixas definidas ───────
  it('NDVI label segue faixas: Degradado<0.2, Seco<0.4, Razoável<0.6, Bom<0.8, Excelente>=0.8', () => {
    // Degradado: sul, agosto, sem chuva → NDVI ~0.13
    const degradado = calculatePastureScore({
      ...baseInput,
      city: 'Rondonópolis',
      month: 8,
      rain_last_30d_mm: 10,
    })
    expect(degradado.ndvi).toBeLessThan(0.2)
    expect(degradado.ndvi_label).toBe('Degradado')

    // Seco: centro, junho, sem chuva → NDVI ~0.27
    const seco = calculatePastureScore({
      ...baseInput,
      city: 'Cuiabá',
      month: 6,
      rain_last_30d_mm: 10,
    })
    expect(seco.ndvi).toBeGreaterThanOrEqual(0.2)
    expect(seco.ndvi).toBeLessThan(0.4)
    expect(seco.ndvi_label).toBe('Seco')

    // Bom: oeste, fevereiro, sem dado de chuva → NDVI 0.72
    const bom = calculatePastureScore({
      ...baseInput,
      city: 'Tangará da Serra',
      month: 2,
      rain_last_30d_mm: null,
    })
    expect(bom.ndvi).toBeGreaterThanOrEqual(0.6)
    expect(bom.ndvi).toBeLessThan(0.8)
    expect(bom.ndvi_label).toBe('Bom')
  })
})
