import { createServerSupabaseClient } from '@/lib/supabase-server'
import { animalSchema } from '@/lib/schemas'
import { NextRequest, NextResponse } from 'next/server'

// Listar animais de um lote com filtros opcionais
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const herdId = request.nextUrl.searchParams.get('herd_id')
    if (!herdId) return NextResponse.json({ error: 'herd_id obrigatório' }, { status: 400 })

    const status = request.nextUrl.searchParams.get('status')
    const sex = request.nextUrl.searchParams.get('sex')

    // Montar query base
    let query = supabase
      .from('animals')
      .select('*, breed:breeds(name)')
      .eq('herd_id', herdId)
      .eq('user_id', user.id)
      .order('ear_tag', { ascending: true })

    // Filtros opcionais
    if (status) query = query.eq('status', status)
    if (sex) query = query.eq('sex', sex)

    const { data: animals, error } = await query
    if (error) throw error

    // Buscar peso médio do lote para comparação
    const { data: herd } = await supabase
      .from('herds')
      .select('avg_weight_kg')
      .eq('id', herdId)
      .single()

    const herdAvgWeight = herd?.avg_weight_kg || 0

    // Para cada animal, calcular GMD individual
    const animalsComGmd = await Promise.all(
      (animals || []).map(async (animal) => {
        // Buscar últimas 2 pesagens para calcular GMD
        const { data: pesagens } = await supabase
          .from('animal_weighings')
          .select('weight_kg, weighed_at')
          .eq('animal_id', animal.id)
          .order('weighed_at', { ascending: false })
          .limit(2)

        let gmd = null
        if (pesagens && pesagens.length >= 2) {
          const pesoRecente = Number(pesagens[0].weight_kg)
          const pesoAnterior = Number(pesagens[1].weight_kg)
          const dataRecente = new Date(pesagens[0].weighed_at)
          const dataAnterior = new Date(pesagens[1].weighed_at)
          const dias = Math.max(1, Math.round((dataRecente.getTime() - dataAnterior.getTime()) / (1000 * 60 * 60 * 24)))
          gmd = Math.round(((pesoRecente - pesoAnterior) / dias) * 100) / 100
        }

        // Comparação com média do lote
        const pesoAtual = Number(animal.current_weight_kg) || 0
        const diffVsLote = herdAvgWeight > 0
          ? Math.round(((pesoAtual - herdAvgWeight) / herdAvgWeight) * 10000) / 100
          : null

        return {
          ...animal,
          gmd_individual: gmd,
          diff_vs_herd_percent: diffVsLote,
          herd_avg_weight: herdAvgWeight,
        }
      })
    )

    return NextResponse.json({
      animals: animalsComGmd,
      total: animalsComGmd.length,
      herd_avg_weight: herdAvgWeight,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Cadastrar novo animal
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    const parsed = animalSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { herd_id, ear_tag, name, breed_id, sex, birth_date, entry_weight_kg, notes } = parsed.data

    // Verificar se o lote pertence ao usuário
    const { data: herd } = await supabase
      .from('herds')
      .select('*, farm:farms!inner(id, user_id)')
      .eq('id', herd_id)
      .single()

    if (!herd || herd.farm.user_id !== user.id) {
      return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 })
    }

    // Verificar se brinco já existe no lote
    const { data: existente } = await supabase
      .from('animals')
      .select('id')
      .eq('herd_id', herd_id)
      .eq('ear_tag', ear_tag)
      .maybeSingle()

    if (existente) {
      return NextResponse.json({ error: 'Brinco já cadastrado neste lote' }, { status: 409 })
    }

    // Inserir animal
    const { data: animal, error } = await supabase
      .from('animals')
      .insert({
        herd_id,
        farm_id: herd.farm.id,
        user_id: user.id,
        ear_tag,
        name: name || null,
        breed_id: breed_id || null,
        sex,
        birth_date: birth_date || null,
        entry_weight_kg: entry_weight_kg || null,
        current_weight_kg: entry_weight_kg || null,
        notes: notes || null,
      })
      .select()
      .single()

    if (error) throw error

    // Se informou peso de entrada, registrar primeira pesagem
    if (entry_weight_kg) {
      await supabase.from('animal_weighings').insert({
        animal_id: animal.id,
        weight_kg: entry_weight_kg,
        weighed_at: new Date().toISOString().split('T')[0],
        notes: 'Peso de entrada',
      })
    }

    return NextResponse.json({ success: true, animal }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
