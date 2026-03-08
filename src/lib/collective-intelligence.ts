/**
 * IA Inteligência Coletiva
 *
 * Agrega dados anonimizados de toda a rede de produtores para gerar:
 * - Benchmarks por perfil (raça, região, sistema de produção)
 * - Sugestões personalizadas baseadas nas melhores práticas dos top produtores
 * - Ranking anônimo por região
 *
 * Em produção, os dados viriam do Supabase com agregação real.
 * Aqui usamos dados simulados representando ~500 produtores.
 */

// Perfil de um cluster (grupo de produtores similares)
export interface ClusterProfile {
  cluster_id: string
  label: string               // Ex: "Nelore Pasto MT-Oeste"
  breed_type: string           // 'zebuino' | 'cruzamento' | 'taurino'
  system: string               // 'pasto' | 'semi' | 'confinamento'
  region: string               // 'oeste' | 'norte' | 'centro' | 'sul'
  avg_gmd: number              // GMD médio do cluster (kg/dia)
  top10_gmd: number            // GMD dos top 10% do cluster
  avg_cost_arroba: number      // Custo médio por arroba (R$)
  top10_cost_arroba: number    // Custo dos top 10% (menor = melhor)
  avg_mortality_percent: number // Mortalidade média (%)
  common_supplement: string    // Suplemento mais usado
  common_forage: string        // Forrageira mais comum
  producer_count: number       // Quantidade de produtores no cluster
  best_practices: string[]     // Práticas dos melhores produtores
}

// Clusters pré-construídos (simulados a partir de "500+ produtores")
const CLUSTERS: ClusterProfile[] = [
  // --- Zebuíno Pasto por região ---
  {
    cluster_id: 'z_pasto_oeste',
    label: 'Nelore Pasto — Oeste MT',
    breed_type: 'zebuino',
    system: 'pasto',
    region: 'oeste',
    avg_gmd: 0.62,
    top10_gmd: 0.88,
    avg_cost_arroba: 265,
    top10_cost_arroba: 215,
    avg_mortality_percent: 2.1,
    common_supplement: 'Proteico',
    common_forage: 'Brachiária Brizantha',
    producer_count: 142,
    best_practices: [
      'Rotação de piquetes a cada 35 dias',
      'Suplementação proteica na seca',
      'Pesagem mensal',
    ],
  },
  {
    cluster_id: 'z_pasto_norte',
    label: 'Nelore Pasto — Norte MT',
    breed_type: 'zebuino',
    system: 'pasto',
    region: 'norte',
    avg_gmd: 0.58,
    top10_gmd: 0.82,
    avg_cost_arroba: 275,
    top10_cost_arroba: 228,
    avg_mortality_percent: 2.4,
    common_supplement: 'Mineral',
    common_forage: 'Brachiária Humidícola',
    producer_count: 98,
    best_practices: [
      'Sombra artificial nos piquetes',
      'Vermifugação estratégica',
      'Controle de ectoparasitas',
    ],
  },

  // --- Zebuíno Confinamento ---
  {
    cluster_id: 'z_confin_centro',
    label: 'Nelore Confinamento — Centro MT',
    breed_type: 'zebuino',
    system: 'confinamento',
    region: 'centro',
    avg_gmd: 1.42,
    top10_gmd: 1.78,
    avg_cost_arroba: 195,
    top10_cost_arroba: 165,
    avg_mortality_percent: 1.8,
    common_supplement: 'Concentrado RK',
    common_forage: 'Silagem Milho',
    producer_count: 67,
    best_practices: [
      'Adaptação gradual de 21 dias',
      'Leitura de cocho 2x/dia',
      'Milho reidratado',
    ],
  },

  // --- Cruzamento Pasto ---
  {
    cluster_id: 'c_pasto_oeste',
    label: 'Cruzamento Pasto — Oeste MT',
    breed_type: 'cruzamento',
    system: 'pasto',
    region: 'oeste',
    avg_gmd: 0.72,
    top10_gmd: 0.98,
    avg_cost_arroba: 248,
    top10_cost_arroba: 198,
    avg_mortality_percent: 1.9,
    common_supplement: 'Prot.Energ',
    common_forage: 'Brachiária Marandu',
    producer_count: 85,
    best_practices: [
      'Suplementação energético-proteica',
      'Genética F1 Angus x Nelore',
      'IATF com taxa >55%',
    ],
  },

  // --- Cruzamento Semi-confinamento ---
  {
    cluster_id: 'c_semi_centro',
    label: 'Cruzamento Semi-confin — Centro MT',
    breed_type: 'cruzamento',
    system: 'semi',
    region: 'centro',
    avg_gmd: 1.05,
    top10_gmd: 1.35,
    avg_cost_arroba: 220,
    top10_cost_arroba: 185,
    avg_mortality_percent: 1.6,
    common_supplement: 'FazCarne',
    common_forage: 'Mombaça',
    producer_count: 53,
    best_practices: [
      'Suplementação com caroço de algodão',
      'Pasto irrigado na seca',
      'Lote uniforme (max 15% variação peso)',
    ],
  },

  // --- Taurino Confinamento ---
  {
    cluster_id: 't_confin_sul',
    label: 'Taurino Confinamento — Sul MT',
    breed_type: 'taurino',
    system: 'confinamento',
    region: 'sul',
    avg_gmd: 1.65,
    top10_gmd: 2.10,
    avg_cost_arroba: 210,
    top10_cost_arroba: 172,
    avg_mortality_percent: 2.2,
    common_supplement: 'Concentrado',
    common_forage: 'Silagem Milho + Bagaço',
    producer_count: 38,
    best_practices: [
      'Dieta alta energia (>72% NDT)',
      'Implante hormonal',
      'Uso de ionóforos',
    ],
  },
]

