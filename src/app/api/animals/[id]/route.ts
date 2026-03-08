import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// Buscar animal individual com histórico completo
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { id } = await params

    // Buscar dados do animal
    const { data: animal, error } = await supabase
      .from('animals')
      .select('*, breed:breeds(name), herd:herds(name)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !animal) {
      return NextResponse.json({ error: 'Animal não encontrado' }, { status: 404 })
    }

    // Buscar histórico de pesagens
    const { data: pesagens } = await supabase
      .from('animal_weighings')
      .select('*')
      .eq('animal_id', id)
      .order('weighed_at', { ascending: true })

    // Buscar histórico de eventos
    const { data: eventos } = await supabase
      .from('animal_events')
      .select('*, from_herd:herds!animal_events_from_herd_id_fkey(name), to_herd:herds!animal_events_to_herd_id_fkey(name)')
      .eq('animal_id', id)
      .order('event_date', { ascending: false })

    // Calcular GMD individual
    let gmd = null
    if (pesagens && pesagens.length >= 2) {
      const primeira = pesagens[0]
      const ultima = pesagens[pesagens.length - 1]
      const dias = Math.max(1, Math.round(
        (new Date(ultima.weighed_at).getTime() - new Date(primeira.weighed_at).getTime()) / (1000 * 60 * 60 * 24)
      ))
      gmd = Math.round(((Number(ultima.weight_kg) - Number(primeira.weight_kg)) / dias) * 100) / 100
    }

    return NextResponse.json({
      animal,
      weighings: pesagens || [],
      events: eventos || [],
      gmd_individual: gmd,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Atualizar dados do animal
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { id } = await params
    const body = await request.json()

    // Verificar se animal pertence ao usuário
    const { data: existente } = await supabase
      .from('animals')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existente) {
      return NextResponse.json({ error: 'Animal não encontrado' }, { status: 404 })
    }

    // Campos permitidos para atualização
    const camposPermitidos: Record<string, unknown> = {}
    if (body.name !== undefined) camposPermitidos.name = body.name
    if (body.breed_id !== undefined) camposPermitidos.breed_id = body.breed_id
    if (body.sex !== undefined) camposPermitidos.sex = body.sex
    if (body.birth_date !== undefined) camposPermitidos.birth_date = body.birth_date
    if (body.notes !== undefined) camposPermitidos.notes = body.notes
    if (body.status !== undefined) camposPermitidos.status = body.status
    camposPermitidos.updated_at = new Date().toISOString()

    const { data: atualizado, error } = await supabase
      .from('animals')
      .update(camposPermitidos)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, animal: atualizado })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Descarte suave (soft delete) — marca status como 'descarte'
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { id } = await params

    // Verificar se animal pertence ao usuário
    const { data: existente } = await supabase
      .from('animals')
      .select('id, status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existente) {
      return NextResponse.json({ error: 'Animal não encontrado' }, { status: 404 })
    }

    if (existente.status === 'descarte') {
      return NextResponse.json({ error: 'Animal já está marcado para descarte' }, { status: 400 })
    }

    // Marcar como descarte (soft delete)
    const { error } = await supabase
      .from('animals')
      .update({ status: 'descarte', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error

    // Registrar evento de descarte
    await supabase.from('animal_events').insert({
      animal_id: id,
      event_type: 'descarte',
      description: 'Animal marcado para descarte',
      event_date: new Date().toISOString().split('T')[0],
    })

    return NextResponse.json({ success: true, message: 'Animal marcado para descarte' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
