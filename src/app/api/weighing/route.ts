import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { herd_id, weight_kg, date, notes } = await request.json()

    // Buscar lote
    const { data: herd } = await supabase
      .from('herds')
      .select('*, farm:farms!inner(user_id)')
      .eq('id', herd_id)
      .single()

    if (!herd || herd.farm.user_id !== user.id) {
      return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 })
    }

    const oldWeight = herd.avg_weight_kg
    const newWeight = parseFloat(weight_kg)

    // Calcular GMD real se tinha peso anterior
    let gmdReal = null
    if (oldWeight && oldWeight > 0) {
      // Buscar última pesagem do histórico
      const { data: lastWeighing } = await supabase
        .from('herd_history')
        .select('created_at, details')
        .eq('herd_id', herd_id)
        .eq('event_type', 'pesagem')
        .order('created_at', { ascending: false })
        .limit(1)

      let daysBetween = 30 // padrão se não tem pesagem anterior
      if (lastWeighing && lastWeighing.length > 0) {
        const lastDate = new Date(lastWeighing[0].created_at)
        const currentDate = date ? new Date(date) : new Date()
        daysBetween = Math.max(1, Math.round((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)))
      }

      gmdReal = (newWeight - oldWeight) / daysBetween
    }

    // Atualizar peso no lote
    await supabase.from('herds').update({
      avg_weight_kg: newWeight,
    }).eq('id', herd_id)

    // Registrar no histórico
    await supabase.from('herd_history').insert({
      herd_id,
      event_type: 'pesagem',
      details: {
        peso_anterior: oldWeight,
        peso_novo: newWeight,
        ganho: oldWeight ? newWeight - oldWeight : null,
        gmd_real: gmdReal ? Math.round(gmdReal * 100) / 100 : null,
        data: date || new Date().toISOString().split('T')[0],
        observacao: notes || null,
      },
    })

    // Projeção de abate atualizada
    let daysToTarget = null
    const targetWeight = 540
    if (newWeight < targetWeight && gmdReal && gmdReal > 0) {
      daysToTarget = Math.ceil((targetWeight - newWeight) / gmdReal)
    }

    return NextResponse.json({
      success: true,
      old_weight: oldWeight,
      new_weight: newWeight,
      gain: oldWeight ? newWeight - oldWeight : null,
      gmd_real: gmdReal ? Math.round(gmdReal * 100) / 100 : null,
      days_to_target: daysToTarget,
      target_weight: targetWeight,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const herdId = request.nextUrl.searchParams.get('herd_id')
    if (!herdId) return NextResponse.json({ error: 'herd_id obrigatório' }, { status: 400 })

    const { data: history } = await supabase
      .from('herd_history')
      .select('created_at, details')
      .eq('herd_id', herdId)
      .eq('event_type', 'pesagem')
      .order('created_at', { ascending: true })

    return NextResponse.json({ history: history || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

