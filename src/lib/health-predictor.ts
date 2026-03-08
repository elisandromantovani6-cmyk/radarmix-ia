/**
 * IA Previsão de Problemas Sanitários
 *
 * Prediz risco de doenças para bovinos baseado em:
 * - Clima: temperatura, umidade, chuva, estação (seca/águas)
 * - Região: cidades endêmicas do MT para tristeza parasitária
 * - Rebanho: fase (cria mais vulnerável), lotação, espécie
 * - Histórico: última vacinação, último vermífugo, eventos sanitários
 *
 * Doenças previstas:
 * 1. Carrapato — umidade alta + calor + estação chuvosa
 * 2. Pneumonia — frio + chuva + lotação alta + animais jovens
 * 3. Tristeza Parasitária — região endêmica + estação + sem vacinação
 * 4. Verminose — estação chuvosa + lotação alta + sem vermífugo recente
 * 5. Botulismo — estação seca + sem vacinação + carcaças/ossos
 * 6. Clostridiose — estação chuvosa + animais jovens + sem vacinação
 *
 * Referências: EMBRAPA Gado de Corte, INDEA-MT, BR-CORTE 4ª ed.
 */

// Cidades endêmicas para tristeza parasitária no MT
// Regiões de transição cerrado-pantanal com alta prevalência de carrapato Boophilus
const CIDADES_ENDEMICAS_TRISTEZA = [
  'cuiaba',
  'rondonopolis',
  'barra do garcas',
  'primavera do leste',
]

// Custos preventivos por cabeça (R$) — referência IMEA-MT 2025/2026
const CUSTOS_PREVENTIVOS: Record<string, { min: number; max: number }> = {
  carrapato: { min: 3, max: 5 },         // Carrapaticida pour-on ou injetável
  pneumonia: { min: 15, max: 30 },       // Antibiótico preventivo (Draxxin, Zuprevo)
  tristeza_parasitaria: { min: 2, max: 4 }, // Vacina contra babesiose/anaplasmose
  verminose: { min: 4, max: 8 },         // Vermífugo (ivermectina, moxidectina)
  botulismo: { min: 2, max: 4 },         // Vacina contra botulismo (2 doses)
  clostridiose: { min: 2, max: 4 },      // Vacina polivalente contra clostrídios
}

// Nomes legíveis das doenças para exibição na interface
const LABELS_DOENCAS: Record<string, string> = {
  carrapato: 'Infestação por Carrapato',
  pneumonia: 'Pneumonia Bovina',
  tristeza_parasitaria: 'Tristeza Parasitária (Babesiose/Anaplasmose)',
  verminose: 'Verminose (Nematódeos Gastrointestinais)',
  botulismo: 'Botulismo',
  clostridiose: 'Clostridiose',
}

// Meses do ano em português para o calendário sanitário
const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

// Interface de risco individual por doença
export interface DiseaseRisk {
  disease: string           // identificador interno (ex: 'carrapato')
  label: string             // nome legível (ex: 'Infestação por Carrapato')
  risk_percent: number      // 0-100 — probabilidade estimada de ocorrência
  severity: 'baixo' | 'moderado' | 'alto' | 'critico'
  factors: string[]         // fatores que contribuem para o risco
  preventive_action: string // ação preventiva recomendada
  deadline_days: number     // prazo para aplicar a prevenção (dias)
  estimated_cost_per_head: number // custo estimado R$/cabeça
}

// Interface da previsão completa de saúde do rebanho
export interface HealthPrediction {
  risks: DiseaseRisk[]
  calendar: { month: string; diseases: string[] }[] // próximos 3 meses
  total_preventive_cost: number // custo total preventivo (R$) para todo o rebanho
  summary: string              // resumo textual da situação sanitária
}

// Entrada para cálculo de riscos sanitários
export interface HealthInput {
  temp: number                       // temperatura atual (°C)
  humidity: number                   // umidade relativa (%)
  rain_mm: number                    // precipitação recente (mm)
  season: string                     // 'seca' | 'aguas'
  city: string                       // cidade da fazenda
  phase: string                      // fase do lote (cria, recria, engorda)
  head_count: number                 // número de cabeças
  species: string                    // espécie (bovino, etc.)
  last_vaccination_days: number | null   // dias desde última vacinação (null = nunca)
  last_deworming_days: number | null     // dias desde último vermífugo (null = nunca)
  stocking_rate: number | null           // taxa de lotação (UA/ha, null = desconhecida)
}

