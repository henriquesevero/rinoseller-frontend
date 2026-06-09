import type { Client, ClientPayment, Order, Quote } from '../types'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('pt-BR')
}

const STATUS_LABEL: Record<string, string> = {
  'Aguardando Aprovação': 'Aguardando Aprovação',
  'Aprovado':             'Aprovado',
  'Faturado':             'Faturado',
  'Entregue':             'Entregue',
  'Cancelado':            'Cancelado',
  'Entregue/Faturado':    'Entregue/Faturado',
  'Faturado Gradual':     'Faturado Gradual',
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
.cards { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:20px; }
.card { flex:1; min-width:110px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; }
.card-label { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.12em; color:#94a3b8; margin-bottom:3px; }
.card-value { font-size:15px; font-weight:700; color:#0f172a; }
.card-value.good { color:#059669; }
.card-value.bad { color:#dc2626; }
.card-value.accent { color:#28AEA4; }
.section-title { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.16em; color:#94a3b8; margin:22px 0 8px; padding-bottom:6px; border-bottom:1px solid #f1f5f9; }
.info-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px 28px; margin-bottom:20px; }
.info-grid .full { grid-column:1/-1; }
.field-label { font-size:9px; text-transform:uppercase; letter-spacing:.1em; color:#94a3b8; }
.field-value { font-size:12px; color:#0f172a; font-weight:500; margin-top:2px; }
table { width:100%; border-collapse:collapse; margin-bottom:4px; }
thead th { background:#f8fafc; color:#64748b; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; padding:8px 10px; border-top:1px solid #e2e8f0; border-bottom:1px solid #28AEA4; text-align:left; }
th.r,td.r { text-align:right; }
th.c,td.c { text-align:center; }
tbody td { padding:7px 10px; font-size:11px; border-bottom:1px solid #f1f5f9; }
tbody tr:nth-child(even) td { background:#f8fafc; }
tbody tr:last-child td { border-bottom:none; }
.code { color:#94a3b8; font-family:monospace; font-size:10px; }
.muted { color:#94a3b8; }
.num { font-variant-numeric:tabular-nums; }
.credit { color:#059669; font-weight:700; }
.debt { color:#dc2626; font-weight:700; }
.ok { color:#059669; font-weight:600; }
.badge { display:inline-block; padding:2px 8px; border-radius:99px; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; border:1px solid; }
.badge-ok { background:#f0fdf4; color:#059669; border-color:#bbf7d0; }
.badge-bad { background:#fef2f2; color:#dc2626; border-color:#fecaca; }
.empty { color:#94a3b8; font-style:italic; padding:10px 0; }
.footer { margin-top:36px; padding-top:12px; border-top:1px solid #e2e8f0; font-size:9px; color:#94a3b8; display:flex; justify-content:space-between; }
.footer-accent { color:#28AEA4; font-weight:700; }
@media print { body { padding:0; } @page { margin:10mm; size:A4; } h2,h3 { page-break-after:avoid; } table { page-break-inside:auto; } tr { page-break-inside:avoid; } }
`

function openPrint(title: string, body: string) {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <style>${BASE_CSS}</style>
</head>
<body>
  <div class="page">
    <div class="top-bar"></div>
    ${body}
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

export function exportClientsPDF(clients: Client[]) {
  const sorted       = [...clients].sort((a, b) => a.name.localeCompare(b.name))
  const totalDebt    = sorted.reduce((s, c) => s + c.debt, 0)
  const countDebt    = sorted.filter(c => c.debt > 0).length
  const countOk      = sorted.filter(c => c.debt <= 0).length

  const rows = sorted.map(c => `
    <tr>
      <td>${c.name}</td>
      <td class="muted">${c.phone || '—'}</td>
      <td class="muted">${c.email || '—'}</td>
      <td class="r num ${c.debt > 0 ? 'debt' : 'ok'}">${c.debt > 0 ? formatBRL(c.debt) : 'Em dia'}</td>
      <td class="r num muted">${c.debt_limit > 0 ? formatBRL(c.debt_limit) : '—'}</td>
    </tr>
  `).join('')

  const body = `
    <div class="header">
      <div>
        <div class="brand">RinoSeller</div>
        <div class="brand-sub">Relatório de Clientes</div>
      </div>
      <div class="doc-meta">
        <div class="doc-title">Clientes</div>
        <div class="doc-date">${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
      </div>
    </div>

    <div class="cards">
      <div class="card">
        <div class="card-label">Total</div>
        <div class="card-value">${sorted.length}</div>
      </div>
      <div class="card">
        <div class="card-label">Em dia</div>
        <div class="card-value good">${countOk}</div>
      </div>
      <div class="card">
        <div class="card-label">Com dívida</div>
        <div class="card-value bad">${countDebt}</div>
      </div>
      <div class="card">
        <div class="card-label">Total em aberto</div>
        <div class="card-value bad">${formatBRL(totalDebt)}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Nome</th><th>Telefone</th><th>E-mail</th>
          <th class="r">Situação</th><th class="r">Limite</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `

  openPrint('Clientes — RinoSeller', body)
}

export function exportClientReportPDF(client: Client, orders: Order[], quotes: Quote[], payments: ClientPayment[]) {
  const quotesDesc = [...quotes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const ordersDesc = [...orders].reverse()
  const paymentsDesc = [...payments].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const paymentRows = paymentsDesc.map(p => `
    <tr>
      <td>${fmtDate(p.created_at)}</td>
      <td class="muted">${p.notes || '—'}</td>
      <td class="r num credit">+ ${formatBRL(p.amount)}</td>
    </tr>
  `).join('')

  const quoteRows = quotesDesc.map(q => `
    <tr>
      <td class="code">ORC-${q.id.slice(-6).toUpperCase()}</td>
      <td>${fmtDate(q.created_at)}</td>
      <td>${STATUS_LABEL[q.status] ?? q.status}</td>
      <td class="muted">${q.payment_type || '—'}</td>
      <td class="r num">${formatBRL(q.total)}</td>
    </tr>
  `).join('')

  const orderRows = ordersDesc.map(o => `
    <tr>
      <td class="code">${o.id.slice(-6).toUpperCase()}</td>
      <td>${fmtDate(o.created_at)}</td>
      <td class="muted">${o.status}</td>
      <td class="r num">${formatBRL(o.total)}</td>
    </tr>
  `).join('')

  const body = `
    <div class="header">
      <div>
        <div class="brand">RinoSeller</div>
        <div class="brand-sub">Relatório do Cliente</div>
      </div>
      <div class="doc-meta">
        <div class="doc-title">Extrato individual</div>
        <div class="doc-date">${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
      </div>
    </div>

    <div class="info-grid">
      <div><div class="field-label">Nome</div><div class="field-value">${client.name}</div></div>
      ${client.phone    ? `<div><div class="field-label">Telefone</div><div class="field-value">${client.phone}</div></div>` : ''}
      ${client.email    ? `<div><div class="field-label">E-mail</div><div class="field-value">${client.email}</div></div>` : ''}
      ${client.cpf_cnpj ? `<div><div class="field-label">CPF / CNPJ</div><div class="field-value">${client.cpf_cnpj}</div></div>` : ''}
      ${client.address  ? `<div class="full"><div class="field-label">Endereço</div><div class="field-value">${client.address}</div></div>` : ''}
      <div><div class="field-label">Cliente desde</div><div class="field-value">${fmtDate(client.created_at)}</div></div>
      <div>
        <div class="field-label">Situação financeira</div>
        <div class="field-value ${client.debt > 0 ? 'debt' : 'ok'}">${client.debt > 0 ? 'Devendo ' + formatBRL(client.debt) : 'Em dia'}</div>
      </div>
    </div>

    <div class="section-title">Pedidos de venda (${quotesDesc.length})</div>
    ${quotesDesc.length === 0 ? '<p class="empty">Nenhum pedido registrado.</p>' : `
    <table>
      <thead><tr><th>Cód.</th><th>Data</th><th>Status</th><th>Pagamento</th><th class="r">Valor</th></tr></thead>
      <tbody>${quoteRows}</tbody>
    </table>`}

    ${ordersDesc.length > 0 ? `
    <div class="section-title">Pedidos do catálogo (${ordersDesc.length})</div>
    <table>
      <thead><tr><th>Cód.</th><th>Data</th><th>Status</th><th class="r">Valor</th></tr></thead>
      <tbody>${orderRows}</tbody>
    </table>` : ''}

    <div class="section-title">Histórico de recebimentos (${payments.length})</div>
    ${payments.length === 0 ? '<p class="empty">Nenhum recebimento registrado.</p>' : `
    <table>
      <thead><tr><th>Data</th><th>Observações</th><th class="r">Valor</th></tr></thead>
      <tbody>${paymentRows}</tbody>
    </table>`}
  `

  openPrint(`Relatório — ${client.name}`, body)
}
