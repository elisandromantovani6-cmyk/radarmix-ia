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

  // 4. Mapear espécie para filtro de produto
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

  // 5. Buscar produtos compatíveis
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('species', productSpecies)
    .order('priority_score', { ascending: false })

  if (!products || products.length === 0) return null

  // 6. Pontuar cada produto
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
        reasons.push('Ideal para ' + seasonLabel + ' - suplementacao proteica')
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

    // Ajuste por raça (taurinos precisam mais suplementação)
    if (breedFactor) {
      if (breedFactor.cms_multiplier > 1.1) {
        score += 5
        reasons.push('Raca ' + (breedInfo?.name || '') + ' com maior exigencia nutricional')
      }
    }

    // Ajuste por condição de pasto
    if (herd.pasture_condition === 'degradado') {
      if (product.line === 'Proteico' || product.line === 'Prot.Energ') {
        score += 10
        reasons.push('Compensa deficit de pasto degradado')
      }
    }

    // Confinamento
    if (herd.main_phase === 'engorda' && product.line === 'RK') {
      score += 15
      reasons.push('Linha RK ideal para engorda intensiva')
    }
    if (herd.main_phase === 'engorda' && product.name && product.name.toLowerCase().includes('confinamento')) {
      score += 20
      reasons.push('Especifico para confinamento - referencia: GMD 1,79 kg/dia em Nelore (caso real MT)')
    }

    // Calcular consumo estimado (g/cab/dia)
    const consumption = estimateConsumption(product, herd, breedFactor)

    return {
      product,
      score,
      reasons,
      deficits: forageDeficits,
      consumption_kg_day: consumption / 1000,
      monthly_cost_estimate: null,
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

  if (pb !== null && pb < 7) deficits.push('Proteina bruta baixa (' + pb + '% PB)')
  if (ndt !== null && ndt < 50) deficits.push('Energia baixa (' + ndt + '% NDT)')
  if (p !== null && p < 1.5) deficits.push('Fosforo deficiente')
  if (na_val !== null && na_val < 0.5) deficits.push('Sodio deficiente')
  if (ca !== null && ca < 2.0) deficits.push('Calcio baixo')
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
    if (deficit.includes('Fosforo') && product.p_g_kg && product.p_g_kg > 40) {
      score += 8
      reasons.push('Corrige deficit de fosforo (' + product.p_g_kg + 'g/kg P)')
    }
    if (deficit.includes('Sodio') && product.na_g_kg && product.na_g_kg > 50) {
      score += 5
      reasons.push('Fornece sodio adequado')
    }
    if (deficit.includes('Calcio') && product.ca_g_kg && product.ca_g_kg > 80) {
      score += 5
      reasons.push('Corrige deficit de calcio')
    }
    if (deficit.includes('Proteina') && product.pb_percent && product.pb_percent > 20) {
      score += 12
      reasons.push('Compensa baixa proteina da forragem')
    }
    if (deficit.includes('Energia') && product.ndt_percent && product.ndt_percent > 50) {
      score += 10
      reasons.push('Complementa energia deficiente')
    }
    if (deficit.includes('Zinco') && product.zn_mg_kg && product.zn_mg_kg > 2000) {
      score += 5
      reasons.push('Fornece zinco para imunidade e reproducao')
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

export function estimateConsumption(product: any, herd: HerdData, breedFactor: any): number {
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

  // Ajuste por raça
  if (breedFactor && breedFactor.cms_multiplier) {
    base = Math.round(base * breedFactor.cms_multiplier)
  }

  // Ajuste por peso (animais maiores consomem mais)
  if (herd.avg_weight_kg && herd.avg_weight_kg > 400) {
    base = Math.round(base * 1.1)
  }

  return base
}

export function generateExplanation(rec: Recommendation, herdName: string): string {
  const lines: string[] = []

  lines.push('RECOMENDACAO PARA ' + herdName.toUpperCase())
  lines.push('')
  lines.push('Produto recomendado: ' + rec.product.name)
  lines.push('Linha: ' + rec.product.line)
  lines.push('Consumo estimado: ' + rec.consumption_kg_day.toFixed(1) + ' kg/cab/dia')
  lines.push('Consumo mensal do lote: ' + (rec.consumption_kg_day * 30).toFixed(0) + ' kg/cab/mes')
  lines.push('')

  if (rec.deficits.length > 0) {
    lines.push('Deficits identificados na forrageira:')
    rec.deficits.forEach(d => lines.push('  - ' + d))
    lines.push('')
  }

  if (rec.reasons.length > 0) {
    lines.push('Por que este produto:')
    rec.reasons.forEach(r => lines.push('  - ' + r))
  }

  return lines.join('\n')
}

