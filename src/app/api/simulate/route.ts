import { createServerSupabaseClient } from '@/lib/supabase-server'
import { simulateSchema } from '@/lib/schemas'
import { calculateGeneticScore, type GeneticInput, type WeighingHistory } from '@/lib/genetic-score'
import { NextRequest, NextResponse } from 'next/server'
import { SupabaseClient } from '@supabase/supabase-js'

const ARROBA_PRICES = {
  current: 320.00,
  avg_30d: 315.00,
  avg_90d: 308.00,
  date: '2026-03-05',
  source: 'Referência MT',
}

// Preço de referência do animal por fase (R$/cab) - IMEA-MT 2025/2026
const ANIMAL_PRICES: Record<string, number> = {
  cria: 2200,       // bezerro desmamado 180-200kg
  recria: 3200,     // garrote 280-320kg
  engorda: 4200,    // boi magro 380-420kg
  lactacao: 5500,   // vaca leiteira em produção
  reproducao: 6000, // touro/matriz
}

const SUPPLEMENT_COST_PER_KG: Record<string, number> = {
  's': 3.80, 'sr': 4.20, 'especial': 5.50, 'conc.sal': 3.20,
  'rk': 3.00, 'proteico': 2.80, 'prot.energ': 2.50,
  'fazcarne': 2.20, 'concentrado': 2.00, 'nucleo': 6.50,
}

const CONSUMPTION_PER_LINE: Record<string, number> = {
  's': 0.08, 'sr': 0.08, 'especial': 0.08, 'rk': 1.5,
  'proteico': 0.5, 'prot.energ': 0.8, 'fazcarne': 1.0, 'concentrado': 3.0,
}

const GMD_ESTIMATES: Record<string, number> = {
  'cria': 0.35, 'recria': 0.50, 'recria_proteico': 0.65,
  'engorda': 0.70, 'engorda_rk': 1.20, 'engorda_confinamento': 1.60,
}

// Custos operacionais realistas MT (R$/cab/dia) - IMEA-MT + Embrapa + Scot Consultoria
const DEFAULT_COSTS: Record<string, {
  pasto: number, mao_obra: number, sanidade: number, outros: number
}> = {
  cria: { pasto: 1.80, mao_obra: 1.20, sanidade: 0.45, outros: 0.70 },
  recria: { pasto: 2.20, mao_obra: 1.40, sanidade: 0.50, outros: 0.80 },
  engorda: { pasto: 2.80, mao_obra: 1.80, sanidade: 0.55, outros: 1.20 },
  engorda_confinamento: { pasto: 0.80, mao_obra: 3.50, sanidade: 0.70, outros: 2.50 },
  lactacao: { pasto: 2.50, mao_obra: 2.20, sanidade: 0.60, outros: 1.00 },
  reproducao: { pasto: 2.00, mao_obra: 1.50, sanidade: 0.70, outros: 0.80 },
}

// Taxa de mortalidade padrão por fase (%) - Embrapa / IMEA-MT / Assocon
const DEFAULT_MORTALITY: Record<string, number> = {
  cria: 5.0,        // 4-8% bezerros (Embrapa)
  recria: 2.0,      // 1-3% (IMEA-MT)
  engorda: 1.5,     // 1-2% (IMEA-MT)
  engorda_confinamento: 2.0, // 1-3% (Assocon)
  lactacao: 2.0,    // vacas leiteiras
  reproducao: 1.5,  // matrizes/touros
}

// Impostos na venda de gado - MT
const TAXES = {
  funrural: 0.015,     // 1,5% sobre receita bruta
  senar: 0.002,        // 0,2% sobre receita bruta
  fethab_per_head: 14.46, // FETHAB-MT por cabeça transportada
}

// Busca exigências nutricionais do BR-CORTE para CMS e NDT reais
async function fetchNutrientReqForSimulation(
  supabase: SupabaseClient,
  breedType: string,
  weight: number,
  phase: string,
  isConfinamento: boolean
) {
  const phaseMap: Record<string, string> = {
    'cria': 'cria', 'recria': 'recria', 'engorda': 'engorda',
    'lactacao': 'lactacao', 'reproducao': 'manutencao',
  }
  const productionPhase = phaseMap[phase] || 'recria'
  const system = isConfinamento ? 'confinamento' : 'pasto'

  const { data } = await supabase
    .from('nutrient_requirements')
    .select('cms_kg_day, cms_percent_pv, ndt_kg_day, ndt_percent_ms, pb_g_day, pb_percent_ms')
    .eq('breed_type', breedType)
    .eq('production_phase', productionPhase)
    .eq('production_system', system)
    .order('body_weight_kg', { ascending: true })

  if (!data || data.length === 0) return null

  // Encontrar o peso mais próximo
  let closest = data[0]
  let minDiff = Infinity
  for (const row of data) {
    const diff = Math.abs((row as any).body_weight_kg - weight)
    if (diff < minDiff) {
      minDiff = diff
      closest = row
    }
  }
  return closest
}

