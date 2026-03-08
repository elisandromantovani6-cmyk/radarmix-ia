import { createServerSupabaseClient } from '@/lib/supabase-server'
import { animalWeighSchema } from '@/lib/schemas'
import { NextRequest, NextResponse } from 'next/server'

// Registrar pesagem individual do animal
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

    const parsed = animalWeighSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { weight_kg, weighed_at, notes } = parsed.data
    const dataRegistro = weighed_at || new Date().toISOString().split('T')[0]

    // Verificar se animal pertence ao usuário
    const { data: animal } = await supabase
      .from('animals')
      .select('id, current_weight_kg, herd_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!animal) {
      return NextResponse.json({ error: 'Animal não encontrado' }, { status: 404 })
    }

    const pesoAnterior = Number(animal.current_weight_kg) || 0

    // Registrar pesagem no histórico
    const { error: errPesagem } = await supabase.from('animal_weighings').insert({
      animal_id: id,
      weight_kg,
      weighed_at: dataRegistro,
      notes: notes || null,
    })
    if (errPesagem) throw errPesagem

    // Atualizar peso atual do animal
    const { error: errUpdate } = await supabase
      .from('animals')
      .update({
        current_weight_kg: weight_kg,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (errUpdate) throw errUpdate

    // Calcular GMD individual (entre última pesagem anterior e esta)
    let gmdIndividual = null
    if (pesoAnterior > 0) {
      // Buscar data da pesagem anterior
      const { data: pesagemAnterior } = await supabase
        .from('animal_weighings')
        .select('weighed_at')
        .eq('animal_id', id)
        .order('weighed_at', { ascending: false })
        .range(1, 1) // pegar a segunda mais recente (a primeira é a que acabamos de inserir)

      let diasEntrePesagens = 30 // padrão
      if (pesagemAnterior && pesagemAnterior.length > 0) {
        const dataAnterior = new Date(pesagemAnterior[0].weighed_at)
        const dataAtual = new Date(dataRegistro)
        diasEntrePesagens = Math.max(1, Math.round(
          (dataAtual.getTime() - dataAnterior.getTime()) / (1000 * 60 * 60 * 24)
        ))
      }

      gmdIndividual = Math.round(((weight_kg - pesoAnterior) / diasEntrePesagens) * 100) / 100
    }

    // Buscar GMD do lote para comparação
    const { data: herd } = await supabase
      .from('herds')
      .select('avg_weight_kg')
      .eq('id', animal.herd_id)
      .single()

    // Comparar peso do animal com média do lote
    const herdAvgWeight = Number(herd?.avg_weight_kg) || 0
    const diffVsLote = herdAvgWeight > 0
      ? Math.round(((weight_kg - herdAvgWeight) / herdAvgWeight) * 10000) / 100
      : null

    return NextResponse.json({
      success: true,
      peso_anterior: pesoAnterior,
      peso_novo: weight_kg,
      ganho: pesoAnterior > 0 ? Math.round((weight_kg - pesoAnterior) * 100) / 100 : null,
      gmd_individual: gmdIndividual,
      herd_avg_weight: herdAvgWeight,
      diff_vs_herd_percent: diffVsLote,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
