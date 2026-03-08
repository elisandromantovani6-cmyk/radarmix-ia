import { SupabaseClient } from '@supabase/supabase-js'

export interface HerdData {
  id: string
  species: string
  main_phase: string
  head_count: number
  forage_id: string | null
  breed_id: string | null
  avg_weight_kg: number | null
  sex: string | null
  pasture_condition: string | null
}

export interface Recommendation {
  product: any
  score: number
  reasons: string[]
  deficits: string[]
  consumption_kg_day: number
  monthly_cost_estimate: number | null
  nutrition_data?: NutritionContext | null
}

// Dados nutricionais enriquecidos pelas tabelas BR-CORTE/CQBAL
export interface NutritionContext {
  feed_composition: any | null
  nutrient_requirements: any | null
  breed_adjustments: any[]
  cms_calculated: number | null
  pb_required_g_day: number | null
  ndt_required_percent: number | null
  deficit_details: DeficitDetail[]
}

export interface DeficitDetail {
  nutrient: string
  forage_supply: number | null
  animal_requirement: number | null
  deficit_percent: number | null
  severity: 'leve' | 'moderado' | 'grave'
}

// Busca composição detalhada da forrageira na tabela feed_composition (CQBAL/BR-CORTE)
async function fetchFeedComposition(supabase: SupabaseClient, forageName: string, season: string) {
  // Tentar match pelo nome da forrageira
  const searchName = forageName.toLowerCase()
    .replace('capim-', '')
    .replace('capim ', '')

  const { data } = await supabase
    .from('feed_composition')
    .select('*')
    .eq('season', season === 'seca' ? 'seca' : 'aguas')
    .ilike('feed_name', '%' + searchName + '%')
    .limit(1)

  if (data && data.length > 0) return data[0]

  // Fallback: buscar média anual
  const { data: fallback } = await supabase
    .from('feed_composition')
    .select('*')
    .eq('season', 'media_anual')
    .ilike('feed_name', '%' + searchName + '%')
    .limit(1)

  return fallback && fallback.length > 0 ? fallback[0] : null
}

// Busca exigências nutricionais do BR-CORTE baseado no peso e fase do animal
async function fetchNutrientRequirements(
  supabase: SupabaseClient,
  breedType: string,
  weight: number,
  phase: string,
  system: string
) {
  const productionPhase = mapPhaseToBRCorte(phase)

  // Buscar o registro mais próximo do peso do animal
  const { data } = await supabase
    .from('nutrient_requirements')
    .select('*')
    .eq('breed_type', breedType)
    .eq('production_phase', productionPhase)
    .eq('production_system', system)
    .order('body_weight_kg', { ascending: true })

  if (!data || data.length === 0) return null

  // Encontrar o peso mais próximo
  let closest = data[0]
  let minDiff = Math.abs(data[0].body_weight_kg - weight)
  for (const row of data) {
    const diff = Math.abs(row.body_weight_kg - weight)
    if (diff < minDiff) {
      minDiff = diff
      closest = row
    }
  }

  return closest
}

// Busca fatores de ajuste zebuíno vs taurino
async function fetchBreedAdjustments(supabase: SupabaseClient) {
  const { data } = await supabase
    .from('breed_adjustment_factors')
    .select('*')

  return data || []
}

function mapPhaseToBRCorte(phase: string): string {
  const map: Record<string, string> = {
    'cria': 'cria',
    'recria': 'recria',
    'engorda': 'engorda',
    'lactacao': 'lactacao',
    'reproducao': 'manutencao',
  }
  return map[phase] || 'recria'
}

// Determina o tipo genético para consulta no BR-CORTE
function getBreedType(breedName: string | null): string {
  if (!breedName) return 'zebuino'
  const name = breedName.toLowerCase()

  if (name.startsWith('f1') || name.includes('cruzamento') || name.includes('composto')) return 'cruzado_f1'
  if (['angus', 'hereford', 'charolês', 'charolais', 'limousin', 'simental', 'simmental'].some(t => name.includes(t))) return 'taurino'
  if (['girolando', 'gir leiteiro', 'jersey'].some(t => name.includes(t))) return 'leiteiro_cruzado'

  return 'zebuino'
}