function getBreedTypeForSim(breedName: string | null): string {
  if (!breedName) return 'zebuino'
  const name = breedName.toLowerCase()
  if (name.startsWith('f1') || name.includes('cruzamento')) return 'cruzado_f1'
  if (['angus', 'hereford', 'charolês', 'charolais', 'limousin', 'simental'].some(t => name.includes(t))) return 'taurino'
  return 'zebuino'
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = simulateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const {
      herd_id, custom_arroba_price, custom_costs, custom_animal_price, cycle_months,
    } = parsed.data

    const { data: herd } = await supabase
      .from('herds')
      .select('*, farm:farms!inner(user_id), product:products(id, name, line, package_kg), breed:breeds(name)')
      .eq('id', herd_id)
      .single()

    if (!herd || herd.farm.user_id !== user.id) {
      return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 })
    }

    // Buscar pesagens do lote para score genético
    const { data: herdHistory } = await supabase
      .from('herd_history')
      .select('weight_kg, created_at')
      .eq('herd_id', herd_id)
      .order('created_at', { ascending: true })

    // Calcular GMD real entre pesagens consecutivas
    const weighingHistoryItems: WeighingHistory[] = []
    if (herdHistory && herdHistory.length >= 2) {
      for (let i = 1; i < herdHistory.length; i++) {
        const prev = herdHistory[i - 1]
        const curr = herdHistory[i]
        if (prev.weight_kg && curr.weight_kg) {
          const daysDiff = (new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime()) / (1000 * 60 * 60 * 24)
          if (daysDiff > 0) {
            const gmdReal = (curr.weight_kg - prev.weight_kg) / daysDiff
            weighingHistoryItems.push({ gmd_real: gmdReal, date: curr.created_at })
          }
        }
      }
    }

    // Calcular score genético
    const geneticInput: GeneticInput = {
      breed_name: (herd.breed as any)?.name || null,
      genetic_info: (herd as any).genetic_info || null,
      phase: herd.main_phase,
    }
    const geneticScore = calculateGeneticScore(geneticInput, weighingHistoryItems)

    const product = herd.product as any
    if (!product) {
      return NextResponse.json({ error: 'Lote sem produto recomendado. Gere uma recomendação primeiro.' }, { status: 400 })
    }

    const line = (product.line || '').toLowerCase()
    const arrobaPrice = custom_arroba_price || ARROBA_PRICES.current

    // Buscar dados BR-CORTE para CMS real
    const breedType = getBreedTypeForSim((herd.breed as any)?.name || null)
    const isConfinamento = herd.main_phase === 'engorda' && line === 'concentrado'
    const nutrientReq = await fetchNutrientReqForSimulation(
      supabase, breedType, herd.avg_weight_kg || 350, herd.main_phase, isConfinamento
    )

    // 1. Custo do suplemento — usa CMS do BR-CORTE se disponível
    let consumptionKgDay = CONSUMPTION_PER_LINE[line] || 0.1
    if (nutrientReq?.cms_kg_day) {
      // Ajustar consumo de suplemento com base no CMS real
      if (line === 'concentrado') consumptionKgDay = nutrientReq.cms_kg_day * 0.35
      else if (line === 'rk') consumptionKgDay = nutrientReq.cms_kg_day * 0.18
      else if (line === 'fazcarne') consumptionKgDay = nutrientReq.cms_kg_day * 0.12
      else if (line === 'prot.energ') consumptionKgDay = nutrientReq.cms_kg_day * 0.10
      else if (line === 'proteico') consumptionKgDay = nutrientReq.cms_kg_day * 0.06
    }
    const costPerKg = SUPPLEMENT_COST_PER_KG[line] || 3.50
    const dailySupplementCost = consumptionKgDay * costPerKg

    // 2. Custos operacionais
    let costKey = herd.main_phase
    if (herd.main_phase === 'engorda' && line === 'concentrado') costKey = 'engorda_confinamento'
    const defaults = DEFAULT_COSTS[costKey] || DEFAULT_COSTS['recria']

    const costs = {
      suplemento: dailySupplementCost,
      pasto: custom_costs?.pasto ?? defaults.pasto,
      mao_obra: custom_costs?.mao_obra ?? defaults.mao_obra,
      sanidade: custom_costs?.sanidade ?? defaults.sanidade,
      outros: custom_costs?.outros ?? defaults.outros,
    }

    const dailyOperationalCost = costs.suplemento + costs.pasto + costs.mao_obra + costs.sanidade + costs.outros
    const monthlyOperationalCost = dailyOperationalCost * 30

    // 3. Custo do animal
    const animalPrice = custom_animal_price ?? ANIMAL_PRICES[herd.main_phase] ?? 3500

    // 4. Ciclo em meses
    const defaultCycleMonths: Record<string, number> = {
      cria: 8, recria: 12, engorda: 5, lactacao: 12, reproducao: 12,
    }
    const months = cycle_months ?? defaultCycleMonths[herd.main_phase] ?? 6

    // 5. GMD — usa genetic score se disponível, fallback para tabela fixa
    let gmdKey = herd.main_phase
    if (herd.main_phase === 'engorda' && line === 'rk') gmdKey = 'engorda_rk'
    if (herd.main_phase === 'recria' && (line === 'proteico' || line === 'prot.energ')) gmdKey = 'recria_proteico'
    const gmdFallback = GMD_ESTIMATES[gmdKey] || 0.45

    // Usar GMD ajustado pela genética, ou fallback se não tem raça nem pesagens
    const hasGeneticData = geneticInput.breed_name !== null || weighingHistoryItems.length > 0
    const gmd = hasGeneticData ? geneticScore.gmd_adjusted : gmdFallback
    const carcassYield = hasGeneticData ? geneticScore.carcass_yield : 0.52

    // 6. Cálculos operacionais
    const dailyGainArroba = (gmd * carcassYield) / 15
    const monthlyGainArroba = dailyGainArroba * 30
    const revenuePerHeadMonth = monthlyGainArroba * arrobaPrice
    const operationalProfitMonth = revenuePerHeadMonth - monthlyOperationalCost
    const operationalROI = monthlyOperationalCost > 0 ? ((revenuePerHeadMonth - monthlyOperationalCost) / monthlyOperationalCost) * 100 : 0

    // 7. Ciclo completo
    const totalOperationalCostCycle = monthlyOperationalCost * months
    const totalInvestment = animalPrice + totalOperationalCostCycle

    const initialWeight = herd.avg_weight_kg || 350
    const finalWeight = initialWeight + (gmd * months * 30)
    const finalArroba = (finalWeight * carcassYield) / 15
    const saleRevenue = finalArroba * arrobaPrice

    // Impostos por cabeça
    const taxFunrural = saleRevenue * TAXES.funrural
    const taxSenar = saleRevenue * TAXES.senar
    const taxFethab = TAXES.fethab_per_head // por cabeça
    const totalTaxesPerHead = taxFunrural + taxSenar + taxFethab

    // Receita líquida (após impostos)
    const netRevenue = saleRevenue - totalTaxesPerHead

    // Lucro por cabeça (receita líquida - investimento)
    const totalProfit = netRevenue - totalInvestment
    const totalROI = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0
    const profitPerMonth = totalProfit / months
    const costPerArrobaProduced = totalInvestment / finalArroba

    // ROI anualizado para comparar com Selic
    const annualizedROI = months > 0 ? (Math.pow(1 + totalROI / 100, 12 / months) - 1) * 100 : 0
    const selicRate = 13.25 // Selic atual

    // Saúde financeira
    let healthLevel = 'danger'
    let healthLabel = 'Prejuízo'
    let healthColor = 'red'
    if (totalROI >= 20) { healthLevel = 'excellent'; healthLabel = 'Excelente'; healthColor = 'green' }
    else if (totalROI >= 10) { healthLevel = 'good'; healthLabel = 'Bom'; healthColor = 'green' }
    else if (totalROI >= 5) { healthLevel = 'moderate'; healthLabel = 'Moderado'; healthColor = 'yellow' }
    else if (totalROI >= 0) { healthLevel = 'low'; healthLabel = 'Baixo - considere alternativas'; healthColor = 'yellow' }

    // Taxa de mortalidade
    const mortalityRate = parsed.data.mortality_rate ?? DEFAULT_MORTALITY[costKey] ?? 2.0
    const mortalityFraction = mortalityRate / 100

    // Cabeças efetivas (sobrevivem ao ciclo)
    const effectiveHeads = Math.round(herd.head_count * (1 - mortalityFraction))
    const deadHeads = herd.head_count - effectiveHeads

    // Custo perdido nos animais mortos (investimento até metade do ciclo em média)
    const avgInvestmentPerDead = animalPrice + (monthlyOperationalCost * (months / 2))
    const mortalityLoss = deadHeads * avgInvestmentPerDead

    // Recalcular lucro do lote considerando mortalidade
    const totalLotRevenue = netRevenue * effectiveHeads
    const totalLotCost = totalInvestment * herd.head_count // custo foi em todos, inclusive os que morreram
    const totalLotProfit = totalLotRevenue - totalLotCost
    const totalLotInvestment = totalLotCost

    // Projeção de abate
    let daysToTarget = null
    let projectedWeight = null
    if (herd.main_phase === 'engorda' && herd.avg_weight_kg) {
      const targetWeight = 540
      if (herd.avg_weight_kg < targetWeight) {
        daysToTarget = Math.ceil((targetWeight - herd.avg_weight_kg) / gmd)
        projectedWeight = targetWeight
      }
    }

    const costBreakdown = {
      suplemento: { value: costs.suplemento * 30, pct: dailyOperationalCost > 0 ? (costs.suplemento / dailyOperationalCost) * 100 : 0 },
      pasto: { value: costs.pasto * 30, pct: dailyOperationalCost > 0 ? (costs.pasto / dailyOperationalCost) * 100 : 0 },
      mao_obra: { value: costs.mao_obra * 30, pct: dailyOperationalCost > 0 ? (costs.mao_obra / dailyOperationalCost) * 100 : 0 },
      sanidade: { value: costs.sanidade * 30, pct: dailyOperationalCost > 0 ? (costs.sanidade / dailyOperationalCost) * 100 : 0 },
      outros: { value: costs.outros * 30, pct: dailyOperationalCost > 0 ? (costs.outros / dailyOperationalCost) * 100 : 0 },
    }

    await supabase.from('simulations').insert({
      user_id: user.id, herd_id: herd.id,
      result: {
        arroba_price: arrobaPrice, gmd, costs, animal_price: animalPrice,
        cycle_months: months, total_investment: totalInvestment,
        sale_revenue: saleRevenue, total_profit: totalProfit, total_roi: totalROI,
        health_level: healthLevel, annualized_roi: annualizedROI,
      }
    })

    return NextResponse.json({
      herd_name: herd.name, head_count: herd.head_count,
      breed_name: herd.breed?.name || 'Não informada',
      phase: herd.main_phase, avg_weight: herd.avg_weight_kg,
      product_name: product.name, product_line: product.line,
      arroba_price: arrobaPrice, arroba_avg_30d: ARROBA_PRICES.avg_30d, arroba_avg_90d: ARROBA_PRICES.avg_90d,
      gmd, carcass_yield: carcassYield, consumption_kg_day: consumptionKgDay,
      genetic_score: {
        declared: geneticScore.declared_score,
        learned: geneticScore.learned_score,
        final: geneticScore.final_score,
        confidence: geneticScore.confidence,
        weighing_count: geneticScore.weighing_count,
        gmd_potential: geneticScore.gmd_potential,
        gmd_reference: geneticScore.gmd_reference,
        gmd_adjusted: geneticScore.gmd_adjusted,
        gmd_by_phase: geneticScore.gmd_by_phase,
        genetic_group: geneticScore.genetic_group,
      },
      costs, cost_breakdown: costBreakdown,
      monthly_operational_cost: monthlyOperationalCost,
      monthly_gain_arroba: monthlyGainArroba,
      revenue_per_head_month: revenuePerHeadMonth,
      operational_profit_month: operationalProfitMonth,
      operational_roi: operationalROI,
      animal_price: animalPrice, cycle_months: months,
      initial_weight: initialWeight, final_weight: Math.round(finalWeight),
      final_arroba: finalArroba, sale_revenue: saleRevenue,
      total_operational_cost: totalOperationalCostCycle,
      total_investment: totalInvestment, total_profit: totalProfit,
      total_roi: totalROI, profit_per_month: profitPerMonth,
      cost_per_arroba: costPerArrobaProduced,
      annualized_roi: annualizedROI, selic_rate: selicRate,
      health_level: healthLevel, health_label: healthLabel, health_color: healthColor,
      total_lot_investment: totalLotInvestment, total_lot_profit: totalLotProfit,
      mortality_rate: mortalityRate,
      effective_heads: effectiveHeads,
      dead_heads: deadHeads,
      mortality_loss: mortalityLoss,
      taxes: {
        funrural: taxFunrural,
        senar: taxSenar,
        fethab: taxFethab,
        total_per_head: totalTaxesPerHead,
        total_lot: totalTaxesPerHead * effectiveHeads,
      },
      gross_revenue: saleRevenue,
      net_revenue: netRevenue,
      days_to_target: daysToTarget, projected_weight: projectedWeight,
      br_corte_data: nutrientReq ? {
        cms_kg_day: nutrientReq.cms_kg_day,
        cms_percent_pv: nutrientReq.cms_percent_pv,
        ndt_percent_ms: nutrientReq.ndt_percent_ms,
        pb_g_day: nutrientReq.pb_g_day,
        pb_percent_ms: nutrientReq.pb_percent_ms,
        source: 'BR-CORTE 4a Ed. (2023)',
      } : null,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

