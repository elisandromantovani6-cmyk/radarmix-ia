'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const CATEGORIES = [
  { value: 'mineral', label: 'Mineral' },
  { value: 'sal', label: 'Sal / Proteinado' },
  { value: 'milho', label: 'Milho' },
  { value: 'soja', label: 'Soja / Farelo' },
  { value: 'ureia', label: 'Uréia' },
  { value: 'volumoso', label: 'Volumoso / Silagem' },
  { value: 'racao', label: 'Ração' },
  { value: 'outros', label: 'Outros' },
]

const UNITS = ['kg', 'ton', 'saco 25kg', 'saco 30kg', 'saco 40kg', 'saco 50kg', 'un']

export default function FornecedorPage() {
  const [loading, setLoading] = useState(true)
  const [supplier, setSupplier] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Formulário do fornecedor
  const [editingSupplier, setEditingSupplier] = useState(false)
  const [supplierForm, setSupplierForm] = useState({ name: '', city: '', phone: '', description: '' })

  // Novo produto
  const [showNewProduct, setShowNewProduct] = useState(false)
  const [newProduct, setNewProduct] = useState({
    product_name: '', category: 'mineral', price: '', unit: 'kg', stock_qty: '', description: ''
  })

  // Edição de produto
  const [editingProduct, setEditingProduct] = useState<string | null>(null)
  const [editProductForm, setEditProductForm] = useState({ product_name: '', price: '', stock_qty: '' })

  const [saving, setSaving] = useState(false)

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/marketplace/supplier')
      const data = await res.json()
      if (res.ok && data.supplier) {
        setSupplier(data.supplier)
        setProducts(data.supplier.products || [])
        setSupplierForm({
          name: data.supplier.name || '',
          city: data.supplier.city || '',
          phone: data.supplier.phone || '',
          description: data.supplier.description || '',
        })
      }
    } catch {
      // erro silencioso
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  // --- Ações do fornecedor ---
  const saveSupplier = async () => {
    if (!supplierForm.name) return
    setSaving(true)
    try {
      const res = await fetch('/api/marketplace/supplier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_supplier', ...supplierForm }),
      })
      if (res.ok) {
        showMessage('success', 'Dados do fornecedor atualizados com sucesso!')
        setEditingSupplier(false)
        fetchData()
      } else {
        const data = await res.json()
        showMessage('error', data.error || 'Erro ao salvar')
      }
    } catch {
      showMessage('error', 'Erro de conexão')
    }
    setSaving(false)
  }

  // --- Ações de produto ---
  const addProduct = async () => {
    if (!newProduct.product_name || !newProduct.price) return
    setSaving(true)
    try {
      const res = await fetch('/api/marketplace/supplier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_product',
          supplier_id: supplier?.id,
          product_name: newProduct.product_name,
          category: newProduct.category,
          price: parseFloat(newProduct.price),
          unit: newProduct.unit,
          stock_qty: newProduct.stock_qty ? parseInt(newProduct.stock_qty) : null,
          description: newProduct.description,
        }),
      })
      if (res.ok) {
        showMessage('success', 'Produto adicionado com sucesso!')
        setNewProduct({ product_name: '', category: 'mineral', price: '', unit: 'kg', stock_qty: '', description: '' })
        setShowNewProduct(false)
        fetchData()
      } else {
        const data = await res.json()
        showMessage('error', data.error || 'Erro ao adicionar produto')
      }
    } catch {
      showMessage('error', 'Erro de conexão')
    }
    setSaving(false)
  }

  const updateProduct = async (productId: string) => {
    if (!editProductForm.product_name || !editProductForm.price) return
    setSaving(true)
    try {
      const res = await fetch('/api/marketplace/supplier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_product',
          product_id: productId,
          product_name: editProductForm.product_name,
          price: parseFloat(editProductForm.price),
          stock_qty: editProductForm.stock_qty ? parseInt(editProductForm.stock_qty) : null,
        }),
      })
      if (res.ok) {
        showMessage('success', 'Produto atualizado com sucesso!')
        setEditingProduct(null)
        fetchData()
      } else {
        const data = await res.json()
        showMessage('error', data.error || 'Erro ao atualizar produto')
      }
    } catch {
      showMessage('error', 'Erro de conexão')
    }
    setSaving(false)
  }

  const deleteProduct = async (productId: string, productName: string) => {
    if (!confirm(`Tem certeza que deseja excluir "${productName}"?`)) return
    setSaving(true)
    try {
      const res = await fetch('/api/marketplace/supplier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_product', product_id: productId }),
      })
      if (res.ok) {
        showMessage('success', 'Produto excluído com sucesso!')
        fetchData()
      } else {
        const data = await res.json()
        showMessage('error', data.error || 'Erro ao excluir produto')
      }
    } catch {
      showMessage('error', 'Erro de conexão')
    }
    setSaving(false)
  }

  // --- Tela de carregamento ---
  if (loading) return (
    <div className="min-h-screen bg-[#050506] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#050506] text-zinc-100 relative">
      {/* Header */}
      <header className="border-b border-white/[0.04] bg-[#050506]/80 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/marketplace" className="text-zinc-700 hover:text-white text-[13px] transition-colors">
              ← Marketplace
            </Link>
            <div className="h-4 w-px bg-zinc-800"></div>
            <div className="flex items-center gap-2">
              <img src="/logo-radarmix.jpg" alt="Radarmix" className="w-8 h-8 rounded-lg object-contain" />
              <h1 className="text-[15px] font-extrabold">
                RADAR<span className="text-gradient">MIX</span>{' '}
                <span className="text-[11px] text-orange-500/80 font-semibold">PAINEL DO FORNECEDOR</span>
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Mensagem de feedback */}
      {message && (
        <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-xl text-[13px] font-semibold shadow-lg transition-all ${
          message.type === 'success'
            ? 'bg-green-500/20 border border-green-500/30 text-green-400'
            : 'bg-red-500/20 border border-red-500/30 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      <main className="max-w-5xl mx-auto px-6 py-8 relative z-10">
        {/* Título */}
        <div className="mb-8 animate-in">
          <h2 className="text-[24px] font-bold text-white mb-2">Painel do Fornecedor</h2>
          <p className="text-zinc-500 text-[14px]">Gerencie seus dados, produtos e estoque no marketplace.</p>
        </div>

        {/* Seção: Dados do Fornecedor */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 mb-8 animate-in">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[14px] font-bold text-zinc-300 uppercase tracking-wider">Dados do Fornecedor</h3>
            {!editingSupplier && (
              <button
                onClick={() => setEditingSupplier(true)}
                className="px-4 py-2 text-[12px] font-semibold rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white hover:border-orange-500/50 transition-all"
              >
                Editar dados
              </button>
            )}
          </div>

          {!editingSupplier ? (
            // Exibição dos dados
            supplier ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-zinc-600 uppercase tracking-wider mb-1">Nome</p>
                  <p className="text-[14px] text-white font-semibold">{supplier.name || 'Não informado'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-zinc-600 uppercase tracking-wider mb-1">Cidade</p>
                  <p className="text-[14px] text-white font-semibold">{supplier.city || 'Não informada'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-zinc-600 uppercase tracking-wider mb-1">Telefone</p>
                  <p className="text-[14px] text-white font-semibold">{supplier.phone || 'Não informado'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-zinc-600 uppercase tracking-wider mb-1">Descrição</p>
                  <p className="text-[14px] text-white font-semibold">{supplier.description || 'Sem descrição'}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-zinc-500 text-[13px] mb-4">Você ainda não cadastrou seus dados de fornecedor.</p>
                <button
                  onClick={() => setEditingSupplier(true)}
                  className="px-6 py-3 text-[13px] font-semibold rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-colors"
                >
                  Cadastrar agora
                </button>
              </div>
            )
          ) : (
            // Formulário de edição
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-1">Nome da empresa</label>
                  <input
                    type="text"
                    value={supplierForm.name}
                    onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                    placeholder="Ex: Agropecuária Silva"
                    className="w-full px-3 py-2.5 text-[13px] rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-1">Cidade</label>
                  <input
                    type="text"
                    value={supplierForm.city}
                    onChange={(e) => setSupplierForm({ ...supplierForm, city: e.target.value })}
                    placeholder="Ex: Cuiabá"
                    className="w-full px-3 py-2.5 text-[13px] rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-1">Telefone</label>
                  <input
                    type="text"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    placeholder="(65) 99999-9999"
                    className="w-full px-3 py-2.5 text-[13px] rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-1">Descrição</label>
                  <input
                    type="text"
                    value={supplierForm.description}
                    onChange={(e) => setSupplierForm({ ...supplierForm, description: e.target.value })}
                    placeholder="Breve descrição da empresa"
                    className="w-full px-3 py-2.5 text-[13px] rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditingSupplier(false)}
                  className="flex-1 py-2.5 text-[13px] font-semibold rounded-lg bg-transparent border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveSupplier}
                  disabled={saving || !supplierForm.name}
                  className="flex-1 py-2.5 text-[13px] font-semibold rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar dados'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Seção: Produtos */}
        <div className="animate-in delay-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-bold text-zinc-300 uppercase tracking-wider">
              Meus Produtos ({products.length})
            </h3>
            <button
              onClick={() => setShowNewProduct(!showNewProduct)}
              className="px-4 py-2 text-[12px] font-semibold rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-colors"
            >
              + Novo Produto
            </button>
          </div>

          {/* Formulário: Novo Produto */}
          {showNewProduct && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 mb-4">
              <h4 className="text-[14px] font-bold text-zinc-300 mb-4">Adicionar novo produto</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-1">Nome do produto</label>
                  <input
                    type="text"
                    value={newProduct.product_name}
                    onChange={(e) => setNewProduct({ ...newProduct, product_name: e.target.value })}
                    placeholder="Ex: Sal mineral premium"
                    className="w-full px-3 py-2.5 text-[13px] rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-1">Categoria</label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="w-full px-3 py-2.5 text-[13px] rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:border-orange-500 focus:outline-none transition-colors"
                  >
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-1">Preço (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    placeholder="0,00"
                    className="w-full px-3 py-2.5 text-[13px] rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-1">Unidade</label>
                  <select
                    value={newProduct.unit}
                    onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                    className="w-full px-3 py-2.5 text-[13px] rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:border-orange-500 focus:outline-none transition-colors"
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-1">Estoque (quantidade)</label>
                  <input
                    type="number"
                    value={newProduct.stock_qty}
                    onChange={(e) => setNewProduct({ ...newProduct, stock_qty: e.target.value })}
                    placeholder="Opcional"
                    className="w-full px-3 py-2.5 text-[13px] rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-1">Descrição do produto</label>
                  <input
                    type="text"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    placeholder="Opcional"
                    className="w-full px-3 py-2.5 text-[13px] rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowNewProduct(false)}
                  className="flex-1 py-2.5 text-[13px] font-semibold rounded-lg bg-transparent border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={addProduct}
                  disabled={saving || !newProduct.product_name || !newProduct.price}
                  className="flex-1 py-2.5 text-[13px] font-semibold rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Adicionar produto'}
                </button>
              </div>
            </div>
          )}

          {/* Lista de produtos */}
          {products.length === 0 ? (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-10 text-center">
              <p className="text-zinc-500 text-[13px]">Nenhum produto cadastrado ainda. Clique em "+ Novo Produto" para começar.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Cabeçalho da tabela */}
              <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-4 py-2 text-[11px] text-zinc-600 uppercase tracking-wider font-semibold">
                <div className="col-span-4">Produto</div>
                <div className="col-span-2 text-right">Preço</div>
                <div className="col-span-1 text-center">Unidade</div>
                <div className="col-span-2 text-center">Estoque</div>
                <div className="col-span-3 text-right">Ações</div>
              </div>

              {products.map((p: any) => (
                <div key={p.id} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
                  {editingProduct === p.id ? (
                    // Modo edição
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-1">Nome</label>
                          <input
                            type="text"
                            value={editProductForm.product_name}
                            onChange={(e) => setEditProductForm({ ...editProductForm, product_name: e.target.value })}
                            className="w-full px-3 py-2 text-[13px] rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:border-orange-500 focus:outline-none transition-colors"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-1">Preço (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editProductForm.price}
                            onChange={(e) => setEditProductForm({ ...editProductForm, price: e.target.value })}
                            className="w-full px-3 py-2 text-[13px] rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:border-orange-500 focus:outline-none transition-colors"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-1">Estoque</label>
                          <input
                            type="number"
                            value={editProductForm.stock_qty}
                            onChange={(e) => setEditProductForm({ ...editProductForm, stock_qty: e.target.value })}
                            className="w-full px-3 py-2 text-[13px] rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:border-orange-500 focus:outline-none transition-colors"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setEditingProduct(null)}
                          className="px-4 py-2 text-[12px] font-semibold rounded-lg bg-transparent border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-all"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => updateProduct(p.id)}
                          disabled={saving}
                          className="px-4 py-2 text-[12px] font-semibold rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:opacity-50"
                        >
                          {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Modo visualização
                    <div className="sm:grid sm:grid-cols-12 gap-4 items-center">
                      <div className="col-span-4 mb-2 sm:mb-0">
                        <p className="text-[14px] font-bold text-white">{p.product_name}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 text-[10px] rounded-md bg-orange-500/10 border border-orange-500/20 text-orange-400">
                          {CATEGORIES.find(c => c.value === p.category)?.label || p.category}
                        </span>
                        {p.description && <p className="text-[11px] text-zinc-600 mt-1">{p.description}</p>}
                      </div>
                      <div className="col-span-2 text-right mb-1 sm:mb-0">
                        <p className="text-[15px] font-black text-white">{fmt(p.price_per_unit)}</p>
                      </div>
                      <div className="col-span-1 text-center mb-1 sm:mb-0">
                        <p className="text-[12px] text-zinc-400">{p.unit}</p>
                      </div>
                      <div className="col-span-2 text-center mb-2 sm:mb-0">
                        {p.stock_qty != null ? (
                          <span className={`text-[13px] font-semibold ${p.stock_qty > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {p.stock_qty} {p.unit}
                          </span>
                        ) : (
                          <span className="text-[12px] text-zinc-600">--</span>
                        )}
                      </div>
                      <div className="col-span-3 flex gap-2 justify-end">
                        <button
                          onClick={() => {
                            setEditingProduct(p.id)
                            setEditProductForm({
                              product_name: p.product_name,
                              price: String(p.price_per_unit),
                              stock_qty: p.stock_qty != null ? String(p.stock_qty) : '',
                            })
                          }}
                          className="px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white hover:border-orange-500/50 transition-all"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => deleteProduct(p.id, p.product_name)}
                          className="px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-zinc-800 border border-zinc-700 text-red-400 hover:text-red-300 hover:border-red-500/50 transition-all"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
