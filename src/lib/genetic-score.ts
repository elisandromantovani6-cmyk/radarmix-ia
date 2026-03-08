// ============================================================================
// Sistema de Score Genético com Auto-Learning
// ============================================================================
// Camada 1: Score DECLARADO (informado no cadastro)
// Camada 2: Score APRENDIDO (calculado das pesagens reais / GMD real)
// Camada 3: Score FINAL = peso_declarado x declarado + peso_aprendido x aprendido
//
// A confiança sobe conforme mais pesagens acontecem:
// 0 pesagens: 100% declarado, 0% aprendido -> Confiança 30%
// 1 pesagem:  70% declarado, 30% aprendido -> Confiança 42%
// 3 pesagens: 40% declarado, 60% aprendido -> Confiança 66%
// 5+ pesagens: 20% declarado, 80% aprendido -> Confiança 90%
// ============================================================================

// GMD de referência por raça e fase (dados Embrapa/ABCZ) - kg/dia
const BREED_GMD_REFERENCE: Record<string, Record<string, number>> = {
  // Zebuínos
  'nelore': { cria: 0.35, recria: 0.55, engorda: 0.75 },
  'tabapua': { cria: 0.33, recria: 0.50, engorda: 0.70 },
  'guzera': { cria: 0.32, recria: 0.48, engorda: 0.68 },
  'brahman': { cria: 0.36, recria: 0.55, engorda: 0.78 },
  // Taurinos
  'angus': { cria: 0.42, recria: 0.70, engorda: 1.10 },
  'hereford': { cria: 0.40, recria: 0.65, engorda: 1.00 },
  'charolais': { cria: 0.43, recria: 0.72, engorda: 1.15 },
  'limousin': { cria: 0.40, recria: 0.68, engorda: 1.05 },
  'senepol': { cria: 0.38, recria: 0.60, engorda: 0.85 },
  'simental': { cria: 0.42, recria: 0.70, engorda: 1.10 },
  // Cruzamentos
  'f1_angus_nelore': { cria: 0.40, recria: 0.65, engorda: 1.00 },
  'f1_senepol_nelore': { cria: 0.38, recria: 0.60, engorda: 0.88 },
  'brangus': { cria: 0.40, recria: 0.65, engorda: 0.95 },
  'braford': { cria: 0.38, recria: 0.62, engorda: 0.90 },
  'montana': { cria: 0.39, recria: 0.63, engorda: 0.92 },
  // Leite
  'girolando': { cria: 0.30, recria: 0.45, engorda: 0.60 },
  'jersey': { cria: 0.28, recria: 0.40, engorda: 0.55 },
  'holandesa': { cria: 0.32, recria: 0.48, engorda: 0.65 },
  // Fallback
  'default': { cria: 0.35, recria: 0.50, engorda: 0.70 },
}

// Rendimento de carcaça por grupo genético
const CARCASS_YIELD: Record<string, number> = {
  'zebuino': 0.52,
  'taurino': 0.56,
  'cruzamento': 0.54,
  'leite': 0.48,
  'default': 0.52,
}

// Tolerância ao calor (impacto no ITU)
const HEAT_TOLERANCE: Record<string, number> = {
  'zebuino': 1.0,      // base, adaptado
  'cruzamento': 0.92,  // leve redução com calor
  'taurino': 0.82,     // sofre mais com calor
  'senepol': 0.97,     // taurino adaptado ao calor
  'leite': 0.88,
  'default': 1.0,
}

// Score base por raça (0-100) para cálculo do score declarado
const BREED_BASE_SCORE: Record<string, number> = {
  // Zebuínos
  'nelore': 50, 'tabapua': 45, 'guzera': 43, 'brahman': 55,
  // Taurinos
  'angus': 80, 'hereford': 75, 'charolais': 82, 'limousin': 78,
  'senepol': 68, 'simental': 80,
  // Cruzamentos
  'f1_angus_nelore': 70, 'f1_senepol_nelore': 65, 'brangus': 72,
  'braford': 68, 'montana': 67,
  // Leite
  'girolando': 38, 'jersey': 35, 'holandesa': 40,
}

