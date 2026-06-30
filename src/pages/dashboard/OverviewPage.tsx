import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getQuotes, getClients, getProducts, getAllPayments } from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import type { Quote, Client, Product, ClientPayment } from '../../types'

const IconEye = ({ open }: { open: boolean }) => open ? (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)
const IconSun = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
)
const IconMoon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
)

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Period = '7d' | 'mes' | '6m' | 'ano'
interface ChartPoint { label: string; value: number }

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '7d',  label: '7 dias'  },
  { value: 'mes', label: 'Mês'     },
  { value: '6m',  label: '6 meses' },
  { value: 'ano', label: 'Ano'     },
]

// ── Helpers de período ────────────────────────────────────────────────────────

function invoicedDate(q: Quote) { return new Date(q.invoiced_at ?? q.created_at) }

// Quotes que geram faturamento (receita reconhecida pela venda).
// Inclui Entregue, pois ao marcar como entregue um pedido faturado perde o status "Faturado".
// Inclui Faturado Gradual: o total do orçamento entra no faturamento no momento do faturamento.
function isFaturadoQuote(q: Quote) {
  if (q.status === 'Faturado Gradual') return true
  if (q.payment_type === 'Personalizado') return false
  if (q.status === 'Entregue/Faturado') return true
  return q.status === 'Faturado' || q.status === 'Entregue'
}

function chartData(quotes: Quote[], payments: ClientPayment[], period: Period): ChartPoint[] {
  const inv = quotes.filter(isFaturadoQuote)
  const now = new Date()

  const quoteVal = (from: Date, to?: Date) =>
    inv.filter(q => { const d = invoicedDate(q); return d >= from && (!to || d <= to) })
       .reduce((s, q) => s + q.total, 0)

  const payVal = (from: Date, to?: Date) =>
    payments.filter(p => { const d = new Date(p.created_at); return d >= from && (!to || d <= to) })
            .reduce((s, p) => s + p.amount, 0)

  if (period === '7d') {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() - (6 - i))
      const key = d.toISOString().slice(0, 10)
      const qv = inv.filter(q => (q.invoiced_at ?? q.created_at).slice(0, 10) === key).reduce((s, q) => s + q.total, 0)
      const pv = payments.filter(p => p.created_at.slice(0, 10) === key).reduce((s, p) => s + p.amount, 0)
      return { label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), value: qv + pv }
    })
  }
  if (period === 'mes') {
    return Array.from({ length: 5 }, (_, i) => {
      const end = new Date(now); end.setDate(end.getDate() - (4 - i) * 7)
      const start = new Date(end); start.setDate(start.getDate() - 6)
      return { label: start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), value: quoteVal(start, end) + payVal(start, end) }
    })
  }
  if (period === '6m') {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const qv = inv.filter(q => (q.invoiced_at ?? q.created_at).slice(0, 7) === key).reduce((s, q) => s + q.total, 0)
      const pv = payments.filter(p => p.created_at.slice(0, 7) === key).reduce((s, p) => s + p.amount, 0)
      return { label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), value: qv + pv }
    })
  }
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const qv = inv.filter(q => (q.invoiced_at ?? q.created_at).slice(0, 7) === key).reduce((s, q) => s + q.total, 0)
    const pv = payments.filter(p => p.created_at.slice(0, 7) === key).reduce((s, p) => s + p.amount, 0)
    return { label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), value: qv + pv }
  })
}

function periodTotal(quotes: Quote[], payments: ClientPayment[], period: Period): number {
  const inv = quotes.filter(isFaturadoQuote)
  const now = new Date()
  const ago = (days: number) => { const d = new Date(now); d.setDate(d.getDate() - days); return d }
  let cutoff: Date
  if (period === '7d')  cutoff = ago(7)
  else if (period === 'mes') cutoff = ago(30)
  else if (period === '6m')  cutoff = new Date(now.getFullYear(), now.getMonth() - 6, 1)
  else cutoff = new Date(now.getFullYear(), 0, 1)
  const qTotal = inv.filter(q => invoicedDate(q) >= cutoff).reduce((s, q) => s + q.total, 0)
  const pTotal = payments.filter(p => new Date(p.created_at) >= cutoff).reduce((s, p) => s + p.amount, 0)
  return qTotal + pTotal
}

