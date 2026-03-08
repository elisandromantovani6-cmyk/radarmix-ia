/**
 * Copiloto da Fazenda - Briefing Diario com Acoes Prioritarias
 *
 * Cruza dados de todos os modulos (clima, nutricao, sanitario, financeiro)
 * para gerar um resumo diario com 3-5 acoes prioritarias para o produtor.
 *
 * Prioridades:
 *   1 = urgente (vermelho) - acoes que precisam de atencao imediata
 *   2 = importante (amarelo) - acoes que devem ser planejadas em breve
 *   3 = rotina (azul) - melhorias e boas praticas
 */

// Interface de uma acao recomendada pelo copiloto
export interface CopilotAction {
  priority: 1 | 2 | 3
  icon: string
  category: 'clima' | 'nutricao' | 'sanitario' | 'financeiro' | 'manejo'
  title: string
  description: string
  herd_name?: string
}

// Interface do briefing diario completo
export interface DailyBriefing {
  greeting: string
  date: string
  actions: CopilotAction[]
  weather_summary: string
  financial_summary: string
  tip_of_day: string
}

// Dados de entrada de cada lote
export interface HerdInput {
  name: string
  phase: string
  head_count: number
  avg_weight_kg: number | null
  current_product: string | null
  days_since_weighing: number | null
  days_since_vaccination: number | null
  profile_completeness: number
}

// Dados climaticos de entrada
export interface ClimateInput {
  temp: number
  humidity: number
  itu: number
  itu_level: string
  season: string
  rain_forecast: boolean
  stress_days: number
}

// Dados financeiros de entrada
export interface FinancialInput {
  best_roi: number
  worst_cost_category: string | null
  waste_detected: boolean
}

// Entrada completa para gerar o briefing
export interface BriefingInput {
  farmer_name: string
  herds: HerdInput[]
  climate: ClimateInput | null
  financial: FinancialInput | null
}

// 15+ dicas praticas de manejo que rotacionam por dia do ano
const TIPS_OF_DAY: string[] = [
  'Garanta pelo menos 50 litros de agua limpa por cabeca/dia. No calor, pode chegar a 80L.',
  'Pese o gado a cada 28-35 dias para acompanhar o GMD real e ajustar a dieta a tempo.',
  'Suplemento mineral deve ser oferecido a vontade. Se acabar rapido, aumente os cochos.',
  'Observe o comportamento no cocho: se sobra mais de 10%, reduza a quantidade fornecida.',
  'Rotacione os piquetes a cada 3-7 dias para melhor aproveitamento da forragem.',
  'Faca vermifugacao estrategica na entrada da seca e na entrada das aguas.',
  'Mantenha o calendario sanitario em dia: aftosa, clostridioses e raiva sao obrigatorias.',
  'No periodo seco, suplementacao proteica (minimo 40% PB) e essencial para manter o GMD.',
  'Avalie a condicao corporal (ECC) dos animais mensalmente. Meta: escore 3 a 3,5.',
  'Forneca sombra: minimo 4m2/animal. Arvores ou sombrite reduzem estresse termico.',
  'Analise bromatologica do pasto custa R$150 e pode economizar milhares em suplementacao.',
  'Negocie compras de insumos em grupo com vizinhos para conseguir melhores precos.',
  'Manejo sanitario preventivo custa 60% menos que tratamento curativo.',
  'Planeje as pesagens para dias frescos e secos. Estresse do manejo afeta o peso.',
  'Acompanhe o preco da arroba semanalmente para decidir o melhor momento de venda.',
  'Divisao de piquetes melhora o aproveitamento da pastagem em ate 30%.',
  'Registre todas as movimentacoes e eventos sanitarios para ter historico confiavel.',
  'Bezerros desmamados precisam de atencao especial nos primeiros 30 dias.',
  'Confira se o sal mineral esta sendo consumido na quantidade recomendada pelo fabricante.',
  'Agua de qualidade importa: analise a agua dos bebedouros pelo menos 1x por ano.',
]

/**
 * Gera saudacao baseada na hora do dia (usa horario de Brasilia como referencia)
 */
function getGreeting(farmerName: string): string {
  const hour = new Date().getHours()
  let period = 'Bom dia'
  if (hour >= 12 && hour < 18) period = 'Boa tarde'
  else if (hour >= 18) period = 'Boa noite'

  return `${period}, ${farmerName}! Aqui esta seu dia.`
}

/**
 * Formata a data atual em portugues
 */