// Pesos por número de pesagens: { declared, learned }
const WEIGHT_BY_WEIGHINGS: Record<number, { declared: number; learned: number }> = {
  0: { declared: 1.0, learned: 0.0 },
  1: { declared: 0.7, learned: 0.3 },
  2: { declared: 0.55, learned: 0.45 },
  3: { declared: 0.4, learned: 0.6 },
  4: { declared: 0.3, learned: 0.7 },
}
// 5+ usa { declared: 0.2, learned: 0.8 }

export interface GeneticInput {
  breed_name: string | null        // nome da raça (do banco)
  genetic_pattern: string | null   // 'puro' | 'cruzamento' | 'anelorado' | null
  bull_quality: string | null      // 'ceip' | 'provado' | 'comum' | null
  phase: string                    // 'cria' | 'recria' | 'engorda'
}

export interface WeighingHistory {
  gmd_real: number   // GMD calculado da pesagem
  date: string
}

export interface GeneticScore {
  declared_score: number        // 0-100 baseado no que declarou
  learned_score: number | null  // 0-100 baseado nas pesagens (null se sem pesagem)
  final_score: number           // 0-100 combinado
  confidence: number            // 0-100 confiança no score
  weighing_count: number
  gmd_reference: number         // GMD esperado para a raça/fase
  gmd_adjusted: number          // GMD ajustado pelo score genético
  carcass_yield: number         // rendimento de carcaça ajustado
  heat_tolerance: number        // fator de tolerância ao calor
  genetic_group: string         // 'zebuino' | 'taurino' | 'cruzamento' | 'leite'
}

/**
 * Normaliza o nome da raça para lookup nas tabelas de referência.
 * Ex: "Nelore" -> "nelore", "F1 Angus x Nelore" -> "f1_angus_nelore"
 */
function normalizeBreedName(name: string | null): string {
  if (!name) return 'default'
  const normalized = name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // remove acentos
    .replace(/\s*x\s*/g, '_')   // "angus x nelore" -> "angus_nelore"
    .replace(/\s+/g, '_')       // espaços -> underscores
    .replace(/[^a-z0-9_]/g, '') // remove caracteres especiais
  // Tenta match direto primeiro
  if (BREED_GMD_REFERENCE[normalized]) return normalized
  // Tenta match parcial (ex: "nelore mocho" -> "nelore")
  for (const key of Object.keys(BREED_GMD_REFERENCE)) {
    if (normalized.includes(key) || key.includes(normalized)) return key
  }
  return 'default'
}

/**
 * Função 1: Calcular score declarado (0-100)
 * Baseado na raça, padrão genético e qualidade do touro.
 */
export function calculateDeclaredScore(input: GeneticInput): number {
  const breedKey = normalizeBreedName(input.breed_name)

  // Base da raça
  let score = BREED_BASE_SCORE[breedKey] ?? 50

  // Ajuste por padrão genético
  if (input.genetic_pattern === 'puro') {
    score += 0
  } else if (input.genetic_pattern === 'cruzamento') {
    score += 10
  } else if (input.genetic_pattern === 'anelorado') {
    score -= 5
  }

  // Ajuste por qualidade do touro
  if (input.bull_quality === 'ceip') {
    score += 15
  } else if (input.bull_quality === 'provado') {
    score += 10
  }
  // 'comum' e null = +0

  // Clamp 0-100
  return Math.max(0, Math.min(100, score))
}

/**
 * Função 2: Calcular score aprendido (das pesagens)
 * Compara o GMD real com o GMD de referência da raça.
 */
export function calculateLearnedScore(
  weighings: WeighingHistory[],
  referenceGmd: number
): number | null {
  if (weighings.length === 0) return null
  if (referenceGmd <= 0) return null

  // Média dos GMD reais
  const avgGmd = weighings.reduce((sum, w) => sum + w.gmd_real, 0) / weighings.length

  // Ratio = gmdReal / referenceGmd
  // Score = clamp(ratio * 50, 0, 100)
  // ratio 1.0 = score 50, ratio 1.5 = score 75, ratio 2.0 = 100
  const ratio = avgGmd / referenceGmd
  const score = ratio * 50

  return Math.max(0, Math.min(100, score))
}