// ── Gráfico de onda ───────────────────────────────────────────────────────────

function WaveChart({ data, light, onHover }: {
  data: ChartPoint[]
  light: boolean
  onHover: (pt: ChartPoint | null) => void
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const W = 600, H = 148
  const PT = 16, PB = 28, PX = 20
  const cH = H - PT - PB
  const max = Math.max(...data.map(d => d.value), 1)
  const n   = data.length

  const px = (i: number) => n < 2 ? W / 2 : PX + (i / (n - 1)) * (W - PX * 2)
  const py = (v: number) => PT + cH - (v / max) * cH * 0.82
  const pts = data.map((d, i) => ({ ...d, x: px(i), y: py(d.value) }))

  const linePath = pts.length < 2 ? '' : pts.reduce((acc, p, i) => {
    if (i === 0) return `M${p.x},${p.y}`
    const prev = pts[i - 1]
    const cx1 = prev.x + (p.x - prev.x) * 0.5
    const cx2 = p.x   - (p.x - prev.x) * 0.5
    return `${acc} C${cx1},${prev.y} ${cx2},${p.y} ${p.x},${p.y}`
  }, '')

  const areaPath = linePath ? `${linePath} L${W},${H} L0,${H} Z` : ''

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const relX = ((e.clientX - rect.left) / rect.width) * W
    let best = 0, minD = Infinity
    pts.forEach((p, i) => { const d = Math.abs(p.x - relX); if (d < minD) { minD = d; best = i } })
    setHoveredIdx(best)
    onHover(pts[best])
  }

  const handleMouseLeave = () => { setHoveredIdx(null); onHover(null) }

  const labelFill = light ? '#999' : '#555'

  return (
    <div className="select-none">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full block"
        style={{ height: 148 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id="wave-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#28AEA4" stopOpacity="0.45" />
            <stop offset="45%"  stopColor="#28AEA4" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#28AEA4" stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {areaPath && <path d={areaPath} fill="url(#wave-fill)" />}
        {linePath && <path d={linePath} fill="none" stroke="#28AEA4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

        {hoveredIdx !== null && (
          <line x1={pts[hoveredIdx].x} y1={PT} x2={pts[hoveredIdx].x} y2={H - PB}
            stroke="#28AEA4" strokeWidth="1" strokeDasharray="4,3" strokeOpacity="0.5" />
        )}
        {hoveredIdx !== null && (
          <circle cx={pts[hoveredIdx].x} cy={pts[hoveredIdx].y} r={5}
            fill="#28AEA4" stroke={light ? '#f0f0f0' : '#111111'} strokeWidth="2.5" />
        )}

        {pts.map((p, i) => {
          const step = n > 9 ? Math.ceil(n / 7) : 1
          if (i % step !== 0 && i !== n - 1) return null
          return (
            <text key={i} x={p.x} y={H - 8} textAnchor="middle"
              fill={labelFill} fontSize="10" fontFamily="ui-sans-serif,system-ui,sans-serif">
              {p.label}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

function RankList({ title, items, color, onClick }: {
  title: string
  items: { name: string; value: string }[]
  color: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-[#111111] border border-[#1e1e1e] rounded-2xl p-5 hover:border-[#28AEA4]/25 transition-colors group"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-[0.2em] group-hover:text-[#28AEA4]/70 transition-colors">{title}</p>
        <span className="text-[10px] text-gray-700 group-hover:text-[#28AEA4]/60 transition-colors">Ver completo →</span>
      </div>
      {items.length === 0 ? (
        <p className="text-gray-700 text-xs py-4 text-center">Sem dados suficientes</p>
      ) : (
        <div className="space-y-2.5">
          {items.map((it, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-[10px] text-gray-700 font-bold w-5 flex-shrink-0">{i + 1}º</span>
                <span className="text-sm text-gray-300 truncate">{it.name}</span>
              </div>
              <span className={`text-sm font-bold tabular-nums flex-shrink-0 ${color}`}>{it.value}</span>
            </div>
          ))}
        </div>
      )}
    </button>
  )
}

interface ClientRankRow { id: string; name: string; revenue: number; orderCount: number; debt: number }

function RankingModal({ data, onClose, onPrint }: {
  data: { title: string; rows: ClientRankRow[] } | null
  onClose: () => void
  onPrint: () => void
}) {
  if (!data) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#111111] border border-[#1e1e1e] rounded-2xl w-full max-w-2xl max-h-[82vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-[#1c1c1c] flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-white font-semibold text-sm">{data.title}</h3>
            <p className="text-gray-600 text-xs mt-0.5">Ranking completo · {data.rows.length} cliente{data.rows.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none px-1">×</button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-3">
          {data.rows.length === 0 ? (
            <p className="text-gray-700 text-sm text-center py-10">Sem dados suficientes</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] text-gray-500 uppercase tracking-wider">
                  <th className="py-2 pr-3 font-semibold">#</th>
                  <th className="py-2 pr-3 font-semibold">Cliente</th>
                  <th className="py-2 pr-3 font-semibold text-right">Total comprado</th>
                  <th className="py-2 pr-3 font-semibold text-right">Pedidos</th>
                  <th className="py-2 font-semibold text-right">Dívida</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r, i) => (
                  <tr key={r.id} className="border-t border-[#1a1a1a]">
                    <td className="py-2 pr-3 text-gray-600">{i + 1}º</td>
                    <td className="py-2 pr-3 text-gray-300 truncate max-w-[180px]">{r.name}</td>
                    <td className="py-2 pr-3 text-right text-[#28AEA4] font-medium tabular-nums">{formatBRL(r.revenue)}</td>
                    <td className="py-2 pr-3 text-right text-blue-400 tabular-nums">{r.orderCount}</td>
                    <td className={`py-2 text-right tabular-nums ${r.debt > 0 ? 'text-red-400' : 'text-gray-700'}`}>
                      {r.debt > 0 ? formatBRL(r.debt) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-6 py-4 border-t border-[#1c1c1c] flex justify-end gap-2 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors">Fechar</button>
          <button onClick={onPrint} className="px-4 py-2 rounded-lg text-sm bg-[#28AEA4] text-white font-medium hover:bg-[#1d9992] transition-colors">Imprimir</button>
        </div>
      </div>
    </div>
  )
}

function printClientRanking(title: string, rows: ClientRankRow[]) {
  const rowsHtml = rows.map((r, i) => `
    <tr>
      <td class="muted">${i + 1}º</td>
      <td>${r.name}</td>
      <td class="r num">${formatBRL(r.revenue)}</td>
      <td class="c muted">${r.orderCount}</td>
      <td class="r num ${r.debt > 0 ? 'debt' : 'muted'}">${r.debt > 0 ? formatBRL(r.debt) : '—'}</td>
    </tr>`).join('')

  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>${title} — Mirra Cosméticos</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; font-size:11px; color:#0f172a; background:#fff; }
.page { padding:36px 44px; }
.top-bar { height:3px; background:#28AEA4; margin:-36px -44px 32px; }
.header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:18px; border-bottom:1px solid #e2e8f0; margin-bottom:22px; }
.brand { font-size:17px; font-weight:800; color:#0f172a; }
.brand-sub { font-size:9px; letter-spacing:.18em; color:#28AEA4; margin-top:3px; text-transform:uppercase; font-weight:600; }
.doc-date { font-size:10px; color:#64748b; text-align:right; }
table { width:100%; border-collapse:collapse; }
thead th { background:#f8fafc; color:#64748b; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; padding:8px 12px; border-top:1px solid #e2e8f0; border-bottom:1px solid #28AEA4; }
th.r,td.r { text-align:right; }
th.c,td.c { text-align:center; }
tbody td { padding:8px 12px; border-bottom:1px solid #f1f5f9; }
tbody tr:nth-child(even) td { background:#f8fafc; }
tbody tr:last-child td { border-bottom:none; }
.muted { color:#94a3b8; }
.num { font-variant-numeric:tabular-nums; }
.debt { color:#dc2626; font-weight:700; }
.footer { margin-top:32px; padding-top:10px; border-top:1px solid #e2e8f0; font-size:9px; color:#94a3b8; display:flex; justify-content:space-between; }
.accent { color:#28AEA4; font-weight:700; }
@media print { body { padding:0; } @page { margin:10mm; size:A4; } }
</style></head>
<body>
  <div class="page">
    <div class="top-bar"></div>
    <div class="header">
      <div>
        <div class="brand">MIRRA COSMÉTICOS</div>
        <div class="brand-sub">${title}</div>
      </div>
      <div class="doc-date">Gerado em ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
    </div>
    <table>
      <thead><tr><th>#</th><th>Cliente</th><th class="r">Total comprado</th><th class="c">Pedidos</th><th class="r">Dívida</th></tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <div class="footer">
      <span>Mirra Cosméticos</span>
      <span class="accent">RinoSeller</span>
    </div>
  </div>
</body></html>`

  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) { alert('Permita popups para imprimir o ranking.'); return }
  win.document.write(html)
  win.document.close()
  win.addEventListener('load', () => setTimeout(() => win.print(), 400))
}

// ── Página ────────────────────────────────────────────────────────────────────

export function OverviewPage() {
  const { user }   = useAuth()
  const { hideValues, toggleHideValues, theme, toggleTheme } = useSettings()
  const [quotes, setQuotes]                  = useState<Quote[]>([])
  const [clients, setClients]                = useState<Client[]>([])
  const [products, setProducts]              = useState<Product[]>([])
  const [clientPayments, setClientPayments]  = useState<ClientPayment[]>([])
  const [loading, setLoading]                = useState(true)
  const [period, setPeriod]                  = useState<Period>('7d')
  const [hoveredPoint, setHoveredPoint]      = useState<ChartPoint | null>(null)
  const [openRanking, setOpenRanking]        = useState<{ title: string; rows: ClientRankRow[] } | null>(null)
  const [clientTab, setClientTab]            = useState<'compradores' | 'dividas' | 'pedidos'>('compradores')
  const [productTab, setProductTab]          = useState<'mais' | 'menos'>('mais')

  useEffect(() => {
    Promise.all([getQuotes(), getClients(), getProducts(), getAllPayments()])
      .then(([q, c, p, pay]) => { setQuotes(q ?? []); setClients(c ?? []); setProducts(p ?? []); setClientPayments(pay ?? []) })
      .finally(() => setLoading(false))
  }, [])

  const now       = new Date()
  const greeting  = now.getHours() < 12 ? 'Bom dia' : now.getHours() < 18 ? 'Boa tarde' : 'Boa noite'
  const firstName = user?.name?.split(' ')[0] ?? 'Vendedor'
  const isLight   = theme === 'light'

  const hv = (v: string) => hideValues ? '••••••' : v

  const revenuePayments = clientPayments.filter(p => p.count_as_revenue === true)
  const faturadoPeriod = periodTotal(quotes, revenuePayments, period)
  const chartPoints    = chartData(quotes, revenuePayments, period)
  const lowStock       = products.filter(p => !p.is_kit && p.stock_quantity <= 3)

  // ── Dashboard de clientes ──────────────────────────────────────────────────
  const clientStats = clients.map(c => {
    const clientQuotes = quotes.filter(q => q.client_id === c.id)
    const revenue = clientQuotes.filter(isFaturadoQuote).reduce((s, q) => s + q.total, 0)
      + revenuePayments.filter(p => p.client_id === c.id).reduce((s, p) => s + p.amount, 0)
    const orderCount = clientQuotes.filter(q =>
      q.status === 'Aprovado' || q.status === 'Entregue' || q.status === 'Faturado' || q.status === 'Entregue/Faturado'
    ).length
    return { id: c.id, name: c.name, revenue, orderCount, debt: c.debt }
  })

  const allBuyers    = [...clientStats].sort((a, b) => b.revenue - a.revenue)
  const allLeast     = [...clientStats].filter(c => c.revenue > 0).sort((a, b) => a.revenue - b.revenue)
  const allDebtors   = [...clientStats].filter(c => c.debt > 0).sort((a, b) => b.debt - a.debt)
  const allOrderers  = [...clientStats].filter(c => c.orderCount > 0).sort((a, b) => b.orderCount - a.orderCount)

  const topBuyers    = allBuyers.slice(0, 5)
  const bottomBuyers = allLeast.slice(0, 5)
  const topDebtors   = allDebtors.slice(0, 5)
  const topOrderers  = allOrderers.slice(0, 5)

  // ── Ranking de produtos e marcas ────────────────────────────────────────────
  const soldQuotes = quotes.filter(q =>
    q.status === 'Aprovado' || q.status === 'Entregue' || q.status === 'Faturado' || q.status === 'Entregue/Faturado'
  )
  const productSales = new Map<string, { name: string; qty: number }>()
  soldQuotes.forEach(q => {
    q.items.forEach(item => {
      const cur = productSales.get(item.product_id) ?? { name: item.product_name, qty: 0 }
      cur.qty += item.quantity
      productSales.set(item.product_id, cur)
    })
  })

  const productRank    = [...productSales.entries()].map(([id, v]) => ({ id, name: v.name, qty: v.qty }))
  const topProducts    = [...productRank].sort((a, b) => b.qty - a.qty).slice(0, 5)
  const bottomProducts = [...productRank].filter(p => p.qty > 0).sort((a, b) => a.qty - b.qty).slice(0, 5)

  return (
    <div className="min-h-full">
      <div className="px-6 py-7 border-b border-[#1c1c1c] flex items-start justify-between gap-4">
        <div>
          <p className="text-gray-500 text-sm">{greeting}, {firstName}</p>
          <h1 className="text-2xl font-bold text-white mt-0.5">Visão Geral</h1>
          <p className="text-gray-600 text-xs mt-1">
            {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 mt-1">
          <button
            onClick={toggleHideValues}
            title={hideValues ? 'Mostrar valores' : 'Ocultar valores'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2a2a2a] text-gray-500 hover:text-gray-200 hover:border-[#3a3a3a] transition-all text-xs"
          >
            <IconEye open={!hideValues} />
            <span className="hidden sm:inline">{hideValues ? 'Mostrar' : 'Ocultar'}</span>
          </button>
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2a2a2a] text-gray-500 hover:text-gray-200 hover:border-[#3a3a3a] transition-all text-xs"
          >
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
            <span className="hidden sm:inline">{theme === 'dark' ? 'Claro' : 'Escuro'}</span>
          </button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#28AEA4]/30 border-t-[#28AEA4] rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ── Linha 1: Faturamento + Gráfico (empilhados no celular) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card faturamento — mesmo tamanho dos outros */}
              <div className="bg-[#111111] border border-[#1e1e1e] rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-[0.2em] mb-1">
                    {hoveredPoint ? hoveredPoint.label : 'Faturamento'}
                  </p>
                  <p className="text-2xl font-bold text-[#28AEA4] tabular-nums leading-none">
                    {hv(formatBRL(hoveredPoint?.value ?? faturadoPeriod))}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">período selecionado</p>
                </div>
                <div className="flex gap-1 bg-[#0a0a0a] p-1 rounded-xl mt-4">
                  {PERIOD_OPTIONS.map(opt => (
                    <button key={opt.value}
                      onClick={() => { setPeriod(opt.value); setHoveredPoint(null) }}
                      className={`flex-1 py-1 rounded-lg text-xs font-medium transition-all ${
                        period === opt.value ? 'bg-[#28AEA4] text-white' : 'text-gray-500 hover:text-gray-300'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card gráfico */}
              <div className="bg-[#111111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
                <p className="px-4 pt-4 pb-1 text-[10px] font-semibold text-gray-500 uppercase tracking-[0.2em]">
                  Evolução
                </p>
                {chartPoints.every(d => d.value === 0) ? (
                  <div className="flex items-center justify-center text-gray-700 text-sm" style={{ height: 148 }}>
                    Sem dados no período
                  </div>
                ) : (
                  <WaveChart data={chartPoints} light={isLight} onHover={setHoveredPoint} />
                )}
              </div>
            </div>

            {/* ── Rankings ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* Estoque Crítico */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-white">Estoque Crítico</h2>
                  <Link to="/dashboard/produtos" className="text-xs text-[#28AEA4]/70 hover:text-[#28AEA4]">Gerenciar →</Link>
                </div>
                <div className="bg-[#111111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
                  {lowStock.length === 0 ? (
                    <p className="text-gray-700 text-xs text-center py-8">Estoque em dia</p>
                  ) : (
                    <div className="px-4 py-2 space-y-1">
                      {[...lowStock]
                        .sort((a, b) => a.stock_quantity - b.stock_quantity)
                        .slice(0, 7)
                        .map(p => (
                          <div key={p.id} className="flex items-center gap-2.5 py-2">
                            <div className="min-w-0">
                              <p className="text-sm text-gray-200 truncate leading-snug">{p.name}</p>
                              <p className="text-xs font-semibold tabular-nums mt-0.5">
                                {p.stock_quantity === 0
                                  ? <span className="text-red-400">Zerado</span>
                                  : <span className="text-amber-400">{p.stock_quantity} un. restantes</span>
                                }
                              </p>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  )}
                  <div className="border-t border-[#1e1e1e] px-4 py-2.5">
                    <Link to="/dashboard/produtos" className="block w-full text-xs text-gray-600 hover:text-[#28AEA4] transition-colors text-center">
                      Ajustar estoque →
                    </Link>
                  </div>
                </div>
              </div>

              {/* Ranking de Clientes */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-white">Ranking de Clientes</h2>
                  <Link to="/dashboard/clientes" className="text-xs text-[#28AEA4]/70 hover:text-[#28AEA4]">Ver todos →</Link>
                </div>
                <div className="bg-[#111111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-[#1e1e1e]">
                  {([
                    { key: 'compradores' as const, label: 'Compradores',  color: 'text-[#28AEA4]' },
                    { key: 'dividas'     as const, label: 'Dívidas',      color: 'text-red-400'   },
                    { key: 'pedidos'     as const, label: 'Nº Pedidos',   color: 'text-blue-400'  },
                  ]).map(t => (
                    <button key={t.key} onClick={() => setClientTab(t.key)}
                      className={`flex-1 py-3 text-xs font-medium transition-colors border-b-2 ${
                        clientTab === t.key
                          ? `${t.color} border-current`
                          : 'text-gray-600 border-transparent hover:text-gray-400'
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Rows */}
                <div className="px-4 py-2 space-y-1">
                  {clientTab === 'compradores' && (
                    allBuyers.slice(0, 5).length === 0
                      ? <p className="text-gray-700 text-xs text-center py-4">Sem dados suficientes</p>
                      : allBuyers.slice(0, 5).map((c, i) => (
                        <div key={c.id} className="flex items-center gap-2.5 py-2">
                          <span className="text-[11px] text-gray-600 w-5 shrink-0 tabular-nums">{i + 1}º</span>
                          <div className="min-w-0">
                            <p className="text-sm text-gray-200 truncate leading-snug">{c.name}</p>
                            <p className="text-xs font-semibold text-[#28AEA4] tabular-nums mt-0.5">{hv(formatBRL(c.revenue))}</p>
                          </div>
                        </div>
                      ))
                  )}
                  {clientTab === 'dividas' && (
                    allDebtors.slice(0, 5).length === 0
                      ? <p className="text-gray-700 text-xs text-center py-4">Nenhum devedor</p>
                      : allDebtors.slice(0, 5).map((c, i) => (
                        <div key={c.id} className="flex items-center gap-2.5 py-2">
                          <span className="text-[11px] text-gray-600 w-5 shrink-0 tabular-nums">{i + 1}º</span>
                          <div className="min-w-0">
                            <p className="text-sm text-gray-200 truncate leading-snug">{c.name}</p>
                            <p className="text-xs font-semibold text-red-400 tabular-nums mt-0.5">{hv(formatBRL(c.debt))}</p>
                          </div>
                        </div>
                      ))
                  )}
                  {clientTab === 'pedidos' && (
                    allOrderers.slice(0, 5).length === 0
                      ? <p className="text-gray-700 text-xs text-center py-4">Sem dados suficientes</p>
                      : allOrderers.slice(0, 5).map((c, i) => (
                        <div key={c.id} className="flex items-center gap-2.5 py-2">
                          <span className="text-[11px] text-gray-600 w-5 shrink-0 tabular-nums">{i + 1}º</span>
                          <div className="min-w-0">
                            <p className="text-sm text-gray-200 truncate leading-snug">{c.name}</p>
                            <p className="text-xs font-semibold text-blue-400 tabular-nums mt-0.5">{c.orderCount} pedido{c.orderCount !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                      ))
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-[#1e1e1e] px-4 py-2.5">
                  <button
                    onClick={() => setOpenRanking(
                      clientTab === 'compradores' ? { title: 'Maiores compradores', rows: allBuyers } :
                      clientTab === 'dividas'     ? { title: 'Dívidas em aberto',   rows: allDebtors } :
                                                    { title: 'Volume de pedidos',   rows: allOrderers }
                    )}
                    className="w-full text-xs text-gray-600 hover:text-[#28AEA4] transition-colors text-center"
                  >
                    Ver ranking completo →
                  </button>
                </div>
                </div>
              </div>

              {/* Ranking de Produtos */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-white">Ranking de Produtos</h2>
                  <Link to="/dashboard/produtos" className="text-xs text-[#28AEA4]/70 hover:text-[#28AEA4]">Ver todos →</Link>
                </div>
                <div className="bg-[#111111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
                  <div className="flex border-b border-[#1e1e1e]">
                    {([
                      { key: 'mais' as const, label: 'Mais vendidos', color: 'text-[#28AEA4]' },
                      { key: 'menos' as const, label: 'Menos vendidos', color: 'text-amber-400' },
                    ]).map(t => (
                      <button key={t.key} onClick={() => setProductTab(t.key)}
                        className={`flex-1 py-3 text-xs font-medium transition-colors border-b-2 ${
                          productTab === t.key
                            ? `${t.color} border-current`
                            : 'text-gray-600 border-transparent hover:text-gray-400'
                        }`}>
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="px-4 py-2 space-y-1">
                    {(productTab === 'mais' ? topProducts : bottomProducts).length === 0 ? (
                      <p className="text-gray-700 text-xs text-center py-4">Sem dados suficientes</p>
                    ) : (productTab === 'mais' ? topProducts : bottomProducts).map((p, i) => (
                      <div key={p.id} className="flex items-center gap-2.5 py-2">
                        <span className="text-[11px] text-gray-600 w-5 shrink-0 tabular-nums">{i + 1}º</span>
                        <div className="min-w-0">
                          <p className="text-sm text-gray-200 truncate leading-snug">{p.name}</p>
                          <p className={`text-xs font-semibold tabular-nums mt-0.5 ${productTab === 'mais' ? 'text-[#28AEA4]' : 'text-amber-400'}`}>
                            {p.qty} un. vendida{p.qty !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </>
        )}
      </div>

      <RankingModal
        data={openRanking}
        onClose={() => setOpenRanking(null)}
        onPrint={() => openRanking && printClientRanking(openRanking.title, openRanking.rows)}
      />
    </div>
  )
}