function formatDate(): string {
  const now = new Date()
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }
  return now.toLocaleDateString('pt-BR', options)
}

/**
 * Gera acoes relacionadas ao clima
 */
function generateClimateActions(climate: ClimateInput): CopilotAction[] {
  const actions: CopilotAction[] = []

  // ITU alto = nao fazer manejo
  if (climate.itu >= 79) {
    actions.push({
      priority: 1,
      icon: '🌡️',
      category: 'clima',
      title: `Nao faca manejo hoje, ITU ${climate.itu}`,
      description: `Estresse termico em nivel ${climate.itu_level}. Evite pesagem, vacinacao e movimentacao. Garanta sombra e agua a vontade.`,
    })
  } else if (climate.itu >= 72) {
    actions.push({
      priority: 2,
      icon: '🌡️',
      category: 'clima',
      title: `ITU ${climate.itu} - cuidado com manejo`,
      description: `Nivel de alerta. Prefira manejo no inicio da manha (antes das 9h) ou final da tarde (apos 16h).`,
    })
  }

  // Previsao de chuva = adiar pesagem
  if (climate.rain_forecast) {
    actions.push({
      priority: 2,
      icon: '🌧️',
      category: 'clima',
      title: 'Chuva prevista, adie pesagem',
      description: 'Dias chuvosos dificultam o manejo e causam estresse nos animais. Planeje pesagens para dias secos.',
    })
  }

  // Muitos dias de estresse consecutivos
  if (climate.stress_days >= 3) {
    actions.push({
      priority: 1,
      icon: '🔥',
      category: 'clima',
      title: `${climate.stress_days} dias de estresse termico previstos`,
      description: 'Sequencia prolongada de calor. Aumente pontos de agua, garanta sombra e considere ajustar a dieta para maior densidade energetica.',
    })
  }

  return actions
}

/**
 * Gera acoes de dicas sazonais
 */
function generateSeasonActions(season: string): CopilotAction[] {
  const actions: CopilotAction[] = []

  if (season === 'seca') {
    actions.push({
      priority: 2,
      icon: '☀️',
      category: 'nutricao',
      title: 'Periodo seco: reforce a suplementacao',
      description: 'Forragem perde qualidade na seca. Suplementacao proteica (min. 40% PB) mantem a microbiota ruminal ativa.',
    })
  }

  if (season === 'aguas') {
    actions.push({
      priority: 3,
      icon: '🌿',
      category: 'nutricao',
      title: 'Periodo das aguas: aproveite o capim verde',
      description: 'Forragem de boa qualidade disponivel. Foco em mineral e microelementos para maximizar o aproveitamento.',
    })
  }

  return actions
}

/**
 * Gera acoes baseadas nos dados de cada lote
 */
function generateHerdActions(herds: HerdInput[]): CopilotAction[] {
  const actions: CopilotAction[] = []

  for (const herd of herds) {
    // Lote sem suplemento definido
    if (!herd.current_product) {
      actions.push({
        priority: 1,
        icon: '🥣',
        category: 'nutricao',
        title: `Lote ${herd.name} sem suplemento definido`,
        description: `${herd.head_count} cabecas sem recomendacao de produto. Gere uma recomendacao para otimizar o desempenho.`,
        herd_name: herd.name,
      })
    }

    // Vacinacao atrasada (180+ dias)
    if (herd.days_since_vaccination !== null && herd.days_since_vaccination > 180) {
      actions.push({
        priority: 1,
        icon: '💉',
        category: 'sanitario',
        title: `Vacinar lote ${herd.name} (${herd.days_since_vaccination} dias)`,
        description: `Mais de 180 dias sem vacinacao. Verifique o calendario sanitario e programe a vacinacao urgente.`,
        herd_name: herd.name,
      })
    }
    // Vacinacao proxima de vencer (120-180 dias)
    else if (herd.days_since_vaccination !== null && herd.days_since_vaccination > 120) {
      actions.push({
        priority: 2,
        icon: '💉',
        category: 'sanitario',
        title: `Programar vacinacao lote ${herd.name} em 60 dias`,
        description: `${herd.days_since_vaccination} dias desde a ultima vacinacao. Planeje a proxima dose.`,
        herd_name: herd.name,
      })
    }

    // Pesagem atrasada (35+ dias)
    if (herd.days_since_weighing !== null && herd.days_since_weighing > 35) {
      actions.push({
        priority: 2,
        icon: '⚖️',
        category: 'manejo',
        title: `Pesar lote ${herd.name} (${herd.days_since_weighing} dias sem pesagem)`,
        description: `Pesagem regular (28-35 dias) permite acompanhar o GMD real e ajustar a dieta.`,
        herd_name: herd.name,
      })
    }

    // Perfil incompleto
    if (herd.profile_completeness < 80) {
      actions.push({
        priority: 3,
        icon: '📋',
        category: 'manejo',
        title: `Complete perfil do lote ${herd.name} para melhor IA`,
        description: `Perfil em ${herd.profile_completeness}%. Mais dados = recomendacoes mais precisas.`,
        herd_name: herd.name,
      })
    }
  }

  return actions
}