/**
 * Função 3: Calcular score final combinado
 * Combina score declarado e aprendido com pesos baseados no número de pesagens.
 */
export function calculateGeneticScore(
  input: GeneticInput,
  weighings: WeighingHistory[]
): GeneticScore {
  const breedKey = normalizeBreedName(input.breed_name)
  const geneticGroup = getGeneticGroup(input.breed_name)
  const gmdReference = getReferenceGmd(input.breed_name, input.phase)

  // Scores individuais
  const declaredScore = calculateDeclaredScore(input)
  const learnedScore = calculateLearnedScore(weighings, gmdReference)

  // Pesos por número de pesagens
  const count = weighings.length
  const weights = WEIGHT_BY_WEIGHINGS[count] ?? { declared: 0.2, learned: 0.8 }

  // Score final
  let finalScore: number
  if (learnedScore === null) {
    finalScore = declaredScore
  } else {
    finalScore = weights.declared * declaredScore + weights.learned * learnedScore
  }
  finalScore = Math.max(0, Math.min(100, finalScore))

  // Confiança: 30 + min(60, weighings.length * 12)
  const confidence = Math.min(90, 30 + Math.min(60, count * 12))

  // GMD ajustado: gmd_reference * (final_score / 50)
  // score 50 = referência, 75 = 1.5x, 100 = 2x
  const gmdAdjusted = gmdReference * (finalScore / 50)

  // Carcass yield baseado no grupo genético
  const carcassYield = CARCASS_YIELD[geneticGroup] ?? CARCASS_YIELD['default']

  // Heat tolerance - senepol tem tratamento especial
  let heatTolerance: number
  if (breedKey === 'senepol') {
    heatTolerance = HEAT_TOLERANCE['senepol']
  } else {
    heatTolerance = HEAT_TOLERANCE[geneticGroup] ?? HEAT_TOLERANCE['default']
  }

  return {
    declared_score: Math.round(declaredScore * 100) / 100,
    learned_score: learnedScore !== null ? Math.round(learnedScore * 100) / 100 : null,
    final_score: Math.round(finalScore * 100) / 100,
    confidence,
    weighing_count: count,
    gmd_reference: gmdReference,
    gmd_adjusted: Math.round(gmdAdjusted * 1000) / 1000,
    carcass_yield: carcassYield,
    heat_tolerance: heatTolerance,
    genetic_group: geneticGroup,
  }
}

/**
 * Função 4: Determinar grupo genético
 */
export function getGeneticGroup(breed_name: string | null): string {
  const breedKey = normalizeBreedName(breed_name)

  const zebuinos = ['nelore', 'tabapua', 'guzera', 'brahman']
  const taurinos = ['angus', 'hereford', 'charolais', 'limousin', 'senepol', 'simental']
  const cruzamentos = ['f1_angus_nelore', 'f1_senepol_nelore', 'brangus', 'braford', 'montana']
  const leite = ['girolando', 'jersey', 'holandesa']

  if (zebuinos.includes(breedKey)) return 'zebuino'
  if (taurinos.includes(breedKey)) return 'taurino'
  if (cruzamentos.includes(breedKey)) return 'cruzamento'
  if (leite.includes(breedKey)) return 'leite'

  // Fallback: se tem "f1" no nome, é cruzamento
  if (breedKey.startsWith('f1')) return 'cruzamento'

  // Padrão MT: zebuíno
  return 'zebuino'
}

/**
 * Função 5: Obter GMD de referência para raça/fase
 */
export function getReferenceGmd(breed_name: string | null, phase: string): number {
  const breedKey = normalizeBreedName(breed_name)
  const breedData = BREED_GMD_REFERENCE[breedKey] || BREED_GMD_REFERENCE['default']
  return breedData[phase] ?? BREED_GMD_REFERENCE['default'][phase] ?? 0.50
}