/**
 * Resultado da análise de inteligência coletiva para um produtor
 */
export interface CollectiveInsight {
  /** Cluster mais próximo do perfil do produtor */
  my_cluster: ClusterProfile
  /** Posição do produtor dentro do cluster */
  my_position: {
    gmd_percentile: number    // Ex: 72 = o produtor está melhor que 72% do cluster
    cost_percentile: number   // Ex: 60 = custo menor que 60% do cluster
    position_label: string    // Ex: "Top 28% em GMD"
  }
  /** Sugestões personalizadas baseadas nos melhores produtores */
  suggestions: Array<{
    type: 'nutricao' | 'manejo' | 'genetica' | 'pastagem'
    title: string
    description: string
    potential_improvement: string   // Ex: "+14% GMD" ou "-R$ 12/@ custo"
    adopted_by_percent: number     // Ex: 78 = "78% dos Top 10% usam isso"
  }>
  /** Estatísticas gerais da rede */
  network_stats: {
    total_producers: number
    total_heads: number
    avg_gmd_network: number
    top10_gmd_network: number
  }
}

/**
 * Entrada do produtor para análise coletiva
 */
export interface CollectiveInput {
  breed_type: string           // 'zebuino' | 'cruzamento' | 'taurino'
  system: string               // 'pasto' | 'semi' | 'confinamento'
  region: string               // 'oeste' | 'norte' | 'centro' | 'sul'
  my_gmd: number               // GMD atual do produtor (kg/dia)
  my_cost_arroba: number       // Custo por arroba atual (R$)
  my_supplement: string | null // Suplemento usado atualmente
  my_forage: string | null     // Forrageira principal
}

/**
 * Encontra o cluster mais próximo do perfil do produtor.
 * Prioriza: mesmo sistema > mesma raça > mesma região.
 * Se não encontrar match exato, retorna o mais próximo.
 */
export function findClosestCluster(input: CollectiveInput): ClusterProfile {
  // Primeiro tenta match exato (sistema + raça + região)
  const exactMatch = CLUSTERS.find(
    c => c.system === input.system &&
         c.breed_type === input.breed_type &&
         c.region === input.region
  )
  if (exactMatch) return exactMatch

  // Tenta match parcial (sistema + raça, qualquer região)
  const partialMatch = CLUSTERS.find(
    c => c.system === input.system && c.breed_type === input.breed_type
  )
  if (partialMatch) return partialMatch

  // Tenta match por sistema apenas
  const systemMatch = CLUSTERS.find(c => c.system === input.system)
  if (systemMatch) return systemMatch

  // Fallback: retorna o primeiro cluster (zebuíno pasto oeste — mais comum)
  return CLUSTERS[0]
}

/**
 * Calcula o percentil do produtor dentro do cluster.
 * Usa interpolação linear entre a média e o top 10%.
 * Retorna valor entre 0 e 100.
 */