/**
 * Normaliza nome de cidade para comparação.
 * Remove acentos, converte para minúsculas e substitui hífens por espaços.
 */
function normalizarCidade(city: string): string {
  return city
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/-/g, ' ')
    .trim()
}

/**
 * Verifica se a cidade está em região endêmica para tristeza parasitária.
 * Compara nome normalizado com lista de cidades endêmicas do MT.
 */
function isCidadeEndemica(city: string): boolean {
  const normalizada = normalizarCidade(city)
  return CIDADES_ENDEMICAS_TRISTEZA.some(c => normalizada.includes(c))
}

/**
 * Determina a severidade a partir do percentual de risco.
 * Faixas: 0-25 baixo, 26-50 moderado, 51-75 alto, 76-100 crítico
 */
function calcularSeveridade(riskPercent: number): 'baixo' | 'moderado' | 'alto' | 'critico' {
  if (riskPercent <= 25) return 'baixo'
  if (riskPercent <= 50) return 'moderado'
  if (riskPercent <= 75) return 'alto'
  return 'critico'
}

/**
 * Calcula prazo para ação preventiva baseado na severidade.
 * Quanto maior o risco, menor o prazo.
 */
function calcularPrazo(severity: 'baixo' | 'moderado' | 'alto' | 'critico'): number {
  switch (severity) {
    case 'critico': return 3   // urgente — agir em 3 dias
    case 'alto': return 7      // agir na próxima semana
    case 'moderado': return 15 // planejar para 15 dias
    case 'baixo': return 30    // monitorar, agir em 30 dias
  }
}

/**
 * Calcula custo médio preventivo por cabeça para uma doença.
 */
function custoMedio(disease: string): number {
  const custo = CUSTOS_PREVENTIVOS[disease]
  if (!custo) return 5
  return Math.round(((custo.min + custo.max) / 2) * 100) / 100
}

/**
 * Limita valor entre 0 e 100 para garantir percentual válido.
 */
function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

/**
 * Calcula risco de infestação por carrapato.
 *
 * Fatores principais:
 * - Umidade alta (>70%) favorece o ciclo do carrapato Boophilus microplus
 * - Temperatura entre 25-35°C é ideal para proliferação
 * - Estação das águas aumenta a fase de vida livre no pasto
 * - Lotação alta facilita transmissão entre animais
 */
function calcularRiscoCarrapato(input: HealthInput): DiseaseRisk {
  let risco = 0
  const fatores: string[] = []

  // Umidade — principal fator para fase de vida livre do carrapato
  if (input.humidity >= 80) {
    risco += 30
    fatores.push('Umidade muito alta (≥80%) — favorece eclosão de larvas')
  } else if (input.humidity >= 70) {
    risco += 20
    fatores.push('Umidade alta (≥70%) — condição favorável ao carrapato')
  }

  // Temperatura — faixa ideal de proliferação
  if (input.temp >= 25 && input.temp <= 35) {
    risco += 25
    fatores.push('Temperatura ideal para proliferação (25-35°C)')
  } else if (input.temp >= 20) {
    risco += 10
    fatores.push('Temperatura moderada — ciclo mais lento')
  }

  // Estação chuvosa — mais umidade no pasto e fase de vida livre
  if (input.season === 'aguas') {
    risco += 20
    fatores.push('Período das águas — pasto úmido favorece larvas')
  }

  // Chuva recente — ambiente úmido propício
  if (input.rain_mm > 20) {
    risco += 10
    fatores.push(`Chuva recente (${input.rain_mm}mm) — ambiente propício`)
  }

  // Lotação alta — mais contato entre animais
  if (input.stocking_rate && input.stocking_rate > 2.5) {
    risco += 10
    fatores.push('Lotação alta (>2,5 UA/ha) — maior pressão de infestação')
  }

  // Sem vermífugo recente — carrapato sem controle
  if (input.last_deworming_days === null || input.last_deworming_days > 60) {
    risco += 5
    fatores.push('Sem controle parasitário recente (>60 dias)')
  }

  const riskPercent = clamp(risco)
  const severity = calcularSeveridade(riskPercent)

  return {
    disease: 'carrapato',
    label: LABELS_DOENCAS.carrapato,
    risk_percent: riskPercent,
    severity,
    factors: fatores,
    preventive_action: 'Aplicar carrapaticida (pour-on ou injetável). Rotacionar princípio ativo para evitar resistência.',
    deadline_days: calcularPrazo(severity),
    estimated_cost_per_head: custoMedio('carrapato'),
  }
}

