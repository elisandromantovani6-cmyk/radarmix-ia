/**
 * API de Inteligência Coletiva
 *
 * GET /api/collective?herd_id=xxx
 *
 * Busca dados do lote, raça e fazenda do produtor,
 * calcula GMD e custo por arroba, e retorna insights
 * baseados na inteligência coletiva da rede.
 */

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getCollectiveInsight, type CollectiveInput } from '@/lib/collective-intelligence'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Determina o sistema de produção a partir da fase do lote.
 * Mapeia as fases cadastradas para os 3 sistemas reconhecidos.
 */
function determineSystem(phase: string | null): string {
  if (!phase) return 'pasto'
  const p = phase.toLowerCase()
  if (p.includes('confin')) return 'confinamento'
  if (p.includes('semi') || p.includes('termin')) return 'semi'
  // Cria, recria, engorda a pasto = pasto
  return 'pasto'
}

/**
 * Determina a região aproximada a partir da cidade da fazenda.
 * Em produção usaria coordenadas GPS; aqui usa heurística simples.
 */
function determineRegion(city: string | null): string {
  if (!city) return 'centro'
  const c = city.toLowerCase()
  // Cidades do oeste MT
  if (['tangará', 'diamantino', 'campo novo', 'sapezal', 'campo de julio'].some(w => c.includes(w))) return 'oeste'
  // Cidades do norte MT
  if (['sinop', 'sorriso', 'lucas', 'nova mutum', 'colíder'].some(w => c.includes(w))) return 'norte'
  // Cidades do sul MT
  if (['rondonópolis', 'primavera', 'alto araguaia', 'itiquira'].some(w => c.includes(w))) return 'sul'
  // Default: centro (Cuiabá, Várzea Grande, etc.)
  return 'centro'
}

/**
 * Determina o tipo de raça a partir do nome da raça.
 * Classifica em zebuíno, cruzamento ou taurino.
 */
function determineBreedType(breedName: string | null): string {
  if (!breedName) return 'zebuino'
  const b = breedName.toLowerCase()
  // Taurinos puros
  if (['angus', 'hereford', 'charolês', 'limousin', 'simental'].some(w => b.includes(w))) return 'taurino'
  // Cruzamentos (F1, meio-sangue, etc.)
  if (['f1', 'cruzamento', 'meio', 'composto', 'brangus', 'montana'].some(w => b.includes(w))) return 'cruzamento'
  // Zebuínos (Nelore, Brahman, Gir, Guzerá, etc.)
  return 'zebuino'
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Obter herd_id da query string
    const { searchParams } = new URL(request.url)
    const herdId = searchParams.get('herd_id')
    if (!herdId) {
      return NextResponse.json(
        { error: 'Parâmetro herd_id é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar dados do lote com raça e fazenda
    const { data: herd, error: herdError } = await supabase
      .from('herds')
      .select(`
        id,
        main_phase,
        head_count,
        avg_weight_kg,
        breed_id,
        forage_id,
        farm_id
      `)
      .eq('id', herdId)
      .single()

    if (herdError || !herd) {
      return NextResponse.json(
        { error: 'Lote não encontrado' },
        { status: 404 }
      )
    }

    // Buscar nome da raça
    let breedName: string | null = null
    if (herd.breed_id) {
      const { data: breed } = await supabase
        .from('breeds')
        .select('name')
        .eq('id', herd.breed_id)
        .single()
      breedName = breed?.name || null
    }

    // Buscar nome da forrageira
    let forageName: string | null = null
    if (herd.forage_id) {
      const { data: forage } = await supabase
        .from('forages')
        .select('name')
        .eq('id', herd.forage_id)
        .single()
      forageName = forage?.name || null
    }

    // Buscar dados da fazenda (cidade para determinar região)
    const { data: farm } = await supabase
      .from('farms')
      .select('city')
      .eq('id', herd.farm_id)
      .single()

    // Buscar pesagens para calcular GMD real
    const { data: weighings } = await supabase
      .from('herd_history')
      .select('details')
      .eq('herd_id', herdId)
      .eq('event_type', 'pesagem')
      .order('created_at', { ascending: false })
      .limit(5)

    // Calcular GMD a partir das pesagens
    let myGmd = 0.55 // Valor padrão se não houver pesagens
    if (weighings && weighings.length > 0) {
      // Usar o GMD real da pesagem mais recente
      const latestGmd = (weighings[0].details as Record<string, unknown>)?.gmd_real as number | undefined
      if (latestGmd && latestGmd > 0) {
        myGmd = latestGmd
      }
    }

    // Buscar simulações para estimar custo por arroba
    const { data: simulations } = await supabase
      .from('simulations')
      .select('result')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    // Calcular custo por arroba a partir da simulação
    let myCostArroba = 280 // Valor padrão
    if (simulations && simulations.length > 0) {
      const simResult = simulations[0].result as Record<string, unknown> | null
      const costFromSim = simResult?.cost_per_arroba as number | undefined
      if (costFromSim && costFromSim > 0) {
        myCostArroba = costFromSim
      }
    }

    // Buscar suplemento atual do lote (última recomendação)
    const { data: consultations } = await supabase
      .from('consultations')
      .select('result')
      .eq('herd_id', herdId)
      .order('created_at', { ascending: false })
      .limit(1)

    let mySupplement: string | null = null
    if (consultations && consultations.length > 0) {
      const consultResult = consultations[0].result as Record<string, unknown> | null
      const productName = consultResult?.product_name as string | undefined
      mySupplement = productName || null
    }

    // Montar input para inteligência coletiva
    const collectiveInput: CollectiveInput = {
      breed_type: determineBreedType(breedName),
      system: determineSystem(herd.main_phase),
      region: determineRegion(farm?.city || null),
      my_gmd: myGmd,
      my_cost_arroba: myCostArroba,
      my_supplement: mySupplement,
      my_forage: forageName,
    }

    // Gerar insights
    const insight = getCollectiveInsight(collectiveInput)

    return NextResponse.json({
      herd_id: herdId,
      input_used: collectiveInput,
      insight,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
