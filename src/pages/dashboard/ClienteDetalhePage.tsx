import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getClient, updateClient, registerPayment, addDebt, getClientOrders, getClientQuotes,
  deleteClient, getClientPaymentHistory, invoiceQuote, deliverQuote,
  clearClientPaymentHistory, clearClientOrders, clearClientQuotes,
} from '../../api/client'
import { downloadQuotePDF, sendQuoteByEmail } from '../../utils/quoteDocument'
import { exportClientReportPDF } from '../../utils/clientDocument'
import type { Client, Order, Quote, ClientPayment } from '../../types'
import { ConfirmModal } from '../../components/ConfirmModal'
import { LoadingOverlay } from '../../components/LoadingOverlay'
import { useSettings } from '../../contexts/SettingsContext'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  const n = d.length
  if (n === 0) return ''
  if (n <= 2) return `(${d}`
  if (n <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`
  if (n <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

function maskCpfCnpj(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 14)
  const n = d.length
  if (n <= 11) {
    if (n <= 3) return d
    if (n <= 6) return `${d.slice(0,3)}.${d.slice(3)}`
    if (n <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`
    return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
  }
  const r = `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}`
  return n > 12 ? `${r}-${d.slice(12)}` : r
}

function mapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

function whatsappUrl(phone: string) {
  const digits = phone.replace(/\D/g, '')
  return `https://wa.me/55${digits}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

type Modal = 'payment' | 'debt' | 'edit' | null

const CYCLE_PRESETS = [
  { label: 'Nenhuma', days: 0 },
  { label: 'Semanal', days: 7 },
  { label: 'Quinzenal', days: 14 },
  { label: 'Mensal', days: 30 },
  { label: 'Personalizado', days: -1 },
]

export function ClienteDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { theme } = useSettings()
  const light = theme === 'light'
  const [client, setClient] = useState<Client | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [payments, setPayments] = useState<ClientPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Modal>(null)
  const [amount, setAmount] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [paymentCountAsRevenue, setPaymentCountAsRevenue] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirmDeleteClient, setConfirmDeleteClient] = useState(false)
  const [confirmInvoiceQuote, setConfirmInvoiceQuote] = useState<string | null>(null)
  const [confirmClearPayments, setConfirmClearPayments] = useState(false)
  const [confirmClearQuotes, setConfirmClearQuotes] = useState(false)
  const [confirmClearOrders, setConfirmClearOrders] = useState(false)
  const [addressCopied, setAddressCopied] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '', phone: '', email: '', notes: '', cpf_cnpj: '', address: '',
    payment_cycle_days: 0, payment_cycle_amount: 0, debt_limit: 0,
  })
  const [customCycleDays, setCustomCycleDays] = useState('')
  const [actionLoading, setActionLoading] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [c, o, q, ph] = await Promise.all([
        getClient(id), getClientOrders(id), getClientQuotes(id), getClientPaymentHistory(id),
      ])
      setClient(c)
      setOrders(o ?? [])
      setQuotes(q ?? [])
      setPayments(ph ?? [])
      setEditForm({
        name: c.name, phone: c.phone, email: c.email, notes: c.notes,
        cpf_cnpj: c.cpf_cnpj, address: c.address,
        payment_cycle_days: c.payment_cycle_days ?? 0,
        payment_cycle_amount: c.payment_cycle_amount ?? 0,
        debt_limit: c.debt_limit ?? 0,
      })
    } catch { navigate('/dashboard/clientes', { replace: true }) }
    finally { setLoading(false) }
  }, [id, navigate])

  useEffect(() => { load() }, [load])

  const handleCopyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address)
      setAddressCopied(true)
      setTimeout(() => setAddressCopied(false), 1800)
    } catch { alert('Não foi possível copiar o endereço.') }
  }

  const totalOrders = orders.reduce((s, o) => s + o.total, 0)
  const totalQuotes = quotes.filter(q => q.status === 'Entregue/Faturado').reduce((s, q) => s + q.total, 0)
  const totalSpent  = totalOrders + totalQuotes
  const ordersDesc  = [...orders].reverse()
  const quotesDesc  = [...quotes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const confirmInvoiceQuoteTarget = quotes.find(q => q.id === confirmInvoiceQuote)

  const nextPaymentDate = (() => {
    if (!client || !client.payment_cycle_days || client.payment_cycle_days <= 0) return null
    const last = payments[0]
    const base = last ? last.created_at : client.created_at
    return addDays(base, client.payment_cycle_days)
  })()

  const handlePayment = async () => {
    const v = parseFloat(amount)
    if (!id || isNaN(v) || v <= 0 || saving) return
    setSaving(true)
    try {
      const updated = await registerPayment(id, v, paymentNotes || undefined, paymentCountAsRevenue)
      setClient(updated)
      const ph = await getClientPaymentHistory(id)
      setPayments(ph ?? [])
      setModal(null)
      setAmount('')
      setPaymentNotes('')
      setPaymentCountAsRevenue(true)
    } catch { alert('Erro ao registrar pagamento.') }
    finally { setSaving(false) }
  }

  const handleAddDebt = async () => {
    const v = parseFloat(amount)
    if (!id || isNaN(v) || v <= 0 || saving) return
    setSaving(true)
    try {
      const updated = await addDebt(id, v)
      setClient(updated)
      setModal(null)
      setAmount('')
    } catch { alert('Erro ao adicionar débito.') }
    finally { setSaving(false) }
  }

  const handleDeleteClient = async () => {
    if (!id) return
    try { await deleteClient(id); navigate('/dashboard/clientes', { replace: true }) }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erro ao excluir cliente') }
  }

  const doClearPayments = async () => {
    setConfirmClearPayments(false)
    if (!id) return
    try { await clearClientPaymentHistory(id); await load() }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erro ao limpar histórico de recebimentos') }
  }

  const doClearQuotes = async () => {
    setConfirmClearQuotes(false)
    if (!id) return
    try { await clearClientQuotes(id); await load() }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erro ao limpar pedidos') }
  }

  const doClearOrders = async () => {
    setConfirmClearOrders(false)
    if (!id) return
    try { await clearClientOrders(id); await load() }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erro ao limpar pedidos do catálogo') }
  }

  const doInvoiceQuote = async () => {
    const quoteId = confirmInvoiceQuote
    setConfirmInvoiceQuote(null)
    if (!quoteId) return
    setActionLoading('Marcando como faturado…')
    try { await invoiceQuote(quoteId); await load() }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erro') }
    finally { setActionLoading('') }
  }

  const [confirmDeliverQuote, setConfirmDeliverQuote] = useState<string | null>(null)
  const doDeliverQuote = async () => {
    const quoteId = confirmDeliverQuote
    setConfirmDeliverQuote(null)
    if (!quoteId) return
    setActionLoading('Marcando como entregue…')
    try { await deliverQuote(quoteId); await load() }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erro ao marcar como entregue') }
    finally { setActionLoading('') }
  }

  const handleDownloadPDF = async (q: Quote) => {
    if (!client) return
    setActionLoading('Gerando PDF…')
    try { await downloadQuotePDF(q, [client]) }
    finally { setActionLoading('') }
  }

  const handleSendEmail = async (q: Quote) => {
    if (!client) return
    const kind = (q.status === 'Aguardando Aprovação' || q.status === 'Cancelado') ? 'orcamento' : 'pedido'
    setActionLoading('Enviando e-mail…')
    try { await sendQuoteByEmail(q, [client], kind) }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erro ao enviar e-mail') }
    finally { setActionLoading('') }
  }

  const handleEdit = async () => {
    if (!id || !editForm.name.trim() || saving) return
    setSaving(true)
    try {
      const updated = await updateClient(id, editForm)
      setClient(updated)
      setModal(null)
    } catch { alert('Erro ao atualizar cliente.') }
    finally { setSaving(false) }
  }

  const selectedCyclePreset = (() => {
    const d = editForm.payment_cycle_days
    const preset = CYCLE_PRESETS.find(p => p.days === d && p.days !== -1)
    if (preset) return preset.label
    if (d > 0) return 'Personalizado'
    return 'Nenhuma'
  })()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-[#28AEA4]/30 border-t-[#28AEA4] rounded-full animate-spin" />
      </div>
    )
  }
  if (!client) return null

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[#1c1c1c] flex items-center gap-4">
        <button onClick={() => navigate('/dashboard/clientes')}
          className="text-gray-500 hover:text-white transition-colors p-1 -ml-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white truncate">{client.name}</h1>
          {client.notes && <p className="text-gray-500 text-sm truncate">{client.notes}</p>}
        </div>
        <button onClick={() => exportClientReportPDF(client, orders, quotes, payments)}
          className="border border-[#2a2a2a] hover:border-[#28AEA4]/40 text-gray-400 hover:text-[#28AEA4] rounded-xl px-4 py-2 text-sm transition-all flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <path d="M14 2v6h6"/>
          </svg>
          Relatório PDF
        </button>
        <button onClick={() => setModal('edit')}
          className="border border-[#2a2a2a] hover:border-[#28AEA4]/40 text-gray-400 hover:text-[#28AEA4] rounded-xl px-4 py-2 text-sm transition-all">
          Editar
        </button>
      </div>

      <div className="px-6 py-5 space-y-5">

        {/* Contact info */}
        <div className="bg-[#111111] border border-[#1e1e1e] rounded-2xl p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-[#28AEA4]/10 border border-[#28AEA4]/25 flex items-center justify-center flex-shrink-0">
              <span className="text-[#28AEA4] font-bold text-2xl">{client.name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <p className="font-bold text-white text-lg">{client.name}</p>
              <p className="text-gray-600 text-xs mt-0.5">
                Cliente desde {new Date(client.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 text-sm">
            {client.cpf_cnpj && (
              <div className="flex items-center gap-2 text-gray-400">
                <span className="text-gray-600">🪪</span> {client.cpf_cnpj}
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2 text-gray-400">
                <span className="text-gray-600">📞</span>
                <span className="flex-1">{client.phone}</span>
                <a
                  href={whatsappUrl(client.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/20 transition-colors flex-shrink-0"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>
                  </svg>
                  WhatsApp
                </a>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-2 text-gray-400">
                <span className="text-gray-600">✉</span>
                <span className="flex-1">{client.email}</span>
                <a
                  href={`mailto:${client.email}`}
                  className="flex items-center gap-1 px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-500/20 transition-colors flex-shrink-0"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2"/>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                  Email
                </a>
              </div>
            )}
            {client.address && (
              <div className="flex items-center gap-2 text-gray-400">
                <span className="text-gray-600">📍</span>
                <span className="flex-1">{client.address}</span>
                <button
                  onClick={() => handleCopyAddress(client.address)}
                  title="Copiar endereço"
                  className={`flex items-center gap-1 px-2.5 py-1 border rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
                    addressCopied
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-[#28AEA4]/10 border-[#28AEA4]/20 text-[#28AEA4] hover:bg-[#28AEA4]/20'
                  }`}
                >
                  {addressCopied ? (
                    <>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Copiado
                    </>
                  ) : (
                    <>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                      Copiar
                    </>
                  )}
                </button>
                <a
                  href={mapsUrl(client.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-500/20 transition-colors flex-shrink-0"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  Maps
                </a>
              </div>
            )}
            {client.notes && (
              <div className="flex items-center gap-2 text-gray-400">
                <span className="text-gray-600">📝</span> {client.notes}
              </div>
            )}
          </div>
        </div>

        {/* Financial summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#111111] border border-[#1e1e1e] rounded-2xl p-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 font-semibold">Total Gasto</p>
            <p className="text-2xl font-bold text-white tabular-nums">{formatBRL(totalSpent)}</p>
            <p className="text-xs text-gray-600 mt-1">
              {orders.length + quotes.length} {(orders.length + quotes.length) === 1 ? 'registro' : 'registros'}
            </p>
          </div>

          <div className={`rounded-2xl p-4 border ${
            client.debt > 0
              ? 'bg-red-950/30 border-red-800/30'
              : 'bg-emerald-950/20 border-emerald-800/20'
          }`}>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 font-semibold">
              {client.debt > 0 ? 'Valor em Aberto' : 'Situação'}
            </p>
            <p className={`text-2xl font-bold tabular-nums ${
              client.debt > 0 ? 'text-red-400' : 'text-emerald-400'
            }`}>
              {client.debt > 0 ? formatBRL(client.debt) : 'Em dia'}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {client.debt > 0 ? 'aguardando pagamento' : 'sem pendências'}
            </p>
            {client.debt_limit > 0 && (
              <p className={`text-xs mt-1 ${client.debt >= client.debt_limit ? 'text-red-400 font-semibold' : 'text-gray-600'}`}>
                Limite: {formatBRL(client.debt_limit)}
                {client.debt >= client.debt_limit && ' · limite atingido, novos pedidos bloqueados'}
              </p>
            )}
          </div>
        </div>

        {/* Cycle info */}
        {client.payment_cycle_days > 0 && (
          <div className="bg-[#111111] border border-[#28AEA4]/15 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-1">Ciclo de Recebimento</p>
              <p className="text-sm text-white font-medium">
                A cada {client.payment_cycle_days} dia{client.payment_cycle_days !== 1 ? 's' : ''}
                {client.payment_cycle_amount > 0 && (
                  <span className="text-[#28AEA4] ml-2">· {formatBRL(client.payment_cycle_amount)}</span>
                )}
              </p>
            </div>
            {nextPaymentDate && (
              <div className="text-right flex-shrink-0">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-1">Próximo</p>
                <p className="text-sm text-[#28AEA4] font-mono">{nextPaymentDate}</p>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => { setModal('payment'); setAmount(''); setPaymentNotes('') }}
            className="bg-[#28AEA4]/10 hover:bg-[#28AEA4]/20 border border-[#28AEA4]/30 hover:border-[#28AEA4]/50 text-[#1d9992] dark:text-[#6edbd5] rounded-xl py-3 text-sm font-semibold transition-all">
            ✓ Registrar Pagamento
          </button>
          <button onClick={() => { setModal('debt'); setAmount('') }}
            className="bg-[#111111] hover:bg-[#161616] border border-[#2a2a2a] hover:border-[#3a3a3a] text-gray-300 rounded-xl py-3 text-sm font-semibold transition-all">
            + Adicionar Débito
          </button>
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => setConfirmDeleteClient(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-700 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
            Excluir cliente
          </button>
        </div>

        {/* Payment history */}
        {payments.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white">
                Histórico de Recebimentos
                <span className="text-gray-600 font-normal ml-2">({payments.length})</span>
              </h2>
              <button
                onClick={() => setConfirmClearPayments(true)}
                className="text-[11px] text-gray-600 hover:text-red-400 transition-colors"
              >
                Limpar histórico
              </button>
            </div>
            <div className="space-y-2">
              {payments.map(p => (
                <div key={p.id} className="bg-[#0f0f0f] border border-[#1c1c1c] rounded-2xl px-5 py-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-3">
                    <div>
                      <p className="text-xs text-gray-500">{formatDateShort(p.created_at)}</p>
                      {p.notes && <p className="text-xs text-gray-600 truncate mt-0.5">{p.notes}</p>}
                    </div>
                    {p.count_as_revenue && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#28AEA4]/10 border border-[#28AEA4]/20 text-[#28AEA4] flex-shrink-0">
                        gradual
                      </span>
                    )}
                  </div>
                  <span className="text-emerald-400 font-bold tabular-nums text-sm flex-shrink-0">
                    +{formatBRL(p.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quotes history */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">
              Pedidos
              {quotes.length > 0 && <span className="text-gray-600 font-normal ml-2">({quotes.length})</span>}
            </h2>
            {quotes.length > 0 && (
              <button
                onClick={() => setConfirmClearQuotes(true)}
                className="text-[11px] text-gray-600 hover:text-red-400 transition-colors"
              >
                Limpar histórico
              </button>
            )}
          </div>

          {quotesDesc.length === 0 ? (
            <div className="bg-[#111111] border border-[#1e1e1e] rounded-2xl p-6 text-center">
              <p className="text-gray-600 text-sm">Nenhum pedido para este cliente.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {quotesDesc.map(q => {
                const statusColor: Record<string, string> = light ? {
                  'Aguardando Aprovação': 'bg-amber-50 border border-amber-200 text-amber-600',
                  'Aprovado':             'bg-blue-50 border border-blue-200 text-blue-600',
                  'Entregue':             'bg-violet-50 border border-violet-200 text-violet-600',
                  'Faturado':             'bg-teal-50 border border-teal-200 text-teal-700',
                  'Faturado Gradual':     'bg-[#28AEA4]/10 border border-[#28AEA4]/30 text-[#1d9992]',
                  'Cancelado':            'bg-red-50 border border-red-200 text-red-500',
                  'Entregue/Faturado':    'bg-teal-50 border border-teal-200 text-teal-700',
                } : {
                  'Aguardando Aprovação': 'bg-yellow-950/60 text-yellow-400',
                  'Aprovado':             'bg-blue-950/60 text-blue-400',
                  'Entregue':             'bg-purple-950/60 text-purple-400',
                  'Faturado':             'bg-emerald-950/60 text-emerald-400',
                  'Faturado Gradual':     'bg-[#28AEA4]/10 text-[#28AEA4]',
                  'Cancelado':            'bg-red-950/60 text-red-400',
                  'Entregue/Faturado':    'bg-emerald-950/60 text-emerald-400',
                }
                return (
                  <div key={q.id} className="bg-[#0f0f0f] border border-[#1c1c1c] rounded-2xl p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColor[q.status] ?? 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                            {q.status}
                          </span>
                          {q.payment_type === 'Personalizado' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400">
                              gradual
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1.5">
                          ORC-{q.id.slice(-6).toUpperCase()} · {formatDate(q.created_at)}
                        </p>
                      </div>
                      <span className="text-[#28AEA4] font-bold tabular-nums text-lg flex-shrink-0">{formatBRL(q.total)}</span>
                    </div>
                    <div className="space-y-0.5 mb-3">
                      {q.items.map((item, j) => (
                        <div key={j} className="flex justify-between text-xs text-gray-600">
                          <span>{item.quantity}× {item.product_name}</span>
                          <span className="tabular-nums">{formatBRL(item.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownloadPDF(q)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 rounded-lg text-xs font-medium hover:text-white hover:border-[#3a3a3a] transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                        Gerar PDF
                      </button>
                      <button
                        onClick={() => handleSendEmail(q)}
                        disabled={!client.email}
                        title={!client.email ? 'Cliente sem e-mail cadastrado' : undefined}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 rounded-lg text-xs font-medium hover:text-white hover:border-[#3a3a3a] transition-colors disabled:opacity-30"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        E-mail
                      </button>
                      {q.status === 'Aprovado' && (
                        <button
                          onClick={() => setConfirmInvoiceQuote(q.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-[#28AEA4]/10 border border-[#28AEA4]/25 text-[#1d9992] dark:text-[#6edbd5] rounded-lg text-xs font-medium hover:bg-[#28AEA4]/20 transition-colors"
                        >
                          {q.payment_type === 'Personalizado' ? 'Faturar Gradual' : 'Faturar'}
                        </button>
                      )}
                      {q.status === 'Faturado Gradual' && (
                        <button
                          onClick={() => setConfirmDeliverQuote(q.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 rounded-lg text-xs font-medium hover:bg-violet-500/20 transition-colors"
                        >
                          Marcar Entregue
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Catalog orders history */}
        {ordersDesc.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white">
                Pedidos do Catálogo
                <span className="text-gray-600 font-normal ml-2">({ordersDesc.length})</span>
              </h2>
              <button
                onClick={() => setConfirmClearOrders(true)}
                className="text-[11px] text-gray-600 hover:text-red-400 transition-colors"
              >
                Limpar histórico
              </button>
            </div>
            <div className="space-y-3">
              {ordersDesc.map(order => (
                <div key={order.id} className="bg-[#0f0f0f] border border-[#1c1c1c] rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                        order.status === 'Pronta-Entrega'
                          ? light ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-emerald-950/60 border-emerald-900 text-emerald-400'
                          : light ? 'bg-[#28AEA4]/10 border-[#28AEA4]/30 text-[#1d9992]' : 'bg-[#28AEA4]/10 border-[#28AEA4]/20 text-[#28AEA4]'
                      }`}>
                        {order.status}
                      </span>
                      <p className="text-xs text-gray-500 mt-1.5">{formatDate(order.created_at)}</p>
                    </div>
                    <span className="text-[#28AEA4] font-bold tabular-nums text-lg flex-shrink-0">{formatBRL(order.total)}</span>
                  </div>
                  <div className="space-y-0.5">
                    {order.items.map((item, j) => (
                      <div key={j} className="flex justify-between text-xs text-gray-600">
                        <span>{item.quantity}× {item.product_name}</span>
                        <span className="tabular-nums">{formatBRL(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Payment / Debt Modal */}
      {(modal === 'payment' || modal === 'debt') && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#1c1c1c]">
              <h2 className="text-lg font-bold text-white">
                {modal === 'payment' ? 'Registrar Pagamento' : 'Adicionar Débito'}
              </h2>
              <button onClick={() => setModal(null)} className="text-gray-600 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {modal === 'payment' && client.debt > 0 && (
                <div className="bg-[#1a1a1a] rounded-xl px-4 py-2.5 text-sm text-gray-400">
                  Dívida atual: <span className="text-red-400 font-bold">{formatBRL(client.debt)}</span>
                </div>
              )}
              {modal === 'payment' && client.payment_cycle_amount > 0 && (
                <button
                  onClick={() => setAmount(String(client.payment_cycle_amount))}
                  className="w-full text-left px-4 py-2.5 bg-[#28AEA4]/5 border border-[#28AEA4]/20 rounded-xl text-sm text-gray-400 hover:border-[#28AEA4]/40 transition-colors"
                >
                  Usar valor do ciclo: <span className="text-[#28AEA4] font-bold">{formatBRL(client.payment_cycle_amount)}</span>
                </button>
              )}
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">
                  Valor (R$)
                </label>
                <input
                  type="number" step="0.01" min="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (modal === 'payment' ? handlePayment() : handleAddDebt())}
                  placeholder="0,00"
                  className="w-full bg-[#171717] border border-[#2a2a2a] focus:border-[#28AEA4] text-white rounded-xl px-4 py-3 text-lg font-bold outline-none transition-all"
                  autoFocus
                />
              </div>
              {modal === 'payment' && (
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">
                    Referência (opcional)
                  </label>
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={e => setPaymentNotes(e.target.value)}
                    placeholder="Ex: semana 23, parcela 2/4..."
                    className="w-full bg-[#171717] border border-[#2a2a2a] focus:border-[#28AEA4] text-white rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                  />
                </div>
              )}
              {modal === 'payment' && (
                <button
                  type="button"
                  onClick={() => setPaymentCountAsRevenue(v => !v)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors text-sm ${
                    paymentCountAsRevenue
                      ? 'bg-[#28AEA4]/10 border-[#28AEA4]/30 text-[#28AEA4]'
                      : 'bg-[#171717] border-[#2a2a2a] text-gray-500'
                  }`}
                >
                  <span>Contar no faturamento gradual</span>
                  <span className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${paymentCountAsRevenue ? 'bg-[#28AEA4]' : 'bg-[#333]'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${paymentCountAsRevenue ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </span>
                </button>
              )}
              <div className="flex gap-3">
                <button onClick={() => setModal(null)}
                  className="flex-1 border border-[#2a2a2a] text-gray-400 rounded-xl py-3 text-sm hover:bg-[#141414]">
                  Cancelar
                </button>
                <button
                  onClick={modal === 'payment' ? handlePayment : handleAddDebt}
                  disabled={saving || !amount || parseFloat(amount) <= 0}
                  className={`flex-1 font-bold rounded-xl py-3 text-sm disabled:opacity-40 transition-colors ${
                    modal === 'payment'
                      ? 'bg-[#28AEA4] hover:bg-[#1d9992] text-white'
                      : 'bg-[#28AEA4] hover:bg-[#3cbdb6] text-white'
                  }`}
                >
                  {saving ? 'Salvando...' : modal === 'payment' ? 'Confirmar Pagamento' : 'Adicionar Débito'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <LoadingOverlay show={!!actionLoading} label={actionLoading} />

      <ConfirmModal
        open={confirmInvoiceQuote !== null}
        title={
          confirmInvoiceQuoteTarget?.payment_type === 'Personalizado'
            ? 'Faturar Gradual — lançar dívida no cliente?'
            : client.debt > 0
            ? 'Cliente com dívida pendente'
            : 'Marcar como Faturado?'
        }
        message={
          confirmInvoiceQuoteTarget?.payment_type === 'Personalizado'
            ? `Uma dívida de ${formatBRL(confirmInvoiceQuoteTarget?.total ?? 0)} será lançada para "${client.name}"${client.debt > 0 ? ` (dívida atual: ${formatBRL(client.debt)})` : ''}. O pedido passa para "Faturado Gradual". O pagamento é gerenciado via registros no cadastro do cliente.`
            : client.debt > 0
            ? `"${client.name}" possui dívida pendente de ${formatBRL(client.debt)}. Deseja realmente faturar sem quitar a dívida existente?`
            : 'Confirme que o pagamento foi recebido. Em seguida, marque o pedido como entregue para dar baixa no estoque.'
        }
        confirmLabel="Confirmar faturamento"
        danger={client.debt > 0 && confirmInvoiceQuoteTarget?.payment_type !== 'Personalizado'}
        onConfirm={doInvoiceQuote}
        onCancel={() => setConfirmInvoiceQuote(null)}
      />

      <ConfirmModal
        open={confirmDeliverQuote !== null}
        title="Marcar como Entregue?"
        message={`O estoque será descontado. O pagamento do pedido é gerenciado gradualmente no cadastro de "${client.name}".`}
        confirmLabel="Confirmar entrega"
        onConfirm={doDeliverQuote}
        onCancel={() => setConfirmDeliverQuote(null)}
      />

      <ConfirmModal
        open={confirmDeleteClient}
        title="Excluir cliente?"
        message={`"${client.name}" e todos os seus dados serão removidos permanentemente. Esta ação não pode ser desfeita.`}
        confirmLabel="Sim, excluir"
        danger
        onConfirm={handleDeleteClient}
        onCancel={() => setConfirmDeleteClient(false)}
      />

      <ConfirmModal
        open={confirmClearPayments}
        title="Limpar histórico de recebimentos?"
        message="Todos os registros de pagamento deste cliente serão removidos permanentemente. O saldo devedor não será alterado. Esta ação não pode ser desfeita."
        confirmLabel="Sim, limpar"
        danger
        onConfirm={doClearPayments}
        onCancel={() => setConfirmClearPayments(false)}
      />

      <ConfirmModal
        open={confirmClearQuotes}
        title="Limpar histórico de pedidos?"
        message="Todos os pedidos deste cliente serão removidos permanentemente. Esta ação não pode ser desfeita."
        confirmLabel="Sim, limpar"
        danger
        onConfirm={doClearQuotes}
        onCancel={() => setConfirmClearQuotes(false)}
      />

      <ConfirmModal
        open={confirmClearOrders}
        title="Limpar histórico de pedidos do catálogo?"
        message="Todos os pedidos do catálogo deste cliente serão removidos permanentemente. Esta ação não pode ser desfeita."
        confirmLabel="Sim, limpar"
        danger
        onConfirm={doClearOrders}
        onCancel={() => setConfirmClearOrders(false)}
      />

      {/* Edit Modal */}
      {modal === 'edit' && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl w-full max-w-md shadow-2xl my-4">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#1c1c1c]">
              <h2 className="text-lg font-bold text-white">Editar Cliente</h2>
              <button onClick={() => setModal(null)} className="text-gray-600 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Nome *</label>
                <input type="text" placeholder="Nome completo"
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-[#171717] border border-[#2a2a2a] focus:border-[#28AEA4] text-white rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">CPF / CNPJ</label>
                <input type="text" placeholder="000.000.000-00"
                  value={editForm.cpf_cnpj}
                  onChange={e => setEditForm(f => ({ ...f, cpf_cnpj: maskCpfCnpj(e.target.value) }))}
                  className="w-full bg-[#171717] border border-[#2a2a2a] focus:border-[#28AEA4] text-white rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Telefone</label>
                <input type="tel" placeholder="(11) 99999-9999"
                  value={editForm.phone}
                  onChange={e => setEditForm(f => ({ ...f, phone: maskPhone(e.target.value) }))}
                  className="w-full bg-[#171717] border border-[#2a2a2a] focus:border-[#28AEA4] text-white rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Endereço</label>
                <input type="text" placeholder="Rua, número, bairro, cidade"
                  value={editForm.address}
                  onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full bg-[#171717] border border-[#2a2a2a] focus:border-[#28AEA4] text-white rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">E-mail</label>
                <input type="email" placeholder="email@exemplo.com"
                  value={editForm.email}
                  onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full bg-[#171717] border border-[#2a2a2a] focus:border-[#28AEA4] text-white rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Observações</label>
                <input type="text" placeholder="Nome do salão, bairro..."
                  value={editForm.notes}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-[#171717] border border-[#2a2a2a] focus:border-[#28AEA4] text-white rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                />
              </div>

              {/* Cycle config */}
              <div className="pt-2 border-t border-[#1c1c1c]">
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">
                  Ciclo de Recebimento
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {CYCLE_PRESETS.map(preset => {
                    const active = selectedCyclePreset === preset.label
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          if (preset.days === -1) {
                            setEditForm(f => ({ ...f, payment_cycle_days: parseInt(customCycleDays) || 0 }))
                          } else {
                            setEditForm(f => ({ ...f, payment_cycle_days: preset.days }))
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          active
                            ? 'bg-[#28AEA4]/15 border-[#28AEA4]/40 text-[#28AEA4]'
                            : 'bg-[#171717] border-[#2a2a2a] text-gray-500 hover:border-[#3a3a3a] hover:text-gray-300'
                        }`}
                      >
                        {preset.label}
                      </button>
                    )
                  })}
                </div>
                {selectedCyclePreset === 'Personalizado' && (
                  <div className="mb-3">
                    <input
                      type="number" min="1" placeholder="Número de dias"
                      value={customCycleDays}
                      onChange={e => {
                        setCustomCycleDays(e.target.value)
                        setEditForm(f => ({ ...f, payment_cycle_days: parseInt(e.target.value) || 0 }))
                      }}
                      className="w-full bg-[#171717] border border-[#2a2a2a] focus:border-[#28AEA4] text-white rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                    />
                  </div>
                )}
                {editForm.payment_cycle_days > 0 && (
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">
                      Valor esperado por ciclo (R$)
                    </label>
                    <input
                      type="number" step="0.01" min="0" placeholder="0,00"
                      value={editForm.payment_cycle_amount || ''}
                      onChange={e => setEditForm(f => ({ ...f, payment_cycle_amount: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-[#171717] border border-[#2a2a2a] focus:border-[#28AEA4] text-white rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">
                    Limite de dívida (R$)
                  </label>
                  <input
                    type="number" step="0.01" min="0" placeholder="Sem limite"
                    value={editForm.debt_limit || ''}
                    onChange={e => setEditForm(f => ({ ...f, debt_limit: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-[#171717] border border-[#2a2a2a] focus:border-[#28AEA4] text-white rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                  />
                  <p className="text-[11px] text-gray-600 mt-1.5">
                    Ao atingir esse valor em dívida, o cliente não poderá receber novos pedidos ou orçamentos. Deixe em branco ou 0 para não aplicar limite.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setModal(null)}
                  className="flex-1 border border-[#2a2a2a] text-gray-400 rounded-xl py-3 text-sm hover:bg-[#141414]">
                  Cancelar
                </button>
                <button onClick={handleEdit} disabled={saving || !editForm.name.trim()}
                  className="flex-1 bg-[#28AEA4] hover:bg-[#3cbdb6] disabled:bg-[#0c5a55] text-white font-bold rounded-xl py-3 text-sm">
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
