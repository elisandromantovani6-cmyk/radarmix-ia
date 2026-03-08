import { createServerSupabaseClient } from '@/lib/supabase-server'
import { animalTransferSchema } from '@/lib/schemas'
import { NextRequest, NextResponse } from 'next/server'

// Transferir animal entre lotes
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { id } = await params
    const body = await request.json()

    const parsed = animalTransferSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { to_herd_id } = parsed.data

    // Buscar animal atual
    const { data: animal } = await supabase
      .from('animals')
      .select('id, herd_id, ear_tag, farm_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!animal) {
      return NextResponse.json({ error: 'Animal não encontrado' }, { status: 404 })
    }

    if (animal.herd_id === to_herd_id) {
      return NextResponse.json({ error: 'Animal já pertence a este lote' }, { status: 400 })
    }

    // Verificar se lote destino pertence ao mesmo usuário e fazenda
    const { data: loteDestino } = await supabase
      .from('herds')
      .select('id, name, farm:farms!inner(id, user_id)')
      .eq('id', to_herd_id)
      .single()

    const farm = loteDestino?.farm as unknown as { id: string; user_id: string } | null
    if (!loteDestino || !farm || farm.user_id !== user.id) {
      return NextResponse.json({ error: 'Lote destino não encontrado' }, { status: 404 })
    }

    // Verificar se brinco já existe no lote destino
    const { data: brincoExistente } = await supabase
      .from('animals')
      .select('id')
      .eq('herd_id', to_herd_id)
      .eq('ear_tag', animal.ear_tag)
      .maybeSingle()

    if (brincoExistente) {
      return NextResponse.json(
        { error: 'Já existe um animal com este brinco no lote destino' },
        { status: 409 }
      )
    }

    const loteOrigemId = animal.herd_id

    // Atualizar lote do animal
    const { error: errUpdate } = await supabase
      .from('animals')
      .update({
        herd_id: to_herd_id,
        farm_id: farm.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (errUpdate) throw errUpdate

    // Registrar evento de transferência
    await supabase.from('animal_events').insert({
      animal_id: id,
      event_type: 'transferencia',
      description: `Transferido para lote ${loteDestino.name}`,
      from_herd_id: loteOrigemId,
      to_herd_id: to_herd_id,
      event_date: new Date().toISOString().split('T')[0],
    })

    return NextResponse.json({
      success: true,
      message: `Animal transferido para o lote ${loteDestino?.name}`,
      from_herd_id: loteOrigemId,
      to_herd_id: to_herd_id,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
