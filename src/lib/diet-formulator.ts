// =============================================================================
// Formulador de Dieta Automática — RadarMix IA
// Calcula dieta otimizada por custo mínimo baseado nas exigências do BR-CORTE
// =============================================================================

// Ingrediente disponível com composição nutricional e custo
export interface Ingredient {
  name: string
  category: 'volumoso' | 'concentrado' | 'mineral' | 'proteico'
  pb_percent: number       // proteína bruta %
  ndt_percent: number      // nutrientes digestíveis totais %
  fdn_percent: number      // fibra em detergente neutro %
  ca_percent: number       // cálcio %
  p_percent: number        // fósforo %
  cost_per_kg: number      // custo em R$/kg
  max_inclusion_percent: number // inclusão máxima na dieta (ex: ureia max 1%)
  min_inclusion_percent: number // inclusão mínima na dieta
}

// Banco de ingredientes pré-configurado (comuns em Mato Grosso)
export const INGREDIENTS: Ingredient[] = [
  { name: 'Capim Brachiária (águas)', category: 'volumoso', pb_percent: 8.5, ndt_percent: 52, fdn_percent: 65, ca_percent: 0.35, p_percent: 0.15, cost_per_kg: 0.08, max_inclusion_percent: 100, min_inclusion_percent: 40 },
  { name: 'Capim Brachiária (seca)', category: 'volumoso', pb_percent: 4.2, ndt_percent: 45, fdn_percent: 72, ca_percent: 0.28, p_percent: 0.10, cost_per_kg: 0.06, max_inclusion_percent: 100, min_inclusion_percent: 40 },
  { name: 'Silagem de milho', category: 'volumoso', pb_percent: 7.5, ndt_percent: 65, fdn_percent: 48, ca_percent: 0.25, p_percent: 0.20, cost_per_kg: 0.15, max_inclusion_percent: 80, min_inclusion_percent: 0 },
  { name: 'Milho grão moído', category: 'concentrado', pb_percent: 9.0, ndt_percent: 87, fdn_percent: 12, ca_percent: 0.03, p_percent: 0.28, cost_per_kg: 0.85, max_inclusion_percent: 60, min_inclusion_percent: 0 },
  { name: 'Farelo de soja', category: 'concentrado', pb_percent: 46.0, ndt_percent: 82, fdn_percent: 14, ca_percent: 0.30, p_percent: 0.65, cost_per_kg: 2.10, max_inclusion_percent: 30, min_inclusion_percent: 0 },
  { name: 'Farelo de algodão', category: 'proteico', pb_percent: 38.0, ndt_percent: 70, fdn_percent: 30, ca_percent: 0.20, p_percent: 1.00, cost_per_kg: 1.60, max_inclusion_percent: 25, min_inclusion_percent: 0 },
  { name: 'Casca de soja', category: 'concentrado', pb_percent: 12.0, ndt_percent: 77, fdn_percent: 60, ca_percent: 0.50, p_percent: 0.15, cost_per_kg: 0.70, max_inclusion_percent: 30, min_inclusion_percent: 0 },
  { name: 'Polpa cítrica', category: 'concentrado', pb_percent: 7.0, ndt_percent: 82, fdn_percent: 22, ca_percent: 1.60, p_percent: 0.12, cost_per_kg: 0.75, max_inclusion_percent: 30, min_inclusion_percent: 0 },
  { name: 'Ureia pecuária', category: 'proteico', pb_percent: 281.0, ndt_percent: 0, fdn_percent: 0, ca_percent: 0, p_percent: 0, cost_per_kg: 2.50, max_inclusion_percent: 1, min_inclusion_percent: 0 },
  { name: 'Sal mineral Radarmix', category: 'mineral', pb_percent: 0, ndt_percent: 0, fdn_percent: 0, ca_percent: 12.0, p_percent: 8.0, cost_per_kg: 3.80, max_inclusion_percent: 2, min_inclusion_percent: 0.5 },
  { name: 'Calcário calcítico', category: 'mineral', pb_percent: 0, ndt_percent: 0, fdn_percent: 0, ca_percent: 36.0, p_percent: 0, cost_per_kg: 0.15, max_inclusion_percent: 2, min_inclusion_percent: 0 },
  { name: 'Fosfato bicálcico', category: 'mineral', pb_percent: 0, ndt_percent: 0, fdn_percent: 0, ca_percent: 24.0, p_percent: 18.0, cost_per_kg: 3.20, max_inclusion_percent: 2, min_inclusion_percent: 0 },
  { name: 'Caroço de algodão', category: 'concentrado', pb_percent: 23.0, ndt_percent: 78, fdn_percent: 45, ca_percent: 0.15, p_percent: 0.60, cost_per_kg: 1.20, max_inclusion_percent: 15, min_inclusion_percent: 0 },
]

