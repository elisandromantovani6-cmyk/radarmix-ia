/**
 * Módulo de Previsão de Estresse Térmico para Bovinos
 *
 * Combina dados climáticos (ITU) com tolerância racial para:
 * - Prever risco de estresse térmico nos próximos 5 dias
 * - Calcular impacto no GMD (ganho médio diário)
 * - Gerar sugestões de manejo (sombra, dieta, água)
 * - Emitir alertas antecipados
 *
 * Referências: Thom (1959), Hahn (1999), BR-CORTE 4ª ed. (2023)
 */

// Tolerância ao calor por grupo genético (mesmo do genetic-score.ts)
const HEAT_TOLERANCE: Record<string, number> = {
  zebuino: 1.0,
  cruzamento: 0.92,
  taurino: 0.82,
  senepol: 0.97,
  leite: 0.88,
  default: 1.0,
}

// Impacto no consumo de matéria seca (CMS) por nível de ITU
// Referência: NRC (2016), adaptado para condições tropicais
const CMS_REDUCTION: Record<string, number> = {
  normal: 0,       // sem redução
  alert: 0.05,     // -5% CMS
  danger: 0.12,    // -12% CMS
  emergency: 0.25, // -25% CMS
}

// Impacto no GMD (kg/dia) por nível de ITU
// Valores médios para zebuínos; ajustados pela heat_tolerance
const GMD_IMPACT: Record<string, number> = {
  normal: 0,
  alert: -0.08,
  danger: -0.15,
  emergency: -0.30,
}

export interface StressRisk {
  level: 'normal' | 'alert' | 'danger' | 'emergency'
  label: string
  itu_adjusted: number
  gmd_impact_kg: number
  cms_reduction_percent: number
}

export interface StressForecastDay {
  date: string
  day_label: string
  temp: number
  humidity: number
  itu_raw: number
  itu_adjusted: number
  stress_risk: StressRisk
  management_actions: string[]
}

export interface ThermalStressPrediction {
  breed_group: string
  heat_tolerance: number
  current_stress: StressRisk
  forecast: StressForecastDay[]
  advance_alerts: string[]
  stress_days_count: number
  projected_gmd_loss_30d: number
  management_summary: string[]
}

function calculateITU(temp: number, humidity: number): number {
  return 0.8 * temp + (humidity / 100) * (temp - 14.4) + 46.4
}

/**
 * Ajusta o ITU pela tolerância racial.
 * Raças menos tolerantes (taurino: 0.82) sentem o calor mais intensamente,
 * então o ITU efetivo é maior para elas.
 * Fórmula: ITU_ajustado = ITU_base + (1 - heat_tolerance) * 20
 * Ex: Taurino com ITU 75 → 75 + (1-0.82)*20 = 75 + 3.6 = 78.6
 */
function adjustITUByBreed(itu: number, heatTolerance: number): number {
  const adjustment = (1 - heatTolerance) * 20
  return itu + adjustment
}

function getStressLevel(ituAdjusted: number): 'normal' | 'alert' | 'danger' | 'emergency' {
  if (ituAdjusted < 72) return 'normal'
  if (ituAdjusted < 79) return 'alert'
  if (ituAdjusted < 89) return 'danger'
  return 'emergency'
}

const LEVEL_LABELS: Record<string, string> = {
  normal: 'Conforto térmico',
  alert: 'Alerta',
  danger: 'Perigo',
  emergency: 'Emergência',
}

function calculateStressRisk(ituRaw: number, heatTolerance: number): StressRisk {
  const ituAdjusted = adjustITUByBreed(ituRaw, heatTolerance)
  const level = getStressLevel(ituAdjusted)

  // Ajustar impacto no GMD pela tolerância racial
  // Raças menos tolerantes sofrem mais
  const toleranceFactor = 1 / heatTolerance
  const gmdImpact = GMD_IMPACT[level] * toleranceFactor

  return {
    level,
    label: LEVEL_LABELS[level],
    itu_adjusted: Math.round(ituAdjusted * 10) / 10,
    gmd_impact_kg: Math.round(gmdImpact * 100) / 100,
    cms_reduction_percent: Math.round(CMS_REDUCTION[level] * 100 * toleranceFactor),
  }
}

/**
 * Gera ações de manejo recomendadas para cada nível de estresse.
 */
