// ============================================================================
// Sistema de Score Genético com Auto-Learning — v2
// ============================================================================
// 4 perguntas por clique (sem digitar nada):
//
// Q1: Origem genética
//     Não sei / PO / LA / Cruzamento Industrial / F1 / Meio-sangue / Composto
//
// Q2: Sobre o touro (checkboxes)
//     Sei quem é o touro / Touro é CEIP / Tem DEP
//
// Q3: Fenótipos observados
//     Porte (Pequeno-Médio-Grande)
//     Uniformidade (Baixa-Média-Alta)
//     Temperamento (Manso-Médio-Arredio)
//
// Q4: IA calcula automaticamente
//     Score 0-100, Potencial GMD, GMD referência por fase
//
// Auto-learning: pesagens reais sobrepõe o score declarado
// 0 pesagens: 100% declarado -> Confiança 30%
// 1 pesagem:  70/30         -> Confiança 42%
// 3 pesagens: 40/60         -> Confiança 66%
// 5+ pesagens: 20/80        -> Confiança 90%
// ============================================================================

// GMD de referência por raça e fase (dados Embrapa/ABCZ) - kg/dia
const BREED_GMD_REFERENCE: Record<string, Record<string, number>> = {
  // Zebuinos
  'nelore': { cria: 0.35, recria: 0.55, engorda: 0.75, confinamento: 1.20 },
  'tabapua': { cria: 0.33, recria: 0.50, engorda: 0.70, confinamento: 1.10 },
  'guzera': { cria: 0.32, recria: 0.48, engorda: 0.68, confinamento: 1.05 },
  'brahman': { cria: 0.36, recria: 0.55, engorda: 0.78, confinamento: 1.25 },
  // Taurinos
  'angus': { cria: 0.42, recria: 0.70, engorda: 1.10, confinamento: 1.60 },
  'hereford': { cria: 0.40, recria: 0.65, engorda: 1.00, confinamento: 1.50 },
  'charolais': { cria: 0.43, recria: 0.72, engorda: 1.15, confinamento: 1.65 },
  'limousin': { cria: 0.40, recria: 0.68, engorda: 1.05, confinamento: 1.55 },
  'senepol': { cria: 0.38, recria: 0.60, engorda: 0.85, confinamento: 1.35 },
  'simental': { cria: 0.42, recria: 0.70, engorda: 1.10, confinamento: 1.60 },
  // Cruzamentos
  'f1_angus_nelore': { cria: 0.40, recria: 0.65, engorda: 1.00, confinamento: 1.50 },
  'f1_senepol_nelore': { cria: 0.38, recria: 0.60, engorda: 0.88, confinamento: 1.38 },
  'brangus': { cria: 0.40, recria: 0.65, engorda: 0.95, confinamento: 1.45 },
  'braford': { cria: 0.38, recria: 0.62, engorda: 0.90, confinamento: 1.40 },
  'montana': { cria: 0.39, recria: 0.63, engorda: 0.92, confinamento: 1.42 },
  // Leite
  'girolando': { cria: 0.30, recria: 0.45, engorda: 0.60, confinamento: 0.90 },
  'jersey': { cria: 0.28, recria: 0.40, engorda: 0.55, confinamento: 0.85 },
  'holandesa': { cria: 0.32, recria: 0.48, engorda: 0.65, confinamento: 1.00 },
  // Fallback
  'default': { cria: 0.35, recria: 0.50, engorda: 0.70, confinamento: 1.10 },
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
  'zebuino': 1.0,
  'cruzamento': 0.92,
  'taurino': 0.82,
  'senepol': 0.97,
  'leite': 0.88,
  'default': 1.0,
}

// Score base por raça (0-100) para cálculo do score declarado
const BREED_BASE_SCORE: Record<string, number> = {
  'nelore': 50, 'tabapua': 45, 'guzera': 43, 'brahman': 55,
  'angus': 80, 'hereford': 75, 'charolais': 82, 'limousin': 78,
  'senepol': 68, 'simental': 80,
  'f1_angus_nelore': 70, 'f1_senepol_nelore': 65, 'brangus': 72,
  'braford': 68, 'montana': 67,
  'girolando': 38, 'jersey': 35, 'holandesa': 40,
}

// === PONTUAÇÃO POR PERGUNTA ===

// Q1: Origem genética
const ORIGIN_SCORE: Record<string, number> = {
  'po': 15,                    // PO - Puro de Origem, registro genealógico
  'la': 10,                    // LA - Livro Aberto
  'cruzamento_industrial': 12, // Heterose programada
  'f1': 10,                    // Primeiro cruzamento, max heterose
  'meio_sangue': 5,            // Meio-sangue, sem controle
  'composto': 8,               // Raça composta (Montana, Canchim)
}
// 'não_sei' / null = +0