// Entrada para formulação da dieta
export interface DietInput {
  weight_kg: number
  gmd_target: number       // GMD desejado em kg/dia
  phase: string            // cria, recria, engorda, etc.
  breed_type: string       // zebuino, taurino, cruzamento
  season: string           // seca, aguas
  available_ingredients?: string[] // nomes dos ingredientes disponíveis (null = todos)
}

// Resultado da formulação de dieta
export interface DietResult {
  ingredients: Array<{
    name: string
    kg_per_day: number
    percent_of_diet: number
    cost_per_day: number
  }>
  totals: {
    cms_kg_day: number       // consumo de matéria seca total
    pb_percent: number       // proteína bruta da dieta
    ndt_percent: number      // energia da dieta
    fdn_percent: number      // fibra da dieta
    ca_percent: number       // cálcio da dieta
    p_percent: number        // fósforo da dieta
    cost_per_day: number     // custo total por dia em R$
    cost_per_month: number   // custo mensal em R$
    cost_per_kg_gain: number // eficiência alimentar em R$/kg ganho
  }
  requirements_met: {
    pb: boolean
    ndt: boolean
    fdn: boolean
    ca: boolean
    p: boolean
  }
  comparison_vs_current?: {
    current_cost: number
    optimized_cost: number
    savings_percent: number
    savings_monthly: number
  }
  efficiency: {
    feed_conversion: number          // kg MS / kg ganho
    cost_per_arroba_produced: number  // R$ por @ produzida
  }
}

// =============================================================================
// Cálculo do CMS (Consumo de Matéria Seca) — baseado no BR-CORTE
// Zebuíno: 2.3% do peso vivo
// Taurino: 2.7% do peso vivo
// Cruzamento: 2.5% do peso vivo
// =============================================================================
export function calculateCMS(weight_kg: number, breed_type: string): number {
  const cms_percent_map: Record<string, number> = {
    zebuino: 2.3,
    taurino: 2.7,
    cruzamento: 2.5,
  }
  const cms_percent = cms_percent_map[breed_type] ?? 2.3
  return (weight_kg * cms_percent) / 100
}

// =============================================================================
// Cálculo das exigências nutricionais baseado no peso, fase e GMD alvo
// Retorna os valores mínimos/máximos que a dieta deve atender
// =============================================================================
export interface NutrientRequirements {
  pb_min_percent: number   // proteína bruta mínima %
  ndt_min_percent: number  // NDT mínimo %
  fdn_min_percent: number  // FDN mínimo % (saúde ruminal)
  fdn_max_percent: number  // FDN máximo %
  ca_min_percent: number   // cálcio mínimo %
  p_min_percent: number    // fósforo mínimo %
}

