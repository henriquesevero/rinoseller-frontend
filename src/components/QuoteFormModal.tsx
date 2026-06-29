import { useRef, useState } from 'react'
import { createProduct, updatePrice } from '../api/client'
import type { Client, Product } from '../types'
import { ConfirmModal } from './ConfirmModal'

const CATEGORIES = ['Químicos', 'Lavatório', 'Finalizadores', 'Acessórios', 'Tratamentos']
const EMPTY_NEW_PROD = { name: '', category: 'Químicos', price: '', cost_price: '', stock_quantity: '0' }

function nextProductCode(products: Product[]): string {
  const max = products.reduce((m, p) => {
    const n = parseInt(p.code ?? '0', 10)
    return isNaN(n) ? m : Math.max(m, n)
  }, 0)
  return (max + 1).toString().padStart(3, '0')
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

type CartEntry = { product_id: string; product_name: string; price: number; quantity: number }

export interface QuoteFormPayload {
  client_id: string
  items: { product_id: string; quantity: number }[]
  notes?: string
  payment_type?: string
  installments?: number
}

interface Props {
  open: boolean
  title: string
  submitLabel: string
  savingLabel: string
  clients: Client[]
  products: Product[]
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>
  onSubmit: (payload: QuoteFormPayload) => Promise<void>
  onClose: () => void
}

export function QuoteFormModal({ open, title, submitLabel, savingLabel, clients, products, setProducts, onSubmit, onClose }: Props) {
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [confirmClose, setConfirmClose] = useState(false)
  const [paymentType, setPaymentType] = useState('')
  const [installments, setInstallments] = useState(1)

  // cliente
  const [selectedClient, setSelectedClient] = useState('')
  const [clientSearch, setClientSearch]     = useState('')
  const [clientOpen, setClientOpen]         = useState(false)

  // produto search
  const [prodSearch, setProdSearch] = useState('')
  const [prodOpen, setProdOpen]     = useState(false)

  // novo produto inline
  const [showNewProd, setShowNewProd]   = useState(false)
  const [newProd, setNewProd]           = useState(EMPTY_NEW_PROD)
  const [savingNewProd, setSavingNewProd] = useState(false)
  const [newProdError, setNewProdError]   = useState('')

  // carrinho
  const [cart, setCart]   = useState<CartEntry[]>([])
  const [notes, setNotes] = useState('')

  // edição de preço no carrinho
  const [editingPriceId, setEditingPriceId]   = useState<string | null>(null)
  const [editingPriceVal, setEditingPriceVal] = useState('')
  const priceInputRef = useRef<HTMLInputElement>(null)

  const [stockWarning, setStockWarning] = useState('')

  if (!open) return null

  const filteredClients  = clientSearch.trim().length > 0
    ? clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()))
    : []

  const filteredProducts = prodSearch.trim().length > 0
    ? products.filter(p => p.name.toLowerCase().includes(prodSearch.toLowerCase()))
    : []

  // ── Handlers — cliente ────────────────────────────────────────────────────────

  const selectClient = (c: Client) => {
    setSelectedClient(c.id); setClientSearch(c.name); setClientOpen(false)
  }

  // ── Handlers — produto ────────────────────────────────────────────────────────

  const selectProduct = (prod: Product) => {
    if (!prod.is_kit && prod.stock_quantity === 0) {
      setStockWarning(`"${prod.name}" está sem estoque e não pode ser adicionado.`)
      setProdSearch(''); setProdOpen(false)
      return
    }
    setStockWarning('')
    setCart(prev => {
      const ex = prev.find(e => e.product_id === prod.id)
      if (ex) return prev.map(e => e.product_id === prod.id ? { ...e, quantity: e.quantity + 1 } : e)
      return [...prev, { product_id: prod.id, product_name: prod.name, price: prod.price, quantity: 1 }]
    })
    setProdSearch(''); setProdOpen(false)
  }

  const openNewProd = () => {
    setNewProd({ ...EMPTY_NEW_PROD, name: prodSearch })
    setShowNewProd(true); setProdOpen(false); setNewProdError('')
  }

  const handleCreateProduct = async () => {
    if (!newProd.name || !newProd.price) { setNewProdError('Nome e preço são obrigatórios'); return }
    setSavingNewProd(true); setNewProdError('')
    try {
      const created = await createProduct({
        name: newProd.name,
        category: newProd.category,
        price: parseFloat(newProd.price),
        cost_price: parseFloat(newProd.cost_price || '0'),
        stock_quantity: parseInt(newProd.stock_quantity || '0'),
        code: nextProductCode(products),
      })
      setProducts(prev => [...prev, created])
      setCart(prev => [...prev, { product_id: created.id, product_name: created.name, price: created.price, quantity: 1 }])
      setShowNewProd(false); setNewProd(EMPTY_NEW_PROD); setProdSearch('')
    } catch (e: unknown) {
      setNewProdError(e instanceof Error ? e.message : 'Erro ao criar produto')
    } finally {
      setSavingNewProd(false)
    }
  }

  // ── Handlers — carrinho ───────────────────────────────────────────────────────

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) setCart(prev => prev.filter(e => e.product_id !== id))
    else setCart(prev => prev.map(e => e.product_id === id ? { ...e, quantity: qty } : e))
  }

  const startEditPrice = (id: string, currentPrice: number) => {
    setEditingPriceId(id)
    setEditingPriceVal(String(currentPrice))
    setTimeout(() => priceInputRef.current?.select(), 30)
  }

  const confirmEditPrice = async (id: string) => {
    const newPrice = parseFloat(editingPriceVal.replace(',', '.'))
    if (!isNaN(newPrice) && newPrice > 0 && newPrice !== cart.find(e => e.product_id === id)?.price) {
      try {
        await updatePrice(id, newPrice)
        setCart(prev => prev.map(e => e.product_id === id ? { ...e, price: newPrice } : e))
        setProducts(prev => prev.map(p => p.id === id ? { ...p, price: newPrice } : p))
      } catch { /* silently ignore if product is new and not in catalog */ }
    }
    setEditingPriceId(null)
  }

  const cartTotal = cart.reduce((s, e) => s + e.price * e.quantity, 0)

  // ── Modal ─────────────────────────────────────────────────────────────────────

  const hasFormData = cart.length > 0 || !!selectedClient || notes.trim().length > 0

  const resetModal = () => {
    setSelectedClient(''); setClientSearch(''); setCart([]); setNotes('')
    setProdSearch(''); setShowNewProd(false); setNewProd(EMPTY_NEW_PROD)
    setEditingPriceId(null); setError(''); setStockWarning('')
    setPaymentType(''); setInstallments(1)
  }

  const requestClose = () => {
    if (hasFormData) { setConfirmClose(true); return }
    resetModal(); onClose()
  }

  const doClose = () => { setConfirmClose(false); resetModal(); onClose() }

  const handleSubmit = async () => {
    if (!selectedClient || cart.length === 0) return
    setSaving(true); setError('')
    try {
      await onSubmit({
        client_id: selectedClient,
        items: cart.map(e => ({ product_id: e.product_id, quantity: e.quantity })),
        notes,
        payment_type: paymentType || undefined,
        installments: paymentType === 'Cartão de Crédito' ? installments : undefined,
      })
      resetModal(); onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
        onClick={requestClose}
      >
        <div
          className="bg-[#0f0f0f] border border-[#1c1c1c] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#1c1c1c]">
            <h2 className="text-white font-semibold text-lg">{title}</h2>
            <button onClick={requestClose} className="text-gray-500 hover:text-white">✕</button>
          </div>

          <div className="px-6 py-5 space-y-5">

            {/* ── Cliente ── */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Cliente</label>
              <div className="relative">
                <input
                  type="text"
                  value={clientSearch}
                  onChange={e => { setClientSearch(e.target.value); setSelectedClient(''); setClientOpen(true) }}
                  onFocus={() => clientSearch.trim() && setClientOpen(true)}
                  onBlur={() => setTimeout(() => setClientOpen(false), 150)}
                  placeholder="Digite o nome do cliente…"
                  className={`w-full bg-[#141414] border rounded-xl px-4 py-3 text-sm focus:outline-none placeholder-gray-700 text-white ${
                    selectedClient ? 'border-[#28AEA4]/40' : 'border-[#272727] focus:border-[#28AEA4]/50'
                  }`}
                />
                {selectedClient && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#28AEA4] text-xs">✓</span>}
                {clientOpen && filteredClients.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#272727] rounded-xl overflow-hidden z-10 max-h-48 overflow-y-auto shadow-xl">
                    {filteredClients.map(c => (
                      <button key={c.id} onMouseDown={() => selectClient(c)}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-[#272727] transition-colors text-left">
                        <span className="text-gray-200">{c.name}</span>
                        {c.cpf_cnpj && <span className="text-gray-600 ml-4 flex-shrink-0 text-xs">{c.cpf_cnpj}</span>}
                      </button>
                    ))}
                  </div>
                )}
                {clientOpen && clientSearch.trim().length > 0 && filteredClients.length === 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#272727] rounded-xl px-4 py-3 text-sm text-gray-600 z-10">
                    Nenhum cliente encontrado
                  </div>
                )}
              </div>
            </div>

            {/* ── Produto ── */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Adicionar Produto</label>
              <div className="relative">
                <input
                  type="text"
                  value={prodSearch}
                  onChange={e => { setProdSearch(e.target.value); setProdOpen(true); setShowNewProd(false) }}
                  onFocus={() => prodSearch.trim() && setProdOpen(true)}
                  onBlur={() => setTimeout(() => setProdOpen(false), 150)}
                  placeholder="Digite o nome do produto…"
                  className="w-full bg-[#141414] border border-[#272727] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#28AEA4]/50 placeholder-gray-700"
                />
                {prodOpen && prodSearch.trim().length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#272727] rounded-xl overflow-hidden z-10 shadow-xl">
                    {filteredProducts.map(p => {
                      const outOfStock = !p.is_kit && p.stock_quantity === 0
                      return (
                        <button key={p.id} onMouseDown={() => selectProduct(p)}
                          className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors text-left ${outOfStock ? 'opacity-50 cursor-not-allowed hover:bg-transparent' : 'hover:bg-[#272727]'}`}>
                          <span className="text-gray-200 flex items-center gap-2">
                            {p.name}
                            {outOfStock && <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded">Sem estoque</span>}
                          </span>
                          <span className="text-[#28AEA4] ml-4 flex-shrink-0">{fmt(p.price)}</span>
                        </button>
                      )
                    })}
                    <button
                      onMouseDown={openNewProd}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[#28AEA4]/80 hover:bg-[#272727] transition-colors border-t border-[#272727]"
                    >
                      <span className="text-base leading-none">+</span>
                      Criar produto "{prodSearch}"
                    </button>
                  </div>
                )}
              </div>
              {stockWarning && (
                <p className="text-xs text-red-400 mt-1">{stockWarning}</p>
              )}

              {/* ── Formulário novo produto (inline) ── */}
              {showNewProd && (
                <div className="mt-3 bg-[#141414] border border-[#28AEA4]/20 rounded-xl p-4 space-y-3">
                  <p className="text-xs text-[#28AEA4] font-semibold uppercase tracking-wider">Novo produto</p>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Nome</label>
                    <input
                      type="text"
                      value={newProd.name}
                      onChange={e => setNewProd(p => ({ ...p, name: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#272727] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#28AEA4]/40"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Categoria</label>
                      <select
                        value={newProd.category}
                        onChange={e => setNewProd(p => ({ ...p, category: e.target.value }))}
                        className="w-full bg-[#1a1a1a] border border-[#272727] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#28AEA4]/40"
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Estoque inicial</label>
                      <input
                        type="number"
                        min="0"
                        value={newProd.stock_quantity}
                        onChange={e => setNewProd(p => ({ ...p, stock_quantity: e.target.value }))}
                        className="w-full bg-[#1a1a1a] border border-[#272727] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#28AEA4]/40"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Preço de venda (R$)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newProd.price}
                        onChange={e => setNewProd(p => ({ ...p, price: e.target.value }))}
                        className="w-full bg-[#1a1a1a] border border-[#272727] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#28AEA4]/40"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Custo (R$)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newProd.cost_price}
                        onChange={e => setNewProd(p => ({ ...p, cost_price: e.target.value }))}
                        className="w-full bg-[#1a1a1a] border border-[#272727] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#28AEA4]/40"
                      />
                    </div>
                  </div>

                  {newProdError && <p className="text-red-400 text-xs">{newProdError}</p>}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleCreateProduct}
                      disabled={savingNewProd}
                      className="flex-1 py-2 bg-[#28AEA4] text-white rounded-lg text-sm font-semibold hover:bg-[#1d9992] disabled:opacity-40 transition-colors"
                    >
                      {savingNewProd ? 'Criando…' : 'Criar e adicionar'}
                    </button>
                    <button
                      onClick={() => { setShowNewProd(false); setNewProd(EMPTY_NEW_PROD) }}
                      className="px-4 py-2 bg-[#1a1a1a] border border-[#272727] text-gray-500 rounded-lg text-sm hover:text-white transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Carrinho ── */}
            {cart.length > 0 && (
              <div className="bg-[#141414] border border-[#1c1c1c] rounded-xl p-4 space-y-2">
                {cart.map(entry => (
                  <div key={entry.product_id} className="flex items-center gap-3">
                    <span className="flex-1 text-sm text-gray-300 truncate">{entry.product_name}</span>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => updateQty(entry.product_id, entry.quantity - 1)} className="w-6 h-6 rounded-lg bg-[#1c1c1c] text-gray-400 hover:text-white text-sm leading-none">−</button>
                      <span className="w-6 text-center text-white text-sm">{entry.quantity}</span>
                      <button onClick={() => updateQty(entry.product_id, entry.quantity + 1)} className="w-6 h-6 rounded-lg bg-[#1c1c1c] text-gray-400 hover:text-white text-sm leading-none">+</button>
                    </div>

                    {/* Preço editável */}
                    {editingPriceId === entry.product_id ? (
                      <div className="flex items-center gap-1 w-28">
                        <span className="text-gray-600 text-xs">R$</span>
                        <input
                          ref={priceInputRef}
                          type="number"
                          min="0"
                          step="0.01"
                          value={editingPriceVal}
                          onChange={e => setEditingPriceVal(e.target.value)}
                          onBlur={() => confirmEditPrice(entry.product_id)}
                          onKeyDown={e => { if (e.key === 'Enter') confirmEditPrice(entry.product_id) }}
                          className="w-full bg-[#1c1c1c] border border-[#28AEA4]/40 text-white rounded-lg px-2 py-1 text-xs focus:outline-none"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditPrice(entry.product_id, entry.price)}
                        title="Clique para editar o preço"
                        className="text-[#28AEA4] text-sm w-28 text-right hover:text-[#f0c84a] transition-colors group flex items-center justify-end gap-1"
                      >
                        {fmt(entry.price * entry.quantity)}
                        <span className="opacity-0 group-hover:opacity-60 text-[10px] transition-opacity">✎</span>
                      </button>
                    )}
                  </div>
                ))}
                <div className="pt-2 border-t border-[#1c1c1c] flex justify-between">
                  <span className="text-gray-500 text-sm">Total</span>
                  <span className="text-[#28AEA4] font-bold">{fmt(cartTotal)}</span>
                </div>
              </div>
            )}

            {/* ── Observações ── */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Observações</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="Observações…"
                className="w-full bg-[#141414] border border-[#272727] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#28AEA4]/50 resize-none placeholder-gray-700"
              />
            </div>

            {/* ── Pagamento ── */}
            <div>
              <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Forma de Pagamento</label>
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {(['PIX', 'Dinheiro', 'Cartão de Débito', 'Cartão de Crédito'] as const).map(pt => (
                  <button
                    key={pt}
                    type="button"
                    onClick={() => { setPaymentType(paymentType === pt ? '' : pt); setInstallments(1) }}
                    className={`py-2 px-3 rounded-xl text-xs font-medium transition-all border ${
                      paymentType === pt
                        ? 'bg-[#28AEA4]/15 text-[#28AEA4] border-[#28AEA4]/40'
                        : 'bg-[#141414] text-gray-500 border-[#272727] hover:text-gray-300'
                    }`}
                  >
                    {pt}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => { setPaymentType(paymentType === 'Personalizado' ? '' : 'Personalizado'); setInstallments(1) }}
                className={`w-full py-2 px-3 rounded-xl text-xs font-medium transition-all border ${
                  paymentType === 'Personalizado'
                    ? 'bg-orange-500/15 text-orange-400 border-orange-500/40'
                    : 'bg-[#141414] text-gray-500 border-[#272727] hover:text-gray-300'
                }`}
              >
                Personalizado — faturamento gradual (lança dívida no cliente)
              </button>
              {paymentType === 'Cartão de Crédito' && (
                <div className="mt-2">
                  <label className="block text-xs text-gray-600 mb-1.5">Parcelas</label>
                  <div className="grid grid-cols-6 gap-1">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setInstallments(n)}
                        className={`py-1.5 text-xs rounded-lg font-medium transition-colors ${
                          installments === n
                            ? 'bg-[#28AEA4] text-white'
                            : 'bg-[#1a1a1a] border border-[#272727] text-gray-500 hover:text-gray-200'
                        }`}
                      >
                        {n}x
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={!selectedClient || cart.length === 0 || saving}
              className="w-full py-3.5 bg-[#28AEA4] text-white rounded-xl font-semibold text-sm hover:bg-[#1d9992] disabled:opacity-40 transition-colors"
            >
              {saving ? savingLabel : submitLabel}
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmClose}
        title="Descartar?"
        message="Há informações preenchidas que serão perdidas. Deseja realmente fechar sem salvar?"
        confirmLabel="Sim, descartar"
        danger
        onConfirm={doClose}
        onCancel={() => setConfirmClose(false)}
      />
    </>
  )
}
