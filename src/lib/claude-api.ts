const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

interface ClaudeResponse {
  content: { type: string; text: string }[]
}

export async function askClaude(prompt: string): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    return 'Claude API não configurada. Configure ANTHROPIC_API_KEY no .env.local'
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [
          { role: 'user', content: prompt }
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Claude API error:', err)
      return 'Erro ao consultar IA. Tente novamente.'
    }

    const data: ClaudeResponse = await response.json()
    const text = data.content
      .filter(item => item.type === 'text')
      .map(item => item.text)
      .join('')

    return text
  } catch (err: any) {
    console.error('Claude API error:', err.message)
    return 'Erro de conexão com a IA.'
  }
}

export function buildRecommendationPrompt(data: {
  herdName: string
  species: string
  phase: string
  headCount: number
  forageName: string | null
  breedName: string | null
  avgWeight: number | null
  productName: string
  productLine: string
  consumptionKgDay: number
  deficits: string[]
  reasons: string[]
  score: number
}): string {
  return `Você é o nutricionista virtual da Radarmix Nutrição Animal, empresa referência em suplementos minerais para pecuária no Mato Grosso. Seu nome é Radar IA.

Analise esta recomendação e explique para um produtor rural. Use linguagem simples, direta e profissional, como um técnico de campo experiente conversando no curral. Máximo 6 frases.

DADOS DO LOTE:
- Nome: ${data.herdName}
- Espécie: ${data.species}
- Fase: ${data.phase}
- Cabeças: ${data.headCount}
- Capim: ${data.forageName || 'Não informado'}
- Raça: ${data.breedName || 'Não informada'}
- Peso médio: ${data.avgWeight ? data.avgWeight + 'kg' : 'Não informado'}

PRODUTO RECOMENDADO:
- Nome: ${data.productName}
- Linha: ${data.productLine}
- Consumo: ${data.consumptionKgDay.toFixed(1)} kg/cab/dia
- Consumo mensal por cabeça: ${(data.consumptionKgDay * 30).toFixed(0)} kg

DÉFICITS IDENTIFICADOS NA FORRAGEIRA:
${data.deficits.length > 0 ? data.deficits.map(d => '- ' + d).join('\n') : '- Nenhum déficit crítico identificado'}

RAZÕES DA RECOMENDAÇÃO:
${data.reasons.map(r => '- ' + r).join('\n')}

REGRAS IMPORTANTES:
1. Use português brasileiro com acentuação correta
2. Calcule quantos sacos de 25kg o lote inteiro vai precisar por mês
3. Mencione um resultado prático que o produtor vai ver no campo (GMD, condição corporal, desempenho reprodutivo)
4. Se for engorda, mencione o caso real: "Em Arenápolis-MT, Nelore confinado com produto Radarmix RK alcançou GMD de 1,79 kg/dia"
5. Termine com uma frase motivacional curta sobre resultado e lucratividade
6. Nunca use markdown, bullets ou formatação. Texto corrido natural.

Não use markdown, bullets ou formatação. Escreva como texto corrido natural.`
}