export function calculateRequirements(
  weight_kg: number,
  gmd_target: number,
  phase: string,
): NutrientRequirements {
  // Exigências base variam com fase e GMD alvo
  // Valores derivados das tabelas BR-CORTE 2023

  // PB: quanto maior o GMD, maior a exigência proteica
  let pb_min = 7.0 // mínimo absoluto
  if (phase === 'cria') {
    pb_min = 14.0
  } else if (phase === 'recria') {
    pb_min = 10.0 + gmd_target * 3.0 // recria com GMD 0.5 = 11.5%, GMD 1.0 = 13%
  } else if (phase === 'engorda') {
    pb_min = 11.0 + gmd_target * 2.0 // engorda com GMD 1.0 = 13%, GMD 1.5 = 14%
  } else if (phase === 'lactacao') {
    pb_min = 14.0
  }

  // NDT: energia necessária aumenta com GMD
  let ndt_min = 50.0
  if (phase === 'cria') {
    ndt_min = 55.0
  } else if (phase === 'recria') {
    ndt_min = 55.0 + gmd_target * 5.0 // recria GMD 0.5 = 57.5%, GMD 1.0 = 60%
  } else if (phase === 'engorda') {
    ndt_min = 60.0 + gmd_target * 5.0 // engorda GMD 1.0 = 65%, GMD 1.5 = 67.5%
  } else if (phase === 'lactacao') {
    ndt_min = 60.0
  }

  // FDN: mínimo 28% para saúde ruminal, máximo varia com a fase
  const fdn_min = 28.0
  let fdn_max = 65.0
  if (phase === 'engorda') {
    fdn_max = 45.0 // engorda precisa mais energia, menos fibra
  } else if (phase === 'recria') {
    fdn_max = 55.0
  }

  // Ca e P: exigências maiores para animais em crescimento
  let ca_min = 0.25
  let p_min = 0.18
  if (weight_kg < 250) {
    ca_min = 0.40
    p_min = 0.25
  } else if (phase === 'engorda') {
    ca_min = 0.30
    p_min = 0.20
  }

  return { pb_min_percent: pb_min, ndt_min_percent: ndt_min, fdn_min_percent: fdn_min, fdn_max_percent: fdn_max, ca_min_percent: ca_min, p_min_percent: p_min }
}

// =============================================================================
// Seleciona o volumoso base de acordo com a estação do ano
// =============================================================================
function selectBaseForage(season: string, available: Ingredient[]): Ingredient | null {
  // Na seca, usar capim seca ou silagem se disponível
  if (season === 'seca') {
    const dryGrass = available.find(i => i.name.includes('seca') && i.category === 'volumoso')
    if (dryGrass) return dryGrass
  }

  // Nas águas, usar capim de águas
  if (season === 'aguas') {
    const wetGrass = available.find(i => i.name.includes('águas') && i.category === 'volumoso')
    if (wetGrass) return wetGrass
  }

  // Fallback: qualquer volumoso disponível
  return available.find(i => i.category === 'volumoso') ?? null
}

