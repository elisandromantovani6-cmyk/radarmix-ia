'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ProgressiveQuestion({ herd }: { herd: any }) {
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [answered, setAnswered] = useState(false)
  const router = useRouter()

  // Só mostra se condição do pasto não foi preenchida
  if (herd.pasture_condition || answered) return null

  const handleSave = async () => {
    if (!value) return
    setSaving(true)

    // Calcular completude atualizada
    const fields = ['forage_id', 'breed_id', 'avg_weight_kg', 'sex', 'pasture_condition']
    let filled = 1 // contando pasture_condition que está sendo preenchido
    for (const f of fields) {
      if (f !== 'pasture_condition' && herd[f]) filled++
    }
    const completeness = Math.min(100, 20 + Math.round((filled / fields.length) * 80))

    const res = await fetch('/api/herds/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ herd_id: herd.id, pasture_condition: value, profile_completeness: completeness }),
    })
    if (!res.ok) {
      const err = await res.json()
      console.error('Erro ao salvar:', err.error)
    }

    setSaving(false)
    setAnswered(true)
    router.refresh()
  }

  return (
    <div className="mt-3 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs">💡</span>
        <p className="text-xs text-blue-400 font-semibold uppercase">Complete o perfil</p>
      </div>
      <p className="text-sm text-gray-300 mb-3">Como está a condição do pasto deste lote?</p>

      <div className="flex gap-2">
        <select
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">Selecione...</option>
          <option value="bom">Bom - capim verde e alto</option>
          <option value="regular">Regular - capim médio</option>
          <option value="degradado">Degradado - capim ralo e seco</option>
        </select>
        <button
          onClick={handleSave}
          disabled={!value || saving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg disabled:opacity-50"
        >
          {saving ? '...' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}

