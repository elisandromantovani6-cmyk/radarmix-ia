import { createServerSupabaseClient } from '@/lib/supabase-server'
import { askClaude } from '@/lib/claude-api'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { herd_id } = await request.json()
    if (!herd_id) return NextResponse.json({ error: 'herd_id obrigatório' }, { status: 400 })

    // Buscar dados do lote
    const { data: herd } = await supabase
      .from('herds')
      .select('*, farm:farms!inner(user_id, name, city), breed:breeds(name), forage:forages(name)')
      .eq('id', herd_id)
      .single()

    if (!herd || herd.farm.user_id !== user.id) {
      return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 })
    }

    // Buscar alertas
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const currentMonth = today.getMonth() + 1

    const { data: overdue } = await supabase
      .from('health_events')
      .select('*, protocol:health_protocols(name, type)')
      .eq('herd_id', herd_id)
      .not('next_due_date', 'is', null)
      .lt('next_due_date', todayStr)

    // Buscar eventos recentes
    const { data: recentEvents } = await supabase
      .from('health_events')
      .select('event_type, product_name, event_date, protocol:health_protocols(name)')
      .eq('herd_id', herd_id)
      .order('event_date', { ascending: false })
      .limit(10)

    // Buscar protocolos recomendados para o mês
    const { data: recommended } = await supabase
      .from('health_protocols')
      .select('name, type, mandatory, recommended_months')
      .contains('recommended_months', [currentMonth])

    const prompt = buildHealthPrompt({
      herd,
      overdue: overdue || [],
      recentEvents: recentEvents || [],
      recommended: recommended || [],
      currentMonth,
      city: herd.farm.city || 'Mato Grosso',
    })

    const suggestions = await askClaude(prompt)

    return NextResponse.json({ suggestions })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function buildHealthPrompt(data: any): string {
  const monthNames = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

  const overdueList = data.overdue.length > 0
    ? data.overdue.map((e: any) => `- ${e.protocol?.name || e.product_name}: vencido desde ${new Date(e.next_due_date).toLocaleDateString('pt-BR')}`).join('\n')
    : 'Nenhum protocolo vencido'

  const recentList = data.recentEvents.length > 0
    ? data.recentEvents.map((e: any) => `- ${e.event_date}: ${e.protocol?.name || e.product_name} (${e.event_type})`).join('\n')
    : 'Nenhum evento registrado'

  const recommendedList = data.recommended.length > 0
    ? data.recommended.map((p: any) => `- ${p.name} (${p.type})${p.mandatory ? ' [OBRIGATÓRIO]' : ''}`).join('\n')
    : 'Nenhum protocolo recomendado este mês'

  return `Você é o veterinário especialista da Radarmix Nutrição Animal, atuando em ${data.city}, Mato Grosso.

Analise a situação sanitária do lote e dê 3-4 recomendações PRÁTICAS e ESPECÍFICAS.

DADOS DO LOTE:
- Nome: ${data.herd.name}
- Espécie: ${data.herd.species}
- Fase: ${data.herd.main_phase}
- Cabeças: ${data.herd.head_count}
- Raça: ${data.herd.breed?.name || 'Não informada'}
- Capim: ${data.herd.forage?.name || 'Não informado'}
- Região: ${data.city} - MT
- Mês atual: ${monthNames[data.currentMonth]} (${data.currentMonth})

PROTOCOLOS VENCIDOS:
${overdueList}

EVENTOS RECENTES:
${recentList}

PROTOCOLOS RECOMENDADOS PARA ${monthNames[data.currentMonth].toUpperCase()}:
${recommendedList}

CONTEXTO REGIONAL (MATO GROSSO):
- Doenças endêmicas: tristeza parasitária (babesiose/anaplasmose), raiva bovina, clostridioses
- Pressão de carrapato: alta nas águas (outubro-março), moderada na transição
- Febre aftosa: vacinação obrigatória maio e novembro (INDEA-MT)
- Brucelose B19: obrigatória para fêmeas 3-8 meses
- Período das águas (out-mar): maior risco de verminoses e carrapatos
- Período da seca (abr-set): menor pressão parasitária, risco respiratório se confinado

REGRAS:
1. Português brasileiro com acentuação correta
2. Cada recomendação deve ter: O QUE fazer, QUANDO fazer, PRODUTO sugerido (nome genérico), CUSTO estimado/cabeça
3. Priorize protocolos vencidos e obrigatórios
4. Considere a fase do animal e época do ano
5. Use formato: "🩺 TÍTULO: explicação com detalhes práticos"
6. Máximo 4 recomendações, cada uma com 2-3 frases
7. Não use markdown nem bullets
8. Se tudo estiver em dia, parabenize e sugira manutenção preventiva`
}
