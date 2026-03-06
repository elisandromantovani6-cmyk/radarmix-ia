import { createServerSupabaseClient } from '@/lib/supabase-server'
import { askClaude } from '@/lib/claude-api'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { simulationData } = await request.json()

    const prompt = buildSuggestionPrompt(simulationData)
    const suggestions = await askClaude(prompt)

    return NextResponse.json({ suggestions })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function buildSuggestionPrompt(data: any): string {
  return `Você é o Radar IA, consultor financeiro pecuário da Radarmix Nutrição Animal no Mato Grosso.

Analise esta simulação de lucro e dê 3 sugestões PRÁTICAS e ESPECÍFICAS para melhorar o ROI do produtor. Cada sugestão deve ter um impacto estimado em R$ ou %.

DADOS DA SIMULAÇÃO:
- Lote: ${data.herd_name} (${data.head_count} cabeças, ${data.breed_name})
- Fase: ${data.phase}
- Peso atual: ${data.avg_weight || 'Não informado'}kg → Peso final: ${data.final_weight}kg
- GMD atual: ${data.gmd} kg/dia
- Produto atual: ${data.product_name} (Linha ${data.product_line})
- Ciclo: ${data.cycle_months} meses

RESULTADOS:
- Investimento total/cab: R$ ${data.total_investment.toFixed(2)}
  - Animal: R$ ${data.animal_price.toFixed(2)}
  - Operacional: R$ ${data.total_operational_cost.toFixed(2)}
- Venda: R$ ${data.sale_revenue.toFixed(2)} (${data.final_arroba.toFixed(1)}@ × R$ ${data.arroba_price.toFixed(2)})
- Lucro/cab: R$ ${data.total_profit.toFixed(2)}
- ROI do ciclo: ${data.total_roi.toFixed(1)}%
- ROI anualizado: ${data.annualized_roi.toFixed(1)}%
- Selic atual: ${data.selic_rate}%

CUSTOS OPERACIONAIS DIÁRIOS (R$/cab/dia):
- Suplemento: R$ ${data.costs.suplemento.toFixed(2)}
- Pasto: R$ ${data.costs.pasto.toFixed(2)}
- Mão de obra: R$ ${data.costs.mao_obra.toFixed(2)}
- Sanidade: R$ ${data.costs.sanidade.toFixed(2)}
- Outros: R$ ${data.costs.outros.toFixed(2)}

PRODUTOS RADARMIX DISPONÍVEIS PARA SUGESTÃO:
- Linha S/SR: mineral básico, 80g/cab/dia, bom para águas
- Linha Proteico: 500g/cab/dia, aumenta GMD na seca em +0,15 kg/dia
- Linha Prot.Energ: 800g/cab/dia, aumenta GMD em +0,20 kg/dia
- Linha FazCarne: 1kg/cab/dia, aumenta GMD em +0,25 kg/dia
- Linha RK: 1,5kg/cab/dia, engorda intensiva, GMD 1,2-1,8 kg/dia
- Linha Concentrado: confinamento, GMD 1,4-1,8 kg/dia
- Caso real: Nelore em Arenápolis-MT com RK alcançou GMD 1,79 kg/dia

REGRAS:
1. Português brasileiro com acentuação correta
2. Seja específico: "trocar de X para Y aumenta GMD de 0,50 para 0,65, reduzindo ciclo em X dias"
3. Calcule o impacto em R$ por cabeça quando possível
4. Considere: trocar produto, ajustar ciclo, melhorar pasto, vender no momento certo da @
5. Se ROI está bom (>15%), parabenize e sugira como manter
6. Se ROI está ruim (<5%), seja direto sobre os riscos
7. Máximo 3 sugestões, cada uma com 2-3 frases
8. Use formato: "💡 TÍTULO: explicação com números"
9. Não use markdown nem bullets`
}