function getManagementActions(level: string): string[] {
  switch (level) {
    case 'alert':
      return [
        'Garantir acesso a sombra natural ou artificial',
        'Aumentar pontos de água — mínimo 50L/cabeça/dia',
        'Evitar manejo entre 11h e 15h',
      ]
    case 'danger':
      return [
        'Fornecer sombra obrigatória — mínimo 4m²/animal',
        'Água à vontade — considerar bebedouros extras',
        'Suspender manejo, vacinação e pesagem até ITU baixar',
        'Aumentar densidade energética da dieta em 10-15%',
        'Fornecer sal mineral com cromo e selênio (antioxidantes)',
      ]
    case 'emergency':
      return [
        'URGENTE: Sombra e ventilação imediata',
        'Molhar os animais com aspersão de água',
        'Água gelada disponível — repor constantemente',
        'Proibido qualquer tipo de manejo',
        'Monitorar frequência respiratória (>80/min = perigo)',
        'Dieta noturna — fornecer volumoso após 18h',
      ]
    default:
      return []
  }
}

/**
 * Função principal: gera previsão de estresse térmico.
 */
export function predictThermalStress(
  currentTemp: number,
  currentHumidity: number,
  forecast: Array<{ date: string; day_label: string; temp: number; humidity: number }>,
  breedGroup: string,
): ThermalStressPrediction {
  const heatTolerance = HEAT_TOLERANCE[breedGroup] ?? HEAT_TOLERANCE.default

  // Estresse atual
  const currentITU = calculateITU(currentTemp, currentHumidity)
  const currentStress = calculateStressRisk(currentITU, heatTolerance)

  // Previsão para os próximos dias
  const stressForecast: StressForecastDay[] = forecast.map(day => {
    const ituRaw = calculateITU(day.temp, day.humidity)
    const risk = calculateStressRisk(ituRaw, heatTolerance)
    return {
      date: day.date,
      day_label: day.day_label,
      temp: day.temp,
      humidity: day.humidity,
      itu_raw: Math.round(ituRaw),
      itu_adjusted: risk.itu_adjusted,
      stress_risk: risk,
      management_actions: getManagementActions(risk.level),
    }
  })

  // Alertas antecipados
  const advanceAlerts: string[] = []
  stressForecast.forEach((day, index) => {
    if (day.stress_risk.level === 'danger' || day.stress_risk.level === 'emergency') {
      const daysAhead = index + 1
      if (daysAhead <= 3) {
        advanceAlerts.push(
          `Estresse térmico ${day.stress_risk.label.toLowerCase()} previsto em ${daysAhead} dia${daysAhead > 1 ? 's' : ''} (${day.day_label}) — ITU ajustado ${day.itu_adjusted}. Prepare sombra e água.`
        )
      }
    }
  })

  // Contar dias de estresse
  const stressDaysCount = stressForecast.filter(d =>
    d.stress_risk.level !== 'normal'
  ).length

  // Projetar perda de GMD nos próximos 30 dias (estimativa)
  // Usa média ponderada: dias previstos com estresse + dias estimados restantes
  const forecastAvgGmdLoss = stressForecast.length > 0
    ? stressForecast.reduce((sum, d) => sum + Math.abs(d.stress_risk.gmd_impact_kg), 0) / stressForecast.length
    : 0
  const projectedGmdLoss30d = Math.round(forecastAvgGmdLoss * 30 * 100) / 100

  // Resumo de manejo
  const managementSummary: string[] = []
  const worstLevel = getWorstLevel(currentStress.level, stressForecast)

  if (worstLevel === 'emergency') {
    managementSummary.push('Situação crítica prevista. Ative protocolo de emergência térmica.')
    managementSummary.push('Perda estimada de GMD: ' + projectedGmdLoss30d.toFixed(1) + ' kg/mês se não agir.')
  } else if (worstLevel === 'danger') {
    managementSummary.push('Estresse moderado a severo previsto. Aumente sombra e água.')
    managementSummary.push('Considere ajustar dieta para maior densidade energética.')
    managementSummary.push('Perda estimada de GMD: ' + projectedGmdLoss30d.toFixed(1) + ' kg/mês sem intervenção.')
  } else if (worstLevel === 'alert') {
    managementSummary.push('Estresse leve previsto. Monitore comportamento dos animais.')
    managementSummary.push('Garanta sombra disponível e água fresca.')
  } else {
    managementSummary.push('Condições térmicas favoráveis. Animais em conforto.')
  }

  return {
    breed_group: breedGroup,
    heat_tolerance: heatTolerance,
    current_stress: currentStress,
    forecast: stressForecast,
    advance_alerts: advanceAlerts,
    stress_days_count: stressDaysCount,
    projected_gmd_loss_30d: projectedGmdLoss30d,
    management_summary: managementSummary,
  }
}

function getWorstLevel(
  current: string,
  forecast: StressForecastDay[],
): string {
  const levels = ['normal', 'alert', 'danger', 'emergency']
  let worstIndex = levels.indexOf(current)
  for (const day of forecast) {
    const idx = levels.indexOf(day.stress_risk.level)
    if (idx > worstIndex) worstIndex = idx
  }
  return levels[worstIndex]
}
