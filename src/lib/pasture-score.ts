/**
 * Score de Pastagem por Satélite + Foto
 *
 * Combina NDVI (simulado por região/mês), época do ano, chuva recente
 * e tipo de forragem para estimar:
 * - Disponibilidade de matéria seca (kg MS/ha)
 * - PB estimada da forragem (%)
 * - Capacidade de suporte (UA/ha)
 * - Score geral da pastagem (0-100)
 *
 * Como não temos acesso direto ao Sentinel-2, usamos tabelas de NDVI
 * simulado baseadas em padrões sazonais de precipitação do MT.
 *
 * Referências: Embrapa Gado de Corte, INPE (NDVI), Dias-Filho (2014)
 */

// ─── Faixas de NDVI para pastagens tropicais ─────────────────────────
// 0.1-0.2: Solo exposto / pasto degradado
// 0.2-0.4: Pasto seco / início de rebrota
// 0.4-0.6: Pasto em crescimento / razoável
// 0.6-0.8: Pasto verde / boa condição
// 0.8-1.0: Vegetação densa (raro em pasto)

// ─── NDVI simulado por mês e região (padrões de chuva do MT) ────────
// Índice do array: 0=Jan, 1=Fev, ..., 11=Dez
const NDVI_BY_MONTH_REGION: Record<string, number[]> = {
  //          Jan   Fev   Mar   Abr   Mai   Jun   Jul   Ago   Set   Out   Nov   Dez
  'oeste':  [0.68, 0.72, 0.70, 0.62, 0.48, 0.35, 0.28, 0.22, 0.25, 0.38, 0.52, 0.62],
  'norte':  [0.72, 0.74, 0.71, 0.60, 0.45, 0.32, 0.25, 0.20, 0.23, 0.35, 0.50, 0.65],
  'centro': [0.65, 0.68, 0.66, 0.58, 0.44, 0.33, 0.26, 0.21, 0.24, 0.36, 0.48, 0.60],
  'sul':    [0.62, 0.65, 0.63, 0.55, 0.42, 0.30, 0.24, 0.19, 0.22, 0.34, 0.46, 0.58],
}

// ─── Mapeamento de cidades para regiões do MT ────────────────────────
const CITY_REGIONS: Record<string, string> = {
  'tangara da serra': 'oeste',
  'campo novo do parecis': 'oeste',
  'diamantino': 'oeste',
  'arenapolis': 'oeste',
  'nova olimpia': 'oeste',
  'sinop': 'norte',
  'sorriso': 'norte',
  'lucas do rio verde': 'norte',
  'nova mutum': 'norte',
  'alta floresta': 'norte',
  'canarana': 'norte',
  'cuiaba': 'centro',
  'rondonopolis': 'sul',
  'barra do garcas': 'sul',
  'primavera do leste': 'sul',
}

// ─── Fator de correção por tipo de forragem ──────────────────────────
// Diferentes capins têm produtividade diferente com mesmo NDVI
const FORAGE_FACTOR: Record<string, number> = {
  'brachiaria_brizantha': 1.0,    // Marandu — referência base
  'brachiaria_decumbens': 0.85,   // Decumbens — menor produção
  'brachiaria_humidicola': 0.80,  // Humidícola — menor porte
  'mombaça': 1.35,                // Panicum maximum — alta produção
  'tanzania': 1.25,               // Panicum maximum cv. Tanzânia
  'tifton': 1.10,                 // Cynodon — boa qualidade
  'capim_elefante': 1.45,         // Pennisetum — muito produtivo
  'brachiaria_ruziziensis': 0.90, // Ruziziensis
  'massai': 1.15,                 // Panicum maximum cv. Massai
  'piatã': 1.05,                  // Brachiaria brizantha cv. Piatã
}

// ─── Constantes zootécnicas ──────────────────────────────────────────
// 1 UA = 450 kg de peso vivo
const UA_PESO_KG = 450
// Consumo de MS = 2.5% do peso vivo (média para bovinos de corte)
const CONSUMO_MS_PERCENT_PV = 0.025
// Consumo diário de 1 UA em kg de MS
const CONSUMO_MS_UA_DIA = UA_PESO_KG * CONSUMO_MS_PERCENT_PV // 11.25 kg

// ─── Funções auxiliares ──────────────────────────────────────────────

/**
 * Detecta a época do ano com base no mês
 * Mesma lógica do climate/route.ts
 */
function getSeason(month: number): string {
  if (month >= 5 && month <= 9) return 'seca'
  return 'aguas'
}