/**
 * Calcula risco de pneumonia bovina.
 *
 * Fatores principais:
 * - Frio (temp <18°C) causa estresse térmico pelo frio
 * - Chuva + frio = umidade nos pulmões
 * - Lotação alta = transmissão aérea facilitada
 * - Animais jovens (fase cria) são mais vulneráveis
 * - Amplitude térmica alta (não modelada aqui, simplificado)
 */
function calcularRiscoPneumonia(input: HealthInput): DiseaseRisk {
  let risco = 0
  const fatores: string[] = []

  // Temperatura baixa — principal gatilho para pneumonia em bovinos
  if (input.temp < 12) {
    risco += 30
    fatores.push('Temperatura muito baixa (<12°C) — estresse térmico pelo frio')
  } else if (input.temp < 18) {
    risco += 20
    fatores.push('Temperatura baixa (<18°C) — predispõe infecções respiratórias')
  }

  // Chuva + frio — combinação perigosa para vias aéreas
  if (input.rain_mm > 10 && input.temp < 20) {
    risco += 20
    fatores.push('Chuva com frio — animais molhados perdem calor rapidamente')
  } else if (input.rain_mm > 10) {
    risco += 5
    fatores.push('Chuva recente — umidade no ambiente')
  }

  // Lotação alta — transmissão por aerossol entre animais
  if (input.stocking_rate && input.stocking_rate > 3.0) {
    risco += 15
    fatores.push('Lotação muito alta (>3 UA/ha) — transmissão aérea facilitada')
  } else if (input.stocking_rate && input.stocking_rate > 2.0) {
    risco += 8
    fatores.push('Lotação moderada-alta — risco de contágio')
  }

  // Animais jovens — sistema imunológico imaturo
  if (input.phase === 'cria') {
    risco += 20
    fatores.push('Bezerros (fase cria) — sistema imunológico imaturo')
  } else if (input.phase === 'recria') {
    risco += 10
    fatores.push('Animais em recria — ainda vulneráveis a respiratórias')
  }

  // Umidade alta complementa o frio
  if (input.humidity > 85 && input.temp < 20) {
    risco += 10
    fatores.push('Umidade alta com frio — ambiente propício a patógenos respiratórios')
  }

  const riskPercent = clamp(risco)
  const severity = calcularSeveridade(riskPercent)

  return {
    disease: 'pneumonia',
    label: LABELS_DOENCAS.pneumonia,
    risk_percent: riskPercent,
    severity,
    factors: fatores,
    preventive_action: 'Monitorar animais com tosse ou secreção nasal. Em caso de surto, aplicar antibiótico (tulathromicina). Proteger bezerros do frio e chuva.',
    deadline_days: calcularPrazo(severity),
    estimated_cost_per_head: custoMedio('pneumonia'),
  }
}

/**
 * Calcula risco de tristeza parasitária (babesiose + anaplasmose).
 *
 * Fatores principais:
 * - Região endêmica (Cuiabá, Rondonópolis, Barra do Garças, Primavera do Leste)
 * - Estação das águas = mais carrapato transmissor (Boophilus microplus)
 * - Sem vacinação = sem proteção imunológica
 * - Fase cria = bezerros sem imunidade passiva após 4 meses
 */
