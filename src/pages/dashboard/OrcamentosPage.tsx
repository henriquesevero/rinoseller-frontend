import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  approveQuote, cancelQuote, createProduct, createQuote, deleteQuote,
  getClients, getProducts, getQuotes, updatePrice,
} from '../../api/client'
import type { Client, Product, Quote, QuoteStatus } from '../../types'
import { printQuote, shareQuoteOnWhatsApp } from '../../utils/quoteDocument'
import { ConfirmModal } from '../../components/ConfirmModal'
import { useSettings } from '../../contexts/SettingsContext'

const STATUS_COLORS_DARK: Record<QuoteStatus, string> = {
  'Aguardando Aprovação': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  'Aprovado':             'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Entregue':             'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Faturado':             'bg-green-500/10 text-green-400 border-green-500/20',
  'Faturado Gradual':     'bg-[#28AEA4]/10 text-[#28AEA4] border-[#28AEA4]/20',
  'Cancelado':            'bg-red-500/10 text-red-400 border-red-500/20',
  'Entregue/Faturado':    'bg-green-500/10 text-green-400 border-green-500/20',
}

const STATUS_COLORS_LIGHT: Record<QuoteStatus, string> = {
  'Aguardando Aprovação': 'bg-amber-50 border-amber-200 text-amber-700',
  'Aprovado':             'bg-blue-50 border-blue-200 text-blue-600',
  'Entregue':             'bg-violet-50 border-violet-200 text-violet-600',
  'Faturado':             'bg-teal-50 border-teal-200 text-teal-700',
  'Faturado Gradual':     'bg-[#28AEA4]/10 border-[#28AEA4]/30 text-[#1d9992]',
  'Cancelado':            'bg-red-50 border-red-200 text-red-500',
  'Entregue/Faturado':    'bg-teal-50 border-teal-200 text-teal-700',
}

type TabValue = QuoteStatus | 'Todos'

const TABS: { label: string; value: TabValue }[] = [
  { label: 'Todos',       value: 'Todos' },
  { label: 'Aguardando',  value: 'Aguardando Aprovação' },
  { label: 'Aprovados',   value: 'Aprovado' },
  { label: 'Cancelados',  value: 'Cancelado' },
]

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
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('pt-BR')
}

type CartEntry = { product_id: string; product_name: string; price: number; quantity: number }

