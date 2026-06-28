import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  approveQuote, cancelQuote, createQuote, deleteQuote,
  getClients, getProducts, getQuotes,
} from '../../api/client'
import type { Client, Product, Quote, QuoteStatus } from '../../types'
import { downloadQuotePDF, sendQuoteByEmail, shareQuoteOnWhatsApp } from '../../utils/quoteDocument'
import { withMinDuration } from '../../utils/loading'
import { ConfirmModal } from '../../components/ConfirmModal'
import { LoadingOverlay } from '../../components/LoadingOverlay'
import { QuoteFormModal, type QuoteFormPayload } from '../../components/QuoteFormModal'
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

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('pt-BR')
}

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
  const [highlightId, setHighlightId] = useState<string | null>((location.state as { highlightId?: string } | null)?.highlightId ?? null)
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')

  const load = async () => {
    const [qRes, cRes, pRes] = await withMinDuration(
      Promise.allSettled([getQuotes(), getClients(), getProducts()])
    )
    if (qRes.status === 'fulfilled') setQuotes(qRes.value)
    if (cRes.status === 'fulfilled') setClients(cRes.value)
    if (pRes.status === 'fulfilled') setProducts(pRes.value)
    setLoading(false)
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

  const handleCreate = async (payload: QuoteFormPayload) => {
    await createQuote(payload)
    await load()
  }

  const doDelete = async () => {
    if (!confirmDelete) return
    const id = confirmDelete
    setConfirmDelete(null)
    setActionLoading('Excluindo orçamento…')
    try { await deleteQuote(id); await load() }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erro ao excluir orçamento') }
    finally { setActionLoading('') }
  }

  const handleApprove = async (id: string) => {
    setActionLoading('Aprovando orçamento…')
    try { await approveQuote(id); await load() }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erro') }
    finally { setActionLoading('') }
  }

  const handleDownloadPDF = async (q: Quote) => {
    setActionLoading('Gerando PDF…')
    try { await downloadQuotePDF(q, clients) }
    finally { setActionLoading('') }
  }

  const handleSendEmail = async (q: Quote) => {
    setActionLoading('Enviando e-mail…')
    try { await sendQuoteByEmail(q, clients, 'orcamento') }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erro ao enviar e-mail') }
    finally { setActionLoading('') }
  }

  const handleCancel = (id: string) => setConfirmCancelId(id)

  const doCancel = async () => {
    const id = confirmCancelId
    setConfirmCancelId(null)
    if (!id) return
    setActionLoading('Cancelando orçamento…')
    try { await cancelQuote(id); await load() }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erro') }
    finally { setActionLoading('') }
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
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-[#28AEA4]/30 border-t-[#28AEA4] rounded-full animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
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
                  onClick={() => handleDownloadPDF(q)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#28AEA4]/8 border border-[#28AEA4]/20 text-[#28AEA4] rounded-lg text-xs font-medium hover:bg-[#28AEA4]/15 transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                    <rect x="6" y="14" width="12" height="8"/>
                  </svg>
                  Gerar PDF
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
                  onClick={() => handleSendEmail(q)}
                  disabled={!clients.find(c => c.id === q.client_id)?.email}
                  title={!clients.find(c => c.id === q.client_id)?.email ? 'Cliente sem e-mail cadastrado' : undefined}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-500/20 transition-colors disabled:opacity-30"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                  E-mail
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

      <LoadingOverlay show={!!actionLoading} label={actionLoading} />

      <ConfirmModal
        open={confirmCancelId !== null}
        title="Cancelar orçamento?"
        message="Esta ação não pode ser desfeita. O orçamento será marcado como cancelado."
        confirmLabel="Sim, cancelar"
        danger
        onConfirm={doCancel}
        onCancel={() => setConfirmCancelId(null)}
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

      <QuoteFormModal
        open={showModal}
        title="Novo Orçamento"
        submitLabel="Criar Orçamento"
        savingLabel="Criando…"
        clients={clients}
        products={products}
        setProducts={setProducts}
        onSubmit={handleCreate}
        onClose={() => setShowModal(false)}
      />
    </div>
  )
}
