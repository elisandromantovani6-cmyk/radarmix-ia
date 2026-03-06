'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function HerdActions({ herd, allHerds, onClose }: { herd: any, allHerds: any[], onClose: () => void }) {
  const [action, setAction] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [moveCount, setMoveCount] = useState('')
  const [targetHerdId, setTargetHerdId] = useState('')
  const [splitName, setSplitName] = useState('')
  const [splitCount, setSplitCount] = useState('')
  const [newPhase, setNewPhase] = useState(herd.main_phase)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [newProductId, setNewProductId] = useState('')
  const [products, setProducts] = useState<any[]>([])
  const supabase = createClient()
  const router = useRouter()

  const otherHerds = allHerds.filter(h => h.id !== herd.id)

  // Carregar produtos quando abre "trocar produto"
  useEffect(() => {
    if (action === 'product') {
      const loadProducts = async () => {
        const { data } = await supabase
          .from('products')
          .select('id, name, line, species')
          .in('species', herd.species.includes('bovinos') ? ['bovinos_corte', 'bovinos_leite', 'bezerros', 'reprodutores'] : [herd.species])
          .order('line')
          .order('name')
        setProducts(data || [])
      }
      loadProducts()
    }
  }, [action])

  const handleMove = async () => {
    const count = parseInt(moveCount)
    if (!count || count <= 0 || count > herd.head_count || !targetHerdId) return
    setLoading(true)
    const res = await fetch('/api/herds/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'move', herd_id: herd.id, target_herd_id: targetHerdId, count }),
    })
    if (!res.ok) {
      const err = await res.json()
      console.error('Erro ao mover:', err.error)
    }
    setLoading(false)
    router.refresh()
    onClose()
  }

  const handleSplit = async () => {
    const count = parseInt(splitCount)
    if (!count || count <= 0 || count >= herd.head_count || !splitName) return
    setLoading(true)
    const res = await fetch('/api/herds/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'split', herd_id: herd.id, split_name: splitName, split_count: count }),
    })
    if (!res.ok) {
      const err = await res.json()
      console.error('Erro ao dividir:', err.error)
    }
    setLoading(false)
    router.refresh()
    onClose()
  }

  const handlePhaseChange = async () => {
    if (newPhase === herd.main_phase) return
    setLoading(true)
    const res = await fetch('/api/herds/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'phase', herd_id: herd.id, new_phase: newPhase }),
    })
    if (!res.ok) {
      const err = await res.json()
      console.error('Erro ao mudar fase:', err.error)
    }
    setLoading(false)
    router.refresh()
    onClose()
  }

  const handleProductChange = async () => {
    if (!newProductId) return
    setLoading(true)
    const selectedProduct = products.find(p => p.id === newProductId)
    const res = await fetch('/api/herds/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'product',
        herd_id: herd.id,
        product_id: newProductId,
        product_name: selectedProduct?.name || newProductId,
        old_product_name: herd.product?.name || 'Nenhum',
        product_line: selectedProduct?.line,
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      console.error('Erro ao trocar produto:', err.error)
    }
    setLoading(false)
    router.refresh()
    onClose()
  }

  const handleDelete = async () => {
    setLoading(true)
    const res = await fetch('/api/herds/actions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ herd_id: herd.id }),
    })
    if (!res.ok) {
      const err = await res.json()
      console.error('Erro ao encerrar lote:', err.error)
    }
    setLoading(false)
    router.refresh()
    onClose()
  }

  const PHASES = [
    { value: 'cria', label: 'Cria' },
    { value: 'recria', label: 'Recria' },
    { value: 'engorda', label: 'Engorda' },
    { value: 'lactacao', label: 'Lactação' },
    { value: 'reproducao', label: 'Reprodução' },
  ]

  // Agrupar produtos por linha
  const groupedProducts: Record<string, any[]> = {}
  products.forEach(p => {
    if (!groupedProducts[p.line]) groupedProducts[p.line] = []
    groupedProducts[p.line].push(p)
  })

  return (
    <div className="mt-3 bg-gray-800/60 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-gray-300">Ações do Lote</p>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-sm">✕</button>
      </div>

      {!action && (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setAction('product')} className="py-2.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 text-xs font-bold rounded-lg border border-green-600/30">
            🔄 Trocar Produto
          </button>
          <button onClick={() => setAction('move')} className="py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-bold rounded-lg border border-blue-600/30">
            ↗ Mover cabeças
          </button>
          <button onClick={() => setAction('split')} className="py-2.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 text-xs font-bold rounded-lg border border-purple-600/30">
            ✂ Dividir lote
          </button>
          <button onClick={() => setAction('phase')} className="py-2.5 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 text-xs font-bold rounded-lg border border-yellow-600/30">
            🔄 Mudar fase
          </button>
          <button onClick={() => setAction('delete')} className="col-span-2 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-bold rounded-lg border border-red-600/30">
            🗑 Encerrar lote
          </button>
        </div>
      )}

      {/* TROCAR PRODUTO */}
      {action === 'product' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">
            Produto atual: <strong className="text-green-400">{herd.product?.name || 'Nenhum'}</strong>
          </p>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Novo produto</label>
            <select
              value={newProductId}
              onChange={(e) => setNewProductId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white text-sm focus:border-green-500 focus:outline-none"
            >
              <option value="">Selecione...</option>
              {Object.entries(groupedProducts).map(([line, prods]) => (
                <optgroup key={line} label={'Linha ' + line}>
                  {prods.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setAction(null)} className="flex-1 py-2 bg-gray-800 text-gray-400 text-xs rounded-lg">Voltar</button>
            <button onClick={handleProductChange} disabled={loading || !newProductId} className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg disabled:opacity-50">
              {loading ? 'Trocando...' : 'Confirmar troca'}
            </button>
          </div>
        </div>
      )}

      {/* MOVER */}
      {action === 'move' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">Mover cabeças de <strong className="text-white">{herd.name}</strong> ({herd.head_count} cab.):</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Quantidade</label>
              <input type="number" value={moveCount} onChange={(e) => setMoveCount(e.target.value)} max={herd.head_count} min={1} placeholder="Ex: 30"
                className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Lote destino</label>
              <select value={targetHerdId} onChange={(e) => setTargetHerdId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none">
                <option value="">Selecione...</option>
                {otherHerds.map(h => <option key={h.id} value={h.id}>{h.name} ({h.head_count} cab.)</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setAction(null)} className="flex-1 py-2 bg-gray-800 text-gray-400 text-xs rounded-lg">Voltar</button>
            <button onClick={handleMove} disabled={loading || !moveCount || !targetHerdId} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg disabled:opacity-50">
              {loading ? 'Movendo...' : 'Confirmar'}
            </button>
          </div>
        </div>
      )}

      {/* DIVIDIR */}
      {action === 'split' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">Dividir <strong className="text-white">{herd.name}</strong> ({herd.head_count} cab.):</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nome do novo lote</label>
              <input value={splitName} onChange={(e) => setSplitName(e.target.value)} placeholder="Ex: Nelore Lote B"
                className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Cabeças p/ novo lote</label>
              <input type="number" value={splitCount} onChange={(e) => setSplitCount(e.target.value)} max={herd.head_count - 1} min={1} placeholder="Ex: 50"
                className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setAction(null)} className="flex-1 py-2 bg-gray-800 text-gray-400 text-xs rounded-lg">Voltar</button>
            <button onClick={handleSplit} disabled={loading || !splitName || !splitCount} className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg disabled:opacity-50">
              {loading ? 'Dividindo...' : 'Confirmar'}
            </button>
          </div>
        </div>
      )}

      {/* MUDAR FASE */}
      {action === 'phase' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">Mudar fase de <strong className="text-white">{herd.name}</strong>:</p>
          <select value={newPhase} onChange={(e) => setNewPhase(e.target.value)}
            className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white text-sm focus:border-yellow-500 focus:outline-none">
            {PHASES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <p className="text-xs text-gray-600">Ao mudar de fase, o produto recomendado será limpo para recalcular.</p>
          <div className="flex gap-2">
            <button onClick={() => setAction(null)} className="flex-1 py-2 bg-gray-800 text-gray-400 text-xs rounded-lg">Voltar</button>
            <button onClick={handlePhaseChange} disabled={loading || newPhase === herd.main_phase} className="flex-1 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-bold rounded-lg disabled:opacity-50">
              {loading ? 'Salvando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      )}

      {/* ENCERRAR */}
      {action === 'delete' && (
        <div className="space-y-3">
          {!confirmDelete ? (
            <div>
              <p className="text-xs text-red-400">Encerrar <strong>{herd.name}</strong> ({herd.head_count} cab.)?</p>
              <p className="text-xs text-gray-500 mt-1">Esta ação não pode ser desfeita.</p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setAction(null)} className="flex-1 py-2 bg-gray-800 text-gray-400 text-xs rounded-lg">Voltar</button>
                <button onClick={() => setConfirmDelete(true)} className="flex-1 py-2 bg-red-600/30 hover:bg-red-600/50 text-red-400 text-xs font-bold rounded-lg">Sim, encerrar</button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs text-red-400 font-bold">Última confirmação: encerrar {herd.name}?</p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => { setConfirmDelete(false); setAction(null) }} className="flex-1 py-2 bg-gray-800 text-gray-400 text-xs rounded-lg">Cancelar</button>
                <button onClick={handleDelete} disabled={loading} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg disabled:opacity-50">
                  {loading ? 'Encerrando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

