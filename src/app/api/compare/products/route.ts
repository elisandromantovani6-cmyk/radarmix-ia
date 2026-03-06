import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const herdId = request.nextUrl.searchParams.get('herd_id')

    // Se tem herd_id, filtrar por espécie do lote
    let species = null
    if (herdId) {
      const { data: herd } = await supabase.from('herds').select('species').eq('id', herdId).single()
      if (herd) species = herd.species
    }

    let query = supabase.from('products').select('id, name, line, species').order('name')
    if (species) {
      const speciesMap: Record<string, string> = {
        'bovinos_corte': 'bovinos_corte',
        'bovinos_leite': 'bovinos_leite',
        'bezerros': 'bezerros',
        'reprodutores': 'reprodutores',
        'aves': 'aves',
        'equinos': 'equinos',
        'ovinos': 'ovinos',
      }
      query = query.eq('species', speciesMap[species] || species)
    }

    const { data: products } = await query
    return NextResponse.json({ products: products || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
