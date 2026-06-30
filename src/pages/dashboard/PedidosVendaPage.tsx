import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getQuotes, getClients, getProducts, createQuote, approveQuote, deliverQuote, invoiceQuote, deleteQuote, getAllPayments } from '../../api/client'
import { downloadQuotePDF, sendQuoteByEmail, shareQuoteOnWhatsApp } from '../../utils/quoteDocument'
import { withMinDuration } from '../../utils/loading'
import type { Quote, Client, Product, ClientPayment } from '../../types'
import { ConfirmModal } from '../../components/ConfirmModal'
import { LoadingOverlay } from '../../components/LoadingOverlay'
import { QuoteFormModal, type QuoteFormPayload } from '../../components/QuoteFormModal'
import { useSettings } from '../../contexts/SettingsContext'

const STATUS_COLORS_DARK: Record<string, string> = {
  'Aprovado':          'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Entregue':          'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Faturado':          'bg-green-500/10 text-green-400 border-green-500/20',
  'Faturado Gradual':  'bg-[#28AEA4]/10 text-[#28AEA4] border-[#28AEA4]/20',
  'Entregue/Faturado': 'bg-green-500/10 text-green-400 border-green-500/20',
}

const STATUS_COLORS_LIGHT: Record<string, string> = {
  'Aprovado':          'bg-blue-50 border-blue-200 text-blue-600',
  'Entregue':          'bg-violet-50 border-violet-200 text-violet-600',
  'Faturado':          'bg-teal-50 border-teal-200 text-teal-700',
  'Faturado Gradual':  'bg-[#28AEA4]/10 border-[#28AEA4]/30 text-[#1d9992]',
  'Entregue/Faturado': 'bg-teal-50 border-teal-200 text-teal-700',
}

type TabValue = 'Todos' | 'Aprovado' | 'Entregue' | 'GradualEntregue' | 'Faturado'

const TABS: { label: string; value: TabValue }[] = [
  { label: 'Todos',                value: 'Todos' },
  { label: 'Aprovados',            value: 'Aprovado' },
  { label: 'Faturados',            value: 'Faturado' },
  { label: 'Entregues',            value: 'Entregue' },
  { label: 'Faturamento Gradual',  value: 'GradualEntregue' },
]

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('pt-BR')
}

