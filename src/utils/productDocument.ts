import type { Product } from '../types'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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
.card-value.accent { color:#28AEA4; }
table { width:100%; border-collapse:collapse; }
thead th { background:#f8fafc; color:#64748b; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; padding:8px 10px; border-top:1px solid #e2e8f0; border-bottom:1px solid #28AEA4; text-align:left; }
th.r,td.r { text-align:right; }
th.c,td.c { text-align:center; }
tbody td { padding:7px 10px; font-size:11px; border-bottom:1px solid #f1f5f9; }
tbody tr:nth-child(even) td { background:#f8fafc; }
tbody tr:last-child td { border-bottom:none; }
tfoot td { padding:8px 10px; font-weight:700; border-top:2px solid #28AEA4; font-size:11px; }
.code { color:#94a3b8; font-family:monospace; font-size:10px; }
.muted { color:#94a3b8; }
.num { font-variant-numeric:tabular-nums; }
.low { color:#d97706; font-weight:700; }
.zero { color:#dc2626; font-weight:700; }
.footer { margin-top:36px; padding-top:12px; border-top:1px solid #e2e8f0; font-size:9px; color:#94a3b8; display:flex; justify-content:space-between; }
.footer-accent { color:#28AEA4; font-weight:700; }
@media print { body { padding:0; } @page { margin:10mm; size:A4; } }
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

export function exportProductsPDF(products: Product[]) {
  const sorted = [...products].sort((a, b) => {
    const ca = parseInt(a.code ?? '0', 10) || 0
    const cb = parseInt(b.code ?? '0', 10) || 0
    if (ca !== cb) return ca - cb
    return a.name.localeCompare(b.name)
  })

  const totalProducts = sorted.length
  const lowStock      = sorted.filter(p => !p.is_kit && p.stock_quantity > 0 && p.stock_quantity <= 3).length
  const zeroStock     = sorted.filter(p => !p.is_kit && p.stock_quantity === 0).length

  const rows = sorted.map(p => {
    const stockClass = p.is_kit ? '' : p.stock_quantity === 0 ? 'zero' : p.stock_quantity <= 3 ? 'low' : ''
    const stockCell  = p.is_kit ? 'Kit' : String(p.stock_quantity)
    return `
      <tr>
        <td class="code">${p.code ?? ''}</td>
        <td>${p.name}</td>
        <td class="muted">${p.category}</td>
        <td class="r num">${formatBRL(p.price)}</td>
        <td class="r num muted">${formatBRL(p.cost_price)}</td>
        <td class="c num ${stockClass}">${stockCell}</td>
      </tr>
    `
  }).join('')

  const body = `
    <div class="header">
      <div>
        <div class="brand">RinoSeller</div>
        <div class="brand-sub">Catálogo de Produtos</div>
      </div>
      <div class="doc-meta">
        <div class="doc-title">Produtos</div>
        <div class="doc-date">${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
      </div>
    </div>

    <div class="cards">
      <div class="card">
        <div class="card-label">Total de produtos</div>
        <div class="card-value">${totalProducts}</div>
      </div>
      <div class="card">
        <div class="card-label">Estoque baixo</div>
        <div class="card-value" style="color:#d97706">${lowStock}</div>
      </div>
      <div class="card">
        <div class="card-label">Zerados</div>
        <div class="card-value" style="color:#dc2626">${zeroStock}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Cód.</th><th>Nome</th><th>Categoria</th>
          <th class="r">Preço venda</th><th class="r">Custo</th><th class="c">Estoque</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `

  openPrint('Catálogo de Produtos — RinoSeller', body)
}

export function exportStockValuationPDF(products: Product[], focus: 'custo' | 'venda' | 'ambos' = 'ambos') {
  const sorted = [...products]
    .filter(p => p.stock_quantity > 0)
    .sort((a, b) => {
      const ca = parseInt(a.code ?? '0', 10) || 0
      const cb = parseInt(b.code ?? '0', 10) || 0
      if (ca !== cb) return ca - cb
      return a.name.localeCompare(b.name)
    })

  const totalUnidades = sorted.reduce((s, p) => s + p.stock_quantity, 0)
  const totalCusto    = sorted.reduce((s, p) => s + p.stock_quantity * p.cost_price, 0)
  const totalVenda    = sorted.reduce((s, p) => s + p.stock_quantity * p.price, 0)
  const margem        = totalVenda - totalCusto

  const titles: Record<'custo' | 'venda' | 'ambos', string> = {
    custo: 'Estoque — Valor de Custo',
    venda: 'Estoque — Valor de Venda',
    ambos: 'Estoque — Custo e Venda',
  }

  const rows = sorted.map(p => `
    <tr>
      <td class="code">${p.code ?? ''}</td>
      <td>${p.name}</td>
      <td class="c num">${p.stock_quantity}</td>
      <td class="r num muted">${formatBRL(p.cost_price)}</td>
      <td class="r num">${formatBRL(p.price)}</td>
      <td class="r num muted">${formatBRL(p.stock_quantity * p.cost_price)}</td>
      <td class="r num">${formatBRL(p.stock_quantity * p.price)}</td>
    </tr>
  `).join('')

  const body = `
    <div class="header">
      <div>
        <div class="brand">RinoSeller</div>
        <div class="brand-sub">${titles[focus]}</div>
      </div>
      <div class="doc-meta">
        <div class="doc-title">Inventário</div>
        <div class="doc-date">${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
      </div>
    </div>

    <div class="cards">
      <div class="card">
        <div class="card-label">Produtos em estoque</div>
        <div class="card-value">${sorted.length}</div>
      </div>
      <div class="card">
        <div class="card-label">Total de unidades</div>
        <div class="card-value accent">${totalUnidades}</div>
      </div>
      <div class="card">
        <div class="card-label">Valor de custo</div>
        <div class="card-value">${formatBRL(totalCusto)}</div>
      </div>
      <div class="card">
        <div class="card-label">Valor de venda</div>
        <div class="card-value accent">${formatBRL(totalVenda)}</div>
      </div>
      <div class="card">
        <div class="card-label">Margem potencial</div>
        <div class="card-value" style="color:#059669">${formatBRL(margem)}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Cód.</th><th>Nome</th>
          <th class="c">Qtd.</th>
          <th class="r">Custo unit.</th><th class="r">Venda unit.</th>
          <th class="r">Custo total</th><th class="r">Venda total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="5">Totais</td>
          <td class="r num">${formatBRL(totalCusto)}</td>
          <td class="r num">${formatBRL(totalVenda)}</td>
        </tr>
      </tfoot>
    </table>
  `

  openPrint(`${titles[focus]} — RinoSeller`, body)
}
