// ============================================================
// API de Radar de Preços Agro
// GET /api/prices — retorna preços, histórico e alertas
// Usa dados do rebanho para calcular economia potencial
// ============================================================

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getPriceRadar } from '@/lib/price-radar'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Buscar dados do rebanho para calcular economia
    let headCount = 100 // padrão
    let dailyConsumptionKg = 10 // padrão kg/dia por cabeça

    const { data: herds } = await supabase
      .from('herds')
      .select('head_count, daily_consumption_kg, farm:farms!inner(user_id)')
      .eq('farms.user_id', user.id)

    if (herds && herds.length > 0) {
      // Soma total de cabeças de todos os lotes
      headCount = herds.reduce((total, h) => total + (h.head_count || 0), 0)

      // Média ponderada do consumo diário
      const totalConsumption = herds.reduce((sum, h) => {
        const count = h.head_count || 0
        const consumption = h.daily_consumption_kg || 10
        return sum + (count * consumption)
      }, 0)
      dailyConsumptionKg = headCount > 0 ? totalConsumption / headCount : 10
    }

    // Mês atual para sazonalidade
    const currentMonth = new Date().getMonth() + 1

    // Gera radar de preços
    const radar = getPriceRadar(currentMonth, headCount, dailyConsumptionKg)

    // Retorna dados sem o histórico completo de 90 dias para performance
    // (frontend pode solicitar se precisar)
    const searchParams = request.nextUrl.searchParams
    const includeHistory = searchParams.get('history') === 'full'

    const items = radar.items.map(item => ({
      name: item.name,
      unit: item.unit,
      category: item.category,
      current_price: item.current_price,
      history_30d: item.history_30d,
      // Só inclui 90 dias se solicitado
      ...(includeHistory ? { history_90d: item.history_90d } : {}),
      variation_7d_percent: item.variation_7d_percent,
      variation_30d_percent: item.variation_30d_percent,
      trend: item.trend,
    }))

    return NextResponse.json({
      items,
      alerts: radar.alerts,
      last_update: radar.last_update,
      herd_summary: {
        head_count: headCount,
        daily_consumption_kg: Math.round(dailyConsumptionKg * 10) / 10,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