export default function PedidosVendaPage() {
  const location = useLocation()
  const { theme } = useSettings()
  const STATUS_COLORS = theme === 'light' ? STATUS_COLORS_LIGHT : STATUS_COLORS_DARK
  const [quotes, setQuotes]   = useState<Quote[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [clientPayments, setClientPayments] = useState<ClientPayment[]>([])
  const [activeTab, setActiveTab] = useState<TabValue>('Todos')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [confirmDeliver, setConfirmDeliver] = useState<string | null>(null)
  const [confirmInvoice, setConfirmInvoice] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete]   = useState<string | null>(null)
  const [confirmEmailQuote, setConfirmEmailQuote] = useState<Quote | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>((location.state as { highlightId?: string } | null)?.highlightId ?? null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')

  const load = async () => {
    const [allRes, clsRes, prodRes, paymentsRes] = await withMinDuration(
      Promise.allSettled([getQuotes(), getClients(), getProducts(), getAllPayments()])
    )
    if (allRes.status === 'fulfilled') {
      setQuotes(allRes.value.filter(q =>
        q.status === 'Aprovado' ||
        q.status === 'Entregue' ||
        q.status === 'Faturado' ||
        q.status === 'Faturado Gradual' ||
        q.status === 'Entregue/Faturado'
      ))
    }
    if (clsRes.status === 'fulfilled') setClients(clsRes.value)
    if (prodRes.status === 'fulfilled') setProducts(prodRes.value)
    if (paymentsRes.status === 'fulfilled') setClientPayments(paymentsRes.value ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!highlightId) return
    const t = setTimeout(() => {
      document.getElementById(`order-${highlightId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
    const t2 = setTimeout(() => setHighlightId(null), 2800)
    return () => { clearTimeout(t); clearTimeout(t2) }
  }, [highlightId])

  const filtered = quotes
    .filter(q => {
      if (activeTab === 'Todos') return true
      if (activeTab === 'Faturado') return (q.status === 'Faturado' || q.status === 'Entregue/Faturado') && q.payment_type !== 'Personalizado'
      if (activeTab === 'GradualEntregue') return q.status === 'Faturado Gradual' || (q.payment_type === 'Personalizado' && q.status === 'Entregue')
      return q.status === activeTab
    })
    .filter(q => !search || q.client_name.toLowerCase().includes(search.toLowerCase()))
  const sorted = [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Faturado Gradual e seus Entregues NÃO somam nos totais —
  // o valor vem dos pagamentos registrados no cliente.
  const isFaturado = (q: Quote) =>
    q.payment_type !== 'Personalizado' &&
    (q.status === 'Faturado' || q.status === 'Entregue/Faturado' || q.status === 'Entregue')
  const isEntregueNormal = (q: Quote) =>
    q.status === 'Entregue' && q.payment_type !== 'Personalizado'

  const countAprovado  = quotes.filter(q => q.status === 'Aprovado').length
  const countEntregue  = quotes.filter(isEntregueNormal).length
  const countFaturado  = quotes.filter(isFaturado).length
  const totalAprovado  = quotes.filter(q => q.status === 'Aprovado').reduce((s, q) => s + q.total, 0)
  const totalEntregue  = quotes.filter(isEntregueNormal).reduce((s, q) => s + q.total, 0)
  const totalFaturado  = quotes.filter(isFaturado).reduce((s, q) => s + q.total, 0)
  const totalGradual   = clientPayments.filter(p => p.count_as_revenue).reduce((s, p) => s + p.amount, 0)

  const deliverTarget = quotes.find(q => q.id === confirmDeliver)
  const invoiceTarget = quotes.find(q => q.id === confirmInvoice)
  const invoiceClient = clients.find(c => c.id === invoiceTarget?.client_id)
  const invoiceClientHasDebt = (invoiceClient?.debt ?? 0) > 0

  const doDeliver = async () => {
    const id = confirmDeliver
    setConfirmDeliver(null)
    if (!id) return
    setActionLoading('Marcando como entregue…')
    try { await deliverQuote(id); await load() }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erro ao marcar como entregue') }
    finally { setActionLoading('') }
  }

  const doInvoice = async () => {
    const id = confirmInvoice
    setConfirmInvoice(null)
    if (!id) return
    setActionLoading('Marcando como faturado…')
    try { await invoiceQuote(id); await load() }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erro ao marcar como faturado') }
    finally { setActionLoading('') }
  }

  const doDelete = async () => {
    if (!confirmDelete) return
    const id = confirmDelete
    setConfirmDelete(null)
    setActionLoading('Excluindo pedido…')
    try { await deleteQuote(id); await load() }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erro ao excluir pedido') }
    finally { setActionLoading('') }
  }

  const handleDownloadPDF = async (q: Quote) => {
    setActionLoading('Gerando PDF…')
    try { await downloadQuotePDF(q, clients, 'pedido') }
    finally { setActionLoading('') }
  }

  const handleSendEmail = async (q: Quote) => {
    setActionLoading('Enviando e-mail…')
    try { await sendQuoteByEmail(q, clients, 'pedido') }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erro ao enviar e-mail') }
    finally { setActionLoading('') }
  }

  const handleCreate = async (payload: QuoteFormPayload) => {
    const created = await createQuote(payload)
    await approveQuote(created.id)
    await load()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Pedidos de Venda</h1>
          <p className="text-gray-500 text-sm mt-0.5">Acompanhe aprovados, entregues e faturados</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#28AEA4] text-white rounded-xl text-sm font-semibold hover:bg-[#1d9992] transition-colors"
        >
          <span className="text-lg leading-none">+</span>
          Novo Pedido
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-4">
        <div className="bg-[#0f0f0f] border border-[#1c1c1c] rounded-2xl p-4">
          <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1.5">Aprovados</p>
          <p className="text-xl font-bold text-blue-400">{fmt(totalAprovado)}</p>
          <p className="text-gray-600 text-xs mt-1">{countAprovado} pedido{countAprovado !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-[#0f0f0f] border border-[#1c1c1c] rounded-2xl p-4">
          <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1.5">Faturados</p>
          <p className="text-xl font-bold text-[#28AEA4]">{fmt(totalFaturado)}</p>
          <p className="text-gray-600 text-xs mt-1">{countFaturado} pedido{countFaturado !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-[#0f0f0f] border border-[#1c1c1c] rounded-2xl p-4">
          <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1.5">Entregues</p>
          <p className="text-xl font-bold text-purple-400">{fmt(totalEntregue)}</p>
          <p className="text-gray-600 text-xs mt-1">{countEntregue} pedido{countEntregue !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-[#0f0f0f] border border-[#1c1c1c] rounded-2xl p-4">
          <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1.5">Fat. Gradual</p>
          <p className="text-xl font-bold text-amber-400">{fmt(totalGradual)}</p>
          <p className="text-gray-600 text-xs mt-1">coletado via pagamentos</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-[#111] p-1 rounded-xl overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setActiveTab(t.value)}
            className={`flex-1 px-3.5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
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

      {/* Orders */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-[#28AEA4]/30 border-t-[#28AEA4] rounded-full animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-lg">Nenhum pedido encontrado</p>
          <p className="text-sm mt-1">Crie um novo pedido ou aprove um orçamento para que apareça aqui</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(q => (
            <div id={`order-${q.id}`} key={q.id} className={`bg-[#0f0f0f] border rounded-2xl p-5 transition-all duration-500 ${highlightId === q.id ? 'border-[#28AEA4]/50 ring-1 ring-[#28AEA4]/30' : 'border-[#1c1c1c]'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-white font-semibold">{q.client_name}</span>
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLORS[q.status] ?? ''}`}>
                      {q.status}
                    </span>
                    {q.payment_type === 'Personalizado' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400">
                        Faturamento gradual
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs mt-1">
                    Criado em {fmtDate(q.created_at)}
                    {q.approved_at && ` · Aprovado em ${fmtDate(q.approved_at)}`}
                    {q.invoiced_at && (q.status === 'Entregue'
                      ? ` · Entregue em ${fmtDate(q.invoiced_at)}`
                      : (q.status === 'Faturado' || q.status === 'Entregue/Faturado')
                      ? ` · Faturado em ${fmtDate(q.invoiced_at)}`
                      : '')}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[#28AEA4] font-bold text-lg">{fmt(q.total)}</p>
                  {q.payment_type && q.payment_type !== 'Personalizado' && (
                    <p className="text-gray-600 text-[10px] mt-0.5">
                      {q.payment_type === 'Cartão de Crédito'
                        ? (q.installments > 1 ? `${q.installments}x crédito` : 'Crédito à vista')
                        : q.payment_type}
                    </p>
                  )}
                </div>
              </div>

              {/* Items */}
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

              {/* Actions */}
              <div className="mt-3 pt-3 border-t border-[#1c1c1c] flex flex-wrap items-center gap-2">

                {/* Aprovado → Faturar */}
                {q.status === 'Aprovado' && (
                  <button
                    onClick={() => setConfirmInvoice(q.id)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                      q.payment_type === 'Personalizado'
                        ? 'bg-[#28AEA4]/10 border-[#28AEA4]/25 text-[#1d9992] dark:text-[#6edbd5] hover:bg-[#28AEA4]/20'
                        : 'bg-teal-500/10 border-teal-500/20 text-teal-600 dark:text-teal-400 hover:bg-teal-500/20'
                    }`}
                  >
                    {q.payment_type === 'Personalizado' ? 'Faturar Gradual · lança dívida' : 'Marcar como Faturado'}
                  </button>
                )}

                {/* Faturado Gradual → Entregar (desconta estoque; pagamento é via cliente) */}
                {q.status === 'Faturado Gradual' && (
                  <button
                    onClick={() => setConfirmDeliver(q.id)}
                    className="px-4 py-1.5 bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg text-xs font-medium hover:bg-purple-500/20 transition-colors"
                  >
                    Marcar como Entregue
                  </button>
                )}

                {/* Faturado regular → Entregar */}
                {q.status === 'Faturado' && (
                  <button
                    onClick={() => setConfirmDeliver(q.id)}
                    className="px-4 py-1.5 bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg text-xs font-medium hover:bg-purple-500/20 transition-colors"
                  >
                    Marcar como Entregue
                  </button>
                )}

                <button
                  onClick={() => handleDownloadPDF(q)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#28AEA4]/8 border border-[#28AEA4]/20 text-[#28AEA4] rounded-lg text-xs font-medium hover:bg-[#28AEA4]/15 transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9"/>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                    <rect x="6" y="14" width="12" height="8"/>
                  </svg>
                  Gerar PDF
                </button>

                <button
                  onClick={() => shareQuoteOnWhatsApp(q, clients, 'pedido')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg text-xs font-medium hover:bg-green-500/20 transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M11.999 0C5.373 0 0 5.373 0 12c0 2.117.554 4.103 1.523 5.826L.047 24l6.345-1.658A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.006-1.374l-.36-.213-3.727.977.994-3.636-.234-.373A9.818 9.818 0 0 1 2.182 12c0-5.42 4.398-9.818 9.818-9.818 5.42 0 9.818 4.398 9.818 9.818 0 5.42-4.399 9.818-9.819 9.818z"/>
                  </svg>
                  WhatsApp
                </button>

                <button
                  onClick={() => setConfirmEmailQuote(q)}
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
                  title="Excluir pedido"
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
        open={confirmDeliver !== null}
        title="Confirmar entrega?"
        message={
          deliverTarget?.status === 'Faturado Gradual'
            ? `O estoque será descontado. O valor (${fmt(deliverTarget?.total ?? 0)}) já foi lançado como dívida no cliente "${deliverTarget?.client_name}" no momento do faturamento gradual.`
            : 'O estoque será descontado automaticamente. Esta ação não pode ser desfeita.'
        }
        confirmLabel="Confirmar entrega"
        onConfirm={doDeliver}
        onCancel={() => setConfirmDeliver(null)}
      />
      <ConfirmModal
        open={confirmInvoice !== null}
        title={
          invoiceTarget?.payment_type === 'Personalizado'
            ? 'Faturar Gradual — lançar dívida no cliente?'
            : invoiceClientHasDebt
            ? 'Cliente com dívida pendente'
            : 'Marcar como Faturado?'
        }
        message={
          invoiceTarget?.payment_type === 'Personalizado'
            ? `Uma dívida de ${fmt(invoiceTarget?.total ?? 0)} será lançada para "${invoiceClient?.name}"${invoiceClientHasDebt ? ` (dívida atual: ${fmt(invoiceClient?.debt ?? 0)})` : ''}. O pedido passa para "Faturado Gradual". O pagamento ocorre via registros no cadastro do cliente.`
            : invoiceClientHasDebt
            ? `O cliente "${invoiceClient?.name}" possui dívida pendente de ${fmt(invoiceClient?.debt ?? 0)}. Deseja realmente faturar sem quitar a dívida existente?`
            : 'Confirme que o pagamento foi recebido. Em seguida, marque o pedido como entregue para dar baixa no estoque.'
        }
        confirmLabel="Confirmar faturamento"
        danger={invoiceClientHasDebt && invoiceTarget?.payment_type !== 'Personalizado'}
        onConfirm={doInvoice}
        onCancel={() => setConfirmInvoice(null)}
      />
      <ConfirmModal
        open={confirmDelete !== null}
        title="Excluir pedido?"
        message="Esta ação é permanente e não pode ser desfeita. O pedido será removido do sistema."
        confirmLabel="Sim, excluir"
        danger
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmModal
        open={confirmEmailQuote !== null}
        title="Enviar por e-mail?"
        message={`Será enviado o pedido para ${clients.find(c => c.id === confirmEmailQuote?.client_id)?.email ?? ''}. Confirmar?`}
        confirmLabel="Sim, enviar"
        onConfirm={() => { const q = confirmEmailQuote; setConfirmEmailQuote(null); if (q) handleSendEmail(q) }}
        onCancel={() => setConfirmEmailQuote(null)}
      />

      <QuoteFormModal
        open={showModal}
        title="Novo Pedido de Venda"
        submitLabel="Criar Pedido"
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