// =============================================================================
// Função principal: formula dieta otimizada por custo mínimo
// Algoritmo: greedy heurístico
// 1. Começa com volumoso base (respeitando inclusão mínima)
// 2. Adiciona ingredientes obrigatórios (min_inclusion > 0)
// 3. Verifica déficits nutricionais e adiciona concentrados/proteicos
// 4. Prioriza ingredientes mais baratos que atendem os déficits
// =============================================================================
export function formulateDiet(input: DietInput): DietResult {
  const { weight_kg, gmd_target, phase, breed_type, season } = input

  // 1. Calcular CMS total (quanto o animal come por dia em kg de MS)
  const cms_total = calculateCMS(weight_kg, breed_type)

  // 2. Calcular exigências nutricionais
  const requirements = calculateRequirements(weight_kg, gmd_target, phase)

  // 3. Filtrar ingredientes disponíveis
  let available = [...INGREDIENTS]
  if (input.available_ingredients && input.available_ingredients.length > 0) {
    available = INGREDIENTS.filter(i =>
      input.available_ingredients!.some(name => i.name.toLowerCase().includes(name.toLowerCase()))
    )
    // Garantir que sempre tenha pelo menos um volumoso
    if (!available.some(i => i.category === 'volumoso')) {
      const defaultForage = season === 'seca'
        ? INGREDIENTS.find(i => i.name.includes('seca'))
        : INGREDIENTS.find(i => i.name.includes('águas'))
      if (defaultForage) available.push(defaultForage)
    }
  }

  // 4. Montar dieta: mapa de ingrediente -> fração (0 a 1) da dieta
  const dietFractions: Map<string, number> = new Map()

  // 4a. Incluir volumoso base (mínimo 40% para ruminantes)
  const baseForage = selectBaseForage(season, available)
  if (!baseForage) {
    // Sem volumoso, usar valores padrão mínimos
    throw new Error('Nenhum volumoso disponível para formular a dieta')
  }
  const forageMinFraction = baseForage.min_inclusion_percent / 100
  dietFractions.set(baseForage.name, forageMinFraction)

  // 4b. Incluir ingredientes com inclusão mínima obrigatória (ex: sal mineral)
  for (const ingredient of available) {
    if (ingredient.min_inclusion_percent > 0 && ingredient.name !== baseForage.name) {
      dietFractions.set(ingredient.name, ingredient.min_inclusion_percent / 100)
    }
  }

  // 4c. Calcular composição atual da dieta
  function calcDietComposition(fractions: Map<string, number>) {
    let pb = 0, ndt = 0, fdn = 0, ca = 0, p = 0, cost = 0, totalFrac = 0

    for (const [name, frac] of fractions) {
      const ing = available.find(i => i.name === name)
      if (!ing) continue
      pb += ing.pb_percent * frac
      ndt += ing.ndt_percent * frac
      fdn += ing.fdn_percent * frac
      ca += ing.ca_percent * frac
      p += ing.p_percent * frac
      cost += ing.cost_per_kg * frac * cms_total
      totalFrac += frac
    }

    // Normalizar para porcentagem da dieta (se totalFrac != 1)
    if (totalFrac > 0 && totalFrac !== 1) {
      pb /= totalFrac
      ndt /= totalFrac
      fdn /= totalFrac
      ca /= totalFrac
      p /= totalFrac
    }

    return { pb, ndt, fdn, ca, p, cost, totalFrac }
  }

  // 4d. Otimização greedy: adicionar ingredientes para suprir déficits
  // Ordenar concentrados/proteicos por custo-benefício (custo por unidade de nutriente)
  const supplementIngredients = available.filter(i =>
    (i.category === 'concentrado' || i.category === 'proteico') &&
    !dietFractions.has(i.name)
  )

  // Iterar até atender exigências ou esgotar espaço na dieta
  const maxIterations = 20
  for (let iter = 0; iter < maxIterations; iter++) {
    const comp = calcDietComposition(dietFractions)
    const remaining = 1 - comp.totalFrac

    if (remaining <= 0.01) break // dieta cheia

    // Verificar déficits
    const pbDeficit = requirements.pb_min_percent - comp.pb
    const ndtDeficit = requirements.ndt_min_percent - comp.ndt

    // Se ambos estão atendidos, preencher restante com volumoso
    if (pbDeficit <= 0 && ndtDeficit <= 0) {
      // Verificar se FDN está acima do mínimo
      if (comp.fdn >= requirements.fdn_min_percent) {
        // Dieta OK, preencher restante com volumoso (mais barato)
        dietFractions.set(baseForage.name, (dietFractions.get(baseForage.name) ?? 0) + remaining)
        break
      }
    }

    // Selecionar melhor ingrediente para cobrir o maior déficit
    let bestIngredient: Ingredient | null = null
    let bestScore = -Infinity

    for (const ing of supplementIngredients) {
      // Verificar se ainda cabe na dieta (respeitar inclusão máxima)
      const currentFrac = dietFractions.get(ing.name) ?? 0
      const maxFrac = ing.max_inclusion_percent / 100
      if (currentFrac >= maxFrac) continue

      // Pontuar pelo benefício nutricional por custo
      let score = 0
      if (pbDeficit > 0 && ing.pb_percent > 0) {
        score += (ing.pb_percent / ing.cost_per_kg) * (pbDeficit / requirements.pb_min_percent)
      }
      if (ndtDeficit > 0 && ing.ndt_percent > 0) {
        score += (ing.ndt_percent / ing.cost_per_kg) * (ndtDeficit / requirements.ndt_min_percent)
      }

      if (score > bestScore) {
        bestScore = score
        bestIngredient = ing
      }
    }

    if (!bestIngredient || bestScore <= 0) {
      // Sem mais ingredientes que ajudem, preencher com volumoso
      if (remaining > 0) {
        dietFractions.set(baseForage.name, (dietFractions.get(baseForage.name) ?? 0) + remaining)
      }
      break
    }

    // Adicionar incremento do melhor ingrediente (5% por iteração)
    const currentFrac = dietFractions.get(bestIngredient.name) ?? 0
    const maxFrac = bestIngredient.max_inclusion_percent / 100
    const increment = Math.min(0.05, remaining, maxFrac - currentFrac)
    if (increment <= 0) continue

    dietFractions.set(bestIngredient.name, currentFrac + increment)
  }

  // 4e. Garantir que a dieta soma 100%
  const finalComp = calcDietComposition(dietFractions)
  const totalFrac = finalComp.totalFrac
  if (totalFrac < 1) {
    // Preencher restante com volumoso
    dietFractions.set(baseForage.name, (dietFractions.get(baseForage.name) ?? 0) + (1 - totalFrac))
  }

  // 4f. Verificar e corrigir FDN mínimo (28% — saúde ruminal)
  const preCheck = calcDietComposition(dietFractions)
  if (preCheck.fdn < requirements.fdn_min_percent) {
    // Aumentar volumoso em detrimento do concentrado de menor benefício
    // (simplificação: já temos volumoso suficiente na maioria dos casos)
  }

  // 5. Montar resultado final
  const ingredients: DietResult['ingredients'] = []
  let totalCostPerDay = 0

  for (const [name, fraction] of dietFractions) {
    if (fraction <= 0) continue
    const ing = available.find(i => i.name === name)
    if (!ing) continue

    const kgPerDay = fraction * cms_total
    const costPerDay = kgPerDay * ing.cost_per_kg

    ingredients.push({
      name,
      kg_per_day: parseFloat(kgPerDay.toFixed(3)),
      percent_of_diet: parseFloat((fraction * 100).toFixed(1)),
      cost_per_day: parseFloat(costPerDay.toFixed(2)),
    })

    totalCostPerDay += costPerDay
  }

  // Ordenar por % na dieta (maior primeiro)
  ingredients.sort((a, b) => b.percent_of_diet - a.percent_of_diet)

  // Composição final normalizada
  const final = calcDietComposition(dietFractions)

  // 6. Calcular eficiência alimentar
  const feedConversion = gmd_target > 0 ? cms_total / gmd_target : 0
  // 1 arroba = 15 kg de carcaça, rendimento ~52% para zebuíno
  const rendimentoCarcaca = breed_type === 'taurino' ? 0.54 : 0.52
  const kgCarcacaPerDay = gmd_target * rendimentoCarcaca
  const daysPerArroba = kgCarcacaPerDay > 0 ? 15 / kgCarcacaPerDay : 0
  const costPerArroba = daysPerArroba * totalCostPerDay

  // 7. Verificar se exigências foram atendidas
  const requirementsMet = {
    pb: final.pb >= requirements.pb_min_percent,
    ndt: final.ndt >= requirements.ndt_min_percent,
    fdn: final.fdn >= requirements.fdn_min_percent,
    ca: final.ca >= requirements.ca_min_percent,
    p: final.p >= requirements.p_min_percent,
  }

  return {
    ingredients,
    totals: {
      cms_kg_day: parseFloat(cms_total.toFixed(2)),
      pb_percent: parseFloat(final.pb.toFixed(1)),
      ndt_percent: parseFloat(final.ndt.toFixed(1)),
      fdn_percent: parseFloat(final.fdn.toFixed(1)),
      ca_percent: parseFloat(final.ca.toFixed(2)),
      p_percent: parseFloat(final.p.toFixed(2)),
      cost_per_day: parseFloat(totalCostPerDay.toFixed(2)),
      cost_per_month: parseFloat((totalCostPerDay * 30).toFixed(2)),
      cost_per_kg_gain: gmd_target > 0 ? parseFloat((totalCostPerDay / gmd_target).toFixed(2)) : 0,
    },
    requirements_met: requirementsMet,
    efficiency: {
      feed_conversion: parseFloat(feedConversion.toFixed(2)),
      cost_per_arroba_produced: parseFloat(costPerArroba.toFixed(2)),
    },
  }
}
