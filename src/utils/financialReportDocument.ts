import type { CapitalContribution, Expense } from '../types'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export interface FinancialReportData {
  periodLabel: string
  rangeLabel: string
  faturamento: number
  despesasPagas: number
  aportes: number
  retiradas: number
  capitalDisponivel: number
  estoqueCusto: number
  estoqueVenda: number
  totalAReceber: number
  totalPendente: number
  expensesInPeriod: Expense[]
  movementsInPeriod: CapitalContribution[]
}

const BASE_CSS = `
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; font-size:11px; color:#0f172a; background:#fff; }
.page { padding:36px 44px; }
.top-bar { height:3px; background:#28AEA4; margin:-36px -44px 32px; }
.header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:20px; border-bottom:1px solid #e2e8f0; margin-bottom:24px; }
.brand { font-size:17px; font-weight:800; letter-spacing:.02em; color:#0f172a; }
.brand-sub { font-size:9px; letter-spacing:.18em; color:#28AEA4; margin-top:3px; text-transform:uppercase; font-weight:600; }
.doc-meta { text-align:right; }
.doc-title { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.14em; color:#94a3b8; }
.doc-date { font-size:10px; color:#64748b; margin-top:4px; }
.cards { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:8px; }
.card { flex:1; min-width:110px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; }
.card-label { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.12em; color:#94a3b8; margin-bottom:3px; }
.card-value { font-size:14px; font-weight:700; color:#0f172a; }
.card-value.good { color:#059669; }
.card-value.bad { color:#dc2626; }
.card-value.accent { color:#28AEA4; }
.section-title { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.16em; color:#94a3b8; margin:22px 0 8px; padding-bottom:6px; border-bottom:1px solid #f1f5f9; }
table { width:100%; border-collapse:collapse; }
thead th { background:#f8fafc; color:#64748b; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; padding:8px 10px; border-top:1px solid #e2e8f0; border-bottom:1px solid #28AEA4; text-align:left; }
th.r,td.r { text-align:right; }
th.c,td.c { text-align:center; }
tbody td { padding:7px 10px; font-size:11px; border-bottom:1px solid #f1f5f9; }
tbody tr:nth-child(even) td { background:#f8fafc; }
tbody tr:last-child td { border-bottom:none; }
.muted { color:#94a3b8; }
.num { font-variant-numeric:tabular-nums; }
.credit { color:#059669; font-weight:700; }
.debt { color:#dc2626; font-weight:700; }
.badge { display:inline-block; padding:2px 8px; border-radius:99px; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; border:1px solid; }
.badge-ok { background:#f0fdf4; color:#059669; border-color:#bbf7d0; }
.badge-bad { background:#fef2f2; color:#dc2626; border-color:#fecaca; }
.empty { color:#94a3b8; font-style:italic; padding:10px 0; }
.footer { margin-top:36px; padding-top:12px; border-top:1px solid #e2e8f0; font-size:9px; color:#94a3b8; display:flex; justify-content:space-between; }
.footer-accent { color:#28AEA4; font-weight:700; }
@media print { body { padding:0; } @page { margin:10mm; size:A4; } h2 { page-break-after:avoid; } table { page-break-inside:auto; } tr { page-break-inside:avoid; } }
`