export function calculatePercentile(
  myValue: number,
  clusterAvg: number,
  clusterTop10: number,
  invertido = false // true se menor valor = melhor (ex: custo)
): number {
  // Se invertido (custo), invertemos a lógica
  if (invertido) {
    // Custo: menor é melhor. Top 10% tem custo menor.
    if (myValue <= clusterTop10) return 95 // Melhor que os top 10%
    if (myValue >= clusterAvg) {
      // Entre média e pior — abaixo de 50%
      const ratio = (myValue - clusterAvg) / (clusterAvg * 0.5 || 1)
      return Math.max(0, Math.round(50 - ratio * 50))
    }
    // Entre top10 e média — entre 50% e 90%
    const range = clusterAvg - clusterTop10
    if (range <= 0) return 50
    const position = (clusterAvg - myValue) / range
    return Math.round(50 + position * 40)
  }

  // GMD: maior é melhor
  if (myValue >= clusterTop10) return 95 // Melhor que os top 10%
  if (myValue <= clusterAvg * 0.5) return 5 // Muito abaixo da média
  if (myValue <= clusterAvg) {
    // Abaixo da média — entre 5% e 50%
    const range = clusterAvg - clusterAvg * 0.5
    if (range <= 0) return 25
    const position = (myValue - clusterAvg * 0.5) / range
    return Math.round(5 + position * 45)
  }
  // Acima da média mas abaixo do top10 — entre 50% e 90%
  const range = clusterTop10 - clusterAvg
  if (range <= 0) return 70
  const position = (myValue - clusterAvg) / range
  return Math.round(50 + position * 40)
}

/**
 * Gera sugestões personalizadas baseadas na diferença entre
 * o produtor e os top performers do cluster.
 */
function generateSuggestions(
  input: CollectiveInput,
  cluster: ClusterProfile
): CollectiveInsight['suggestions'] {
  const suggestions: CollectiveInsight['suggestions'] = []

  // --- Sugestão de nutrição (suplemento) ---
  const gmdGap = cluster.top10_gmd - input.my_gmd
  if (gmdGap > 0.1 && input.my_supplement !== cluster.common_supplement) {
    const improvPercent = Math.round((gmdGap / (input.my_gmd || 0.5)) * 100)
    suggestions.push({
      type: 'nutricao',
      title: `Considere ${cluster.common_supplement}`,
      description: `Os top 10% do seu perfil usam ${cluster.common_supplement} como suplemento principal. Seu GMD atual (${input.my_gmd.toFixed(2)} kg/dia) está abaixo da média do cluster (${cluster.avg_gmd.toFixed(2)}).`,
      potential_improvement: `+${Math.min(improvPercent, 40)}% GMD`,
      adopted_by_percent: 78,
    })
  }

  // --- Sugestão de pastagem (forrageira) ---
  if (input.my_forage && input.my_forage !== cluster.common_forage && cluster.system !== 'confinamento') {
    suggestions.push({
      type: 'pastagem',
      title: `Forrageira recomendada: ${cluster.common_forage}`,
      description: `A maioria dos produtores top do seu perfil usa ${cluster.common_forage}. Essa forrageira apresenta melhor adaptação e produtividade na sua região.`,
      potential_improvement: '+8% capacidade de suporte',
      adopted_by_percent: 65,
    })
  }

  // --- Sugestão de manejo (melhores práticas) ---
  if (cluster.best_practices.length > 0) {
    suggestions.push({
      type: 'manejo',
      title: cluster.best_practices[0],
      description: `Essa é a prática de manejo mais adotada entre os top produtores do cluster "${cluster.label}". Produtores que adotam essa prática têm GMD ${((cluster.top10_gmd - cluster.avg_gmd) * 0.6).toFixed(2)} kg/dia acima da média.`,
      potential_improvement: `+${Math.round((cluster.top10_gmd - cluster.avg_gmd) / cluster.avg_gmd * 60)}% GMD`,
      adopted_by_percent: 82,
    })
  }

  // --- Sugestão de redução de custo ---
  const costGap = input.my_cost_arroba - cluster.top10_cost_arroba
  if (costGap > 15) {
    suggestions.push({
      type: 'nutricao',
      title: 'Otimize seu custo por arroba',
      description: `Seu custo (R$ ${input.my_cost_arroba}/@ ) está R$ ${Math.round(costGap)} acima dos top 10% (R$ ${cluster.top10_cost_arroba}/@ ). Revise a formulação nutricional e negocie insumos em grupo.`,
      potential_improvement: `-R$ ${Math.round(costGap * 0.6)}/@ custo`,
      adopted_by_percent: 71,
    })
  }

  // --- Sugestão genética (se GMD muito abaixo do potencial) ---
  if (input.my_gmd < cluster.avg_gmd * 0.75) {
    suggestions.push({
      type: 'genetica',
      title: 'Avalie o potencial genético do rebanho',
      description: `Seu GMD (${input.my_gmd.toFixed(2)}) está significativamente abaixo da média do cluster (${cluster.avg_gmd.toFixed(2)}). Considere avaliar a genética do rebanho e selecionar touros com DEP superior para ganho de peso.`,
      potential_improvement: '+20% GMD em 2 gerações',
      adopted_by_percent: 45,
    })
  }

  // Garante pelo menos 3 sugestões adicionando práticas do cluster
  if (suggestions.length < 3 && cluster.best_practices.length > 1) {
    suggestions.push({
      type: 'manejo',
      title: cluster.best_practices[1],
      description: `Prática comum entre os melhores produtores do perfil "${cluster.label}". Adoção está associada a melhores indicadores gerais de desempenho.`,
      potential_improvement: '+5% eficiência geral',
      adopted_by_percent: 58,
    })
  }

  if (suggestions.length < 3 && cluster.best_practices.length > 2) {
    suggestions.push({
      type: 'manejo',
      title: cluster.best_practices[2],
      description: `Recomendação baseada no comportamento dos top produtores da rede. Monitoramento consistente é chave para resultados superiores.`,
      potential_improvement: '+3% controle de indicadores',
      adopted_by_percent: 52,
    })
  }

  return suggestions
}

