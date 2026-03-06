import { createServerSupabaseClient } from '@/lib/supabase-server'
import { generateRecommendation } from '@/lib/recommendation-engine'
import { askClaude, buildRecommendationPrompt } from '@/lib/claude-api'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { herd_id } = await request.json()

    // Buscar lote com dados completos
    const { data: herd, error: herdError } = await supabase
      .from('herds')
      .select('*, farm:farms!inner(user_id)')
      .eq('id', herd_id)
      .single()

    if (herdError || !herd) {
      return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 })
    }

    if (herd.farm.user_id !== user.id) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Gerar recomendação
    const recommendation = await generateRecommendation(supabase, herd)

    if (!recommendation) {
      return NextResponse.json({ error: 'Nenhum produto encontrado para este perfil' }, { status: 404 })
    }

    // Buscar nomes da forrageira e raça para o prompt
    let forageName = null
    let breedName = null

    if (herd.forage_id) {
      const { data: forage } = await supabase.from('forages').select('name').eq('id', herd.forage_id).single()
      forageName = forage?.name || null
    }
    if (herd.breed_id) {
      const { data: breed } = await supabase.from('breeds').select('name').eq('id', herd.breed_id).single()
      breedName = breed?.name || null
    }

    // Gerar explicação com Claude
    const prompt = buildRecommendationPrompt({
      herdName: herd.name,
      species: herd.species,
      phase: herd.main_phase,
      headCount: herd.head_count,
      forageName,
      breedName,
      avgWeight: herd.avg_weight_kg,
      productName: recommendation.product.name,
      productLine: recommendation.product.line,
      consumptionKgDay: recommendation.consumption_kg_day,
      deficits: recommendation.deficits,
      reasons: recommendation.reasons,
      score: recommendation.score,
    })

    const claudeExplanation = await askClaude(prompt)

    // Salvar consulta no banco
    await supabase.from('consultations').insert({
      user_id: user.id,
      herd_id: herd.id,
      recommended_product_id: recommendation.product.id,
      score: recommendation.score,
      explanation: claudeExplanation,
      snapshot: {
        herd_name: herd.name,
        species: herd.species,
        phase: herd.main_phase,
        head_count: herd.head_count,
        forage_id: herd.forage_id,
        breed_id: herd.breed_id,
        deficits: recommendation.deficits,
        reasons: recommendation.reasons,
        consumption_kg_day: recommendation.consumption_kg_day,
      },
    })

    // Atualizar produto atual do lote
    await supabase
      .from('herds')
      .update({ current_product_id: recommendation.product.id })
      .eq('id', herd.id)

    return NextResponse.json({
      product: {
        id: recommendation.product.id,
        name: recommendation.product.name,
        line: recommendation.product.line,
        species: recommendation.product.species,
        package_kg: recommendation.product.package_kg,
      },
      score: recommendation.score,
      reasons: recommendation.reasons,
      deficits: recommendation.deficits,
      consumption_kg_day: recommendation.consumption_kg_day,
      explanation: claudeExplanation,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

