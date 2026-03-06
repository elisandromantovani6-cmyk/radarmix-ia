import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// GET: retorna alertas sanitários (vencidos, próximos e sugeridos)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const herdId = request.nextUrl.searchParams.get('herd_id')

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const in15days = new Date(today)
    in15days.setDate(in15days.getDate() + 15)
    const in15daysStr = in15days.toISOString().split('T')[0]
    const currentMonth = today.getMonth() + 1

    // Buscar eventos vencidos (next_due_date < hoje)
    let overdueQuery = supabase
      .from('health_events')
      .select('*, protocol:health_protocols(name, type, frequency_days)')
      .eq('user_id', user.id)
      .not('next_due_date', 'is', null)
      .lt('next_due_date', todayStr)
      .order('next_due_date', { ascending: true })

    if (herdId) overdueQuery = overdueQuery.eq('herd_id', herdId)

    const { data: overdue } = await overdueQuery

    // Buscar eventos próximos (next_due_date entre hoje e hoje+15)
    let upcomingQuery = supabase
      .from('health_events')
      .select('*, protocol:health_protocols(name, type, frequency_days)')
      .eq('user_id', user.id)
      .not('next_due_date', 'is', null)
      .gte('next_due_date', todayStr)
      .lte('next_due_date', in15daysStr)
      .order('next_due_date', { ascending: true })

    if (herdId) upcomingQuery = upcomingQuery.eq('herd_id', herdId)

    const { data: upcoming } = await upcomingQuery

    // Buscar protocolos recomendados para o mês atual
    const { data: allProtocols } = await supabase
      .from('health_protocols')
      .select('*')
      .contains('recommended_months', [currentMonth])
      .order('mandatory', { ascending: false })

    // Verificar quais protocolos já foram aplicados recentemente no lote
    let recentEventsQuery = supabase
      .from('health_events')
      .select('protocol_id, event_date')
      .eq('user_id', user.id)

    if (herdId) recentEventsQuery = recentEventsQuery.eq('herd_id', herdId)

    const { data: recentEvents } = await recentEventsQuery

    // Filtrar protocolos sugeridos: só os que não foram aplicados recentemente
    const recentProtocolIds = new Set((recentEvents || []).map(e => e.protocol_id))
    const suggested = (allProtocols || []).filter(p => {
      // Se o protocolo já foi aplicado recentemente, verificar frequency_days
      if (recentProtocolIds.has(p.id)) {
        const lastEvent = (recentEvents || []).find(e => e.protocol_id === p.id)
        if (lastEvent && p.frequency_days) {
          const lastDate = new Date(lastEvent.event_date)
          const nextDate = new Date(lastDate)
          nextDate.setDate(nextDate.getDate() + p.frequency_days)
          // Só sugerir se já passou da data prevista
          return nextDate <= today
        }
        return false
      }
      return true
    })

    return NextResponse.json({
      overdue: overdue || [],
      upcoming: upcoming || [],
      suggested: suggested || [],
      current_month: currentMonth,
      total_alerts: (overdue?.length || 0) + (upcoming?.length || 0),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
