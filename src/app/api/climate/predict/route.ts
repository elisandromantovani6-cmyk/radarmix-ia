import { createServerSupabaseClient } from '@/lib/supabase-server'
import { askClaude } from '@/lib/claude-api'
import { climatePredictSchema } from '@/lib/schemas'
import { checkRateLimit } from '@/lib/rate-limiter'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    // Rate limiting: 20 requests por hora
    const rateCheck = checkRateLimit(user.id)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Limite de requisições excedido. Tente novamente em breve.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateCheck.resetIn / 1000)) } }
      )
    }

    const body = await request.json()
    const parsed = climatePredictSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { history_data } = parsed.data

    const prompt = `Você é o Radar IA, especialista em pastagens tropicais do Mato Grosso.

Analise este histórico de 12 meses de uma fazenda e faça uma PREVISÃO para os próximos 3 meses.

DADOS DA FAZENDA:
- Área: ${history_data.total_area} ha
- Rebanho: ${history_data.total_heads} cabeças
- Peso médio: ${history_data.avg_weight}kg
- Lotação atual: ${history_data.current_load} cab/ha
- Capacidade estimada atual: ${history_data.current_capacity} cab/ha
- NDVI atual: ${history_data.current_ndvi} (0-1)
- MS disponível: ${history_data.current_ms} kg/ha
- PB da forragem: ${history_data.current_pb}%
- Superlotado: ${history_data.overloaded ? 'SIM' : 'NÃO'}

HISTÓRICO ÚLTIMOS 6 MESES:
${history_data.history.slice(-6).map((h: any) => 
  h.month + ': Chuva ' + h.rain_mm + 'mm, NDVI ' + h.ndvi.toFixed(2) + ', MS ' + h.ms_kg_ha + ' kg/ha, PB ' + h.pb_percent + '%, Cap. ' + h.capacity_cab_ha + ' cab/ha'
).join('\n')}

Mês atual: ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}

REGRAS:
1. Português brasileiro com acentuação correta
2. Preveja tendência dos próximos 3 meses: vai melhorar, piorar ou manter
3. Se está entrando na seca (abr-set), alerte sobre queda de MS e PB
4. Se está superlotado, sugira quantas cabeças retirar ou quanto suplementar a mais
5. Dê 2-3 ações práticas com prazo (ex: "nas próximas 2 semanas, comece proteinado")
6. Mencione produtos Radarmix específicos quando relevante
7. Máximo 5-6 frases. Seja direto e prático.
8. Não use markdown, bullets ou formatação. Texto corrido.`

    const prediction = await askClaude(prompt)

    return NextResponse.json({ prediction })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