/**
 * Gera acoes baseadas nos dados financeiros
 */
function generateFinancialActions(financial: FinancialInput): CopilotAction[] {
  const actions: CopilotAction[] = []

  if (financial.waste_detected) {
    actions.push({
      priority: 1,
      icon: '💸',
      category: 'financeiro',
      title: 'Desperdicio detectado, revise custos',
      description: 'A IA identificou custos acima da media regional. Revise o modulo de desperdicio para detalhes e sugestoes.',
    })
  }

  if (financial.worst_cost_category) {
    const categoryLabels: Record<string, string> = {
      suplemento: 'suplemento',
      pasto: 'pastagem',
      mao_obra: 'mao de obra',
      sanidade: 'sanidade',
      outros: 'outros custos',
    }
    const label = categoryLabels[financial.worst_cost_category] || financial.worst_cost_category
    actions.push({
      priority: 2,
      icon: '📊',
      category: 'financeiro',
      title: `Custo de ${label} acima da media`,
      description: `Seu maior desvio de custo esta em ${label}. Compare com benchmarks regionais no simulador.`,
    })
  }

  return actions
}

/**
 * Gera resumo do clima em uma linha
 */
function generateWeatherSummary(climate: ClimateInput | null): string {
  if (!climate) return 'Dados climaticos indisponiveis. Configure a localizacao da fazenda.'

  const ituLabels: Record<string, string> = {
    normal: 'conforto',
    alert: 'alerta',
    danger: 'perigo',
    emergency: 'emergencia',
  }
  const ituLabel = ituLabels[climate.itu_level] || climate.itu_level

  let summary = `${climate.temp}°C, ${climate.humidity}% umidade, ITU ${climate.itu} (${ituLabel})`
  if (climate.rain_forecast) summary += ' — chuva prevista'
  return summary
}

/**
 * Gera resumo financeiro em uma linha
 */
function generateFinancialSummary(financial: FinancialInput | null): string {
  if (!financial) return 'Sem dados financeiros. Faca uma simulacao para ver a saude do seu lote.'

  let summary = `Melhor ROI: ${financial.best_roi.toFixed(1)}%`
  if (financial.waste_detected) summary += ' — desperdicio detectado'
  return summary
}

/**
 * Seleciona a dica do dia baseada no dia do ano (rotaciona)
 */
export function getTipOfDay(date?: Date): string {
  const d = date || new Date()
  const startOfYear = new Date(d.getFullYear(), 0, 0)
  const diff = d.getTime() - startOfYear.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
  const index = dayOfYear % TIPS_OF_DAY.length
  return TIPS_OF_DAY[index]
}

/**
 * Funcao principal: gera o briefing diario do copiloto.
 *
 * Cruza dados de clima, lotes, financeiro e sazonalidade
 * para produzir uma lista de 3-5 acoes prioritarias.
 */
export function generateDailyBriefing(input: BriefingInput): DailyBriefing {
  const allActions: CopilotAction[] = []

  // Acoes climaticas
  if (input.climate) {
    allActions.push(...generateClimateActions(input.climate))
    allActions.push(...generateSeasonActions(input.climate.season))
  }

  // Acoes por lote (nutricao, sanitario, manejo)
  allActions.push(...generateHerdActions(input.herds))

  // Acoes financeiras
  if (input.financial) {
    allActions.push(...generateFinancialActions(input.financial))
  }

  // Ordenar por prioridade (1=urgente primeiro, depois 2, depois 3)
  allActions.sort((a, b) => a.priority - b.priority)

  // Limitar a 5 acoes (pegar as mais urgentes)
  const topActions = allActions.slice(0, 5)

  return {
    greeting: getGreeting(input.farmer_name),
    date: formatDate(),
    actions: topActions,
    weather_summary: generateWeatherSummary(input.climate),
    financial_summary: generateFinancialSummary(input.financial),
    tip_of_day: getTipOfDay(),
  }
}