function calcularRiscoTristeza(input: HealthInput): DiseaseRisk {
  let risco = 0
  const fatores: string[] = []

  // Região endêmica — fator mais importante
  if (isCidadeEndemica(input.city)) {
    risco += 30
    fatores.push(`Região endêmica para tristeza (${input.city})`)
  }

  // Estação das águas — mais carrapatos transmissores
  if (input.season === 'aguas') {
    risco += 20
    fatores.push('Período das águas — alta população de carrapatos vetores')
  }

  // Sem vacinação — principal medida preventiva ausente
  if (input.last_vaccination_days === null) {
    risco += 25
    fatores.push('Nunca vacinado contra tristeza — sem proteção imunológica')
  } else if (input.last_vaccination_days > 365) {
    risco += 15
    fatores.push('Vacinação desatualizada (>1 ano) — imunidade pode estar baixa')
  }

  // Fase cria — bezerros perdem imunidade passiva da mãe após ~4 meses
  if (input.phase === 'cria') {
    risco += 15
    fatores.push('Bezerros — perda de imunidade passiva materna')
  }

  // Temperatura e umidade favorecem o vetor (carrapato)
  if (input.temp >= 25 && input.humidity >= 70) {
    risco += 10
    fatores.push('Clima quente e úmido — favorece carrapato vetor')
  }

  const riskPercent = clamp(risco)
  const severity = calcularSeveridade(riskPercent)

  return {
    disease: 'tristeza_parasitaria',
    label: LABELS_DOENCAS.tristeza_parasitaria,
    risk_percent: riskPercent,
    severity,
    factors: fatores,
    preventive_action: 'Vacinar com vacina atenuada contra babesiose/anaplasmose (dose única em bezerros 4-8 meses). Em surto, tratar com diaceturato de diminazene.',
    deadline_days: calcularPrazo(severity),
    estimated_cost_per_head: custoMedio('tristeza_parasitaria'),
  }
}

/**
 * Calcula risco de verminose (nematódeos gastrointestinais).
 *
 * Fatores principais:
 * - Estação chuvosa = larvas infectantes sobrevivem mais no pasto
 * - Lotação alta = contaminação do pasto por fezes
 * - Sem vermífugo recente = carga parasitária acumulada
 * - Animais jovens = menor resistência imunológica
 */
function calcularRiscoVerminose(input: HealthInput): DiseaseRisk {
  let risco = 0
  const fatores: string[] = []

  // Estação chuvosa — umidade do pasto favorece sobrevivência de L3
  if (input.season === 'aguas') {
    risco += 25
    fatores.push('Período das águas — larvas infectantes (L3) sobrevivem mais no pasto')
  }

  // Lotação alta — mais contaminação fecal por hectare
  if (input.stocking_rate && input.stocking_rate > 3.0) {
    risco += 20
    fatores.push('Lotação alta (>3 UA/ha) — pasto contaminado por fezes')
  } else if (input.stocking_rate && input.stocking_rate > 2.0) {
    risco += 10
    fatores.push('Lotação moderada — alguma contaminação do pasto')
  }

  // Sem vermífugo recente — principal medida preventiva
  if (input.last_deworming_days === null) {
    risco += 25
    fatores.push('Nunca vermifugado — carga parasitária desconhecida')
  } else if (input.last_deworming_days > 90) {
    risco += 15
    fatores.push('Vermífugo desatualizado (>90 dias) — reinfecção provável')
  }

  // Umidade alta — complementa o risco
  if (input.humidity >= 75) {
    risco += 10
    fatores.push('Umidade alta — ambiente ideal para estádios larvais')
  }

  // Animais jovens — menos resistência
  if (input.phase === 'cria') {
    risco += 15
    fatores.push('Bezerros — menor resistência imunológica a vermes')
  } else if (input.phase === 'recria') {
    risco += 8
    fatores.push('Animais em recria — ainda desenvolvendo imunidade parasitária')
  }

  // Chuva recente — umidade residual no pasto
  if (input.rain_mm > 15) {
    risco += 5
    fatores.push('Chuva recente — pasto úmido propicia migração de larvas')
  }

  const riskPercent = clamp(risco)
  const severity = calcularSeveridade(riskPercent)

  return {
    disease: 'verminose',
    label: LABELS_DOENCAS.verminose,
    risk_percent: riskPercent,
    severity,
    factors: fatores,
    preventive_action: 'Aplicar vermífugo estratégico (moxidectina ou ivermectina). Fazer OPG (contagem de ovos) para monitorar carga. Rotacionar pastagens.',
    deadline_days: calcularPrazo(severity),
    estimated_cost_per_head: custoMedio('verminose'),
  }
}