// Analisa déficits comparando fornecimento da forrageira com exigência do animal
function analyzeDetailedDeficits(
  feedComp: any,
  requirements: any,
  cmsKgDay: number
): DeficitDetail[] {
  const details: DeficitDetail[] = []
  if (!feedComp || !requirements || cmsKgDay <= 0) return details

  // PB: forrageira fornece X% da MS, animal precisa Y g/dia
  if (feedComp.pb_percent != null && requirements.pb_g_day != null) {
    const pbSupply = (feedComp.pb_percent / 100) * cmsKgDay * 1000 // g/dia
    const pbReq = requirements.pb_g_day
    if (pbSupply < pbReq) {
      const deficitPct = ((pbReq - pbSupply) / pbReq) * 100
      details.push({
        nutrient: 'Proteína Bruta',
        forage_supply: Math.round(pbSupply),
        animal_requirement: pbReq,
        deficit_percent: Math.round(deficitPct),
        severity: deficitPct > 30 ? 'grave' : deficitPct > 15 ? 'moderado' : 'leve',
      })
    }
  }

  // NDT: forrageira fornece X% NDT, animal precisa Y kg/dia
  if (feedComp.ndt_percent != null && requirements.ndt_kg_day != null) {
    const ndtSupply = (feedComp.ndt_percent / 100) * cmsKgDay // kg/dia
    const ndtReq = requirements.ndt_kg_day
    if (ndtSupply < ndtReq) {
      const deficitPct = ((ndtReq - ndtSupply) / ndtReq) * 100
      details.push({
        nutrient: 'Energia (NDT)',
        forage_supply: parseFloat(ndtSupply.toFixed(2)),
        animal_requirement: ndtReq,
        deficit_percent: Math.round(deficitPct),
        severity: deficitPct > 25 ? 'grave' : deficitPct > 10 ? 'moderado' : 'leve',
      })
    }
  }

  // Fósforo: forrageira fornece X g/kg MS, animal precisa Y g/dia
  if (feedComp.p_g_kg != null && requirements.p_g_day != null) {
    const pSupply = feedComp.p_g_kg * cmsKgDay // g/dia
    const pReq = requirements.p_g_day
    if (pSupply < pReq) {
      const deficitPct = ((pReq - pSupply) / pReq) * 100
      details.push({
        nutrient: 'Fósforo',
        forage_supply: parseFloat(pSupply.toFixed(1)),
        animal_requirement: pReq,
        deficit_percent: Math.round(deficitPct),
        severity: deficitPct > 40 ? 'grave' : deficitPct > 20 ? 'moderado' : 'leve',
      })
    }
  }

  // Cálcio
  if (feedComp.ca_g_kg != null && requirements.ca_g_day != null) {
    const caSupply = feedComp.ca_g_kg * cmsKgDay
    const caReq = requirements.ca_g_day
    if (caSupply < caReq) {
      const deficitPct = ((caReq - caSupply) / caReq) * 100
      details.push({
        nutrient: 'Cálcio',
        forage_supply: parseFloat(caSupply.toFixed(1)),
        animal_requirement: caReq,
        deficit_percent: Math.round(deficitPct),
        severity: deficitPct > 40 ? 'grave' : deficitPct > 20 ? 'moderado' : 'leve',
      })
    }
  }

  // Sódio
  if (feedComp.na_g_kg != null && requirements.na_g_day != null) {
    const naSupply = feedComp.na_g_kg * cmsKgDay
    const naReq = requirements.na_g_day
    if (naSupply < naReq) {
      const deficitPct = ((naReq - naSupply) / naReq) * 100
      details.push({
        nutrient: 'Sódio',
        forage_supply: parseFloat(naSupply.toFixed(1)),
        animal_requirement: naReq,
        deficit_percent: Math.round(deficitPct),
        severity: deficitPct > 50 ? 'grave' : deficitPct > 25 ? 'moderado' : 'leve',
      })
    }
  }

  // Zinco
  if (feedComp.zn_mg_kg != null && requirements.zn_mg_day != null) {
    const znSupply = feedComp.zn_mg_kg * cmsKgDay
    const znReq = requirements.zn_mg_day
    if (znSupply < znReq) {
      const deficitPct = ((znReq - znSupply) / znReq) * 100
      details.push({
        nutrient: 'Zinco',
        forage_supply: parseFloat(znSupply.toFixed(1)),
        animal_requirement: znReq,
        deficit_percent: Math.round(deficitPct),
        severity: deficitPct > 40 ? 'grave' : deficitPct > 20 ? 'moderado' : 'leve',
      })
    }
  }

  return details
}