/**
 * Converte NDVI em produção de matéria seca (kg MS/ha/dia)
 * Baseado em curvas da Embrapa para pastagens tropicais
 *
 * NDVI < 0.2 → produção quase zero (pasto degradado)
 * NDVI 0.2-0.4 → 5-20 kg MS/ha/dia (pasto seco)
 * NDVI 0.4-0.6 → 20-50 kg MS/ha/dia (crescimento)
 * NDVI 0.6-0.8 → 50-80 kg MS/ha/dia (pasto bom)
 */
function ndviToMsProduction(ndvi: number): number {
  if (ndvi <= 0.1) return 0
  if (ndvi <= 0.2) return ndvi * 30       // 0-6 kg MS/ha/dia
  if (ndvi <= 0.4) return 6 + (ndvi - 0.2) * 70    // 6-20 kg
  if (ndvi <= 0.6) return 20 + (ndvi - 0.4) * 150   // 20-50 kg
  if (ndvi <= 0.8) return 50 + (ndvi - 0.6) * 150   // 50-80 kg
  return 80 + (ndvi - 0.8) * 50                      // 80+ kg
}

/**
 * Estima qualidade da forragem com base no NDVI e na época
 * PB (proteína bruta), NDT (nutrientes digestíveis totais),
 * FDN (fibra em detergente neutro)
 */
function estimateForageQuality(
  ndvi: number,
  season: string
): { pb_percent: number; ndt_percent: number; fdn_percent: number } {
  // PB: capim verde (águas) tem mais PB que capim seco
  // NDVI alto → mais folha → mais PB
  let pb = 4 + ndvi * 10 // base: 4-14%
  if (season === 'aguas') pb += 2 // águas adiciona PB
  if (season === 'seca') pb -= 1.5 // seca reduz PB

  // NDT: correlaciona com NDVI e época
  let ndt = 40 + ndvi * 25 // base: 40-65%
  if (season === 'seca') ndt -= 5

  // FDN: inversamente proporcional à qualidade
  // Capim seco → FDN mais alto (mais fibra, menos digestível)
  let fdn = 75 - ndvi * 20 // base: 55-75%
  if (season === 'seca') fdn += 5

  // Garante limites fisiológicos
  pb = Math.max(2, Math.min(18, pb))
  ndt = Math.max(35, Math.min(70, ndt))
  fdn = Math.max(45, Math.min(82, fdn))

  return {
    pb_percent: Math.round(pb * 10) / 10,
    ndt_percent: Math.round(ndt * 10) / 10,
    fdn_percent: Math.round(fdn * 10) / 10,
  }
}

/**
 * Classifica o NDVI em labels legíveis
 */
function getNdviLabel(ndvi: number): string {
  if (ndvi < 0.2) return 'Degradado'
  if (ndvi < 0.4) return 'Seco'
  if (ndvi < 0.6) return 'Razoável'
  if (ndvi < 0.8) return 'Bom'
  return 'Excelente'
}

/**
 * Classifica a qualidade da forragem
 */
function getQualityLabel(pb: number): string {
  if (pb >= 10) return 'Alta'
  if (pb >= 7) return 'Média'
  return 'Baixa'
}

/**
 * Classifica o score geral em labels
 */
function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excelente'
  if (score >= 60) return 'Bom'
  if (score >= 40) return 'Regular'
  if (score >= 20) return 'Ruim'
  return 'Crítico'
}

// ─── Interfaces ──────────────────────────────────────────────────────

export interface PastureInput {
  lat: number
  lon: number
  city: string
  forage_type: string | null // 'brachiaria_brizantha', 'mombaça', etc
  area_ha: number
  head_count: number
  rain_last_30d_mm: number | null // dado do climate_cache
  month: number // 1-12
}

export interface PastureScore {
  // NDVI
  ndvi: number
  ndvi_label: string // 'Degradado', 'Seco', 'Razoável', 'Bom', 'Excelente'

  // Produção de matéria seca
  ms_kg_ha_day: number        // kg MS por hectare por dia
  ms_total_kg_day: number     // total da fazenda por dia
  ms_kg_animal_day: number    // por animal por dia

  // Qualidade estimada da forragem
  quality: {
    pb_percent: number
    ndt_percent: number
    fdn_percent: number
    label: string // 'Alta', 'Média', 'Baixa'
  }

  // Capacidade de suporte
  carrying_capacity: {
    ua_per_ha: number           // UA/ha que a pastagem suporta
    current_stocking: number    // UA/ha atual (baseado no head_count)
    status: 'sublotado' | 'adequado' | 'superlotado'
    max_heads: number           // máximo de cabeças para a área
  }