/**
 * Calcula risco de botulismo.
 *
 * Fatores principais:
 * - Estação seca = animais buscam fósforo em carcaças e ossos
 * - Sem vacinação contra botulismo = sem anticorpos
 * - Pastagens degradadas = mais ossos e restos no campo
 * - Deficiência mineral (não modelada diretamente aqui)
 */
function calcularRiscoBotulismo(input: HealthInput): DiseaseRisk {
  let risco = 0
  const fatores: string[] = []

  // Estação seca — animais com carência mineral buscam ossos
  if (input.season === 'seca') {
    risco += 30
    fatores.push('Período seco — animais buscam fósforo em carcaças/ossos (osteofagia)')
  }

  // Sem vacinação — principal prevenção
  if (input.last_vaccination_days === null) {
    risco += 30
    fatores.push('Nunca vacinado contra botulismo — sem proteção')
  } else if (input.last_vaccination_days > 365) {
    risco += 15
    fatores.push('Vacina desatualizada (>1 ano) — reforço necessário')
  }

  // Lotação alta — mais chance de carcaças no campo
  if (input.stocking_rate && input.stocking_rate > 2.5) {
    risco += 10
    fatores.push('Lotação alta — mais chance de carcaças no pasto')
  }

  // Temperatura alta na seca — decomposição rápida de carcaças
  if (input.season === 'seca' && input.temp > 30) {
    risco += 10
    fatores.push('Calor intenso na seca — decomposição rápida gera toxina botulínica')
  }

  const riskPercent = clamp(risco)
  const severity = calcularSeveridade(riskPercent)

  return {
    disease: 'botulismo',
    label: LABELS_DOENCAS.botulismo,
    risk_percent: riskPercent,
    severity,
    factors: fatores,
    preventive_action: 'Vacinar com vacina contra botulismo bivalente (tipos C e D). Remover carcaças e ossos do pasto. Garantir suplementação mineral com fósforo.',
    deadline_days: calcularPrazo(severity),
    estimated_cost_per_head: custoMedio('botulismo'),
  }
}

/**
 * Calcula risco de clostridiose (carbúnculo sintomático, gangrena, etc.).
 *
 * Fatores principais:
 * - Estação chuvosa = esporos de Clostridium ativados pela umidade
 * - Animais jovens (3 meses a 2 anos) = mais vulneráveis
 * - Sem vacinação = principal prevenção ausente
 * - Pastagens alagadas ou com solo revolvido
 */
function calcularRiscoClostridiose(input: HealthInput): DiseaseRisk {
  let risco = 0
  const fatores: string[] = []

  // Estação chuvosa — ativa esporos no solo
  if (input.season === 'aguas') {
    risco += 20
    fatores.push('Período das águas — umidade ativa esporos de Clostridium no solo')
  }

  // Animais jovens — faixa etária mais atingida
  if (input.phase === 'cria') {
    risco += 25
    fatores.push('Bezerros — faixa etária mais susceptível a clostridiose')
  } else if (input.phase === 'recria') {
    risco += 15
    fatores.push('Animais jovens em recria — ainda vulneráveis')
  }

  // Sem vacinação — vacina polivalente é a principal prevenção
  if (input.last_vaccination_days === null) {
    risco += 25
    fatores.push('Nunca vacinado — sem proteção contra clostrídios')
  } else if (input.last_vaccination_days > 365) {
    risco += 12
    fatores.push('Vacina desatualizada (>1 ano) — reforço anual necessário')
  }

  // Chuva forte — áreas alagadas expõem esporos
  if (input.rain_mm > 30) {
    risco += 15
    fatores.push('Chuva forte — áreas alagadas expõem esporos do solo')
  } else if (input.rain_mm > 10) {
    risco += 5
    fatores.push('Chuva moderada — solo úmido favorece esporos')
  }

  // Umidade alta — complementa condições para esporos
  if (input.humidity > 80) {
    risco += 5
    fatores.push('Umidade alta — condição favorável para Clostridium')
  }

  const riskPercent = clamp(risco)
  const severity = calcularSeveridade(riskPercent)

  return {
    disease: 'clostridiose',
    label: LABELS_DOENCAS.clostridiose,
    risk_percent: riskPercent,
    severity,
    factors: fatores,
    preventive_action: 'Vacinar com polivalente contra clostrídios (mínimo 2 doses em bezerros, reforço anual). Em áreas endêmicas, vacinar antes do período chuvoso.',
    deadline_days: calcularPrazo(severity),
    estimated_cost_per_head: custoMedio('clostridiose'),
  }
}

