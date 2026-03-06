'use client'
import { useState, useEffect } from 'react'

export default function ComparePanel({ herdId, herdName }: { herdId: string, herdName: string }) {
  const [products, setProducts] = useState<any[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch('/api/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ herd_id: herdId }),
        })
        // Carrega lista de produtos do Supabase diretamente
        const prodRes = await fetch('/api/compare/products?herd_id=' + herdId)
        if (prodRes.ok) {
          const data = await prodRes.json()
          setProducts(data.products || [])
        }
      } catch {
        // fallback
      } finally {
        setLoadingProducts(false)
      }
    }
    loadProducts()
  }, [herdId])

  const toggleProduct = (id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(p => p !== id)
      if (prev.length >= 5) return prev
      return [...prev, id]
    })
  }

  const compare = async () => {
    if (selected.length < 2) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_ids: selected, herd_id: herdId }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data)
    } catch (err: any) {
      setResult({ error: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4 animate-in">
      <div className="card-accent p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[13px] font-bold text-white">Comparar Produtos</span>
          <span className="badge badge-green">Novo</span>
        </div>

        {/* Seletor de produtos */}
        <p className="text-[11px] text-zinc-500 mb-2">Selecione de 2 a 5 produtos para comparar ({selected.length}/5)</p>
        <div className="max-h-[200px] overflow-y-auto space-y-1 mb-3">
          {loadingProducts ? (
            <p className="text-[11px] text-zinc-600">Carregando produtos...</p>
          ) : products.length === 0 ? (
            <p className="text-[11px] text-zinc-600">Nenhum produto encontrado</p>
          ) : products.map((p: any) => (
            <button key={p.id} onClick={() => toggleProduct(p.id)}
              className={'w-full text-left px-3 py-2 rounded-lg text-[12px] transition-all ' +
                (selected.includes(p.id)
                  ? 'bg-orange-500/15 border border-orange-500/30 text-orange-300'
                  : 'bg-zinc-800/40 border border-transparent text-zinc-400 hover:bg-zinc-800/60')}>
              <span className="font-medium">{p.name}</span>
              <span className="text-zinc-600 ml-2">({p.line})</span>
            </button>
          ))}
        </div>

        {/* Botão comparar */}
        <button onClick={compare} disabled={loading || selected.length < 2}
          className={'w-full py-2.5 min-h-[44px] rounded-xl text-[13px] font-bold transition-all ' +
            (selected.length >= 2
              ? 'btn-primary'
              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed')}>
          {loading ? 'Comparando...' : `Comparar ${selected.length} produtos`}
        </button>

        {/* Resultado */}
        {result && !result.error && (
          <div className="mt-4 space-y-3 animate-in">
            <div className="divider"></div>
            <div className="bg-zinc-900/50 rounded-xl p-4">
              <p className="text-[11px] text-orange-400 font-bold mb-2">ANÁLISE COMPARATIVA</p>
              <p className="text-[13px] text-zinc-300 leading-relaxed whitespace-pre-wrap">{result.analysis}</p>
            </div>
          </div>
        )}

        {result?.error && (
          <p className="mt-3 text-[12px] text-red-400">{result.error}</p>
        )}
      </div>
    </div>
  )
}