  // Score geral (0-100)
  overall_score: number
  score_label: string

  // Sugestões práticas
  suggestions: string[]

  // Projeção para o próximo mês
  next_month: {
    ndvi_projected: number
    trend: 'melhorando' | 'estavel' | 'piorando'
    action: string
  }
}

// ─── Função principal ────────────────────────────────────────────────

/**
 * Calcula o score completo da pastagem
 *
 * Combina NDVI simulado, qualidade da forragem, capacidade de suporte
 * e gera sugestões práticas de manejo.
 */
export function calculatePastureScore(input: PastureInput): PastureScore {
  const { city, forage_type, area_ha, head_count, rain_last_30d_mm, month } = input

  // ─── 1. Determinar região e NDVI base ──────────────────────────
  const normalizedCity = city
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  const region = CITY_REGIONS[normalizedCity] || 'centro'
  const ndviTable = NDVI_BY_MONTH_REGION[region] || NDVI_BY_MONTH_REGION['centro']

  // Mês é 1-based, array é 0-based
  let ndvi = ndviTable[month - 1] ?? 0.40

  // ─── 2. Ajustar NDVI pela chuva dos últimos 30 dias ───────────
  // Mais chuva → mais rebrota → NDVI mais alto
  if (rain_last_30d_mm !== null && rain_last_30d_mm !== undefined) {
    if (rain_last_30d_mm > 200) {
      ndvi = Math.min(ndvi + 0.08, 0.95) // muita chuva → boost
    } else if (rain_last_30d_mm > 100) {
      ndvi = Math.min(ndvi + 0.04, 0.90)
    } else if (rain_last_30d_mm < 20) {
      ndvi = Math.max(ndvi - 0.06, 0.10) // seca → penaliza
    } else if (rain_last_30d_mm < 50) {
      ndvi = Math.max(ndvi - 0.03, 0.10)
    }
  }

  // Garante limites
  ndvi = Math.max(0.05, Math.min(0.95, ndvi))
  ndvi = Math.round(ndvi * 100) / 100

  // ─── 3. Calcular produção de MS ────────────────────────────────
  const season = getSeason(month)
  let msKgHaDay = ndviToMsProduction(ndvi)

  // Aplica fator de correção da forragem
  const forageFactor = (forage_type && FORAGE_FACTOR[forage_type]) || 1.0
  msKgHaDay *= forageFactor

  msKgHaDay = Math.round(msKgHaDay * 10) / 10

  const msTotalKgDay = Math.round(msKgHaDay * area_ha * 10) / 10
  const msKgAnimalDay = head_count > 0
    ? Math.round((msTotalKgDay / head_count) * 10) / 10
    : 0

  // ─── 4. Qualidade da forragem ──────────────────────────────────
  const qualityData = estimateForageQuality(ndvi, season)
  const qualityLabel = getQualityLabel(qualityData.pb_percent)

  // ─── 5. Capacidade de suporte ──────────────────────────────────
  // UA/ha = (MS produzida por ha por dia) / (consumo diário de 1 UA)
  const uaPerHa = msKgHaDay > 0
    ? Math.round((msKgHaDay / CONSUMO_MS_UA_DIA) * 100) / 100
    : 0

  // Lotação atual: assume peso médio de 450 kg (1 UA por cabeça como simplificação)
  const currentStocking = area_ha > 0
    ? Math.round((head_count / area_ha) * 100) / 100
    : 0

  // Status da lotação
  let stockingStatus: 'sublotado' | 'adequado' | 'superlotado'
  if (currentStocking > uaPerHa * 1.15) {
    stockingStatus = 'superlotado'
  } else if (currentStocking < uaPerHa * 0.70) {
    stockingStatus = 'sublotado'
  } else {
    stockingStatus = 'adequado'
  }

  // Máximo de cabeças para a área (1 cabeça = 1 UA simplificado)
  const maxHeads = Math.floor(uaPerHa * area_ha)

  // ─── 6. Score geral (0-100) ────────────────────────────────────
  // NDVI contribui 40%, qualidade 30%, capacidade de suporte 30%

  // Score NDVI: 0-100 baseado no NDVI
  const ndviScore = Math.min(100, (ndvi / 0.8) * 100)

  // Score qualidade: PB como indicador principal
  const qualityScore = Math.min(100, (qualityData.pb_percent / 14) * 100)

  // Score lotação: melhor quando adequado, penaliza superlotação
  let stockingScore = 100
  if (stockingStatus === 'superlotado') {
    const overStocking = currentStocking / (uaPerHa || 1)
    stockingScore = Math.max(0, 100 - (overStocking - 1) * 200)
  } else if (stockingStatus === 'sublotado') {
    // Sublotação é melhor que superlotação mas não ideal
    stockingScore = 70
  }

  const overallScore = Math.round(
    ndviScore * 0.40 + qualityScore * 0.30 + stockingScore * 0.30
  )
  const finalScore = Math.max(0, Math.min(100, overallScore))
  const scoreLabel = getScoreLabel(finalScore)

  // ─── 7. Sugestões práticas ─────────────────────────────────────
  const suggestions: string[] = []

  if (stockingStatus === 'superlotado') {
    suggestions.push(
      `Pastagem superlotada (${currentStocking} UA/ha vs ${uaPerHa} UA/ha suportado). ` +
      `Considere reduzir ${head_count - maxHeads} cabeças ou suplementar com volumoso.`
    )
  }

  if (stockingStatus === 'sublotado') {
    suggestions.push(
      `Pastagem sublotada. Há espaço para até ${maxHeads - head_count} cabeças adicionais.`
    )
  }

  if (ndvi < 0.3) {
    suggestions.push(
      'NDVI muito baixo indica pasto degradado ou seco. ' +
      'Considere suplementação volumosa (silagem, feno) e vedação de piquetes.'
    )
  }

  if (qualityData.pb_percent < 7) {
    suggestions.push(
      `PB estimada em ${qualityData.pb_percent}% — abaixo do mínimo para manutenção (7%). ` +
      'Suplementação proteica (mínimo 40% PB) é essencial para manter a microbiota ruminal.'
    )
  }

  if (season === 'seca' && ndvi < 0.4) {
    suggestions.push(
      'Período seco com pasto deteriorado. Priorize: ' +
      '1) sal proteinado, 2) vedação de piquetes, 3) feno/silagem se disponível.'
    )
  }

  if (season === 'aguas' && ndvi > 0.6) {
    suggestions.push(
      'Pasto em boa condição nas águas. Aproveite para fazer rotação de piquetes ' +
      'e diferir áreas para reserva na seca.'
    )
  }

  if (msKgAnimalDay < CONSUMO_MS_UA_DIA && head_count > 0) {
    suggestions.push(
      `Disponibilidade de MS por animal (${msKgAnimalDay} kg/dia) está abaixo do consumo ideal ` +
      `(${CONSUMO_MS_UA_DIA} kg/dia). Suplementação volumosa recomendada.`
    )
  }

  // Garante pelo menos uma sugestão
  if (suggestions.length === 0) {
    suggestions.push(
      'Pastagem em boas condições. Mantenha o manejo rotacionado e monitore mensalmente.'
    )
  }

  // ─── 8. Projeção para o próximo mês ────────────────────────────
  const nextMonthIndex = month % 12 // 0-based para próximo mês
  const nextNdvi = ndviTable[nextMonthIndex] ?? ndvi
  const ndviProjected = Math.round(nextNdvi * 100) / 100

  let trend: 'melhorando' | 'estavel' | 'piorando'
  const diff = ndviProjected - ndvi
  if (diff > 0.05) {
    trend = 'melhorando'
  } else if (diff < -0.05) {
    trend = 'piorando'
  } else {
    trend = 'estavel'
  }

  let action: string
  if (trend === 'piorando') {
    action = 'Pastagem vai piorar. Planeje suplementação e vedação de piquetes com antecedência.'
  } else if (trend === 'melhorando') {
    action = 'Tendência de melhora. Rebrota esperada — prepare piquetes para rotação.'
  } else {
    action = 'Pastagem estável. Mantenha o manejo atual e monitore a lotação.'
  }

  // ─── Retorno final ─────────────────────────────────────────────
  return {
    ndvi,
    ndvi_label: getNdviLabel(ndvi),

    ms_kg_ha_day: msKgHaDay,
    ms_total_kg_day: msTotalKgDay,
    ms_kg_animal_day: msKgAnimalDay,

    quality: {
      pb_percent: qualityData.pb_percent,
      ndt_percent: qualityData.ndt_percent,
      fdn_percent: qualityData.fdn_percent,
      label: qualityLabel,
    },

    carrying_capacity: {
      ua_per_ha: uaPerHa,
      current_stocking: currentStocking,
      status: stockingStatus,
      max_heads: maxHeads,
    },

    overall_score: finalScore,
    score_label: scoreLabel,

    suggestions,

    next_month: {
      ndvi_projected: ndviProjected,
      trend,
      action,
    },
  }
}
