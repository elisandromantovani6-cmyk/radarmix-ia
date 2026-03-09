'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { GeneticInfo } from '@/lib/genetic-score'

// Componente de botões de opção (chips clicáveis)
function OptionChips({ options, value, onChange }: {
  options: { value: string; label: string }[]
  value: string | null
  onChange: (v: string | null) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(value === opt.value ? null : opt.value)}
          className={`px-3 py-2 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
            value === opt.value
              ? 'bg-orange-600 text-white border border-orange-500'
              : 'bg-gray-800/60 text-gray-400 border border-white/[0.07] hover:border-orange-500/50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// Componente de checkbox estilizado
function CheckBox({ label, checked, onChange }: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm text-left transition-all min-h-[44px] ${
        checked
          ? 'bg-orange-600/15 text-orange-400 border border-orange-500/30'
          : 'bg-gray-800/60 text-gray-400 border border-white/[0.07] hover:border-orange-500/50'
      }`}
    >
      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
        checked ? 'bg-orange-600' : 'bg-gray-700 border border-gray-600'
      }`}>
        {checked && <span className="text-white text-xs font-bold">&#10003;</span>}
      </div>
      {label}
    </button>
  )
}

// Seletor 3 opções inline (Pequeno/Médio/Grande)
function TripleSelect({ options, value, onChange }: {
  options: { value: string; label: string }[]
  value: string | null
  onChange: (v: string | null) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(value === opt.value ? null : opt.value)}
          className={`py-2.5 rounded-lg text-xs font-medium transition-all min-h-[44px] ${
            value === opt.value
              ? 'bg-orange-600 text-white'
              : 'bg-gray-800/60 text-gray-400 border border-white/[0.07] hover:border-orange-500/50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export default function CreateHerdModal({ farmId, onClose }: { farmId: string, onClose: () => void }) {
  const [name, setName] = useState('')
  const [species, setSpecies] = useState('bovinos_corte')
  const [headCount, setHeadCount] = useState('')
  const [mainPhase, setMainPhase] = useState('recria')
  const [forageId, setForageId] = useState('')
  const [breedId, setBreedId] = useState('')
  const [avgWeight, setAvgWeight] = useState('')
  const [sex, setSex] = useState('')
  const [forages, setForages] = useState<any[]>([])
  const [breeds, setBreeds] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showGenetics, setShowGenetics] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  // Estado genético (4 perguntas)
  const [geneticInfo, setGeneticInfo] = useState<GeneticInfo>({
    origin: null,
    knows_bull: false,
    bull_ceip: false,
    has_dep: false,
    size: null,
    uniformity: null,
    temperament: null,
  })

  const updateGenetic = <K extends keyof GeneticInfo>(key: K, value: GeneticInfo[K]) => {
    setGeneticInfo(prev => ({ ...prev, [key]: value }))
  }

  useEffect(() => {
    const loadData = async () => {
      const { data: forageData } = await supabase.from('forages').select('id, name, category').order('name')
      setForages(forageData || [])
      const { data: breedData } = await supabase.from('breeds').select('id, name, category, aptitude').order('name')
      setBreeds(breedData || [])
    }
    loadData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Calcular completude
    let filled = 0
    const optionalFields = [forageId, breedId, avgWeight, sex]
    optionalFields.forEach(f => { if (f) filled++ })
    // Contar campos genéticos preenchidos
    const gFields = [
      geneticInfo.origin, geneticInfo.knows_bull, geneticInfo.bull_ceip,
      geneticInfo.has_dep, geneticInfo.size, geneticInfo.uniformity, geneticInfo.temperament
    ]
    gFields.forEach(f => { if (f) filled++ })
    const completeness = Math.min(100, 20 + Math.round((filled / 11) * 80))

    // Montar genetic_info como JSON (só se algo foi preenchido)
    const hasGeneticData = geneticInfo.origin || geneticInfo.knows_bull ||
      geneticInfo.bull_ceip || geneticInfo.has_dep ||
      geneticInfo.size || geneticInfo.uniformity || geneticInfo.temperament

    const { error: insertError } = await supabase.from('herds').insert({
      farm_id: farmId,
      name,
      species,
      head_count: parseInt(headCount),
      main_phase: mainPhase,
      forage_id: forageId || null,
      breed_id: breedId || null,
      avg_weight_kg: avgWeight ? parseFloat(avgWeight) : null,
      sex: sex || null,
      genetic_info: hasGeneticData ? geneticInfo : null,
      profile_completeness: completeness,
    })

    if (insertError) {
      setError(insertError.message)
    } else {
      router.refresh()
      onClose()
    }
    setLoading(false)
  }

  const SPECIES = [
    { value: 'bovinos_corte', label: 'Bovinos de Corte' },
    { value: 'bovinos_leite', label: 'Bovinos de Leite' },
    { value: 'bezerros', label: 'Bezerros' },
    { value: 'reprodutores', label: 'Reprodutores' },
    { value: 'aves', label: 'Aves' },
    { value: 'equinos', label: 'Equinos' },
    { value: 'ovinos', label: 'Ovinos' },
  ]

  const PHASES: Record<string, {value: string, label: string}[]> = {
    bovinos_corte: [
      { value: 'cria', label: 'Cria' },
      { value: 'recria', label: 'Recria' },
      { value: 'engorda', label: 'Engorda' },
    ],
    bovinos_leite: [
      { value: 'cria', label: 'Cria' },
      { value: 'recria', label: 'Recria' },
      { value: 'lactacao', label: 'Lactação' },
    ],
    bezerros: [{ value: 'cria', label: 'Cria' }],
    reprodutores: [{ value: 'reproducao', label: 'Reprodução' }],
    aves: [
      { value: 'inicial', label: 'Inicial' },
      { value: 'crescimento', label: 'Crescimento' },
      { value: 'engorda', label: 'Engorda' },
      { value: 'postura', label: 'Postura' },
    ],
    equinos: [{ value: 'todas', label: 'Todas as fases' }],
    ovinos: [{ value: 'todas', label: 'Todas as fases' }],
  }

  const filteredBreeds = breeds.filter(b => {
    if (species === 'bovinos_corte' || species === 'bezerros' || species === 'reprodutores') {
      return b.aptitude === 'corte' || b.aptitude === 'dupla'
    }
    if (species === 'bovinos_leite') {
      return b.aptitude === 'leite' || b.aptitude === 'dupla'
    }
    return true
  })

  const availablePhases = PHASES[species] || []
  const isBovino = species.startsWith('bovinos') || species === 'bezerros' || species === 'reprodutores'

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-[60] px-0 sm:px-4 modal-sheet" role="dialog" aria-labelledby="create-herd-title">
      <div className="card p-6 w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl">
        <h3 id="create-herd-title" className="text-xl font-bold mb-1 text-white">Novo Lote</h3>
        <p className="text-xs text-gray-500 mb-4">Preencha o máximo possível para uma recomendação mais precisa</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Nome */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Nome do lote *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Lote Recria Nelore"
              required
              className="w-full px-4 py-2.5 bg-[#050506] border border-white/[0.07] rounded-xl text-white text-sm focus:border-orange-500 focus:outline-none"
            />
          </div>

          {/* Espécie + Fase */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Espécie *</label>
              <select
                value={species}
                onChange={(e) => { setSpecies(e.target.value); setMainPhase(''); setBreedId('') }}
                className="w-full px-3 py-2.5 bg-[#050506] border border-white/[0.07] rounded-xl text-white text-sm focus:border-orange-500 focus:outline-none"
              >
                {SPECIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Fase *</label>
              <select
                value={mainPhase}
                onChange={(e) => setMainPhase(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-[#050506] border border-white/[0.07] rounded-xl text-white text-sm focus:border-orange-500 focus:outline-none"
              >
                <option value="">Selecione...</option>
                {availablePhases.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          {/* Cabeças + Peso */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Cabeças *</label>
              <input
                type="number"
                value={headCount}
                onChange={(e) => setHeadCount(e.target.value)}
                placeholder="Ex: 150"
                required
                min={1}
                className="w-full px-3 py-2.5 bg-[#050506] border border-white/[0.07] rounded-xl text-white text-sm focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Peso médio (kg)</label>
              <input
                type="number"
                value={avgWeight}
                onChange={(e) => setAvgWeight(e.target.value)}
                placeholder="Ex: 350"
                className="w-full px-3 py-2.5 bg-[#050506] border border-white/[0.07] rounded-xl text-white text-sm focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Raça */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Raça</label>
            <select
              value={breedId}
              onChange={(e) => setBreedId(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#050506] border border-white/[0.07] rounded-xl text-white text-sm focus:border-orange-500 focus:outline-none"
            >
              <option value="">Selecione (opcional)...</option>
              {filteredBreeds.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          {/* Sexo + Capim */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Sexo</label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#050506] border border-white/[0.07] rounded-xl text-white text-sm focus:border-orange-500 focus:outline-none"
              >
                <option value="">Selecione...</option>
                <option value="macho">Machos</option>
                <option value="femea">Fêmeas</option>
                <option value="misto">Misto</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Capim</label>
              <select
                value={forageId}
                onChange={(e) => setForageId(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#050506] border border-white/[0.07] rounded-xl text-white text-sm focus:border-orange-500 focus:outline-none"
              >
                <option value="">Selecione...</option>
                {forages.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          </div>

          {/* === SEÇÃO GENÉTICA (só para bovinos) === */}
          {isBovino && (
            <>
              <button
                type="button"
                onClick={() => setShowGenetics(!showGenetics)}
                className="w-full flex items-center justify-between px-4 py-3 bg-orange-500/10 border border-orange-500/20 rounded-xl text-sm text-orange-400 font-semibold hover:bg-orange-500/15 transition-all"
              >
                <span>Genética do lote (opcional)</span>
                <span className="text-xs">{showGenetics ? '▲' : '▼'}</span>
              </button>

              {showGenetics && (
                <div className="space-y-4 bg-gray-800/30 rounded-xl p-4 border border-white/[0.05]">
                  {/* Q1: Origem genética */}
                  <div>
                    <p className="text-sm text-gray-300 font-semibold mb-1">1. Qual a origem genética?</p>
                    <p className="text-xs text-gray-500 mb-2">Toque para selecionar. Toque de novo para desmarcar.</p>
                    <OptionChips
                      options={[
                        { value: 'po', label: 'PO' },
                        { value: 'la', label: 'LA' },
                        { value: 'cruzamento_industrial', label: 'Cruzamento Industrial' },
                        { value: 'f1', label: 'F1' },
                        { value: 'meio_sangue', label: 'Meio-sangue' },
                        { value: 'composto', label: 'Composto' },
                      ]}
                      value={geneticInfo.origin}
                      onChange={(v) => updateGenetic('origin', v)}
                    />
                  </div>

                  {/* Q2: Sobre o touro */}
                  <div>
                    <p className="text-sm text-gray-300 font-semibold mb-2">2. Sobre o touro</p>
                    <div className="space-y-2">
                      <CheckBox
                        label="Sei quem é o touro"
                        checked={geneticInfo.knows_bull}
                        onChange={(v) => updateGenetic('knows_bull', v)}
                      />
                      <CheckBox
                        label="Touro é CEIP"
                        checked={geneticInfo.bull_ceip}
                        onChange={(v) => updateGenetic('bull_ceip', v)}
                      />
                      <CheckBox
                        label="Tem DEP (Diferença Esperada de Progênie)"
                        checked={geneticInfo.has_dep}
                        onChange={(v) => updateGenetic('has_dep', v)}
                      />
                    </div>
                  </div>

                  {/* Q3: Fenótipos */}
                  <div>
                    <p className="text-sm text-gray-300 font-semibold mb-3">3. Avaliação visual do lote</p>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-400 mb-1.5">Porte</p>
                        <TripleSelect
                          options={[
                            { value: 'pequeno', label: 'Pequeno' },
                            { value: 'medio', label: 'Médio' },
                            { value: 'grande', label: 'Grande' },
                          ]}
                          value={geneticInfo.size}
                          onChange={(v) => updateGenetic('size', v)}
                        />
                      </div>

                      <div>
                        <p className="text-xs text-gray-400 mb-1.5">Uniformidade</p>
                        <TripleSelect
                          options={[
                            { value: 'baixa', label: 'Baixa' },
                            { value: 'media', label: 'Média' },
                            { value: 'alta', label: 'Alta' },
                          ]}
                          value={geneticInfo.uniformity}
                          onChange={(v) => updateGenetic('uniformity', v)}
                        />
                      </div>

                      <div>
                        <p className="text-xs text-gray-400 mb-1.5">Temperamento</p>
                        <TripleSelect
                          options={[
                            { value: 'manso', label: 'Manso' },
                            { value: 'medio', label: 'Médio' },
                            { value: 'arredio', label: 'Arredio' },
                          ]}
                          value={geneticInfo.temperament}
                          onChange={(v) => updateGenetic('temperament', v)}
                        />
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 text-center">
                    A IA calcula o Score Genético automaticamente
                  </p>
                </div>
              )}
            </>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 min-h-[44px] btn-ghost rounded-xl text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 min-h-[44px] btn-primary rounded-xl text-sm disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Criar Lote'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
