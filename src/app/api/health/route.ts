import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// GET: lista eventos sanitários do produtor (filtro por herd_id e type)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const herdId = request.nextUrl.searchParams.get('herd_id')
    const eventType = request.nextUrl.searchParams.get('type')

    // Montar consulta base
    let query = supabase
      .from('health_events')
      .select('*, protocol:health_protocols(name, type, frequency_days)')
      .eq('user_id', user.id)
      .order('event_date', { ascending: false })

    // Filtros opcionais
    if (herdId) query = query.eq('herd_id', herdId)
    if (eventType) query = query.eq('event_type', eventType)

    const { data: events, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Erro ao buscar eventos sanitários' }, { status: 500 })
    }

    return NextResponse.json({ events: events || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST: registrar novo evento sanitário
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    const {
      herd_id,
      protocol_id,
      event_type,
      product_name,
      dose,
      cost_per_head,
      head_count,
      notes,
      event_date,
    } = body

    // Validações básicas
    if (!event_type || !product_name) {
      return NextResponse.json({ error: 'Tipo e nome do produto são obrigatórios' }, { status: 400 })
    }

    if (!herd_id) {
      return NextResponse.json({ error: 'Lote é obrigatório' }, { status: 400 })
    }

    // Buscar lote para validar propriedade e pegar farm_id
    const { data: herd } = await supabase
      .from('herds')
      .select('*, farm:farms!inner(id, user_id)')
      .eq('id', herd_id)
      .single()

    if (!herd || herd.farm.user_id !== user.id) {
      return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 })
    }

    // Calcular custo total
    const costPerHead = cost_per_head ? parseFloat(cost_per_head) : null
    const count = head_count ? parseInt(head_count) : herd.head_count
    const totalCost = costPerHead && count ? costPerHead * count : null

    // Calcular próxima data baseada no frequency_days do protocolo
    let nextDueDate: string | null = null
    if (protocol_id) {
      const { data: protocol } = await supabase
        .from('health_protocols')
        .select('frequency_days')
        .eq('id', protocol_id)
        .single()

      if (protocol?.frequency_days) {
        const baseDate = event_date ? new Date(event_date) : new Date()
        baseDate.setDate(baseDate.getDate() + protocol.frequency_days)
        nextDueDate = baseDate.toISOString().split('T')[0]
      }
    }

    // Inserir evento
    const { data: newEvent, error } = await supabase
      .from('health_events')
      .insert({
        farm_id: herd.farm.id,
        user_id: user.id,
        herd_id,
        protocol_id: protocol_id || null,
        event_type,
        product_name,
        dose: dose || null,
        cost_per_head: costPerHead,
        head_count: count,
        total_cost: totalCost,
        notes: notes || null,
        event_date: event_date || new Date().toISOString().split('T')[0],
        next_due_date: nextDueDate,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Erro ao registrar evento sanitário: ' + error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      event: newEvent,
      message: 'Evento sanitário registrado com sucesso!',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