export default function OrcamentosPage() {
  const location = useLocation()
  const { theme } = useSettings()
  const light = theme === 'light'
  const STATUS_COLORS = light ? STATUS_COLORS_LIGHT : STATUS_COLORS_DARK
  const [quotes, setQuotes]     = useState<Quote[]>([])
  const [clients, setClients]   = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [activeTab, setActiveTab] = useState<QuoteStatus | 'Todos'>('Todos')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [highlightId, setHighlightId] = useState<string | null>((location.state as { highlightId?: string } | null)?.highlightId ?? null)
  const [confirmAction, setConfirmAction] = useState<{ type: 'cancel' | 'close'; id?: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [paymentType, setPaymentType] = useState('')
  const [installments, setInstallments] = useState(1)

  // modal — cliente
  const [selectedClient, setSelectedClient] = useState('')
  const [clientSearch, setClientSearch]     = useState('')
  const [clientOpen, setClientOpen]         = useState(false)

  // modal — produto search
  const [prodSearch, setProdSearch] = useState('')
  const [prodOpen, setProdOpen]     = useState(false)

  // modal — novo produto inline
  const [showNewProd, setShowNewProd]   = useState(false)
  const [newProd, setNewProd]           = useState(EMPTY_NEW_PROD)
  const [savingNewProd, setSavingNewProd] = useState(false)
  const [newProdError, setNewProdError]   = useState('')

  // modal — carrinho
  const [cart, setCart]   = useState<CartEntry[]>([])
  const [notes, setNotes] = useState('')

  // edição de preço no carrinho
  const [editingPriceId, setEditingPriceId]   = useState<string | null>(null)
  const [editingPriceVal, setEditingPriceVal] = useState('')
  const priceInputRef = useRef<HTMLInputElement>(null)

  const [stockWarning, setStockWarning] = useState('')

  const load = async () => {
    try {
      const [q, c, p] = await Promise.all([getQuotes(), getClients(), getProducts()])
      setQuotes(q); setClients(c); setProducts(p)
    } catch { /* mantém dados anteriores em caso de erro */ }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!highlightId) return
    const t = setTimeout(() => {
      document.getElementById(`quote-${highlightId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
    const t2 = setTimeout(() => setHighlightId(null), 2800)
    return () => { clearTimeout(t); clearTimeout(t2) }
  }, [highlightId])

  // ── Filtros ──────────────────────────────────────────────────────────────────

  // No escopo de Orçamentos, o ciclo de vida termina em "Aprovado" — o que vem
  // depois (Entregue/Faturado) é tratado em Pedidos de Venda. O orçamento
  // permanece visível aqui como histórico, exibido como "Aprovado".
  const displayStatus = (q: Quote): QuoteStatus =>
    (q.status === 'Entregue' || q.status === 'Faturado' || q.status === 'Entregue/Faturado')
      ? 'Aprovado'
      : q.status

  const filtered = quotes
    .filter(q => activeTab === 'Todos' || displayStatus(q) === activeTab)
    .filter(q => !search || q.client_name.toLowerCase().includes(search.toLowerCase()))
  const sorted   = [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const filteredClients  = clientSearch.trim().length > 0
    ? clients.filter(c => c.name.toLowerCase().startsWith(clientSearch.toLowerCase()))
    : []

  const filteredProducts = prodSearch.trim().length > 0
    ? products.filter(p => p.name.toLowerCase().startsWith(prodSearch.toLowerCase()))
    : []

  // ── Handlers — cliente ────────────────────────────────────────────────────────

  const selectClient = (c: Client) => {
    setSelectedClient(c.id); setClientSearch(c.name); setClientOpen(false)
  }

  // ── Handlers — produto ────────────────────────────────────────────────────────

  const selectProduct = (prod: Product) => {
    if (prod.stock_quantity === 0) {
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
    setEditingPriceId(null); setError('')
    setPaymentType(''); setInstallments(1)
  }

  const closeModal = () => {
    if (hasFormData) { setConfirmAction({ type: 'close' }); return }
    setShowModal(false); resetModal()
  }

  const doClose = () => { setConfirmAction(null); setShowModal(false); resetModal() }

  const handleCreate = async () => {
    if (!selectedClient || cart.length === 0) return
    setSaving(true); setError('')
    try {
      await createQuote({
        client_id: selectedClient,
        items: cart.map(e => ({ product_id: e.product_id, quantity: e.quantity })),
        notes,
        payment_type: paymentType || undefined,
        installments: paymentType === 'Cartão de Crédito' ? installments : undefined,
      })
      setShowModal(false); resetModal(); await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao criar orçamento')
    } finally {
      setSaving(false)
    }
  }

  const doDelete = async () => {
    if (!confirmDelete) return
    const id = confirmDelete
    setConfirmDelete(null)
    try { await deleteQuote(id); await load() }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erro ao excluir orçamento') }
  }

  const handleApprove = async (id: string) => {
    try { await approveQuote(id); await load() }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erro') }
  }

  const handleCancel = (id: string) => setConfirmAction({ type: 'cancel', id })

  const doCancel = async () => {
    const id = confirmAction?.id
    setConfirmAction(null)
    if (!id) return
    try { await cancelQuote(id); await load() }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erro') }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Orçamentos</h1>
          <p className="text-gray-500 text-sm mt-0.5">Crie e gerencie orçamentos para seus clientes</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#28AEA4] text-white rounded-xl text-sm font-semibold hover:bg-[#1d9992] transition-colors"
        >
          <span className="text-lg leading-none">+</span>
          Novo Orçamento
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-[#111] p-1 rounded-xl overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setActiveTab(t.value)}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === t.value ? 'bg-[#28AEA4] text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          placeholder="Buscar por cliente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#111] border border-[#1e1e1e] focus:border-[#28AEA4]/40 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-colors placeholder:text-gray-600"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors text-lg leading-none">×</button>
        )}
      </div>

      {/* Quote list */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-lg">Nenhum orçamento encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(q => (
            <div id={`quote-${q.id}`} key={q.id} className={`bg-[#0f0f0f] border rounded-2xl p-5 transition-all duration-500 ${highlightId === q.id ? 'border-[#28AEA4]/50 ring-1 ring-[#28AEA4]/30' : 'border-[#1c1c1c]'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-white font-semibold">{q.client_name}</span>
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLORS[displayStatus(q)]}`}>
                      {displayStatus(q)}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs mt-1">{fmtDate(q.created_at)} · {q.items.length} {q.items.length === 1 ? 'item' : 'itens'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[#28AEA4] font-bold text-lg">{fmt(q.total)}</p>
                  {q.payment_type && (
                    <p className="text-gray-500 text-[10px] mt-0.5">
                      {q.payment_type === 'Cartão de Crédito'
                        ? (q.installments > 1 ? `${q.installments}x crédito` : 'Crédito à vista')
                        : q.payment_type}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-[#1c1c1c] space-y-1">
                {q.items.map((item, i) => (
                  <div key={i} className="text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">{item.product_name} × {item.quantity}</span>
                      <span className="text-gray-500">{fmt(item.subtotal)}</span>
                    </div>
                    {item.kit_items && item.kit_items.length > 0 && (
                      <p className="text-xs text-gray-600 mt-0.5 pl-3">
                        Kit inclui: {item.kit_items.map(ki => `${ki.quantity}x ${ki.product_name}`).join(' + ')}
                      </p>
                    )}
                  </div>
                ))}
                {q.notes && <p className="text-gray-600 text-xs mt-2 italic">{q.notes}</p>}
              </div>
              {/* Ações de status */}
              {q.status === 'Aguardando Aprovação' && (
                <div className="mt-3 pt-3 border-t border-[#1c1c1c] flex gap-2">
                  <button onClick={() => handleApprove(q.id)} className="px-3.5 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-500/20 transition-colors">Aprovar</button>
                  <button onClick={() => handleCancel(q.id)}  className="px-3.5 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-colors">Cancelar</button>
                </div>
              )}

              {/* Ações de nota */}
              <div className="mt-3 pt-3 border-t border-[#1c1c1c] flex gap-2 flex-wrap">
                <button
                  onClick={() => printQuote(q, clients)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#28AEA4]/8 border border-[#28AEA4]/20 text-[#28AEA4] rounded-lg text-xs font-medium hover:bg-[#28AEA4]/15 transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                    <rect x="6" y="14" width="12" height="8"/>
                  </svg>
                  Imprimir / PDF
                </button>
                <button
                  onClick={() => shareQuoteOnWhatsApp(q, clients, 'orcamento')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg text-xs font-medium hover:bg-green-500/20 transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.845L0 24l6.335-1.508A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.847 0-3.574-.5-5.062-1.373l-.363-.215-3.762.896.957-3.67-.236-.38A9.944 9.944 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                  </svg>
                  WhatsApp
                </button>
                <button
                  onClick={() => setConfirmDelete(q.id)}
                  className="ml-auto p-1.5 text-gray-700 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
                  title="Excluir orçamento"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={confirmAction?.type === 'cancel'}
        title="Cancelar orçamento?"
        message="Esta ação não pode ser desfeita. O orçamento será marcado como cancelado."
        confirmLabel="Sim, cancelar"
        danger
        onConfirm={doCancel}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmModal
        open={confirmAction?.type === 'close'}
        title="Descartar orçamento?"
        message="Há informações preenchidas que serão perdidas. Deseja realmente fechar sem salvar?"
        confirmLabel="Sim, descartar"
        danger
        onConfirm={doClose}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmModal
        open={confirmDelete !== null}
        title="Excluir orçamento?"
        message="Esta ação é permanente e não pode ser desfeita. O orçamento será removido do sistema."
        confirmLabel="Sim, excluir"
        danger
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* ── Modal Novo Orçamento ── */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="bg-[#0f0f0f] border border-[#1c1c1c] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#1c1c1c]">
              <h2 className="text-white font-semibold text-lg">Novo Orçamento</h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-white">✕</button>
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
                      {filteredProducts.map(p => (
                        <button key={p.id} onMouseDown={() => selectProduct(p)}
                          className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors text-left ${p.stock_quantity === 0 ? 'opacity-50 cursor-not-allowed hover:bg-transparent' : 'hover:bg-[#272727]'}`}>
                          <span className="text-gray-200 flex items-center gap-2">
                            {p.name}
                            {p.stock_quantity === 0 && <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded">Sem estoque</span>}
                          </span>
                          <span className="text-[#28AEA4] ml-4 flex-shrink-0">{fmt(p.price)}</span>
                        </button>
                      ))}
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
                  placeholder="Observações do orçamento…"
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
                onClick={handleCreate}
                disabled={!selectedClient || cart.length === 0 || saving}
                className="w-full py-3.5 bg-[#28AEA4] text-white rounded-xl font-semibold text-sm hover:bg-[#1d9992] disabled:opacity-40 transition-colors"
              >
                {saving ? 'Criando…' : 'Criar Orçamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