/**
 * Gera calendário sanitário para os próximos 3 meses.
 * Indica quais doenças têm maior risco em cada mês baseado na estação.
 */
function gerarCalendario(currentMonth: number): { month: string; diseases: string[] }[] {
  const calendario: { month: string; diseases: string[] }[] = []

  for (let i = 0; i < 3; i++) {
    const monthIndex = (currentMonth + i) % 12
    const mesNome = MESES_PT[monthIndex]
    const doencas: string[] = []

    // Meses 10-4 (outubro a abril) = período das águas
    const isAguas = monthIndex >= 9 || monthIndex <= 3
    // Meses 5-9 (maio a setembro) = período seco
    const isSeca = monthIndex >= 4 && monthIndex <= 8

    if (isAguas) {
      doencas.push('Carrapato', 'Verminose', 'Clostridiose', 'Tristeza Parasitária')
    }
    if (isSeca) {
      doencas.push('Botulismo')
    }
    // Pneumonia — meses mais frios (maio a agosto no MT)
    if (monthIndex >= 4 && monthIndex <= 7) {
      doencas.push('Pneumonia')
    }

    calendario.push({ month: mesNome, diseases: doencas })
  }

  return calendario
}

/**
 * Gera resumo textual da situação sanitária do rebanho.
 * Prioriza as doenças com maior risco para destaque.
 */
function gerarResumo(risks: DiseaseRisk[], headCount: number): string {
  const criticos = risks.filter(r => r.severity === 'critico')
  const altos = risks.filter(r => r.severity === 'alto')

  if (criticos.length > 0) {
    const nomes = criticos.map(r => r.label).join(', ')
    return `ALERTA CRÍTICO: Risco elevado de ${nomes}. Ação imediata necessária para proteger ${headCount} cabeças. Consulte o veterinário e aplique as medidas preventivas nos próximos ${criticos[0].deadline_days} dias.`
  }

  if (altos.length > 0) {
    const nomes = altos.map(r => r.label).join(', ')
    return `ATENÇÃO: Risco alto de ${nomes}. Recomenda-se ação preventiva na próxima semana. Planeje a aplicação de medicamentos e vacinas conforme o calendário abaixo.`
  }

  const moderados = risks.filter(r => r.severity === 'moderado')
  if (moderados.length > 0) {
    return `Situação sanitária com riscos moderados. Monitore o rebanho e siga o calendário de vacinação. Mantenha a suplementação mineral em dia.`
  }

  return `Situação sanitária favorável. Continue monitorando e seguindo o calendário de vacinação preventiva. Boas práticas de manejo mantêm o rebanho saudável.`
}

/**
 * Função principal: prediz riscos sanitários do rebanho.
 *
 * Recebe dados climáticos, regionais, do rebanho e histórico sanitário.
 * Retorna riscos por doença, calendário preventivo e custo estimado.
 */
export function predictHealthRisks(input: HealthInput): HealthPrediction {
  // Calcular risco individual para cada doença
  const risks: DiseaseRisk[] = [
    calcularRiscoCarrapato(input),
    calcularRiscoPneumonia(input),
    calcularRiscoTristeza(input),
    calcularRiscoVerminose(input),
    calcularRiscoBotulismo(input),
    calcularRiscoClostridiose(input),
  ]

  // Ordenar por risco decrescente — doenças mais críticas primeiro
  risks.sort((a, b) => b.risk_percent - a.risk_percent)

  // Gerar calendário sanitário dos próximos 3 meses
  const mesAtual = new Date().getMonth() // 0-11
  const calendar = gerarCalendario(mesAtual)

  // Calcular custo total preventivo (apenas doenças com risco moderado ou maior)
  const riscosSuficientes = risks.filter(r => r.severity !== 'baixo')
  const custoTotal = riscosSuficientes.reduce(
    (total, r) => total + r.estimated_cost_per_head * input.head_count,
    0,
  )

  // Gerar resumo textual
  const summary = gerarResumo(risks, input.head_count)

  return {
    risks,
    calendar,
    total_preventive_cost: Math.round(custoTotal * 100) / 100,
    summary,
  }
}
