import { createServerSupabaseClient } from '@/lib/supabase-server'
import { calculateGeneticScore, type GeneticInput, type WeighingHistory } from '@/lib/genetic-score'
import { NextRequest, NextResponse } from 'next/server'

// Taxa de mortalidade padrão por fase (%) - Embrapa / IMEA-MT / Assocon
const DEFAULT_MORTALITY: Record<string, number> = {
  cria: 5.0,
  recria: 2.0,
  engorda: 1.5,
  engorda_confinamento: 2.0,
  lactacao: 2.0,
  reproducao: 1.5,
}

// Impostos na venda de gado - MT
const TAXES = {
  funrural: 0.015,
  senar: 0.002,
  fethab_per_head: 14.46,
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const herdId = request.nextUrl.searchParams.get('herd_id')
    if (!herdId) return NextResponse.json({ error: 'herd_id obrigatório' }, { status: 400 })

    const { data: herd } = await supabase
      .from('herds')
      .select('*, farm:farms!inner(user_id, name, city), product:products(name, line), breed:breeds(name), forage:forages(name)')
      .eq('id', herdId)
      .single()

    if (!herd || herd.farm.user_id !== user.id) {
      return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 })
    }

    // Buscar histórico de pesagens
    const { data: weighings } = await supabase
      .from('herd_history')
      .select('created_at, details')
      .eq('herd_id', herdId)
      .eq('event_type', 'pesagem')
      .order('created_at', { ascending: true })

    // Buscar simulações
    const { data: simulations } = await supabase
      .from('simulations')
      .select('created_at, result')
      .eq('herd_id', herdId)
      .order('created_at', { ascending: false })
      .limit(1)

    const lastSim = simulations && simulations.length > 0 ? simulations[0].result : null

    // Calcular GMD real entre pesagens para score genético
    const weighingHistoryItems: WeighingHistory[] = []
    if (weighings && weighings.length >= 2) {
      for (let i = 1; i < weighings.length; i++) {
        const prev = weighings[i - 1]
        const curr = weighings[i]
        const prevWeight = (prev.details as any)?.peso_novo
        const currWeight = (curr.details as any)?.peso_novo
        if (prevWeight && currWeight) {
          const daysDiff = (new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime()) / (1000 * 60 * 60 * 24)
          if (daysDiff > 0) {
            const gmdCalc = (currWeight - prevWeight) / daysDiff
            weighingHistoryItems.push({ gmd_real: gmdCalc, date: curr.created_at })
          }
        }
      }
    }

    // Score genético
    const geneticInput: GeneticInput = {
      breed_name: (herd.breed as any)?.name || null,
      genetic_info: (herd as any).genetic_info || null,
      phase: herd.main_phase,
    }
    const geneticScore = calculateGeneticScore(geneticInput, weighingHistoryItems)
    const hasGeneticData = geneticInput.breed_name !== null || weighingHistoryItems.length > 0

    // Buscar custos registrados na tabela custos_lote
    const { data: custosLote } = await supabase
      .from('custos_lote')
      .select('category, value, period')
      .eq('herd_id', herdId)
      .eq('user_id', user.id)

    // Buscar custos sanitários reais dos health_events
    const { data: healthEvents } = await supabase
      .from('health_events')
      .select('total_cost')
      .eq('herd_id', herdId)

    // Calcular DRE
    const initialWeight = weighings && weighings.length > 0
      ? (weighings[0].details as any)?.peso_novo || herd.avg_weight_kg || 350
      : herd.avg_weight_kg || 350
    const currentWeight = herd.avg_weight_kg || 350
    const gainKg = currentWeight - initialWeight

    // Calcular dias no lote
    const createdDate = new Date(herd.created_at)
    const now = new Date()
    const daysInLot = Math.max(1, Math.round((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)))
    const monthsInLot = daysInLot / 30

    const gmdReal = daysInLot > 0 ? gainKg / daysInLot : 0

    // Custos: prioriza custos_lote registrados > simulação > fallback
    const categoryMap: Record<string, string> = {
      nutricao: 'suplemento', pasto: 'pasto', mao_obra: 'mao_obra', sanitario: 'sanidade', outros: 'outros',
    }
    let dailyCosts: Record<string, number>
    let costSource: 'registrado' | 'estimado'

    if (custosLote && custosLote.length > 0) {
      dailyCosts = { suplemento: 0, pasto: 0, mao_obra: 0, sanidade: 0, outros: 0 }
      for (const custo of custosLote) {
        const mapped = categoryMap[custo.category] || 'outros'
        let dailyValue = Number(custo.value) || 0
        if (custo.period === 'mensal') dailyValue = dailyValue / 30
        else if (custo.period === 'unico') dailyValue = dailyValue / daysInLot
        dailyCosts[mapped] = (dailyCosts[mapped] || 0) + dailyValue
      }
      costSource = 'registrado'
    } else {
      dailyCosts = lastSim?.costs || {
        suplemento: 0.32, pasto: 2.20, mao_obra: 1.40, sanidade: 0.50, outros: 0.80,
      }
      costSource = 'estimado'
    }

    // Sobrescrever sanidade com custo real dos health_events se disponível
    let healthCostsReal = false
    if (healthEvents && healthEvents.length > 0) {
      const totalHealthCost = healthEvents.reduce((sum, e) => sum + (Number(e.total_cost) || 0), 0)
      const headCount = herd.head_count || 1
      if (totalHealthCost > 0) {
        dailyCosts.sanidade = totalHealthCost / headCount / daysInLot
        healthCostsReal = true
      }
    }

    const dailyTotal = Object.values(dailyCosts).reduce((sum: number, v: any) => sum + v, 0)
    const totalOperational = dailyTotal * daysInLot
    const animalCost = lastSim?.animal_price || 3200

    // Receita projetada
    const arrobaPrice = lastSim?.arroba_price || 320
    const carcassYield = hasGeneticData ? geneticScore.carcass_yield : 0.52
    const currentArroba = (currentWeight * carcassYield) / 15
    const projectedRevenue = currentArroba * arrobaPrice

    // Impostos por cabeça
    const taxFunrural = projectedRevenue * TAXES.funrural
    const taxSenar = projectedRevenue * TAXES.senar
    const taxFethab = TAXES.fethab_per_head
    const totalTaxesPerHead = taxFunrural + taxSenar + taxFethab
    const netRevenue = projectedRevenue - totalTaxesPerHead

    // Mortalidade
    const mortalityRate = DEFAULT_MORTALITY[herd.main_phase] ?? 2.0
    const mortalityFraction = mortalityRate / 100
    const effectiveHeads = Math.round((herd.head_count || 1) * (1 - mortalityFraction))
    const deadHeads = (herd.head_count || 1) - effectiveHeads
    const avgInvestmentPerDead = animalCost + (dailyTotal * daysInLot / 2)
    const mortalityLoss = deadHeads * avgInvestmentPerDead

    // DRE
    const totalInvestment = animalCost + totalOperational
    const grossProfit = netRevenue - totalInvestment
    const grossMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0
    const roi = totalInvestment > 0 ? (grossProfit / totalInvestment) * 100 : 0

    // Cenários de preço
    const scenarios = [
      { price: arrobaPrice - 30, label: 'Pessimista' },
      { price: arrobaPrice, label: 'Atual' },
      { price: arrobaPrice + 30, label: 'Otimista' },
    ].map(s => {
      const rev = currentArroba * s.price
      const taxTotal = rev * TAXES.funrural + rev * TAXES.senar + TAXES.fethab_per_head
      const net = rev - taxTotal
      return {
        ...s,
        revenue: rev,
        net_revenue: net,
        profit: net - totalInvestment,
        margin: (net - totalInvestment) / net * 100,
      }
    })

    // Evolução de peso
    const weightHistory = (weighings || []).map((w: any) => ({
      date: new Date(w.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      weight: (w.details as any)?.peso_novo || 0,
      gmd: (w.details as any)?.gmd_real || null,
    }))

    return NextResponse.json({
      herd: {
        name: herd.name,
        species: herd.species,
        phase: herd.main_phase,
        head_count: herd.head_count,
        breed: herd.breed?.name,
        forage: herd.forage?.name,
        product: herd.product?.name,
        product_line: herd.product?.line,
      },
      farm: { name: herd.farm.name, city: herd.farm.city },
      period: {
        days: daysInLot,
        months: Math.round(monthsInLot * 10) / 10,
        start: createdDate.toLocaleDateString('pt-BR'),
      },
      weight: {
        initial: initialWeight,
        current: currentWeight,
        gain: gainKg,
        gmd_real: Math.round(gmdReal * 100) / 100,
        arroba_current: Math.round(currentArroba * 100) / 100,
        history: weightHistory,
      },
      costs: {
        animal: animalCost,
        daily_breakdown: dailyCosts,
        daily_total: Math.round(dailyTotal * 100) / 100,
        total_operational: Math.round(totalOperational * 100) / 100,
        total_investment: Math.round(totalInvestment * 100) / 100,
        per_head: {
          operational_month: Math.round(dailyTotal * 30 * 100) / 100,
        },
        source: costSource,
        health_costs_real: healthCostsReal,
      },
      revenue: {
        arroba_price: arrobaPrice,
        projected: Math.round(projectedRevenue * 100) / 100,
        gross_revenue: Math.round(projectedRevenue * 100) / 100,
        net_revenue: Math.round(netRevenue * 100) / 100,
        per_lot: Math.round(netRevenue * effectiveHeads * 100) / 100,
      },
      taxes: {
        funrural: Math.round(taxFunrural * 100) / 100,
        senar: Math.round(taxSenar * 100) / 100,
        fethab: taxFethab,
        total_per_head: Math.round(totalTaxesPerHead * 100) / 100,
        total_lot: Math.round(totalTaxesPerHead * effectiveHeads * 100) / 100,
      },
      mortality: {
        rate: mortalityRate,
        effective_heads: effectiveHeads,
        dead_heads: deadHeads,
        loss: Math.round(mortalityLoss * 100) / 100,
      },
      result: {
        gross_profit: Math.round(grossProfit * 100) / 100,
        gross_margin: Math.round(grossMargin * 10) / 10,
        roi: Math.round(roi * 10) / 10,
        profit_per_lot: Math.round(grossProfit * effectiveHeads * 100) / 100,
      },
      scenarios,
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
        carcass_yield: geneticScore.carcass_yield,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

