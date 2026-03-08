/**
 * API de Score de Pastagem
 *
 * Endpoint GET que calcula o score de pastagem para uma fazenda.
 * Busca coordenadas, área, tipo de forragem e dados de chuva,
 * então retorna o score completo via calculatePastureScore().
 *
 * Query params:
 * - farm_id: ID da fazenda (opcional, usa primeira do usuário)
 * - herd_id: ID do lote (opcional, para pegar tipo de forragem)
 */
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { calculatePastureScore } from '@/lib/pasture-score'
import { NextRequest, NextResponse } from 'next/server'

// Coordenadas padrão por cidade (mesmo do climate/route.ts)
const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  'tangara da serra': { lat: -14.6229, lon: -57.4983 },
  'cuiaba': { lat: -15.6014, lon: -56.0979 },
  'rondonopolis': { lat: -16.4673, lon: -54.6372 },
  'sinop': { lat: -11.8608, lon: -55.5094 },
  'sorriso': { lat: -12.5425, lon: -55.7114 },
  'lucas do rio verde': { lat: -13.0498, lon: -55.9040 },
  'nova mutum': { lat: -13.8344, lon: -56.0800 },
  'campo novo do parecis': { lat: -13.6584, lon: -57.8892 },
  'barra do garcas': { lat: -15.8897, lon: -52.2567 },
  'arenapolis': { lat: -14.4458, lon: -56.8434 },
  'diamantino': { lat: -14.4086, lon: -56.4461 },
  'primavera do leste': { lat: -15.5600, lon: -54.2961 },
  'alta floresta': { lat: -9.8756, lon: -56.0861 },
  'canarana': { lat: -13.5516, lon: -52.2706 },
  'nova olimpia': { lat: -14.7919, lon: -57.2883 },
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Parâmetros opcionais da query string
    const farmId = request.nextUrl.searchParams.get('farm_id')
    const herdId = request.nextUrl.searchParams.get('herd_id')

    // ─── 1. Buscar dados da fazenda ────────────────────────────────
    let farmQuery = supabase
      .from('farms')
      .select('id, name, city, latitude, longitude, area_hectares')
      .eq('user_id', user.id)

    if (farmId) {
      farmQuery = farmQuery.eq('id', farmId)
    }

    const { data: farms, error: farmError } = await farmQuery.limit(1)

    if (farmError) {
      return NextResponse.json({ error: 'Erro ao buscar fazenda: ' + farmError.message }, { status: 500 })
    }

    if (!farms || farms.length === 0) {
      return NextResponse.json({ error: 'Nenhuma fazenda encontrada' }, { status: 404 })
    }

    const farm = farms[0]

    // Determinar coordenadas
    let lat = farm.latitude || -14.6229
    let lon = farm.longitude || -57.4983
    let cityName = farm.city || 'Tangará da Serra'

    if (!farm.latitude && farm.city) {
      const normalized = farm.city
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
      const coords = CITY_COORDS[normalized]
      if (coords) {
        lat = coords.lat
        lon = coords.lon
      }
    }

    // Área da fazenda (padrão 100 ha se não informada)
    const areaHa = farm.area_hectares || 100

    // ─── 2. Buscar tipo de forragem do lote ────────────────────────
    let forageType: string | null = null
    let headCount = 0

    // Se tiver herd_id, busca direto
    if (herdId) {
      const { data: herd } = await supabase
        .from('herds')
        .select('forage_id, head_count, forages(name)')
        .eq('id', herdId)
        .eq('farm_id', farm.id)
        .single()

      if (herd) {
        headCount = herd.head_count || 0
        // Tenta mapear o nome da forrageira para o código interno
        const forageName = (herd as any).forages?.name
        if (forageName) {
          forageType = mapForageName(forageName)
        }
      }
    } else {
      // Busca todos os lotes da fazenda e soma cabeças
      const { data: herds } = await supabase
        .from('herds')
        .select('forage_id, head_count, forages(name)')
        .eq('farm_id', farm.id)

      if (herds && herds.length > 0) {
        headCount = herds.reduce((sum, h) => sum + (h.head_count || 0), 0)
        // Usa a forragem do primeiro lote como referência
        const forageName = (herds[0] as any).forages?.name
        if (forageName) {
          forageType = mapForageName(forageName)
        }
      }
    }

    // ─── 3. Buscar dados de chuva do climate_cache ─────────────────
    let rainLast30d: number | null = null

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

    const { data: climateData } = await supabase
      .from('climate_cache')
      .select('precipitation')
      .eq('city', cityName)
      .gte('date', thirtyDaysAgoStr)

    if (climateData && climateData.length > 0) {
      // Soma a precipitação dos últimos 30 dias
      rainLast30d = climateData.reduce(
        (sum, row) => sum + (row.precipitation || 0),
        0
      )
    }

    // ─── 4. Calcular score ─────────────────────────────────────────
    const month = new Date().getMonth() + 1

    const score = calculatePastureScore({
      lat,
      lon,
      city: cityName,
      forage_type: forageType,
      area_ha: areaHa,
      head_count: headCount,
      rain_last_30d_mm: rainLast30d,
      month,
    })

    // ─── 5. Retornar resultado ─────────────────────────────────────
    return NextResponse.json({
      farm: {
        id: farm.id,
        name: farm.name,
        city: cityName,
        area_ha: areaHa,
        head_count: headCount,
        forage_type: forageType,
      },
      score,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * Mapeia nome de forragem do banco para código interno
 * Ex: "Brachiaria brizantha (Marandu)" → "brachiaria_brizantha"
 */
function mapForageName(name: string): string | null {
  const lower = name.toLowerCase()

  if (lower.includes('brizantha') || lower.includes('marandu')) return 'brachiaria_brizantha'
  if (lower.includes('decumbens')) return 'brachiaria_decumbens'
  if (lower.includes('humidicola') || lower.includes('humidícola')) return 'brachiaria_humidicola'
  if (lower.includes('ruziziensis')) return 'brachiaria_ruziziensis'
  if (lower.includes('mombaça') || lower.includes('mombaca')) return 'mombaça'
  if (lower.includes('tanzânia') || lower.includes('tanzania')) return 'tanzania'
  if (lower.includes('tifton')) return 'tifton'
  if (lower.includes('elefante') || lower.includes('napier')) return 'capim_elefante'
  if (lower.includes('massai')) return 'massai'
  if (lower.includes('piatã') || lower.includes('piata')) return 'piatã'

  return null
}