// Q2: Touro (checkboxes, cumulativos)
const BULL_SCORE = {
  knows_bull: 5,   // Sabe quem é o touro
  bull_ceip: 15,   // Touro com CEIP
  has_dep: 10,     // Tem DEP (diferença esperada de progênie)
}

// Q3: Fenótipos observados
const SIZE_SCORE: Record<string, number> = {
  'pequeno': -5,
  'medio': 0,
  'grande': 8,
}

const UNIFORMITY_SCORE: Record<string, number> = {
  'baixa': -5,
  'media': 0,
  'alta': 10,
}

const TEMPERAMENT_SCORE: Record<string, number> = {
  'manso': 5,    // Dócil = melhor manejo = melhor GMD
  'medio': 0,
  'arredio': -8, // Stress = menor GMD
}

// Pesos por numero de pesagens: { declared, learned }
const WEIGHT_BY_WEIGHINGS: Record<number, { declared: number; learned: number }> = {
  0: { declared: 1.0, learned: 0.0 },
  1: { declared: 0.7, learned: 0.3 },
  2: { declared: 0.55, learned: 0.45 },
  3: { declared: 0.4, learned: 0.6 },
  4: { declared: 0.3, learned: 0.7 },
}
// 5+ usa { declared: 0.2, learned: 0.8 }

// === INTERFACES ===

export interface GeneticInfo {
  // Q1: Origem
  origin: string | null          // 'po' | 'la' | 'cruzamento_industrial' | 'f1' | 'meio_sangue' | 'composto' | null
  // Q2: Touro
  knows_bull: boolean
  bull_ceip: boolean
  has_dep: boolean
  // Q3: Fenótipos
  size: string | null            // 'pequeno' | 'medio' | 'grande' | null
  uniformity: string | null      // 'baixa' | 'media' | 'alta' | null
  temperament: string | null     // 'manso' | 'medio' | 'arredio' | null
}

export interface GeneticInput {
  breed_name: string | null        // nome da raça (do banco)
  genetic_info: GeneticInfo | null // dados das 4 perguntas
  phase: string                    // 'cria' | 'recria' | 'engorda'
}

export interface WeighingHistory {
  gmd_real: number   // GMD calculado da pesagem
  date: string
}

export type GmdPotential = 'baixo' | 'medio' | 'alto' | 'elite'

export interface GeneticScore {
  declared_score: number        // 0-100 baseado no que declarou
  learned_score: number | null  // 0-100 baseado nas pesagens (null se sem pesagem)
  final_score: number           // 0-100 combinado
  confidence: number            // 0-100 confiança no score
  weighing_count: number
  gmd_potential: GmdPotential   // classificação do potencial
  gmd_reference: number         // GMD esperado para a raça/fase
  gmd_by_phase: { recria: number; engorda: number; confinamento: number }
  gmd_adjusted: number          // GMD ajustado pelo score genetico
  carcass_yield: number         // rendimento de carcaça ajustado
  heat_tolerance: number        // fator de tolerância ao calor
  genetic_group: string         // 'zebuino' | 'taurino' | 'cruzamento' | 'leite'
}

// === FUNÇÕES INTERNAS ===

/**
 * Normaliza o nome da raça para lookup nas tabelas de referência.
 */
function normalizeBreedName(name: string | null): string {
  if (!name) return 'default'
  const normalized = name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s*x\s*/g, '_')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
  if (BREED_GMD_REFERENCE[normalized]) return normalized
  for (const key of Object.keys(BREED_GMD_REFERENCE)) {
    if (normalized.includes(key) || key.includes(normalized)) return key
  }
  return 'default'
}

/**
 * Classifica o potencial de GMD baseado no score final.
 */
export function classifyGmdPotential(score: number): GmdPotential {
  if (score >= 81) return 'elite'
  if (score >= 56) return 'alto'
  if (score >= 31) return 'medio'
  return 'baixo'
}

// === FUNÇÕES EXPORTADAS ===

/**
 * Função 1: Calcular score declarado (0-100)
 * Soma: base da raça + Q1 (origem) + Q2 (touro) + Q3 (fenótipos)
 */
