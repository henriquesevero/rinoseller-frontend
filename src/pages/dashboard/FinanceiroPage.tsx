import { useState, useEffect, useMemo } from 'react'
import {
  getOrders, getQuotes, getClients, getProducts,
  getExpenses, createExpense, payExpense, deleteExpense,
  getCapitalContributions, addCapitalContribution, deleteCapitalContribution,
  getAllPayments,
} from '../../api/client'
import type { Order, Quote, Client, Product, Expense, CapitalContribution, CapitalMovementType, ClientPayment } from '../../types'
import { exportStockValuationPDF } from '../../utils/productDocument'
import { exportFinancialReportPDF } from '../../utils/financialReportDocument'
import { ConfirmModal } from '../../components/ConfirmModal'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDateOnly(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

interface CardProps { label: string; value: string; sub?: string; accent?: boolean; tone?: 'default' | 'good' | 'bad'; onClick?: () => void }

function StatCard({ label, value, sub, accent, tone = 'default', onClick }: CardProps) {
  const valueColor = accent ? 'text-[#28AEA4]'
    : tone === 'good' ? 'text-emerald-400'
    : tone === 'bad' ? 'text-red-400'
    : 'text-white'
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      className={`text-left rounded-2xl p-5 border transition-all ${accent
        ? 'bg-[#28AEA4]/5 border-[#28AEA4]/20'
        : 'bg-[#111111] border-[#1e1e1e]'
      } ${onClick ? 'cursor-pointer hover:border-[#28AEA4]/40 hover:bg-[#161616]' : ''}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-[0.2em]">{label}</p>
        {onClick && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 flex-shrink-0">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/>
          </svg>
        )}
      </div>
      <p className={`text-2xl font-bold tabular-nums ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </Comp>
  )
}

// Quotes que geram faturamento direto (receita reconhecida pela venda):
// - Exclui Personalizado — a receita entra pelos pagamentos do cliente (ClientPayment)
function isFaturadoQuote(q: Quote) {
  if (q.payment_type === 'Personalizado') return false
  if (q.status === 'Entregue/Faturado') return true
  return q.status === 'Faturado' || q.status === 'Entregue'
}

function revenueDate(q: Quote) { return q.invoiced_at ?? q.created_at }

const PAYMENT_METHODS = ['Dinheiro', 'PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto', 'Transferência'] as const

const MONTH_NAMES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

const EMPTY_EXPENSE = { description: '', supplier: '', amount: '', payment_method: PAYMENT_METHODS[0] as string, due_date: '', notes: '' }
const EMPTY_CONTRIBUTION = { description: '', amount: '', type: 'aporte' as CapitalMovementType | 'zerar' }

// ── Gráfico de composição financeira (donut) ─────────────────────────────────

interface RingSegment { label: string; value: number; color: string }

function FinanceRingChart({ segments }: { segments: RingSegment[] }) {
  const [hovered, setHovered] = useState<number | null>(null)

  const SIZE = 224
  const STROKE = 26
  const R = (SIZE - STROKE) / 2
  const C = 2 * Math.PI * R
  const cx = SIZE / 2
  const cy = SIZE / 2
  const total = segments.reduce((s, x) => s + x.value, 0)

  let cumulative = 0
  const arcs = segments.map((s, i) => {
    const fraction = total > 0 ? s.value / total : 0
    const dash = fraction * C
    const offset = -cumulative * C
    cumulative += fraction
    return { ...s, dash, offset, fraction, idx: i }
  })

  const focused = hovered !== null ? arcs[hovered] : null

  return (
    <div className="flex items-center justify-center gap-10 flex-wrap">
      <div className="relative flex-shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
          <defs>
            {arcs.map(a => (
              <filter key={`glow-${a.idx}`} id={`ring-glow-${a.idx}`} x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor={a.color} floodOpacity="0.55" />
              </filter>
            ))}
          </defs>
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="#1a1a1a" strokeWidth={STROKE} />
          {arcs.map(a => a.value > 0 && (
            <circle
              key={a.idx}
              cx={cx} cy={cy} r={R}
              fill="none"
              stroke={a.color}
              strokeWidth={hovered === a.idx ? STROKE + 7 : STROKE}
              strokeDasharray={`${a.dash} ${C - a.dash}`}
              strokeDashoffset={a.offset}
              strokeLinecap="round"
              filter={hovered === a.idx ? `url(#ring-glow-${a.idx})` : undefined}
              style={{
                transition: 'stroke-width 0.3s cubic-bezier(.4,0,.2,1), opacity 0.3s ease',
                cursor: 'pointer',
                opacity: hovered === null || hovered === a.idx ? 1 : 0.28,
              }}
              onMouseEnter={() => setHovered(a.idx)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-6 text-center">
          <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-[0.25em]">
            {focused ? focused.label : 'Composição'}
          </p>
          <p className="text-xl font-bold text-white tabular-nums mt-1.5 leading-tight">
            {formatBRL(focused ? focused.value : total)}
          </p>
          {focused && (
            <p className="text-xs font-semibold mt-1" style={{ color: focused.color }}>
              {(focused.fraction * 100).toFixed(1)}% do total
            </p>
          )}
        </div>
      </div>

      <div className="w-full sm:w-[320px] flex-shrink-0 space-y-1">
        {arcs.length === 0 && (
          <p className="text-gray-700 text-sm py-6 text-center">Sem dados financeiros suficientes ainda.</p>
        )}
        {arcs.map(a => (
          <div
            key={a.idx}
            onMouseEnter={() => setHovered(a.idx)}
            onMouseLeave={() => setHovered(null)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all cursor-default"
            style={{
              opacity: hovered === null || hovered === a.idx ? 1 : 0.4,
              background: hovered === a.idx ? `${a.color}14` : 'transparent',
            }}
          >
            <span className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-offset-2 ring-offset-[#0c0c0c]" style={{ background: a.color, boxShadow: `0 0 10px ${a.color}99`, ['--tw-ring-color' as any]: `${a.color}33` }} />
            <span className="text-sm text-gray-300 flex-1 min-w-0 break-words">{a.label}</span>
            <span className="text-sm font-bold tabular-nums text-white whitespace-nowrap flex-shrink-0">{formatBRL(a.value)}</span>
            <span className="text-xs text-gray-600 tabular-nums whitespace-nowrap flex-shrink-0">{(a.fraction * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function FinanceiroPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [contributions, setContributions] = useState<CapitalContribution[]>([])
  const [clientPayments, setClientPayments] = useState<ClientPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [expenseFilter, setExpenseFilter] = useState<'todas' | 'pendentes' | 'pagas'>('pendentes')
  const [showNewExpense, setShowNewExpense] = useState(false)
  const [expenseForm, setExpenseForm] = useState(EMPTY_EXPENSE)
  const [savingExpense, setSavingExpense] = useState(false)
  const [showNewContribution, setShowNewContribution] = useState(false)
  const [contributionForm, setContributionForm] = useState(EMPTY_CONTRIBUTION)
  const [savingContribution, setSavingContribution] = useState(false)
  const [payTarget, setPayTarget] = useState<Expense | null>(null)
  const [payingExpense, setPayingExpense] = useState(false)
  const [deleteExpenseTarget, setDeleteExpenseTarget] = useState<Expense | null>(null)
  const [deleteContributionTarget, setDeleteContributionTarget] = useState<CapitalContribution | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportPeriod, setReportPeriod] = useState<'mes' | 'ano' | 'personalizado'>('mes')
  const [reportStart, setReportStart] = useState('')
  const [reportEnd, setReportEnd] = useState('')

  const loadAll = () => {
    setLoading(true)
    Promise.all([getOrders(), getQuotes(), getClients(), getProducts(), getExpenses(), getCapitalContributions(), getAllPayments()])
      .then(([o, q, cl, pr, ex, cc, cp]) => {
        setOrders(o ?? [])
        setQuotes(q ?? [])
        setClients(cl ?? [])
        setProducts(pr ?? [])
        setExpenses(ex ?? [])
        setContributions(cc ?? [])
        setClientPayments(cp ?? [])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadAll() }, [])

  const faturadas = useMemo(() => quotes.filter(isFaturadoQuote), [quotes])

  // ── Faturamento ───────────────────────────────────────────────────────────
  const revenuePayments   = clientPayments.filter(p => p.count_as_revenue === true)
  const receitaCatalogo   = orders.reduce((s, o) => s + o.total, 0)
  const receitaVendas     = faturadas.reduce((s, q) => s + q.total, 0)
  const receitaGradual    = revenuePayments.reduce((s, p) => s + p.amount, 0)
  const receitaTotal      = receitaCatalogo + receitaVendas + receitaGradual


  const now = new Date()
  const todayKey = now.toISOString().slice(0, 10)
  const monthKey = now.toISOString().slice(0, 7)
  const yearKey  = String(now.getFullYear())

  const revenueEvents = useMemo(() => [
    ...orders.map(o => ({ date: o.created_at, amount: o.total })),
    ...faturadas.map(q => ({ date: revenueDate(q), amount: q.total })),
    ...revenuePayments.map(p => ({ date: p.created_at, amount: p.amount })),
  ], [orders, faturadas, revenuePayments])

  const sumRevenueWhere = (pred: (date: string) => boolean) =>
    revenueEvents.filter(e => pred(e.date)).reduce((s, e) => s + e.amount, 0)

  const startOfWeek = new Date(now)
  startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7))
  startOfWeek.setHours(0, 0, 0, 0)
  const weekKey = startOfWeek.toISOString().slice(0, 10)

  const faturamentoHoje   = sumRevenueWhere(d => d.slice(0, 10) === todayKey)
  const faturamentoSemana = sumRevenueWhere(d => d.slice(0, 10) >= weekKey)
  const faturamentoMes    = sumRevenueWhere(d => d.slice(0, 7) === monthKey)
  const faturamentoAno    = sumRevenueWhere(d => d.slice(0, 4) === yearKey)

  // ── Estoque ───────────────────────────────────────────────────────────────
  const sellableProducts = products.filter(p => !p.is_kit)
  const estoqueCusto = sellableProducts.reduce((s, p) => s + p.stock_quantity * p.cost_price, 0)
  const estoqueVenda = sellableProducts.reduce((s, p) => s + p.stock_quantity * p.price, 0)
  const margemPotencial = estoqueVenda - estoqueCusto

  // ── A Receber ─────────────────────────────────────────────────────────────
  const devedores = clients.filter(c => c.debt > 0)
  const totalAReceber = devedores.reduce((s, c) => s + c.debt, 0)

  // ── Contas a pagar / Aportes / Capital ────────────────────────────────────
  const despesasPendentes = expenses.filter(e => e.status === 'Pendente')
  const despesasPagas     = expenses.filter(e => e.status === 'Pago')
  const totalPendente = despesasPendentes.reduce((s, e) => s + e.amount, 0)
  const totalPago     = despesasPagas.reduce((s, e) => s + e.amount, 0)
  const totalAportes   = contributions.filter(c => c.type !== 'retirada').reduce((s, c) => s + c.amount, 0)
  const totalRetiradas = contributions.filter(c => c.type === 'retirada').reduce((s, c) => s + c.amount, 0)
  const capitalDisponivel = receitaTotal - totalPago + totalAportes - totalRetiradas

  const filteredExpenses = [...expenses].sort((a, b) => b.created_at.localeCompare(a.created_at)).filter(e =>
    expenseFilter === 'todas' ? true :
    expenseFilter === 'pendentes' ? e.status === 'Pendente' : e.status === 'Pago'
  )

  const ringSegments: RingSegment[] = [
    { label: 'Capital Disponível',          value: Math.max(capitalDisponivel, 0), color: '#28AEA4' },
    { label: 'Estoque (preço de venda)',    value: estoqueVenda,                   color: '#34d399' },
    { label: 'A Receber de Clientes',       value: totalAReceber,                  color: '#f87171' },
    { label: 'Contas a Pagar (pendentes)',  value: totalPendente,                  color: '#fb923c' },
  ].filter(s => s.value > 0)

  const handleCreateExpense = async () => {
    const amount = parseFloat(expenseForm.amount.replace(',', '.'))
    if (!expenseForm.description.trim() || !amount || amount <= 0 || savingExpense) return
    setSavingExpense(true)
    try {
      await createExpense({
        description: expenseForm.description.trim(),
        supplier: expenseForm.supplier.trim(),
        amount,
        payment_method: expenseForm.payment_method,
        due_date: expenseForm.due_date ? new Date(expenseForm.due_date).toISOString() : undefined,
        notes: expenseForm.notes.trim(),
      })
      await loadAll()
      setShowNewExpense(false)
      setExpenseForm(EMPTY_EXPENSE)
    } catch { alert('Erro ao cadastrar conta a pagar.') }
    finally { setSavingExpense(false) }
  }

  const confirmPay = async () => {
    if (!payTarget || payingExpense) return
    setPayingExpense(true)
    try {
      await payExpense(payTarget.id)
      await loadAll()
      setPayTarget(null)
    } catch { alert('Erro ao registrar pagamento.') }
    finally { setPayingExpense(false) }
  }

  const confirmDeleteExpense = async () => {
    if (!deleteExpenseTarget) return
    try {
      await deleteExpense(deleteExpenseTarget.id)
      await loadAll()
      setDeleteExpenseTarget(null)
    } catch { alert('Erro ao excluir conta.') }
  }

  const handleCreateContribution = async () => {
    const formType = contributionForm.type
    const isZerar = formType === 'zerar'
    const amount = isZerar ? Math.abs(capitalDisponivel) : parseFloat(contributionForm.amount.replace(',', '.'))
    if (!amount || amount <= 0 || savingContribution) return
    const type: CapitalMovementType = formType === 'zerar' ? (capitalDisponivel >= 0 ? 'retirada' : 'aporte') : formType
    if (type === 'retirada' && amount > capitalDisponivel) {
      alert('O valor da retirada não pode ser maior que o capital disponível.')
      return
    }
    setSavingContribution(true)
    try {
      await addCapitalContribution({
        description: contributionForm.description.trim() || (isZerar ? 'Zerar capital disponível' : ''),
        amount,
        type,
        hidden: isZerar,
      })
      await loadAll()
      setShowNewContribution(false)
      setContributionForm(EMPTY_CONTRIBUTION)
    } catch { alert('Erro ao registrar movimentação de capital.') }
    finally { setSavingContribution(false) }
  }

  const confirmDeleteContribution = async () => {
    if (!deleteContributionTarget) return
    try {
      await deleteCapitalContribution(deleteContributionTarget.id)
      await loadAll()
      setDeleteContributionTarget(null)
    } catch { alert('Erro ao excluir movimentação.') }
  }

  const handleGenerateReport = () => {
    const today = new Date()
    let start: Date, end: Date, periodLabel: string

    if (reportPeriod === 'mes') {
      start = new Date(today.getFullYear(), today.getMonth(), 1)
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)
      periodLabel = `Relatório Mensal — ${MONTH_NAMES[today.getMonth()]} de ${today.getFullYear()}`
    } else if (reportPeriod === 'ano') {
      start = new Date(today.getFullYear(), 0, 1)
      end = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999)
      periodLabel = `Relatório Anual — ${today.getFullYear()}`
    } else {
      if (!reportStart || !reportEnd) { alert('Selecione a data inicial e a data final do período.'); return }
      start = new Date(`${reportStart}T00:00:00`)
      end = new Date(`${reportEnd}T23:59:59.999`)
      if (start.getTime() > end.getTime()) { alert('A data inicial deve ser anterior à data final.'); return }
      periodLabel = 'Relatório Personalizado'
    }

    const inRange = (iso: string) => {
      const t = new Date(iso).getTime()
      return t >= start.getTime() && t <= end.getTime()
    }

    const rangeLabel = `${start.toLocaleDateString('pt-BR')} – ${end.toLocaleDateString('pt-BR')}`

    const faturamentoPeriodo = revenueEvents.filter(ev => inRange(ev.date)).reduce((s, ev) => s + ev.amount, 0)
    const expensesInPeriod = despesasPagas.filter(e => e.paid_at && inRange(e.paid_at))
    const despesasPagasPeriodo = expensesInPeriod.reduce((s, e) => s + e.amount, 0)
    const movementsInPeriod = contributions.filter(c => !c.hidden && inRange(c.created_at))
    const aportesPeriodo = movementsInPeriod.filter(c => c.type !== 'retirada').reduce((s, c) => s + c.amount, 0)
    const retiradasPeriodo = movementsInPeriod.filter(c => c.type === 'retirada').reduce((s, c) => s + c.amount, 0)

    exportFinancialReportPDF({
      periodLabel,
      rangeLabel,
      faturamento: faturamentoPeriodo,
      despesasPagas: despesasPagasPeriodo,
      aportes: aportesPeriodo,
      retiradas: retiradasPeriodo,
      capitalDisponivel,
      estoqueCusto,
      estoqueVenda,
      totalAReceber,
      totalPendente,
      expensesInPeriod,
      movementsInPeriod,
    })
    setShowReportModal(false)
  }

  return (
    <div className="min-h-full">
      <div className="px-6 py-7 border-b border-[#1c1c1c] flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Financeiro</h1>
          <p className="text-gray-500 text-sm mt-0.5">Resumo de receitas, estoque, contas e capital</p>
        </div>
        <button onClick={() => setShowReportModal(true)}
          className="bg-[#28AEA4] hover:bg-[#3cbdb6] text-white font-bold px-4 py-2.5 rounded-xl text-sm tracking-wide transition-colors flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/>
          </svg>
          Gerar Relatório Financeiro
        </button>
      </div>

      <div className="px-6 py-6 space-y-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-[#28AEA4]/30 border-t-[#28AEA4] rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Gráfico de composição financeira */}
            <section>
              <div className="bg-[#111111] border border-[#1e1e1e] rounded-2xl p-6 lg:p-8">
                <h2 className="text-sm font-semibold text-white mb-1">Composição Financeira</h2>
                <p className="text-xs text-gray-600 mb-6">Como seu capital está distribuído agora — passe o mouse para detalhar</p>
                <FinanceRingChart segments={ringSegments} />
              </div>
            </section>

            {/* Faturamento */}
            <section>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-3">Faturamento</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard label="Hoje" value={formatBRL(faturamentoHoje)} />
                <StatCard label="Esta Semana" value={formatBRL(faturamentoSemana)} />
                <StatCard label="Este Mês" value={formatBRL(faturamentoMes)} />
                <StatCard label="Este Ano" value={formatBRL(faturamentoAno)} />
              </div>
            </section>

            {/* Estoque */}
            <section>
              <div className="flex items-center justify-between mb-3 gap-3">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em]">Estoque</h2>
                <p className="text-[11px] text-gray-600">Clique em um valor de estoque para gerar o PDF detalhado por produto</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <StatCard label="Valor em Estoque (Custo)" value={formatBRL(estoqueCusto)}
                  sub={`${sellableProducts.reduce((s, p) => s + p.stock_quantity, 0)} unidades`}
                  onClick={() => exportStockValuationPDF(sellableProducts, 'custo')} />
                <StatCard label="Valor em Estoque (Venda)" value={formatBRL(estoqueVenda)} accent
                  onClick={() => exportStockValuationPDF(sellableProducts, 'venda')} />
                <StatCard label="Margem Potencial" value={formatBRL(margemPotencial)} tone="good" sub="Lucro se vender todo o estoque" />
              </div>
            </section>

            {/* Caixa */}
            <section>
              <div className="flex items-center justify-between mb-3 gap-3">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em]">Caixa &amp; Recebíveis</h2>
                <button onClick={() => setShowNewContribution(true)}
                  className="bg-[#28AEA4] hover:bg-[#3cbdb6] text-white font-bold px-4 py-1.5 rounded-lg text-xs tracking-wide transition-colors flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Movimentar Capital
                </button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <StatCard label="Capital Disponível" value={formatBRL(capitalDisponivel)} tone={capitalDisponivel >= 0 ? 'good' : 'bad'}
                  sub="Faturamento + aportes − retiradas − contas pagas" />
                <StatCard label="A Receber de Clientes" value={formatBRL(totalAReceber)} tone={totalAReceber > 0 ? 'bad' : 'default'}
                  sub={`${devedores.length} cliente(s) devendo`} />
                <StatCard label="Contas a Pagar (Pendentes)" value={formatBRL(totalPendente)} tone={totalPendente > 0 ? 'bad' : 'default'}
                  sub={`${despesasPendentes.length} conta(s)`} />
              </div>
            </section>

            {/* Contas a pagar */}
            <section>
              <div className="flex items-center justify-between mb-3 gap-3">
                <h2 className="text-sm font-semibold text-white">Contas a Pagar</h2>
                <div className="flex items-center gap-2.5">
                  <div className="flex gap-1.5">
                    {(['pendentes', 'pagas', 'todas'] as const).map(f => (
                      <button key={f} onClick={() => setExpenseFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          expenseFilter === f
                            ? 'bg-[#28AEA4]/15 text-[#28AEA4] border border-[#28AEA4]/25'
                            : 'bg-[#141414] text-gray-500 border border-[#1e1e1e] hover:text-gray-300'
                        }`}>
                        {f === 'pendentes' ? 'Pendentes' : f === 'pagas' ? 'Pagas' : 'Todas'}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setShowNewExpense(true)}
                    className="bg-[#28AEA4] hover:bg-[#3cbdb6] text-white font-bold px-4 py-1.5 rounded-lg text-xs tracking-wide transition-colors">
                    + Nova Conta
                  </button>
                </div>
              </div>

              {filteredExpenses.length === 0 ? (
                <div className="bg-[#111111] border border-[#1e1e1e] rounded-2xl p-8 text-center">
                  <p className="text-gray-600 text-sm">Nenhuma conta nessa categoria.</p>
                </div>
              ) : (
                <div className="bg-[#111111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
                  {filteredExpenses.map((e, i) => (
                    <div key={e.id} className={`px-5 py-4 flex items-start justify-between gap-3 ${i < filteredExpenses.length - 1 ? 'border-b border-[#1a1a1a]' : ''}`}>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{e.description}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                          {e.supplier && <span className="text-xs text-gray-500">{e.supplier}</span>}
                          {e.payment_method && <span className="text-xs text-gray-600">{e.payment_method}</span>}
                          {e.due_date && <span className="text-xs text-gray-700">Vence em {formatDateOnly(e.due_date)}</span>}
                        </div>
                        <p className="text-xs text-gray-700 mt-0.5">
                          {e.status === 'Pago' && e.paid_at ? `Pago em ${formatDate(e.paid_at)}` : `Cadastrada em ${formatDate(e.created_at)}`}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right flex flex-col items-end gap-2">
                        <p className="text-base font-bold text-white tabular-nums">{formatBRL(e.amount)}</p>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${
                          e.status === 'Pago'
                            ? 'bg-emerald-950/60 text-emerald-400'
                            : 'bg-red-950/40 text-red-400'
                        }`}>
                          {e.status}
                        </span>
                        <div className="flex gap-2">
                          {e.status === 'Pendente' && (
                            <button onClick={() => setPayTarget(e)}
                              className="text-[11px] font-semibold text-[#28AEA4] hover:underline">
                              Marcar como paga
                            </button>
                          )}
                          <button onClick={() => setDeleteExpenseTarget(e)}
                            className="text-[11px] font-semibold text-gray-600 hover:text-red-400">
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Histórico de aportes de capital */}
            <section>
              <h2 className="text-sm font-semibold text-white mb-3">Histórico de Movimentações de Capital</h2>

              {contributions.filter(c => !c.hidden).length === 0 ? (
                <div className="bg-[#111111] border border-[#1e1e1e] rounded-2xl p-8 text-center">
                  <p className="text-gray-600 text-sm">Nenhuma movimentação registrada ainda.</p>
                </div>
              ) : (
                <div className="bg-[#111111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
                  {contributions.filter(c => !c.hidden).sort((a, b) => b.created_at.localeCompare(a.created_at)).map((c, i, arr) => {
                    const isWithdrawal = c.type === 'retirada'
                    return (
                      <div key={c.id} className={`px-5 py-4 flex items-center justify-between gap-3 ${i < arr.length - 1 ? 'border-b border-[#1a1a1a]' : ''}`}>
                        <div className="min-w-0 flex items-center gap-3">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: isWithdrawal ? '#f87171' : '#28AEA4', boxShadow: isWithdrawal ? '0 0 8px #f8717199' : '0 0 8px #28AEA499' }} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{c.description || (isWithdrawal ? 'Retirada de capital' : 'Aporte de capital')}</p>
                            <p className="text-xs text-gray-600 mt-0.5">
                              <span className={isWithdrawal ? 'text-red-400' : 'text-[#28AEA4]'}>{isWithdrawal ? 'Retirada' : 'Aporte'}</span>
                              {' · '}{formatDate(c.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-4">
                          <p className={`text-base font-bold tabular-nums whitespace-nowrap ${isWithdrawal ? 'text-red-400' : 'text-[#28AEA4]'}`}>
                            {isWithdrawal ? '− ' : '+ '}{formatBRL(c.amount)}
                          </p>
                          <button onClick={() => setDeleteContributionTarget(c)}
                            className="text-[11px] font-semibold text-gray-600 hover:text-red-400">
                            Excluir
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* New Expense Modal */}
      {showNewExpense && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#1c1c1c]">
              <h2 className="text-lg font-bold text-white">Nova Conta a Pagar</h2>
              <button onClick={() => { setShowNewExpense(false); setExpenseForm(EMPTY_EXPENSE) }} className="text-gray-600 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="field-label">Descrição *</label>
                <input className="field-input" placeholder="Ex: Compra de produtos — Distribuidor XPTO" value={expenseForm.description}
                  onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} autoFocus />
              </div>
              <div>
                <label className="field-label">Fornecedor / Distribuidor</label>
                <input className="field-input" placeholder="Ex: Mirra Distribuidora" value={expenseForm.supplier}
                  onChange={e => setExpenseForm(f => ({ ...f, supplier: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Valor (R$) *</label>
                  <input className="field-input" placeholder="0,00" inputMode="decimal" value={expenseForm.amount}
                    onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value.replace(/[^0-9.,]/g, '') }))} />
                </div>
                <div>
                  <label className="field-label">Vencimento</label>
                  <input className="field-input" type="date" value={expenseForm.due_date}
                    onChange={e => setExpenseForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="field-label">Forma de Pagamento</label>
                <select className="field-input" value={expenseForm.payment_method}
                  onChange={e => setExpenseForm(f => ({ ...f, payment_method: e.target.value }))}>
                  {PAYMENT_METHODS.map(pm => <option key={pm} value={pm}>{pm}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Observações</label>
                <input className="field-input" placeholder="Ex: Pedido #123, parcela 1/3" value={expenseForm.notes}
                  onChange={e => setExpenseForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => { setShowNewExpense(false); setExpenseForm(EMPTY_EXPENSE) }}
                  className="flex-1 border border-[#2a2a2a] text-gray-400 rounded-xl py-3 text-sm hover:bg-[#141414] transition-colors">
                  Cancelar
                </button>
                <button onClick={handleCreateExpense} disabled={savingExpense || !expenseForm.description.trim() || !expenseForm.amount}
                  className="flex-1 bg-[#28AEA4] hover:bg-[#3cbdb6] disabled:bg-[#0c5a55] disabled:text-[#6edbd5] text-white font-bold rounded-xl py-3 text-sm transition-colors">
                  {savingExpense ? 'Salvando...' : 'Cadastrar Conta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Capital Contribution Modal */}
      {showNewContribution && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#1c1c1c]">
              <h2 className="text-lg font-bold text-white">Movimentar Capital</h2>
              <button onClick={() => { setShowNewContribution(false); setContributionForm(EMPTY_CONTRIBUTION) }} className="text-gray-600 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-3 gap-2 p-1 bg-[#141414] border border-[#2a2a2a] rounded-xl">
                <button
                  onClick={() => setContributionForm(f => ({ ...f, type: 'aporte' }))}
                  className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
                    contributionForm.type === 'aporte'
                      ? 'bg-[#28AEA4] text-white'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}>
                  Aporte
                </button>
                <button
                  onClick={() => setContributionForm(f => ({ ...f, type: 'retirada' }))}
                  className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
                    contributionForm.type === 'retirada'
                      ? 'bg-red-500 text-white'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}>
                  Retirada
                </button>
                <button
                  onClick={() => setContributionForm(f => ({ ...f, type: 'zerar' }))}
                  className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
                    contributionForm.type === 'zerar'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}>
                  Zerar
                </button>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                {contributionForm.type === 'aporte'
                  ? 'Registre um aporte de capital — dinheiro que você está inserindo no caixa do negócio (investimento próprio, empréstimo, etc). Esse valor passa a contar no seu capital disponível.'
                  : contributionForm.type === 'retirada'
                  ? 'Registre uma retirada de capital — dinheiro que você está tirando do caixa do negócio (pró-labore, despesas pessoais, etc). Esse valor será descontado do seu capital disponível.'
                  : `Zera o capital disponível atual (${formatBRL(capitalDisponivel)}), registrando automaticamente ${capitalDisponivel >= 0 ? 'uma retirada' : 'um aporte'} de ${formatBRL(Math.abs(capitalDisponivel))}.`}
              </p>
              {contributionForm.type === 'zerar' ? (
                <div>
                  <label className="field-label">Valor (R$)</label>
                  <input className="field-input opacity-60 cursor-not-allowed" value={formatBRL(Math.abs(capitalDisponivel))} disabled readOnly />
                </div>
              ) : (
                <div>
                  <label className="field-label">Valor (R$) *</label>
                  <input className="field-input" placeholder="0,00" inputMode="decimal" value={contributionForm.amount} autoFocus
                    onChange={e => setContributionForm(f => ({ ...f, amount: e.target.value.replace(/[^0-9.,]/g, '') }))} />
                </div>
              )}
              <div>
                <label className="field-label">Descrição</label>
                <input className="field-input" placeholder={
                  contributionForm.type === 'aporte' ? 'Ex: Aporte inicial, reforço de caixa...'
                  : contributionForm.type === 'retirada' ? 'Ex: Pró-labore, retirada para uso pessoal...'
                  : 'Ex: Zerar capital disponível'
                } value={contributionForm.description}
                  onChange={e => setContributionForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => { setShowNewContribution(false); setContributionForm(EMPTY_CONTRIBUTION) }}
                  className="flex-1 border border-[#2a2a2a] text-gray-400 rounded-xl py-3 text-sm hover:bg-[#141414] transition-colors">
                  Cancelar
                </button>
                <button onClick={handleCreateContribution}
                  disabled={savingContribution || (contributionForm.type === 'zerar' ? capitalDisponivel === 0 : !contributionForm.amount)}
                  className={`flex-1 font-bold rounded-xl py-3 text-sm transition-colors text-white disabled:opacity-50 ${
                    contributionForm.type === 'aporte'
                      ? 'bg-[#28AEA4] hover:bg-[#3cbdb6]'
                      : contributionForm.type === 'retirada'
                      ? 'bg-red-500 hover:bg-red-400 text-white'
                      : 'bg-blue-500 hover:bg-blue-400 text-white'
                  }`}>
                  {savingContribution ? 'Salvando...' : contributionForm.type === 'aporte' ? 'Adicionar ao Capital' : contributionForm.type === 'retirada' ? 'Retirar do Capital' : 'Zerar Capital'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Pay Modal */}
      {payTarget && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="px-6 py-5 border-b border-[#1c1c1c]">
              <h2 className="text-lg font-bold text-white">Confirmar pagamento</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-400 leading-relaxed">
                Confirmar o pagamento de <span className="text-white font-semibold">{payTarget.description}</span>{' '}
                no valor de <span className="text-white font-semibold tabular-nums">{formatBRL(payTarget.amount)}</span>?
                Esse valor será descontado do seu capital disponível.
              </p>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setPayTarget(null)} disabled={payingExpense}
                  className="flex-1 border border-[#2a2a2a] text-gray-400 rounded-xl py-3 text-sm hover:bg-[#141414] transition-colors disabled:opacity-50">
                  Cancelar
                </button>
                <button onClick={confirmPay} disabled={payingExpense}
                  className="flex-1 bg-[#28AEA4] hover:bg-[#3cbdb6] disabled:bg-[#0c5a55] disabled:text-[#6edbd5] text-white font-bold rounded-xl py-3 text-sm transition-colors">
                  {payingExpense ? 'Confirmando...' : 'Confirmar pagamento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteExpenseTarget}
        title="Excluir conta a pagar"
        message={`Excluir "${deleteExpenseTarget?.description}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        danger
        onConfirm={confirmDeleteExpense}
        onCancel={() => setDeleteExpenseTarget(null)}
      />

      <ConfirmModal
        open={!!deleteContributionTarget}
        title="Excluir movimentação de capital"
        message={`Excluir "${deleteContributionTarget?.description || (deleteContributionTarget?.type === 'retirada' ? 'Retirada de capital' : 'Aporte de capital')}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        danger
        onConfirm={confirmDeleteContribution}
        onCancel={() => setDeleteContributionTarget(null)}
      />

      {/* Financial Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#1c1c1c]">
              <h2 className="text-lg font-bold text-white">Gerar Relatório Financeiro</h2>
              <button onClick={() => setShowReportModal(false)} className="text-gray-600 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-xs text-gray-500 leading-relaxed">
                Gere um PDF com a visão financeira completa da empresa: faturamento, contas pagas, movimentações de capital no período selecionado, além da situação atual de estoque, recebíveis e capital disponível.
              </p>
              <div>
                <label className="field-label">Período</label>
                <div className="flex gap-2 p-1 bg-[#141414] border border-[#2a2a2a] rounded-xl">
                  {([
                    { key: 'mes', label: 'Mensal' },
                    { key: 'ano', label: 'Anual' },
                    { key: 'personalizado', label: 'Personalizado' },
                  ] as const).map(opt => (
                    <button key={opt.key} onClick={() => setReportPeriod(opt.key)}
                      className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                        reportPeriod === opt.key ? 'bg-[#28AEA4] text-white' : 'text-gray-400 hover:text-gray-200'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {reportPeriod === 'mes' && (
                <p className="text-xs text-gray-500">
                  Vai gerar o relatório de <span className="text-white font-semibold">{MONTH_NAMES[new Date().getMonth()]} de {new Date().getFullYear()}</span> (mês corrente).
                </p>
              )}
              {reportPeriod === 'ano' && (
                <p className="text-xs text-gray-500">
                  Vai gerar o relatório do ano <span className="text-white font-semibold">{new Date().getFullYear()}</span> completo.
                </p>
              )}
              {reportPeriod === 'personalizado' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="field-label">De</label>
                    <input className="field-input" type="date" value={reportStart}
                      onChange={e => setReportStart(e.target.value)} />
                  </div>
                  <div>
                    <label className="field-label">Até</label>
                    <input className="field-input" type="date" value={reportEnd}
                      onChange={e => setReportEnd(e.target.value)} />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowReportModal(false)}
                  className="flex-1 border border-[#2a2a2a] text-gray-400 rounded-xl py-3 text-sm hover:bg-[#141414] transition-colors">
                  Cancelar
                </button>
                <button onClick={handleGenerateReport}
                  className="flex-1 bg-[#28AEA4] hover:bg-[#3cbdb6] text-white font-bold rounded-xl py-3 text-sm transition-colors">
                  Gerar PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .field-label { display:block; font-size:10px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:0.15em; margin-bottom:6px; }
        .field-input { width:100%; background:#171717; border:1px solid #2a2a2a; color:white; border-radius:12px; padding:10px 14px; font-size:14px; outline:none; transition:border-color 0.2s; }
        .field-input:focus { border-color:#28AEA4; }
      `}</style>
    </div>
  )
}
