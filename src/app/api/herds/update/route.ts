import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { herd_id, pasture_condition, profile_completeness } = await request.json()

    if (!herd_id) {
      return NextResponse.json({ error: 'herd_id obrigatório' }, { status: 400 })
    }

    // Validar que o lote pertence ao usuário
    const { data: herd } = await supabase
      .from('herds')
      .select('*, farm:farms!inner(user_id)')
      .eq('id', herd_id)
      .single()

    if (!herd || herd.farm.user_id !== user.id) {
      return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 })
    }

    const updates: Record<string, any> = {}
    if (pasture_condition !== undefined) updates.pasture_condition = pasture_condition
    if (profile_completeness !== undefined) updates.profile_completeness = profile_completeness

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
    }

    const { error } = await supabase
      .from('herds')
      .update(updates)
      .eq('id', herd_id)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Lote atualizado com sucesso' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
