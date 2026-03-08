// =============================================================================
// Estimativa de Peso por Medidas Biométricas — RadarMix IA
//
// Fórmula da Cinta Torácica (Quetelet, adaptada por Embrapa):
// Peso (kg) = (PT² × CC) / 10.800
// Onde: PT = perímetro torácico (cm), CC = comprimento corporal (cm)
//
// Fórmula simplificada (só perímetro torácico):
// Peso (kg) = (PT² × PT) / 10.800 × fator_raça
//
// Escore de Condição Corporal (ECC) - escala 1-9:
// 1-3: Magro (costelas visíveis, sem cobertura)
// 4-5: Moderado (costelas palpáveis, alguma cobertura)
// 6-7: Bom (costelas cobertas, boa musculatura)
// 8-9: Gordo (depósitos de gordura, cobertura excessiva)
// =============================================================================

// Entrada para estimativa de peso
export interface WeightEstimateInput {
  // Medidas biométricas (cm)
  chest_perimeter_cm: number   // perímetro torácico
  body_length_cm?: number      // comprimento corporal (opcional)
  hip_height_cm?: number       // altura de garupa (opcional)

  // Informações do animal
  breed_type: string           // zebuino, taurino, cruzamento, leite
  sex: 'macho' | 'femea'
  age_months?: number
  phase: string                // cria, recria, engorda, terminação

  // Condição corporal visual (1-9)
  body_condition_score?: number

  // Última pesagem real para comparação
  last_real_weight_kg?: number
  last_real_weight_date?: string
}

// Resultado da estimativa de peso
export interface WeightEstimateResult {
  estimated_weight_kg: number
  confidence_percent: number   // 80-95% típico para biometria
  method: string               // método usado na estimativa

  body_condition: {
    score: number              // 1-9
    label: string              // 'Magro', 'Moderado', 'Bom', 'Gordo'
    recommendation: string
  }

  comparison?: {
    last_weight: number
    days_ago: number
    estimated_gain_kg: number
    estimated_gmd: number      // ganho médio diário (kg/dia)
  }

  carcass_estimate: {
    yield_percent: number      // rendimento de carcaça (%)
    carcass_weight_kg: number  // peso de carcaça (kg)
    arrobas: number            // arrobas (1@ = 15 kg)
    estimated_value: number    // R$ valor estimado
  }
}

// Fatores de ajuste por raça para estimativa de peso
const BREED_FACTORS: Record<string, number> = {
  zebuino: 1.0,
  taurino: 1.08,      // taurinos tendem a ser mais pesados
  cruzamento: 1.04,
  leite: 0.95,
}

// Fatores de ajuste por sexo
const SEX_FACTORS: Record<string, number> = {
  macho: 1.0,
  femea: 0.88,
}

// Preço padrão por arroba (R$/@)
const PRECO_ARROBA = 320

// Rendimento de carcaça por raça (%)
const RENDIMENTO_CARCACA: Record<string, number> = {
  zebuino: 52,
  taurino: 54,
  cruzamento: 53,
  leite: 48,
}

// Fator de ajuste do ECC sobre o rendimento de carcaça
function adjustYieldByCondition(baseYield: number, ecc: number): number {
  // ECC 5 = neutro, cada ponto acima/abaixo ajusta ~0.5%
  const adjustment = (ecc - 5) * 0.5
  return baseYield + adjustment
}

/**
 * Classifica o escore de condição corporal (1-9)
 * Retorna label descritivo e recomendação nutricional
 */
export function classifyBodyCondition(score: number): {
  label: string
  recommendation: string
} {
  if (score <= 3) {
    return {
      label: 'Magro',
      recommendation:
        'Aumentar aporte energético e proteico. Verificar parasitas e saúde. Considerar suplementação concentrada.',
    }
  }
  if (score <= 5) {
    return {
      label: 'Moderado',
      recommendation:
        'Manter dieta atual com monitoramento. Ajustar suplementação conforme fase produtiva.',
    }
  }
  if (score <= 7) {
    return {
      label: 'Bom',
      recommendation:
        'Condição corporal adequada. Manter manejo nutricional. Ideal para reprodução e engorda.',
    }
  }
  // 8-9
  return {
    label: 'Gordo',
    recommendation:
      'Reduzir aporte energético. Risco de problemas reprodutivos e metabólicos. Avaliar dieta.',
  }
}

