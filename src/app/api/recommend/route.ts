import { createServerSupabaseClient } from '@/lib/supabase-server'
import { generateRecommendation } from '@/lib/recommendation-engine'
import { askClaude, buildRecommendationPrompt } from '@/lib/claude-api'
import { recommendSchema } from '@/lib/schemas'
import { checkRateLimit } from '@/lib/rate-limiter'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Rate limiting: 20 requests por hora
    const rateCheck = checkRateLimit(user.id)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Limite de requisições excedido. Tente novamente em breve.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateCheck.resetIn / 1000)) } }
      )
    }

    const body = await request.json()
    const parsed = recommendSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { herd_id } = parsed.data

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

    // Dados nutricionais enriquecidos (BR-CORTE/CQBAL)
    const nutritionData = recommendation.nutrition_data
    const deficitDetails = nutritionData?.deficit_details || []

    // Construir contexto nutricional para o prompt do Claude
    let nutritionContext = ''
    if (nutritionData?.feed_composition) {
      const fc = nutritionData.feed_composition
      nutritionContext += '\n\nDados CQBAL 4.0 da forrageira: ' + fc.feed_name +
        ' (' + fc.season + ') - PB ' + fc.pb_percent + '%, NDT ' + fc.ndt_percent +
        '%, FDN ' + fc.fdn_percent + '%, P ' + fc.p_g_kg + ' g/kg, Ca ' + fc.ca_g_kg + ' g/kg'
    }
    if (nutritionData?.nutrient_requirements) {
      const nr = nutritionData.nutrient_requirements
      nutritionContext += '\nExigências BR-CORTE 2023: ' + nr.body_weight_kg + ' kg, GMD ' +
        nr.gmd_kg_day + ' kg/dia - CMS ' + nr.cms_kg_day + ' kg/dia, PB ' +
        nr.pb_g_day + ' g/dia, NDT ' + nr.ndt_percent_ms + '% MS'
    }
    if (deficitDetails.length > 0) {
      nutritionContext += '\nDéficits calculados (forrageira vs exigência):'
      for (const d of deficitDetails) {
        nutritionContext += '\n  - ' + d.nutrient + ': fornece ' + d.forage_supply +
          ', precisa ' + d.animal_requirement + ' (' + d.deficit_percent + '% déficit, ' + d.severity + ')'
      }
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
      nutritionContext,
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
        nutrition_data: {
          cms_calculated: nutritionData?.cms_calculated,
          pb_required_g_day: nutritionData?.pb_required_g_day,
          ndt_required_percent: nutritionData?.ndt_required_percent,
          deficit_details: deficitDetails,
          source: nutritionData?.feed_composition?.source || null,
        },
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
      nutrition: nutritionData ? {
        cms_kg_day: nutritionData.cms_calculated,
        pb_required_g_day: nutritionData.pb_required_g_day,
        ndt_required_percent: nutritionData.ndt_required_percent,
        deficit_details: deficitDetails,
        forage_source: nutritionData.feed_composition?.source || null,
        requirements_source: nutritionData.nutrient_requirements?.source || null,
      } : null,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

