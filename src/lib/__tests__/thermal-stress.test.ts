import { predictThermalStress } from '../thermal-stress'

describe('thermal-stress', () => {
  const baseForecast = [
    { date: '2026-03-09', day_label: 'seg. 9', temp: 30, humidity: 75 },
    { date: '2026-03-10', day_label: 'ter. 10', temp: 33, humidity: 65 },
    { date: '2026-03-11', day_label: 'qua. 11', temp: 35, humidity: 70 },
    { date: '2026-03-12', day_label: 'qui. 12', temp: 28, humidity: 80 },
    { date: '2026-03-13', day_label: 'sex. 13', temp: 25, humidity: 60 },
  ]

  describe('predictThermalStress', () => {
    it('retorna conforto térmico para zebuíno em condições amenas', () => {
      // temp=20, hum=40 → ITU = 0.8*20 + 0.4*(20-14.4) + 46.4 = 16 + 2.24 + 46.4 = 64.64 (normal)
      const result = predictThermalStress(20, 40, baseForecast, 'zebuino')
      expect(result.breed_group).toBe('zebuino')
      expect(result.heat_tolerance).toBe(1.0)
      expect(result.current_stress.level).toBe('normal')
      expect(result.current_stress.gmd_impact_kg).toBe(0)
    })

    it('detecta estresse para taurino no mesmo clima que seria ok para zebuíno', () => {
      // Temp 32, Umidade 70 → ITU ~78.8 (normal/alerta para zebuíno)
      // Taurino: ITU ajustado = 78.8 + (1-0.82)*20 = 78.8 + 3.6 = 82.4 (perigo!)
      const result = predictThermalStress(32, 70, [], 'taurino')
      expect(result.heat_tolerance).toBe(0.82)
      // ITU ajustado fica maior para taurino
      expect(result.current_stress.itu_adjusted).toBeGreaterThan(78)
      expect(result.current_stress.level).not.toBe('normal')
    })

    it('calcula impacto no GMD proporcional ao estresse', () => {
      // temp=33, hum=65 → ITU = 0.8*33 + 0.65*(33-14.4) + 46.4 = 26.4 + 12.09 + 46.4 = 84.89 (danger)
      const result = predictThermalStress(33, 65, [], 'zebuino')
      expect(result.current_stress.level).toBe('danger')
      expect(result.current_stress.gmd_impact_kg).toBeLessThan(0)
      expect(result.current_stress.cms_reduction_percent).toBeGreaterThan(0)
    })

    it('gera alertas antecipados para dias de perigo', () => {
      const hotForecast = [
        { date: '2026-03-09', day_label: 'seg. 9', temp: 38, humidity: 80 },
        { date: '2026-03-10', day_label: 'ter. 10', temp: 40, humidity: 75 },
      ]
      const result = predictThermalStress(25, 60, hotForecast, 'zebuino')
      expect(result.advance_alerts.length).toBeGreaterThan(0)
      expect(result.advance_alerts[0]).toContain('Estresse térmico')
      expect(result.advance_alerts[0]).toContain('1 dia')
    })

    it('conta dias de estresse corretamente', () => {
      const mixedForecast = [
        { date: '2026-03-09', day_label: 'seg. 9', temp: 25, humidity: 50 }, // normal
        { date: '2026-03-10', day_label: 'ter. 10', temp: 35, humidity: 75 }, // estresse
        { date: '2026-03-11', day_label: 'qua. 11', temp: 24, humidity: 55 }, // normal
        { date: '2026-03-12', day_label: 'qui. 12', temp: 36, humidity: 80 }, // estresse
        { date: '2026-03-13', day_label: 'sex. 13', temp: 22, humidity: 45 }, // normal
      ]
      const result = predictThermalStress(25, 50, mixedForecast, 'zebuino')
      expect(result.stress_days_count).toBe(2)
    })

    it('projeta perda de GMD em 30 dias', () => {
      const hotForecast = [
        { date: '2026-03-09', day_label: 'seg. 9', temp: 35, humidity: 75 },
        { date: '2026-03-10', day_label: 'ter. 10', temp: 36, humidity: 78 },
        { date: '2026-03-11', day_label: 'qua. 11', temp: 34, humidity: 70 },
      ]
      const result = predictThermalStress(35, 75, hotForecast, 'zebuino')
      expect(result.projected_gmd_loss_30d).toBeGreaterThan(0)
    })

    it('gera sugestões de manejo para estresse', () => {
      const result = predictThermalStress(38, 80, [], 'zebuino')
      expect(result.management_summary.length).toBeGreaterThan(0)
    })

    it('senepol tem tolerância quase igual ao zebuíno', () => {
      const result = predictThermalStress(33, 70, [], 'senepol')
      expect(result.heat_tolerance).toBe(0.97)
    })

    it('retorna ações de manejo detalhadas por dia na previsão', () => {
      const hotForecast = [
        { date: '2026-03-09', day_label: 'seg. 9', temp: 38, humidity: 80 },
      ]
      const result = predictThermalStress(25, 60, hotForecast, 'zebuino')
      expect(result.forecast[0].management_actions.length).toBeGreaterThan(0)
    })

    it('usa tolerância default para grupo desconhecido', () => {
      const result = predictThermalStress(30, 70, [], 'desconhecido')
      expect(result.heat_tolerance).toBe(1.0)
    })

    it('leite sofre mais que zebuíno no mesmo clima', () => {
      const zebu = predictThermalStress(34, 75, [], 'zebuino')
      const leite = predictThermalStress(34, 75, [], 'leite')
      // ITU ajustado do leite deve ser maior
      expect(leite.current_stress.itu_adjusted).toBeGreaterThan(zebu.current_stress.itu_adjusted)
    })
  })
})