/**
 * Estima o peso do animal usando medidas biométricas
 *
 * Métodos disponíveis:
 * 1. perimetro_comprimento — usa PT² × CC / 10800 (mais preciso)
 * 2. perimetro_torácico   — usa PT³ / 10800 (quando só tem PT)
 * 3. completo             — usa PT, CC e altura de garupa
 */
export function estimateWeight(input: WeightEstimateInput): WeightEstimateResult {
  const {
    chest_perimeter_cm,
    body_length_cm,
    hip_height_cm,
    breed_type,
    sex,
    body_condition_score,
    last_real_weight_kg,
    last_real_weight_date,
  } = input

  // Buscar fatores de ajuste
  const breedFactor = BREED_FACTORS[breed_type] ?? 1.0
  const sexFactor = SEX_FACTORS[sex] ?? 1.0

  // Calcular peso base e definir método
  let pesoBase: number
  let method: string
  let confidence: number

  if (body_length_cm && hip_height_cm) {
    // Método completo: usa todas as medidas
    // Fórmula: (PT² × CC) / 10800, ajustado pela altura de garupa
    pesoBase = (Math.pow(chest_perimeter_cm, 2) * body_length_cm) / 10800
    // Ajuste pela altura de garupa (correlação com frame size)
    const hipAdjust = hip_height_cm / 140 // 140cm = referência para frame médio
    pesoBase *= hipAdjust
    method = 'completo'
    confidence = 92
  } else if (body_length_cm) {
    // Método com perímetro + comprimento (Quetelet/Embrapa)
    pesoBase = (Math.pow(chest_perimeter_cm, 2) * body_length_cm) / 10800
    method = 'perimetro_comprimento'
    confidence = 90
  } else {
    // Método simplificado: só perímetro torácico
    // Peso = PT³ / 10800
    pesoBase = Math.pow(chest_perimeter_cm, 3) / 10800
    method = 'perimetro_torácico'
    confidence = 85
  }

  // Aplicar fatores de raça e sexo
  let pesoEstimado = pesoBase * breedFactor * sexFactor

  // Ajuste pelo escore de condição corporal (se fornecido)
  const ecc = body_condition_score ?? 5 // padrão = moderado
  // ECC afeta o peso: cada ponto acima/abaixo de 5 ajusta ~2%
  const eccAdjust = 1 + (ecc - 5) * 0.02
  pesoEstimado *= eccAdjust

  // Arredondar para 1 casa decimal
  pesoEstimado = Math.round(pesoEstimado * 10) / 10

  // Classificar condição corporal
  const bodyCondition = classifyBodyCondition(ecc)

  // Calcular comparação com última pesagem (se disponível)
  let comparison: WeightEstimateResult['comparison'] | undefined
  if (last_real_weight_kg && last_real_weight_date) {
    const lastDate = new Date(last_real_weight_date)
    const now = new Date()
    const diffMs = now.getTime() - lastDate.getTime()
    const daysAgo = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)))
    const gain = pesoEstimado - last_real_weight_kg
    comparison = {
      last_weight: last_real_weight_kg,
      days_ago: daysAgo,
      estimated_gain_kg: Math.round(gain * 10) / 10,
      estimated_gmd: Math.round((gain / daysAgo) * 1000) / 1000,
    }
  }

  // Estimar carcaça
  const baseYield = RENDIMENTO_CARCACA[breed_type] ?? 52
  const yieldPercent = adjustYieldByCondition(baseYield, ecc)
  const carcassWeight = pesoEstimado * (yieldPercent / 100)
  const arrobas = Math.round((carcassWeight / 15) * 100) / 100
  const estimatedValue = Math.round(arrobas * PRECO_ARROBA * 100) / 100

  return {
    estimated_weight_kg: pesoEstimado,
    confidence_percent: confidence,
    method,
    body_condition: {
      score: ecc,
      ...bodyCondition,
    },
    comparison,
    carcass_estimate: {
      yield_percent: yieldPercent,
      carcass_weight_kg: Math.round(carcassWeight * 10) / 10,
      arrobas,
      estimated_value: estimatedValue,
    },
  }
}