export function exportFinancialReportPDF(data: FinancialReportData) {
  const resultado = data.faturamento - data.despesasPagas + data.aportes - data.retiradas

  const expenseRows = [...data.expensesInPeriod]
    .sort((a, b) => (b.paid_at ?? '').localeCompare(a.paid_at ?? ''))
    .map(e => `
      <tr>
        <td>${e.description}</td>
        <td class="muted">${e.supplier || '—'}</td>
        <td class="muted">${e.payment_method || '—'}</td>
        <td class="muted">${e.paid_at ? fmtDate(e.paid_at) : '—'}</td>
        <td class="r num debt">${formatBRL(e.amount)}</td>
      </tr>
    `).join('')

  const movementRows = [...data.movementsInPeriod]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(c => {
      const isWithdrawal = c.type === 'retirada'
      return `
        <tr>
          <td>${c.description || (isWithdrawal ? 'Retirada de capital' : 'Aporte de capital')}</td>
          <td class="c"><span class="badge ${isWithdrawal ? 'badge-bad' : 'badge-ok'}">${isWithdrawal ? 'Retirada' : 'Aporte'}</span></td>
          <td class="muted">${fmtDate(c.created_at)}</td>
          <td class="r num ${isWithdrawal ? 'debt' : 'credit'}">${isWithdrawal ? '− ' : '+ '}${formatBRL(c.amount)}</td>
        </tr>
      `
    }).join('')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <title>Relatório Financeiro — RinoSeller</title>
  <style>${BASE_CSS}</style>
</head>
<body>
  <div class="page">
    <div class="top-bar"></div>

    <div class="header">
      <div>
        <div class="brand">RinoSeller</div>
        <div class="brand-sub">Relatório Financeiro</div>
      </div>
      <div class="doc-meta">
        <div class="doc-title">${data.periodLabel}</div>
        <div class="doc-date">${data.rangeLabel}</div>
      </div>
    </div>

    <div class="section-title">Resumo do período</div>
    <div class="cards">
      <div class="card">
        <div class="card-label">Faturamento</div>
        <div class="card-value accent">${formatBRL(data.faturamento)}</div>
      </div>
      <div class="card">
        <div class="card-label">Contas pagas</div>
        <div class="card-value ${data.despesasPagas > 0 ? 'bad' : ''}">${formatBRL(data.despesasPagas)}</div>
      </div>
      <div class="card">
        <div class="card-label">Aportes</div>
        <div class="card-value good">${formatBRL(data.aportes)}</div>
      </div>
      <div class="card">
        <div class="card-label">Retiradas</div>
        <div class="card-value ${data.retiradas > 0 ? 'bad' : ''}">${formatBRL(data.retiradas)}</div>
      </div>
      <div class="card">
        <div class="card-label">Resultado líquido</div>
        <div class="card-value ${resultado >= 0 ? 'good' : 'bad'}">${formatBRL(resultado)}</div>
      </div>
    </div>

    <div class="section-title">Situação atual</div>
    <div class="cards">
      <div class="card">
        <div class="card-label">Capital disponível</div>
        <div class="card-value ${data.capitalDisponivel >= 0 ? 'good' : 'bad'}">${formatBRL(data.capitalDisponivel)}</div>
      </div>
      <div class="card">
        <div class="card-label">Estoque (custo)</div>
        <div class="card-value">${formatBRL(data.estoqueCusto)}</div>
      </div>
      <div class="card">
        <div class="card-label">Estoque (venda)</div>
        <div class="card-value accent">${formatBRL(data.estoqueVenda)}</div>
      </div>
      <div class="card">
        <div class="card-label">A receber</div>
        <div class="card-value ${data.totalAReceber > 0 ? 'bad' : ''}">${formatBRL(data.totalAReceber)}</div>
      </div>
      <div class="card">
        <div class="card-label">Contas pendentes</div>
        <div class="card-value ${data.totalPendente > 0 ? 'bad' : ''}">${formatBRL(data.totalPendente)}</div>
      </div>
    </div>

    <div class="section-title">Contas pagas no período</div>
    ${expenseRows ? `
    <table>
      <thead><tr><th>Descrição</th><th>Fornecedor</th><th>Pagamento</th><th>Pago em</th><th class="r">Valor</th></tr></thead>
      <tbody>${expenseRows}</tbody>
    </table>` : '<p class="empty">Nenhuma conta paga neste período.</p>'}

    <div class="section-title">Movimentações de capital</div>
    ${movementRows ? `
    <table>
      <thead><tr><th>Descrição</th><th class="c">Tipo</th><th>Data</th><th class="r">Valor</th></tr></thead>
      <tbody>${movementRows}</tbody>
    </table>` : '<p class="empty">Nenhuma movimentação de capital neste período.</p>'}

    <div class="footer">
      <span>RinoSeller · gerado em ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
      <span class="footer-accent">RinoSeller</span>
    </div>
  </div>
</body>
</html>`

  const w = window.open('', '_blank', 'width=900,height=700')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 400)
}