export async function generateRecommendation(
  supabase: SupabaseClient,
  herd: HerdData
): Promise<Recommendation | null> {
  // 1. Determinar época do ano (seca ou águas)
  const month = new Date().getMonth() + 1
  const season = (month >= 5 && month <= 9) ? 'seca' : 'aguas'
  const seasonLabel = season === 'seca' ? 'Período seco (mai-set)' : 'Período das águas (out-abr)'

  // 2. Buscar forrageira do lote
  let forage: any = null
  let forageDeficits: string[] = []
  if (herd.forage_id) {
    const { data } = await supabase
      .from('forages')
      .select('*')
      .eq('id', herd.forage_id)
      .single()
    forage = data

    if (forage) {
      forageDeficits = analyzeForageDeficits(forage, season)
    }
  }

  // 3. Buscar fatores nutricionais da raça
  let breedFactor: any = null
  let breedInfo: any = null
  if (herd.breed_id) {
    const { data: breed } = await supabase
      .from('breeds')
      .select('*')
      .eq('id', herd.breed_id)
      .single()
    breedInfo = breed

    if (breed) {
      const { data: factors } = await supabase
        .from('breed_nutrition_factors')
        .select('*')
        .eq('breed_id', herd.breed_id)
        .eq('phase', mapPhaseToFactor(herd.main_phase))
      breedFactor = factors && factors.length > 0 ? factors[0] : null
    }
  }

  // === INTEGRAÇÃO BR-CORTE/CQBAL ===

  // 4. Buscar composição detalhada da forrageira (CQBAL 4.0)
  let feedComp: any = null
  if (forage?.name) {
    feedComp = await fetchFeedComposition(supabase, forage.name, season)
  }

  // 5. Buscar exigências nutricionais do animal (BR-CORTE 2023)
  const breedType = getBreedType(breedInfo?.name || null)
  const animalWeight = herd.avg_weight_kg || 350
  const productionSystem = herd.main_phase === 'engorda' ? 'confinamento' : 'pasto'
  const nutrientReq = await fetchNutrientRequirements(
    supabase, breedType, animalWeight, herd.main_phase, productionSystem
  )

  // 6. Buscar fatores de ajuste por raça
  const breedAdjustments = await fetchBreedAdjustments(supabase)

  // 7. Calcular CMS estimado (BR-CORTE ou fallback)
  let cmsKgDay: number | null = null
  if (nutrientReq?.cms_kg_day) {
    cmsKgDay = nutrientReq.cms_kg_day
  } else if (animalWeight > 0) {
    // Fallback: 2.3% PV para zebuínos, 2.7% para taurinos
    const cmsPct = breedType === 'taurino' ? 2.7 : 2.3
    cmsKgDay = (animalWeight * cmsPct) / 100
  }

  // 8. Análise detalhada de déficits (forrageira vs exigência do animal)
  let detailedDeficits: DeficitDetail[] = []
  if (feedComp && nutrientReq && cmsKgDay) {
    detailedDeficits = analyzeDetailedDeficits(feedComp, nutrientReq, cmsKgDay)

    // Adicionar déficits detalhados aos déficits de texto
    for (const d of detailedDeficits) {
      const msg = d.nutrient + ' - déficit de ' + d.deficit_percent + '% (' +
        d.forage_supply + ' fornecido vs ' + d.animal_requirement + ' necessário)'
      if (!forageDeficits.some(existing => existing.includes(d.nutrient))) {
        forageDeficits.push(msg)
      }
    }
  }

  // Construir contexto nutricional enriquecido
  const nutritionData: NutritionContext = {
    feed_composition: feedComp,
    nutrient_requirements: nutrientReq,
    breed_adjustments: breedAdjustments,
    cms_calculated: cmsKgDay,
    pb_required_g_day: nutrientReq?.pb_g_day || null,
    ndt_required_percent: nutrientReq?.ndt_percent_ms || null,
    deficit_details: detailedDeficits,
  }

  // === FIM INTEGRAÇÃO BR-CORTE/CQBAL ===

  // 9. Mapear espécie para filtro de produto
  const speciesMap: Record<string, string> = {
    'bovinos_corte': 'bovinos_corte',
    'bovinos_leite': 'bovinos_leite',
    'bezerros': 'bezerros',
    'reprodutores': 'reprodutores',
    'aves': 'aves',
    'equinos': 'equinos',
    'ovinos': 'ovinos',
  }
  const productSpecies = speciesMap[herd.species] || 'Bovinos Corte'

  // 10. Buscar produtos compatíveis
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('species', productSpecies)
    .order('priority_score', { ascending: false })

  if (!products || products.length === 0) return null

  // 11. Pontuar cada produto
  const scored = products.map(product => {
    let score = product.priority_score || 50
    const reasons: string[] = []

    // Match por fase
    if (matchPhase(product, herd.main_phase)) {
      score += 20
      reasons.push('Indicado para fase de ' + herd.main_phase)
    }

    // Match por época (seca = proteicos/energéticos; águas = minerais)
    if (season === 'seca') {
      if (product.line === 'Proteico' || product.line === 'Prot.Energ' || product.line === 'FazCarne') {
        score += 15
        reasons.push('Ideal para ' + seasonLabel + ' - suplementação proteica')
      }
      if (product.pb_percent && product.pb_percent > 20) {
        score += 10
        reasons.push('Alto teor proteico (' + product.pb_percent + '% PB)')
      }
    } else {
      if (product.line === 'S' || product.line === 'SR' || product.line === 'Especial') {
        score += 15
        reasons.push('Mineral adequado para ' + seasonLabel)
      }
    }

    // Match por déficits da forrageira
    if (forageDeficits.length > 0) {
      const mineralMatch = checkMineralMatch(product, forageDeficits)
      score += mineralMatch.score
      if (mineralMatch.reasons.length > 0) {
        reasons.push(...mineralMatch.reasons)
      }
    }

    // Pontuação extra por déficits detalhados (BR-CORTE)
    if (detailedDeficits.length > 0) {
      const graveCount = detailedDeficits.filter(d => d.severity === 'grave').length
      const moderateCount = detailedDeficits.filter(d => d.severity === 'moderado').length

      // Produto proteico ganha mais pontos quando há déficit grave de PB
      const hasPBDeficit = detailedDeficits.some(d => d.nutrient === 'Proteína Bruta' && d.severity === 'grave')
      if (hasPBDeficit && product.pb_percent && product.pb_percent > 30) {
        score += 15
        reasons.push('Corrige déficit grave de proteína (dados BR-CORTE)')
      }

      // Produto energético ganha pontos quando há déficit de NDT
      const hasNDTDeficit = detailedDeficits.some(d => d.nutrient === 'Energia (NDT)' && d.severity !== 'leve')
      if (hasNDTDeficit && product.ndt_percent && product.ndt_percent > 60) {
        score += 12
        reasons.push('Complementa déficit energético (dados BR-CORTE)')
      }

      // Pasto degradado + múltiplos déficits graves
      if (herd.pasture_condition === 'degradado' && graveCount >= 2) {
        if (product.line === 'Prot.Energ' || product.line === 'FazCarne') {
          score += 10
          reasons.push('Múltiplos déficits graves em pasto degradado - suplementação intensiva')
        }
      }

      // Bônus para produtos que atendem déficits moderados
      if (moderateCount >= 2 && (product.line === 'SR' || product.line === 'Proteico')) {
        score += 5
      }
    }

    // Ajuste por raça usando fatores BR-CORTE
    if (breedType === 'taurino' && breedAdjustments.length > 0) {
      score += 8
      reasons.push('Raça taurina: +20% exigência energética (BR-CORTE 2023)')
    }

    // Ajuste por raça (taurinos precisam mais suplementação)
    if (breedFactor) {
      if (breedFactor.cms_multiplier > 1.1) {
        score += 5
        reasons.push('Raça ' + (breedInfo?.name || '') + ' com maior exigência nutricional')
      }
    }

    // Ajuste por condição de pasto
    if (herd.pasture_condition === 'degradado') {
      if (product.line === 'Proteico' || product.line === 'Prot.Energ') {
        score += 10
        reasons.push('Compensa déficit de pasto degradado')
      }
    }

    // Confinamento
    if (herd.main_phase === 'engorda' && product.line === 'RK') {
      score += 15
      reasons.push('Linha RK ideal para engorda intensiva')
    }
    if (herd.main_phase === 'engorda' && product.name && product.name.toLowerCase().includes('confinamento')) {
      score += 20
      reasons.push('Específico para confinamento - referência: GMD 1,79 kg/dia em Nelore (caso real MT)')
    }

    // Calcular consumo estimado (g/cab/dia) — usa CMS do BR-CORTE se disponível
    const consumption = estimateConsumption(product, herd, breedFactor, cmsKgDay)

    return {
      product,
      score,
      reasons,
      deficits: forageDeficits,
      consumption_kg_day: consumption / 1000,
      monthly_cost_estimate: null,
      nutrition_data: nutritionData,
    }
  })

  // Ordenar por score e retornar top 1
  scored.sort((a, b) => b.score - a.score)
  return scored[0] || null
}