export function calculateDeclaredScore(input: GeneticInput): number {
  const breedKey = normalizeBreedName(input.breed_name)

  // Base da raça
  let score = BREED_BASE_SCORE[breedKey] ?? 50

  if (input.genetic_info) {
    const info = input.genetic_info

    // Q1: Origem genética
    if (info.origin) {
      score += ORIGIN_SCORE[info.origin] ?? 0
    }

    // Q2: Touro (cumulativo)
    if (info.knows_bull) score += BULL_SCORE.knows_bull
    if (info.bull_ceip) score += BULL_SCORE.bull_ceip
    if (info.has_dep) score += BULL_SCORE.has_dep

    // Q3: Fenótipos
    if (info.size) score += SIZE_SCORE[info.size] ?? 0
    if (info.uniformity) score += UNIFORMITY_SCORE[info.uniformity] ?? 0
    if (info.temperament) score += TEMPERAMENT_SCORE[info.temperament] ?? 0
  }

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

  const avgGmd = weighings.reduce((sum, w) => sum + w.gmd_real, 0) / weighings.length
  // ratio 1.0 = score 50, ratio 1.5 = score 75, ratio 2.0 = 100
  const ratio = avgGmd / referenceGmd
  const score = ratio * 50

  return Math.max(0, Math.min(100, score))
}

/**
 * Função 3: Calcular score final combinado
 */
export function calculateGeneticScore(
  input: GeneticInput,
  weighings: WeighingHistory[]
): GeneticScore {
  const breedKey = normalizeBreedName(input.breed_name)
  const geneticGroup = getGeneticGroup(input.breed_name)
  const gmdReference = getReferenceGmd(input.breed_name, input.phase)

  const declaredScore = calculateDeclaredScore(input)
  const learnedScore = calculateLearnedScore(weighings, gmdReference)

  const count = weighings.length
  const weights = WEIGHT_BY_WEIGHINGS[count] ?? { declared: 0.2, learned: 0.8 }

  let finalScore: number
  if (learnedScore === null) {
    finalScore = declaredScore
  } else {
    finalScore = weights.declared * declaredScore + weights.learned * learnedScore
  }
  finalScore = Math.max(0, Math.min(100, finalScore))

  const confidence = Math.min(90, 30 + Math.min(60, count * 12))
  const gmdAdjusted = gmdReference * (finalScore / 50)
  const carcassYield = CARCASS_YIELD[geneticGroup] ?? CARCASS_YIELD['default']

  let heatTolerance: number
  if (breedKey === 'senepol') {
    heatTolerance = HEAT_TOLERANCE['senepol']
  } else {
    heatTolerance = HEAT_TOLERANCE[geneticGroup] ?? HEAT_TOLERANCE['default']
  }

  // GMD por fase (ajustado pelo score)
  const breedData = BREED_GMD_REFERENCE[breedKey] || BREED_GMD_REFERENCE['default']
  const multiplier = finalScore / 50
  const gmdByPhase = {
    recria: Math.round(breedData['recria'] * multiplier * 1000) / 1000,
    engorda: Math.round(breedData['engorda'] * multiplier * 1000) / 1000,
    confinamento: Math.round(breedData['confinamento'] * multiplier * 1000) / 1000,
  }

  return {
    declared_score: Math.round(declaredScore * 100) / 100,
    learned_score: learnedScore !== null ? Math.round(learnedScore * 100) / 100 : null,
    final_score: Math.round(finalScore * 100) / 100,
    confidence,
    weighing_count: count,
    gmd_potential: classifyGmdPotential(finalScore),
    gmd_reference: gmdReference,
    gmd_by_phase: gmdByPhase,
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
  if (!breed_name) return 'zebuino'

  // Checar F1 no nome ORIGINAL antes de normalizar
  // (evita que "F1 Limousin" normalize para "limousin" e caia em taurino)
  const lower = breed_name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (lower.startsWith('f1')) return 'cruzamento'

  const breedKey = normalizeBreedName(breed_name)

  const zebuinos = ['nelore', 'tabapua', 'guzera', 'brahman']
  const taurinos = ['angus', 'hereford', 'charolais', 'limousin', 'senepol', 'simental']
  const cruzamentos = ['f1_angus_nelore', 'f1_senepol_nelore', 'brangus', 'braford', 'montana']
  const leite = ['girolando', 'jersey', 'holandesa']

  if (zebuinos.includes(breedKey)) return 'zebuino'
  if (taurinos.includes(breedKey)) return 'taurino'
  if (cruzamentos.includes(breedKey)) return 'cruzamento'
  if (leite.includes(breedKey)) return 'leite'
  if (breedKey.startsWith('f1')) return 'cruzamento'

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

/**
 * Cria um GeneticInfo vazio (tudo null/false) para quando o produtor não responde
 */
export function emptyGeneticInfo(): GeneticInfo {
  return {
    origin: null,
    knows_bull: false,
    bull_ceip: false,
    has_dep: false,
    size: null,
    uniformity: null,
    temperament: null,
  }
}
