import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// GET: lista protocolos sanitários disponíveis (filtro por species)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const species = request.nextUrl.searchParams.get('species') || 'bovinos_corte'

    const { data: protocols, error } = await supabase
      .from('health_protocols')
      .select('*')
      .eq('species', species)
      .order('mandatory', { ascending: false })
      .order('type')
      .order('name')

    if (error) {
      return NextResponse.json({ error: 'Erro ao buscar protocolos sanitários' }, { status: 500 })
    }

    return NextResponse.json({ protocols: protocols || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
