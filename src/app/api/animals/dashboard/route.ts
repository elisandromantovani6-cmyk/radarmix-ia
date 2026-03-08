import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// Dashboard de indicadores individuais do lote
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const herdId = request.nextUrl.searchParams.get('herd_id')
    if (!herdId) return NextResponse.json({ error: 'herd_id obrigatório' }, { status: 400 })

    // Buscar todos os animais do lote
    const { data: animals, error } = await supabase
      .from('animals')
      .select('id, ear_tag, name, sex, status, current_weight_kg, entry_weight_kg, entry_date')
      .eq('herd_id', herdId)
      .eq('user_id', user.id)

    if (error) throw error
    if (!animals || animals.length === 0) {
      return NextResponse.json({
        total: 0,
        por_sexo: { macho: 0, femea: 0 },
        por_status: {},
        top_performers: [],
        bottom_performers: [],
        peso_medio: 0,
        herd_avg_weight: 0,
        distribuicao_peso: [],
      })
    }

    // Contagem por sexo
    const porSexo = { macho: 0, femea: 0 }
    animals.forEach(a => { porSexo[a.sex as 'macho' | 'femea']++ })

    // Contagem por status
    const porStatus: Record<string, number> = {}
    animals.forEach(a => { porStatus[a.status] = (porStatus[a.status] || 0) + 1 })

    // Peso médio do lote (via tabela herds)
    const { data: herd } = await supabase
      .from('herds')
      .select('avg_weight_kg')
      .eq('id', herdId)
      .single()
    const herdAvgWeight = Number(herd?.avg_weight_kg) || 0

    // Calcular GMD individual para cada animal ativo
    const animaisAtivos = animals.filter(a => a.status === 'ativo')

    const animaisComGmd = await Promise.all(
      animaisAtivos.map(async (animal) => {
        // Buscar pesagens do animal
        const { data: pesagens } = await supabase
          .from('animal_weighings')
          .select('weight_kg, weighed_at')
          .eq('animal_id', animal.id)
          .order('weighed_at', { ascending: true })

        let gmd = 0
        if (pesagens && pesagens.length >= 2) {
          const primeira = pesagens[0]
          const ultima = pesagens[pesagens.length - 1]
          const dias = Math.max(1, Math.round(
            (new Date(ultima.weighed_at).getTime() - new Date(primeira.weighed_at).getTime()) / (1000 * 60 * 60 * 24)
          ))
          gmd = Math.round(((Number(ultima.weight_kg) - Number(primeira.weight_kg)) / dias) * 100) / 100
        }

        return {
          id: animal.id,
          ear_tag: animal.ear_tag,
          name: animal.name,
          current_weight_kg: Number(animal.current_weight_kg) || 0,
          gmd,
        }
      })
    )

    // Ordenar por GMD para encontrar top e bottom performers
    const ordenadoPorGmd = [...animaisComGmd].sort((a, b) => b.gmd - a.gmd)
    const topPerformers = ordenadoPorGmd.slice(0, 5)
    const bottomPerformers = ordenadoPorGmd.slice(-5).reverse()

    // Peso médio dos animais
    const pesosAtivos = animaisAtivos
      .map(a => Number(a.current_weight_kg))
      .filter(p => p > 0)
    const pesoMedio = pesosAtivos.length > 0
      ? Math.round((pesosAtivos.reduce((s, p) => s + p, 0) / pesosAtivos.length) * 100) / 100
      : 0

    // Distribuição de peso (histograma em faixas de 50kg)
    const distribuicao: { faixa: string; quantidade: number }[] = []
    if (pesosAtivos.length > 0) {
      const pesoMin = Math.floor(Math.min(...pesosAtivos) / 50) * 50
      const pesoMax = Math.ceil(Math.max(...pesosAtivos) / 50) * 50

      for (let faixa = pesoMin; faixa < pesoMax; faixa += 50) {
        const quantidade = pesosAtivos.filter(p => p >= faixa && p < faixa + 50).length
        distribuicao.push({
          faixa: `${faixa}-${faixa + 50}kg`,
          quantidade,
        })
      }
    }

    return NextResponse.json({
      total: animals.length,
      ativos: animaisAtivos.length,
      por_sexo: porSexo,
      por_status: porStatus,
      top_performers: topPerformers,
      bottom_performers: bottomPerformers,
      peso_medio: pesoMedio,
      herd_avg_weight: herdAvgWeight,
      distribuicao_peso: distribuicao,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
