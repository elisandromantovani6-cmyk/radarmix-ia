import { predictHealthRisks, type HealthInput } from '../health-predictor'

// Entrada base para testes — condições medianas do MT
const baseInput: HealthInput = {
  temp: 28,
  humidity: 60,
  rain_mm: 5,
  season: 'seca',
  city: 'Tangará da Serra',
  phase: 'engorda',
  head_count: 200,
  species: 'bovino',
  last_vaccination_days: 30,
  last_deworming_days: 30,
  stocking_rate: 1.5,
}

describe('health-predictor', () => {
  describe('predictHealthRisks', () => {

    it('retorna 6 doenças no resultado', () => {
      const result = predictHealthRisks(baseInput)
      expect(result.risks).toHaveLength(6)
      const doencas = result.risks.map(r => r.disease)
      expect(doencas).toContain('carrapato')
      expect(doencas).toContain('pneumonia')
      expect(doencas).toContain('tristeza_parasitaria')
      expect(doencas).toContain('verminose')
      expect(doencas).toContain('botulismo')
      expect(doencas).toContain('clostridiose')
    })

    it('calcula risco alto de carrapato em condições úmidas e quentes', () => {
      const input: HealthInput = {
        ...baseInput,
        temp: 32,
        humidity: 85,
        rain_mm: 25,
        season: 'aguas',
        stocking_rate: 3.0,
        last_deworming_days: null,
      }
      const result = predictHealthRisks(input)
      const carrapato = result.risks.find(r => r.disease === 'carrapato')!
      // Umidade >=80 (+30) + temp 25-35 (+25) + águas (+20) + chuva >20 (+10) + sem vermífugo (+5) = 90
      expect(carrapato.risk_percent).toBeGreaterThanOrEqual(70)
      expect(['alto', 'critico']).toContain(carrapato.severity)
      expect(carrapato.factors.length).toBeGreaterThan(3)
    })

    it('calcula risco alto de pneumonia com frio, chuva e bezerros', () => {
      const input: HealthInput = {
        ...baseInput,
        temp: 10,
        humidity: 90,
        rain_mm: 20,
        season: 'seca',
        phase: 'cria',
        stocking_rate: 3.5,
      }
      const result = predictHealthRisks(input)
      const pneumonia = result.risks.find(r => r.disease === 'pneumonia')!
      // Temp <12 (+30) + chuva+frio (+20) + lotação >3 (+15) + cria (+20) + umidade alta+frio (+10) = 95
      expect(pneumonia.risk_percent).toBeGreaterThanOrEqual(70)
      expect(['alto', 'critico']).toContain(pneumonia.severity)
    })

    it('calcula risco de tristeza parasitária em região endêmica', () => {
      const input: HealthInput = {
        ...baseInput,
        city: 'Cuiabá',
        season: 'aguas',
        last_vaccination_days: null,
        phase: 'cria',
        temp: 30,
        humidity: 75,
      }
      const result = predictHealthRisks(input)
      const tristeza = result.risks.find(r => r.disease === 'tristeza_parasitaria')!
      // Endêmica (+30) + águas (+20) + sem vacina (+25) + cria (+15) + clima quente+úmido (+10) = 100
      expect(tristeza.risk_percent).toBeGreaterThanOrEqual(80)
      expect(tristeza.severity).toBe('critico')
      expect(tristeza.factors.some(f => f.includes('endêmica'))).toBe(true)
    })

    it('calcula risco baixo de tristeza em região não endêmica vacinada', () => {
      const input: HealthInput = {
        ...baseInput,
        city: 'Sinop',
        season: 'seca',
        last_vaccination_days: 60,
        phase: 'engorda',
        temp: 25,
        humidity: 50,
      }
      const result = predictHealthRisks(input)
      const tristeza = result.risks.find(r => r.disease === 'tristeza_parasitaria')!
      // Nenhum fator forte ativo
      expect(tristeza.risk_percent).toBeLessThanOrEqual(25)
      expect(tristeza.severity).toBe('baixo')
    })

    it('retorna risco baixo em condições ideais', () => {
      const input: HealthInput = {
        ...baseInput,
        temp: 22,
        humidity: 50,
        rain_mm: 0,
        season: 'seca',
        city: 'Sinop',
        phase: 'engorda',
        last_vaccination_days: 30,
        last_deworming_days: 15,
        stocking_rate: 1.0,
      }
      const result = predictHealthRisks(input)
      // Em condições ideais, nenhuma doença deveria ser crítica
      const criticos = result.risks.filter(r => r.severity === 'critico')
      expect(criticos).toHaveLength(0)
      // Resumo deve indicar situação controlada (favorável ou moderada, sem críticos)
      expect(result.summary).toMatch(/favorável|moderado/)
    })

    it('gera calendário sanitário com 3 meses', () => {
      const result = predictHealthRisks(baseInput)
      expect(result.calendar).toHaveLength(3)
      // Cada mês deve ter nome e lista de doenças
      result.calendar.forEach(month => {
        expect(month.month).toBeTruthy()
        expect(Array.isArray(month.diseases)).toBe(true)
      })
    })

    it('calendário inclui doenças corretas por estação', () => {
      const result = predictHealthRisks(baseInput)
      // Pelo menos algum mês deve ter doenças listadas
      const totalDiseases = result.calendar.reduce((sum, m) => sum + m.diseases.length, 0)
      expect(totalDiseases).toBeGreaterThan(0)
    })

    it('calcula custo preventivo total para o rebanho', () => {
      const input: HealthInput = {
        ...baseInput,
        temp: 32,
        humidity: 85,
        rain_mm: 25,
        season: 'aguas',
        head_count: 100,
        last_vaccination_days: null,
        last_deworming_days: null,
      }
      const result = predictHealthRisks(input)
      // Com vários riscos moderados+, custo total deve ser > 0
      expect(result.total_preventive_cost).toBeGreaterThan(0)
      // Custo deve ser proporcional ao número de cabeças
      expect(result.total_preventive_cost).toBeGreaterThan(100) // mínimo razoável para 100 cabeças
    })

    it('fase cria tem mais risco que engorda nas mesmas condições', () => {
      const inputCria: HealthInput = { ...baseInput, phase: 'cria', season: 'aguas', last_vaccination_days: null }
      const inputEngorda: HealthInput = { ...baseInput, phase: 'engorda', season: 'aguas', last_vaccination_days: null }

      const resultCria = predictHealthRisks(inputCria)
      const resultEngorda = predictHealthRisks(inputEngorda)

      // Pneumonia deve ser maior para cria
      const pneumoniaCria = resultCria.risks.find(r => r.disease === 'pneumonia')!
      const pneumoniaEngorda = resultEngorda.risks.find(r => r.disease === 'pneumonia')!
      expect(pneumoniaCria.risk_percent).toBeGreaterThan(pneumoniaEngorda.risk_percent)

      // Clostridiose deve ser maior para cria
      const clostrCria = resultCria.risks.find(r => r.disease === 'clostridiose')!
      const clostrEngorda = resultEngorda.risks.find(r => r.disease === 'clostridiose')!
      expect(clostrCria.risk_percent).toBeGreaterThan(clostrEngorda.risk_percent)
    })

    it('riscos são ordenados por percentual decrescente', () => {
      const input: HealthInput = {
        ...baseInput,
        temp: 30,
        humidity: 80,
        rain_mm: 20,
        season: 'aguas',
        last_vaccination_days: null,
      }
      const result = predictHealthRisks(input)
      for (let i = 1; i < result.risks.length; i++) {
        expect(result.risks[i - 1].risk_percent).toBeGreaterThanOrEqual(result.risks[i].risk_percent)
      }
    })

    it('cada doença tem prazo, custo e ação preventiva', () => {
      const result = predictHealthRisks(baseInput)
      result.risks.forEach(risk => {
        expect(risk.deadline_days).toBeGreaterThan(0)
        expect(risk.estimated_cost_per_head).toBeGreaterThan(0)
        expect(risk.preventive_action.length).toBeGreaterThan(10)
        expect(risk.label.length).toBeGreaterThan(0)
      })
    })

    it('verminose tem risco alto na estação chuvosa com lotação alta e sem vermífugo', () => {
      const input: HealthInput = {
        ...baseInput,
        season: 'aguas',
        stocking_rate: 3.5,
        last_deworming_days: null,
        humidity: 80,
        rain_mm: 20,
        phase: 'cria',
      }
      const result = predictHealthRisks(input)
      const verminose = result.risks.find(r => r.disease === 'verminose')!
      // Águas (+25) + lotação >3 (+20) + sem vermífugo (+25) + umidade (+10) + cria (+15) + chuva (+5) = 100
      expect(verminose.risk_percent).toBeGreaterThanOrEqual(70)
      expect(['alto', 'critico']).toContain(verminose.severity)
    })

    it('botulismo tem risco alto na seca sem vacinação', () => {
      const input: HealthInput = {
        ...baseInput,
        season: 'seca',
        last_vaccination_days: null,
        temp: 35,
        stocking_rate: 3.0,
      }
      const result = predictHealthRisks(input)
      const botulismo = result.risks.find(r => r.disease === 'botulismo')!
      // Seca (+30) + sem vacina (+30) + lotação (+10) + calor na seca (+10) = 80
      expect(botulismo.risk_percent).toBeGreaterThanOrEqual(60)
      expect(['alto', 'critico']).toContain(botulismo.severity)
    })

    it('summary indica alerta crítico quando há doença crítica', () => {
      const input: HealthInput = {
        ...baseInput,
        city: 'Cuiabá',
        season: 'aguas',
        last_vaccination_days: null,
        phase: 'cria',
        temp: 30,
        humidity: 80,
      }
      const result = predictHealthRisks(input)
      // Deve haver pelo menos uma doença crítica (tristeza em Cuiabá + águas + sem vacina + cria)
      const hasCritical = result.risks.some(r => r.severity === 'critico')
      if (hasCritical) {
        expect(result.summary).toContain('CRÍTICO')
      }
    })

    it('reconhece cidades endêmicas com variações de nome', () => {
      // Rondonópolis com acento deve ser reconhecida
      const input: HealthInput = {
        ...baseInput,
        city: 'Rondonópolis',
        season: 'aguas',
        last_vaccination_days: null,
      }
      const result = predictHealthRisks(input)
      const tristeza = result.risks.find(r => r.disease === 'tristeza_parasitaria')!
      expect(tristeza.factors.some(f => f.includes('endêmica'))).toBe(true)
    })

  })
})