export function analyzeForageDeficits(forage: any, season: string): string[] {
  const deficits: string[] = []
  const prefix = season === 'seca' ? 'dry_' : 'rainy_'

  const pb = forage[prefix + 'pb_percent']
  const ndt = forage[prefix + 'ndt_percent']
  const ca = forage[prefix + 'ca_g_kg']
  const p = forage[prefix + 'p_g_kg']
  const na_val = forage[prefix + 'na_g_kg']
  const zn = forage[prefix + 'zn_mg_kg']

  if (pb !== null && pb < 7) deficits.push('Proteína bruta baixa (' + pb + '% PB)')
  if (ndt !== null && ndt < 50) deficits.push('Energia baixa (' + ndt + '% NDT)')
  if (p !== null && p < 1.5) deficits.push('Fósforo deficiente')
  if (na_val !== null && na_val < 0.5) deficits.push('Sódio deficiente')
  if (ca !== null && ca < 2.0) deficits.push('Cálcio baixo')
  if (zn !== null && zn < 20) deficits.push('Zinco deficiente')

  if (season === 'seca' && deficits.length === 0) {
    deficits.push('Forragem com qualidade reduzida na seca')
  }

  return deficits
}

export function checkMineralMatch(product: any, deficits: string[]): { score: number, reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  for (const deficit of deficits) {
    if (deficit.includes('Fósforo') && product.p_g_kg && product.p_g_kg > 40) {
      score += 8
      reasons.push('Corrige déficit de fósforo (' + product.p_g_kg + 'g/kg P)')
    }
    if (deficit.includes('Sódio') && product.na_g_kg && product.na_g_kg > 50) {
      score += 5
      reasons.push('Fornece sódio adequado')
    }
    if (deficit.includes('Cálcio') && product.ca_g_kg && product.ca_g_kg > 80) {
      score += 5
      reasons.push('Corrige déficit de cálcio')
    }
    if (deficit.includes('Proteína') && product.pb_percent && product.pb_percent > 20) {
      score += 12
      reasons.push('Compensa baixa proteína da forragem')
    }
    if (deficit.includes('Energia') && product.ndt_percent && product.ndt_percent > 50) {
      score += 10
      reasons.push('Complementa energia deficiente')
    }
    if (deficit.includes('Zinco') && product.zn_mg_kg && product.zn_mg_kg > 2000) {
      score += 5
      reasons.push('Fornece zinco para imunidade e reprodução')
    }
  }

  return { score, reasons }
}

