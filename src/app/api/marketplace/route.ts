import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// Coordenadas das cidades do MT
const CITY_COORDS: Record<string, { lat: number, lon: number }> = {
  'tangara da serra': { lat: -14.6229, lon: -57.4983 },
  'diamantino': { lat: -14.4086, lon: -56.4461 },
  'nova mutum': { lat: -13.8344, lon: -56.0800 },
  'campo novo do parecis': { lat: -13.6584, lon: -57.8892 },
  'sorriso': { lat: -12.5425, lon: -55.7114 },
  'cuiaba': { lat: -15.6014, lon: -56.0979 },
  'rondonopolis': { lat: -16.4673, lon: -54.6372 },
  'sinop': { lat: -11.8608, lon: -55.5094 },
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const category = request.nextUrl.searchParams.get('category') || null

    // Buscar fazenda do produtor para calcular distância
    const { data: farms } = await supabase.from('farms').select('city, latitude, longitude').eq('user_id', user.id)
    let farmLat = -14.6229, farmLon = -57.4983
    if (farms && farms[0]) {
      if (farms[0].latitude && farms[0].longitude) { farmLat = farms[0].latitude; farmLon = farms[0].longitude }
      else if (farms[0].city) {
        const norm = farms[0].city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        const c = CITY_COORDS[norm]; if (c) { farmLat = c.lat; farmLon = c.lon }
      }
    }

    // Buscar fornecedores com produtos
    let query = supabase.from('suppliers').select('*, products:supplier_products(*)')
    const { data: suppliers } = await query

    if (!suppliers) return NextResponse.json({ suppliers: [] })

    // Calcular distância e ordenar
    const enriched = suppliers.map(s => {
      const dist = s.latitude && s.longitude ? haversineDistance(farmLat, farmLon, s.latitude, s.longitude) : 999
      const products = (s.products || []).filter((p: any) => !category || p.category === category)
      return { ...s, distance_km: Math.round(dist), product_count: products.length, products }
    }).filter(s => s.product_count > 0 || !category).sort((a, b) => a.distance_km - b.distance_km)

    return NextResponse.json({ suppliers: enriched })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
