'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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
  const supabase = createClient()
  const router = useRouter()

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
    // Base 20% (nome, espécie, cabeças, fase) + opcionais
    const completeness = Math.min(100, 20 + Math.round((filled / 5) * 80))

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

  // Filtrar raças por aptidão baseado na espécie
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

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-1 text-white">Novo Lote</h3>
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
              className="w-full px-4 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-white text-sm focus:border-green-500 focus:outline-none"
            />
          </div>

          {/* Espécie + Fase (lado a lado) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Espécie *</label>
              <select
                value={species}
                onChange={(e) => { setSpecies(e.target.value); setMainPhase(''); setBreedId('') }}
                className="w-full px-3 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-white text-sm focus:border-green-500 focus:outline-none"
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
                className="w-full px-3 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-white text-sm focus:border-green-500 focus:outline-none"
              >
                <option value="">Selecione...</option>
                {availablePhases.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          {/* Cabeças + Peso (lado a lado) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Cabeças *</label>
              <input
                type="number"
                value={headCount}
                onChange={(e) => setHeadCount(e.target.value)}
                placeholder="Ex: 150"
                required
                min={1}
                className="w-full px-3 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-white text-sm focus:border-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Peso médio (kg)</label>
              <input
                type="number"
                value={avgWeight}
                onChange={(e) => setAvgWeight(e.target.value)}
                placeholder="Ex: 350"
                className="w-full px-3 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-white text-sm focus:border-green-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Raça */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Raça</label>
            <select
              value={breedId}
              onChange={(e) => setBreedId(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-white text-sm focus:border-green-500 focus:outline-none"
            >
              <option value="">Selecione (opcional)...</option>
              {filteredBreeds.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          {/* Sexo + Capim (lado a lado) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Sexo</label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-white text-sm focus:border-green-500 focus:outline-none"
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
                className="w-full px-3 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-white text-sm focus:border-green-500 focus:outline-none"
              >
                <option value="">Selecione...</option>
                {forages.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-sm disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Criar Lote'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

