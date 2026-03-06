import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// Helper: valida que o lote pertence ao usuário autenticado
async function validateHerdOwnership(supabase: any, herdId: string, userId: string) {
  const { data: herd } = await supabase
    .from('herds')
    .select('*, farm:farms!inner(user_id)')
    .eq('id', herdId)
    .single()

  if (!herd || herd.farm.user_id !== userId) return null
  return herd
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    const { action } = body

    if (action === 'move') {
      const { herd_id, target_herd_id, count } = body
      if (!herd_id || !target_herd_id || !count || count <= 0) {
        return NextResponse.json({ error: 'Dados inválidos para movimentação' }, { status: 400 })
      }

      const herd = await validateHerdOwnership(supabase, herd_id, user.id)
      if (!herd) return NextResponse.json({ error: 'Lote de origem não encontrado' }, { status: 404 })

      const target = await validateHerdOwnership(supabase, target_herd_id, user.id)
      if (!target) return NextResponse.json({ error: 'Lote de destino não encontrado' }, { status: 404 })

      if (count > herd.head_count) {
        return NextResponse.json({ error: 'Quantidade maior que o total do lote' }, { status: 400 })
      }

      await supabase.from('herds').update({ head_count: herd.head_count - count }).eq('id', herd_id)
      await supabase.from('herds').update({ head_count: target.head_count + count }).eq('id', target_herd_id)
      await supabase.from('herd_history').insert({
        herd_id: herd_id,
        event_type: 'movimentacao',
        details: { tipo: 'saida', quantidade: count, destino_lote: target.name, destino_id: target_herd_id },
      })
      await supabase.from('herd_history').insert({
        herd_id: target_herd_id,
        event_type: 'movimentacao',
        details: { tipo: 'entrada', quantidade: count, origem_lote: herd.name, origem_id: herd_id },
      })

      return NextResponse.json({ success: true, message: 'Cabeças movidas com sucesso' })
    }

    if (action === 'split') {
      const { herd_id, split_name, split_count } = body
      if (!herd_id || !split_name || !split_count || split_count <= 0) {
        return NextResponse.json({ error: 'Dados inválidos para divisão' }, { status: 400 })
      }

      const herd = await validateHerdOwnership(supabase, herd_id, user.id)
      if (!herd) return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 })

      if (split_count >= herd.head_count) {
        return NextResponse.json({ error: 'Quantidade deve ser menor que o total do lote' }, { status: 400 })
      }

      await supabase.from('herds').update({ head_count: herd.head_count - split_count }).eq('id', herd_id)
      await supabase.from('herds').insert({
        farm_id: herd.farm_id,
        name: split_name,
        species: herd.species,
        head_count: split_count,
        main_phase: herd.main_phase,
        forage_id: herd.forage_id,
        breed_id: herd.breed_id,
        avg_weight_kg: herd.avg_weight_kg,
        sex: herd.sex,
        pasture_condition: herd.pasture_condition,
        profile_completeness: herd.profile_completeness,
      })
      await supabase.from('herd_history').insert({
        herd_id: herd_id,
        event_type: 'divisao',
        details: { novo_lote: split_name, quantidade_movida: split_count, quantidade_restante: herd.head_count - split_count },
      })

      return NextResponse.json({ success: true, message: 'Lote dividido com sucesso' })
    }

    if (action === 'phase') {
      const { herd_id, new_phase } = body
      if (!herd_id || !new_phase) {
        return NextResponse.json({ error: 'Dados inválidos para mudança de fase' }, { status: 400 })
      }

      const herd = await validateHerdOwnership(supabase, herd_id, user.id)
      if (!herd) return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 })

      if (new_phase === herd.main_phase) {
        return NextResponse.json({ error: 'A fase selecionada é a mesma atual' }, { status: 400 })
      }

      await supabase.from('herds').update({ main_phase: new_phase, current_product_id: null }).eq('id', herd_id)
      await supabase.from('herd_history').insert({
        herd_id: herd_id,
        event_type: 'mudanca_fase',
        details: { fase_anterior: herd.main_phase, fase_nova: new_phase },
      })

      return NextResponse.json({ success: true, message: 'Fase alterada com sucesso' })
    }

    if (action === 'product') {
      const { herd_id, product_id, product_name, old_product_name, product_line } = body
      if (!herd_id || !product_id) {
        return NextResponse.json({ error: 'Dados inválidos para troca de produto' }, { status: 400 })
      }

      const herd = await validateHerdOwnership(supabase, herd_id, user.id)
      if (!herd) return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 })

      await supabase.from('herds').update({ current_product_id: product_id }).eq('id', herd_id)
      await supabase.from('herd_history').insert({
        herd_id: herd_id,
        event_type: 'troca_produto',
        details: {
          produto_anterior: old_product_name || 'Nenhum',
          produto_novo: product_name || product_id,
          linha_nova: product_line,
          motivo: 'Troca manual pelo produtor',
        },
      })

      return NextResponse.json({ success: true, message: 'Produto trocado com sucesso' })
    }

    return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { herd_id } = await request.json()
    if (!herd_id) return NextResponse.json({ error: 'herd_id obrigatório' }, { status: 400 })

    const herd = await validateHerdOwnership(supabase, herd_id, user.id)
    if (!herd) return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 })

    await supabase.from('herd_history').insert({
      herd_id: herd_id,
      event_type: 'encerramento',
      details: { nome: herd.name, cabecas: herd.head_count, motivo: 'Encerrado pelo produtor' },
    })
    await supabase.from('herds').delete().eq('id', herd_id)

    return NextResponse.json({ success: true, message: 'Lote encerrado com sucesso' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
