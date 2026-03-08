import { createServerSupabaseClient } from '@/lib/supabase-server'
import { detectWaste } from '@/lib/waste-detector'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const herdId = request.nextUrl.searchParams.get('herd_id')
    if (!herdId) return NextResponse.json({ error: 'herd_id obrigatório' }, { status: 400 })

    // Buscar lote
    const { data: herd } = await supabase
      .from('herds')
      .select('*, farm:farms!inner(user_id)')
      .eq('id', herdId)
      .single()

    if (!herd || herd.farm.user_id !== user.id) {
      return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 })
    }

    // Buscar custos registrados
    const { data: custosLote } = await supabase
      .from('custos_lote')
      .select('category, value, period')
      .eq('herd_id', herdId)
      .eq('user_id', user.id)

    // Buscar custos sanitários reais
    const { data: healthEvents } = await supabase
      .from('health_events')
      .select('total_cost')
      .eq('herd_id', herdId)

    // Dias no lote
    const createdDate = new Date(herd.created_at)
    const now = new Date()
    const daysInLot = Math.max(1, Math.round((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)))

    // Montar custos diários (mesma lógica do DRE)
    const categoryMap: Record<string, string> = {
      nutricao: 'suplemento', pasto: 'pasto', mao_obra: 'mao_obra', sanitario: 'sanidade', outros: 'outros',
    }

    let dailyCosts: Record<string, number>
    let hasRealCosts = false

    if (custosLote && custosLote.length > 0) {
      dailyCosts = { suplemento: 0, pasto: 0, mao_obra: 0, sanidade: 0, outros: 0 }
      for (const custo of custosLote) {
        const mapped = categoryMap[custo.category] || 'outros'
        let dailyValue = Number(custo.value) || 0
        if (custo.period === 'mensal') dailyValue = dailyValue / 30
        else if (custo.period === 'unico') dailyValue = dailyValue / daysInLot
        dailyCosts[mapped] = (dailyCosts[mapped] || 0) + dailyValue
      }
      hasRealCosts = true
    } else {
      // Usar custos padrão estimados (fallback do DRE)
      const { data: simulations } = await supabase
        .from('simulations')
        .select('result')
        .eq('herd_id', herdId)
        .order('created_at', { ascending: false })
        .limit(1)

      dailyCosts = simulations && simulations.length > 0 && simulations[0].result?.costs
        ? simulations[0].result.costs
        : { suplemento: 0.32, pasto: 2.20, mao_obra: 1.40, sanidade: 0.50, outros: 0.80 }
    }

    // Sobrescrever sanidade com custo real
    if (healthEvents && healthEvents.length > 0) {
      const totalHealthCost = healthEvents.reduce((sum, e) => sum + (Number(e.total_cost) || 0), 0)
      if (totalHealthCost > 0) {
        dailyCosts.sanidade = totalHealthCost / (herd.head_count || 1) / daysInLot
      }
    }

    // Calcular GMD real
    const { data: weighings } = await supabase
      .from('herd_history')
      .select('created_at, details')
      .eq('herd_id', herdId)
      .eq('event_type', 'pesagem')
      .order('created_at', { ascending: true })

    let gmdReal: number | null = null
    if (weighings && weighings.length >= 2) {
      const first = weighings[0]
      const last = weighings[weighings.length - 1]
      const firstWeight = (first.details as any)?.peso_novo
      const lastWeight = (last.details as any)?.peso_novo
      if (firstWeight && lastWeight) {
        const daysDiff = (new Date(last.created_at).getTime() - new Date(first.created_at).getTime()) / (1000 * 60 * 60 * 24)
        if (daysDiff > 0) gmdReal = (lastWeight - firstWeight) / daysDiff
      }
    }

    // Detectar desperdícios
    const report = detectWaste(
      dailyCosts,
      herd.main_phase,
      herd.head_count || 1,
      gmdReal,
      daysInLot,
    )

    return NextResponse.json({
      herd_id: herdId,
      herd_name: herd.name,
      phase: herd.main_phase,
      head_count: herd.head_count,
      days_in_lot: daysInLot,
      has_real_costs: hasRealCosts,
      gmd_real: gmdReal ? Math.round(gmdReal * 1000) / 1000 : null,
      report,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
