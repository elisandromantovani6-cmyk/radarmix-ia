import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const {
      herd_id, custom_arroba_price, custom_costs, custom_animal_price, cycle_months,
    } = await request.json()

    const { data: herd } = await supabase
      .from('herds')
      .select('*, farm:farms!inner(user_id), product:products(id, name, line, package_kg), breed:breeds(name)')
      .eq('id', herd_id)
      .single()

    if (!herd || herd.farm.user_id !== user.id) {
      return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 })
    }

    const product = herd.product as any
    if (!product) {
      return NextResponse.json({ error: 'Lote sem produto recomendado. Gere uma recomendação primeiro.' }, { status: 400 })
    }

    const line = (product.line || '').toLowerCase()
    const arrobaPrice = custom_arroba_price || ARROBA_PRICES.current

    // 1. Custo do suplemento
    const consumptionKgDay = CONSUMPTION_PER_LINE[line] || 0.1
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

    // 5. GMD
    let gmdKey = herd.main_phase
    if (herd.main_phase === 'engorda' && line === 'rk') gmdKey = 'engorda_rk'
    if (herd.main_phase === 'recria' && (line === 'proteico' || line === 'prot.energ')) gmdKey = 'recria_proteico'
    const gmd = GMD_ESTIMATES[gmdKey] || 0.45

    const carcassYield = 0.52

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

    const totalProfit = saleRevenue - totalInvestment
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

    const totalLotProfit = totalProfit * herd.head_count
    const totalLotInvestment = totalInvestment * herd.head_count

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
      days_to_target: daysToTarget, projected_weight: projectedWeight,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