/**
 * Calcula estatísticas gerais da rede de produtores.
 * Soma todos os clusters para dar uma visão macro.
 */
function calculateNetworkStats(): CollectiveInsight['network_stats'] {
  const totalProducers = CLUSTERS.reduce((sum, c) => sum + c.producer_count, 0)
  // Estimativa: média de 350 cabeças por produtor
  const totalHeads = totalProducers * 350

  // Média ponderada do GMD da rede (ponderada por qtd de produtores)
  const weightedGmd = CLUSTERS.reduce(
    (sum, c) => sum + c.avg_gmd * c.producer_count, 0
  )
  const avgGmdNetwork = weightedGmd / totalProducers

  // Top 10% da rede: média dos top10 de cada cluster ponderada
  const weightedTop10 = CLUSTERS.reduce(
    (sum, c) => sum + c.top10_gmd * c.producer_count, 0
  )
  const top10GmdNetwork = weightedTop10 / totalProducers

  return {
    total_producers: totalProducers,
    total_heads: totalHeads,
    avg_gmd_network: Math.round(avgGmdNetwork * 100) / 100,
    top10_gmd_network: Math.round(top10GmdNetwork * 100) / 100,
  }
}

/**
 * Função principal: gera insights de inteligência coletiva
 * para um produtor com base no seu perfil e dados.
 *
 * 1. Encontra o cluster mais próximo
 * 2. Calcula a posição do produtor no cluster (percentis)
 * 3. Gera sugestões personalizadas
 * 4. Retorna estatísticas gerais da rede
 */
export function getCollectiveInsight(input: CollectiveInput): CollectiveInsight {
  // Encontrar o cluster mais próximo do perfil do produtor
  const cluster = findClosestCluster(input)

  // Calcular percentis (posição relativa no cluster)
  const gmdPercentile = calculatePercentile(
    input.my_gmd,
    cluster.avg_gmd,
    cluster.top10_gmd
  )

  const costPercentile = calculatePercentile(
    input.my_cost_arroba,
    cluster.avg_cost_arroba,
    cluster.top10_cost_arroba,
    true // invertido: menor custo = melhor
  )

  // Gerar label descritivo da posição
  const topPercent = 100 - gmdPercentile
  const positionLabel = gmdPercentile >= 90
    ? 'Top 10% em GMD'
    : gmdPercentile >= 75
      ? `Top ${topPercent}% em GMD`
      : gmdPercentile >= 50
        ? `Acima da média em GMD`
        : `Abaixo da média em GMD — potencial de melhoria`

  // Gerar sugestões personalizadas
  const suggestions = generateSuggestions(input, cluster)

  // Calcular estatísticas gerais da rede
  const networkStats = calculateNetworkStats()

  return {
    my_cluster: cluster,
    my_position: {
      gmd_percentile: gmdPercentile,
      cost_percentile: costPercentile,
      position_label: positionLabel,
    },
    suggestions,
    network_stats: networkStats,
  }
}

// Exportar clusters para uso em testes
export { CLUSTERS }
