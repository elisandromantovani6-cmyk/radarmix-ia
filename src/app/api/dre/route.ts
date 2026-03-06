import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

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

    // Custos estimados (usa dados da última simulação se disponível)
    const dailyCosts = lastSim?.costs || {
      suplemento: 0.32,
      pasto: 2.20,
      mao_obra: 1.40,
      sanidade: 0.50,
      outros: 0.80,
    }

    const dailyTotal = Object.values(dailyCosts).reduce((sum: number, v: any) => sum + v, 0)
    const totalOperational = dailyTotal * daysInLot
    const animalCost = lastSim?.animal_price || 3200

    // Receita projetada
    const arrobaPrice = lastSim?.arroba_price || 320
    const carcassYield = 0.52
    const currentArroba = (currentWeight * carcassYield) / 15
    const projectedRevenue = currentArroba * arrobaPrice

    // DRE
    const totalInvestment = animalCost + totalOperational
    const grossProfit = projectedRevenue - totalInvestment
    const grossMargin = projectedRevenue > 0 ? (grossProfit / projectedRevenue) * 100 : 0
    const roi = totalInvestment > 0 ? (grossProfit / totalInvestment) * 100 : 0

    // Cenários de preço
    const scenarios = [
      { price: arrobaPrice - 30, label: 'Pessimista' },
      { price: arrobaPrice, label: 'Atual' },
      { price: arrobaPrice + 30, label: 'Otimista' },
    ].map(s => ({
      ...s,
      revenue: currentArroba * s.price,
      profit: (currentArroba * s.price) - totalInvestment,
      margin: ((currentArroba * s.price) - totalInvestment) / (currentArroba * s.price) * 100,
    }))

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
      },
      revenue: {
        arroba_price: arrobaPrice,
        projected: Math.round(projectedRevenue * 100) / 100,
        per_lot: Math.round(projectedRevenue * herd.head_count * 100) / 100,
      },
      result: {
        gross_profit: Math.round(grossProfit * 100) / 100,
        gross_margin: Math.round(grossMargin * 10) / 10,
        roi: Math.round(roi * 10) / 10,
        profit_per_lot: Math.round(grossProfit * herd.head_count * 100) / 100,
      },
      scenarios,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