export function matchPhase(product: any, phase: string): boolean {
  const name = (product.name || '').toLowerCase()
  const line = (product.line || '').toLowerCase()

  if (phase === 'cria' && (name.includes('cria') || name.includes('bezerro'))) return true
  if (phase === 'recria' && (name.includes('recria') || line === 'sr' || line === 's')) return true
  if (phase === 'engorda' && (name.includes('engorda') || name.includes('confinamento') || line === 'rk' || line === 'fazcarne')) return true
  if (phase === 'lactacao' && (name.includes('leite') || name.includes('lactacao') || line.includes('leite'))) return true
  if (phase === 'reproducao' && (name.includes('reproduc') || name.includes('especial'))) return true

  // Match genérico por linha
  if ((line === 's' || line === 'sr') && (phase === 'recria' || phase === 'cria')) return true

  return false
}

export function mapPhaseToFactor(phase: string): string {
  const map: Record<string, string> = {
    'cria': 'cria',
    'recria': 'recria',
    'engorda': 'terminacao',
    'lactacao': 'lactacao',
    'reproducao': 'reproducao',
  }
  return map[phase] || phase
}

export function estimateConsumption(
  product: any, herd: HerdData, breedFactor: any, cmsKgDay?: number | null
): number {
  // Consumo base em g/cab/dia por tipo de produto
  let base = 100 // mineral padrão

  const line = (product.line || '').toLowerCase()
  if (line === 's' || line === 'sr' || line === 'especial') base = 80
  if (line === 'proteico') base = 500
  if (line === 'prot.energ') base = 800
  if (line === 'fazcarne') base = 1000
  if (line === 'rk') base = 1500
  if (line === 'concentrado') base = 3000
  if (line.includes('leite')) base = 2000

  // Se temos CMS do BR-CORTE, ajusta consumo de concentrado/proteico proporcionalmente
  if (cmsKgDay && cmsKgDay > 0) {
    // Para concentrados e proteicos, consumo é % do CMS total
    if (line === 'concentrado') {
      // Concentrado: ~30-40% do CMS em confinamento
      base = Math.round(cmsKgDay * 0.35 * 1000)
    } else if (line === 'rk') {
      // RK: ~15-20% do CMS
      base = Math.round(cmsKgDay * 0.18 * 1000)
    } else if (line === 'fazcarne') {
      // FazCarne: ~10-15% do CMS
      base = Math.round(cmsKgDay * 0.12 * 1000)
    } else if (line === 'prot.energ') {
      // Prot.Energ: ~8-12% do CMS
      base = Math.round(cmsKgDay * 0.10 * 1000)
    } else if (line === 'proteico') {
      // Proteico: ~5-8% do CMS
      base = Math.round(cmsKgDay * 0.06 * 1000)
    }
  }

  // Ajuste por raça
  if (breedFactor && breedFactor.cms_multiplier) {
    base = Math.round(base * breedFactor.cms_multiplier)
  }

  // Ajuste por peso (animais maiores consomem mais) — só se não tem CMS do BR-CORTE
  if (!cmsKgDay && herd.avg_weight_kg && herd.avg_weight_kg > 400) {
    base = Math.round(base * 1.1)
  }

  return base
}

export function generateExplanation(rec: Recommendation, herdName: string): string {
  const lines: string[] = []

  lines.push('RECOMENDAÇÃO PARA ' + herdName.toUpperCase())
  lines.push('')
  lines.push('Produto recomendado: ' + rec.product.name)
  lines.push('Linha: ' + rec.product.line)
  lines.push('Consumo estimado: ' + rec.consumption_kg_day.toFixed(1) + ' kg/cab/dia')
  lines.push('Consumo mensal do lote: ' + (rec.consumption_kg_day * 30).toFixed(0) + ' kg/cab/mes')
  lines.push('')

  if (rec.deficits.length > 0) {
    lines.push('Déficits identificados na forrageira:')
    rec.deficits.forEach(d => lines.push('  - ' + d))
    lines.push('')
  }

  if (rec.reasons.length > 0) {
    lines.push('Por que este produto:')
    rec.reasons.forEach(r => lines.push('  - ' + r))
  }

  return lines.join('\n')
}

