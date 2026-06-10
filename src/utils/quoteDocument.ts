import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import type { Client, Quote } from '../types'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('pt-BR')
}
function pad(id: string) {
  return id.slice(-6).toUpperCase()
}
function findClient(quote: Quote, clients: Client[]) {
  return clients.find(c => c.id === quote.client_id)
}

// ── CSS compartilhado ─────────────────────────────────────────────────────────

const DOC_CSS = `
* { margin:0; padding:0; box-sizing:border-box; }
body, div { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; font-size:12px; color:#0f172a; background:#fff; }
.wrap { padding:36px 44px; width:794px; background:#fff; }
.top-bar { height:3px; background:#28AEA4; margin:-36px -44px 32px; }
.header { display:flex; align-items:flex-start; justify-content:space-between; padding-bottom:20px; border-bottom:1px solid #e2e8f0; margin-bottom:24px; }
.brand-name { font-size:18px; font-weight:800; letter-spacing:.03em; color:#0f172a; }
.brand-sub { font-size:9px; letter-spacing:.2em; text-transform:uppercase; color:#28AEA4; margin-top:4px; font-weight:600; }
.doc-type { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.16em; color:#94a3b8; text-align:right; }
.doc-number { font-size:20px; font-weight:800; text-align:right; color:#0f172a; margin-top:2px; }
.doc-date { font-size:10px; color:#64748b; margin-top:4px; text-align:right; }
.doc-status { display:inline-block; margin-top:6px; padding:3px 10px; border-radius:99px; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; background:#f0fdf9; color:#0f766e; border:1px solid #99e6e0; float:right; clear:right; }
.section { margin-bottom:20px; }
.section-title { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.18em; color:#94a3b8; margin-bottom:8px; padding-bottom:5px; border-bottom:1px solid #f1f5f9; }
.client-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px 28px; }
.client-grid .full { grid-column:1/-1; }
.field-label { font-size:9px; color:#94a3b8; text-transform:uppercase; letter-spacing:.1em; }
.field-value { font-size:12px; color:#0f172a; font-weight:500; margin-top:2px; }
table { width:100%; border-collapse:collapse; }
thead th { background:#f8fafc; color:#64748b; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; padding:9px 12px; text-align:left; border-top:1px solid #e2e8f0; border-bottom:1px solid #28AEA4; }
th.center,td.center { text-align:center; }
th.right,td.right { text-align:right; }
tbody tr:nth-child(even) td { background:#f8fafc; }
tbody td { padding:9px 12px; font-size:11px; border-bottom:1px solid #f1f5f9; color:#0f172a; }
tbody tr:last-child td { border-bottom:none; }
.totals { display:flex; justify-content:flex-end; margin-top:6px; }
.totals-box { width:240px; }
.totals-row { display:flex; justify-content:space-between; padding:7px 10px; font-size:11px; color:#64748b; }
.totals-row.grand { background:#f0fdf9; color:#0f766e; font-size:14px; font-weight:700; border-radius:8px; margin-top:3px; }
.notes-box { margin-top:16px; padding:12px 14px; background:#f8fafc; border-left:3px solid #28AEA4; font-size:11px; color:#475569; line-height:1.5; border-radius:0 6px 6px 0; }
.footer { margin-top:40px; padding-top:14px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:flex-end; }
.footer-info { font-size:9px; color:#94a3b8; line-height:1.7; }
.footer-accent { color:#28AEA4; font-weight:700; }
.sign-line { width:180px; border-top:1px solid #cbd5e1; margin-bottom:4px; }
.sign-label { font-size:9px; color:#94a3b8; letter-spacing:.08em; text-transform:uppercase; }
`

// ── Conteúdo HTML do documento ────────────────────────────────────────────────

function fmtPayment(quote: Quote): string {
  if (!quote.payment_type) return ''
  if (quote.payment_type === 'Cartão de Crédito') {
    const n = quote.installments ?? 1
    return n <= 1 ? 'Cartão de Crédito à vista' : `Cartão de Crédito ${n}x`
  }
  return quote.payment_type
}

function buildBodyContent(quote: Quote, client?: Client, kind: 'orcamento' | 'pedido' = 'orcamento'): string {
  const quoteNumber = `ORC-${pad(quote.id)}`

  const statusMap: Record<string, string> = {
    'Aguardando Aprovação': 'Aguardando Aprovação',
    'Aprovado':             'Aprovado',
    'Entregue/Faturado':    'Entregue / Faturado',
    'Cancelado':            'Cancelado',
  }

  return `
  <div class="wrap">
    <div class="top-bar"></div>
    <div class="header">
      <div>
        <div class="brand-name">RinoSeller</div>
        <div class="brand-sub">${kind === 'pedido' ? 'Pedido de Venda' : 'Orçamento'}</div>
      </div>
      <div>
        <div class="doc-type">${kind === 'pedido' ? 'Pedido' : 'Orçamento'}</div>
        <div class="doc-number">${quoteNumber}</div>
        <div class="doc-date">${fmtDate(quote.created_at)}</div>
        <div class="doc-status">${statusMap[quote.status] ?? quote.status}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Dados do Cliente</div>
      <div class="client-grid">
        <div>
          <div class="field-label">Nome</div>
          <div class="field-value">${quote.client_name}</div>
        </div>
        ${client?.cpf_cnpj ? `<div><div class="field-label">CPF / CNPJ</div><div class="field-value">${client.cpf_cnpj}</div></div>` : ''}
        ${client?.phone ? `<div><div class="field-label">Telefone / WhatsApp</div><div class="field-value">${client.phone}</div></div>` : ''}
        ${client?.email ? `<div><div class="field-label">E-mail</div><div class="field-value">${client.email}</div></div>` : ''}
        ${client?.address ? `<div class="full"><div class="field-label">Endereço</div><div class="field-value">${client.address}</div></div>` : ''}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Produtos</div>
      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th class="center">Qtd.</th>
            <th class="right">Valor Unit.</th>
            <th class="right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${quote.items.map(i => `
            <tr>
              <td>${i.product_name}</td>
              <td class="center">${i.quantity}</td>
              <td class="right">${fmt(i.unit_price)}</td>
              <td class="right"><strong>${fmt(i.subtotal)}</strong></td>
            </tr>
            ${i.kit_items && i.kit_items.length > 0 ? `
            <tr>
              <td colspan="4" style="padding:0 12px 9px 12px;border-bottom:1px solid #eee;font-size:10px;color:#888;font-style:italic;">
                Kit inclui: ${i.kit_items.map(ki => `${ki.quantity}x ${ki.product_name}`).join(' • ')}
              </td>
            </tr>` : ''}
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="totals">
      <div class="totals-box">
        <div class="totals-row">
          <span>${quote.items.length} ${quote.items.length === 1 ? 'item' : 'itens'}</span>
          <span>${fmt(quote.total)}</span>
        </div>
        ${fmtPayment(quote) ? `<div class="totals-row" style="color:#666;font-size:11px"><span>Pagamento</span><span>${fmtPayment(quote)}</span></div>` : ''}
        <div class="totals-row grand">
          <span>TOTAL</span>
          <span>${fmt(quote.total)}</span>
        </div>
      </div>
    </div>

    ${quote.notes ? `<div class="notes-box"><strong>Observações:</strong> ${quote.notes}</div>` : ''}

    <div class="footer">
      <div class="footer-info">
        RinoSeller · <span class="footer-accent">RinoSeller</span><br>
        Emitido em ${new Date().toLocaleString('pt-BR')}
      </div>
      <div>
        <div class="sign-line"></div>
        <div class="sign-label">Assinatura / Aprovação</div>
      </div>
    </div>
  </div>`
}

// ── Gera PDF como Blob ────────────────────────────────────────────────────────

async function generatePDFBlob(quote: Quote, client?: Client, kind: 'orcamento' | 'pedido' = 'orcamento'): Promise<Blob> {
  const container = document.createElement('div')
  // Renderiza fora da tela (mas totalmente opaco) — opacity:0 faz o html2canvas capturar em branco
  container.style.cssText = 'position:fixed;left:-99999px;top:0;width:794px;background:#fff;pointer-events:none;'

  const styleEl = document.createElement('style')
  styleEl.textContent = DOC_CSS
  container.appendChild(styleEl)

  const bodyDiv = document.createElement('div')
  bodyDiv.innerHTML = buildBodyContent(quote, client, kind)
  container.appendChild(bodyDiv)

  document.body.appendChild(container)

  // Aguarda carregamento de imagens
  await Promise.all(
    Array.from(container.querySelectorAll('img')).map(
      img => img.complete
        ? Promise.resolve()
        : new Promise(r => { img.onload = r; img.onerror = r })
    )
  )

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
    })

    const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pgW     = pdf.internal.pageSize.getWidth()
    const pgH     = pdf.internal.pageSize.getHeight()
    const imgW    = pgW
    const imgH    = (canvas.height * pgW) / canvas.width
    const imgData = canvas.toDataURL('image/png')

    pdf.addImage(imgData, 'PNG', 0, 0, imgW, imgH)

    // Adiciona páginas extras se necessário
    let remaining = imgH - pgH
    let offset    = -pgH
    while (remaining > 0) {
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, offset, imgW, imgH)
      offset    -= pgH
      remaining -= pgH
    }

    return pdf.output('blob')
  } finally {
    document.body.removeChild(container)
  }
}

// ── API pública ───────────────────────────────────────────────────────────────

export async function downloadQuotePDF(quote: Quote, clients: Client[], kind: 'orcamento' | 'pedido' = 'orcamento'): Promise<void> {
  const client   = findClient(quote, clients)
  const prefix   = kind === 'pedido' ? 'PED' : 'ORC'
  const fileName = `${prefix}-${pad(quote.id)}.pdf`

  let pdfBlob: Blob
  try {
    pdfBlob = await generatePDFBlob(quote, client, kind)
  } catch {
    alert('Não foi possível gerar o PDF.')
    return
  }

  const blobUrl = URL.createObjectURL(pdfBlob)
  const link    = document.createElement('a')
  link.href     = blobUrl
  link.download = fileName
  link.click()
  URL.revokeObjectURL(blobUrl)
}

export async function shareQuoteOnWhatsApp(quote: Quote, clients: Client[], kind: 'orcamento' | 'pedido' = 'orcamento'): Promise<void> {
  const client   = findClient(quote, clients)
  const docCode  = kind === 'pedido' ? `PED-${pad(quote.id)}` : `ORC-${pad(quote.id)}`
  const docNoun  = kind === 'pedido' ? 'pedido' : 'orçamento'
  const fileName = `${kind}-${pad(quote.id)}.pdf`

  const greeting = client?.name ? `Olá, *${client.name}*! 👋` : 'Olá! 👋'
  const message  = [
    greeting,
    '',
    `Segue em anexo o ${docNoun} *${docCode}* da RinoSeller.`,
    '',
    `📦 *${quote.items.length} ${quote.items.length === 1 ? 'item' : 'itens'}*`,
    ...quote.items.map(i => `  • ${i.product_name} (${i.quantity}x) — ${fmt(i.subtotal)}`),
    '',
    `💰 *Total: ${fmt(quote.total)}*`,
    ...(quote.notes ? ['', `_Obs: ${quote.notes}_`] : []),
    '',
    'Qualquer dúvida estamos à disposição! 😊',
    '',
    '*RinoSeller*',
  ].join('\n')

  let pdfBlob: Blob
  try {
    pdfBlob = await generatePDFBlob(quote, client, kind)
  } catch {
    alert('Não foi possível gerar o PDF. Tente usar o botão Gerar PDF.')
    return
  }

  const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' })

  // Mobile: Web Share API com arquivo
  if (
    navigator.share &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [pdfFile] })
  ) {
    try {
      await navigator.share({
        title: `${kind === 'pedido' ? 'Pedido' : 'Orçamento'} ${docCode} — RinoSeller`,
        text: message,
        files: [pdfFile],
      })
      return
    } catch (e) {
      if ((e as Error).name === 'AbortError') return // usuário cancelou
    }
  }

  // Desktop fallback: baixa o PDF + abre WhatsApp com a mensagem
  const blobUrl = URL.createObjectURL(pdfBlob)
  const link    = document.createElement('a')
  link.href     = blobUrl
  link.download = fileName
  link.click()
  URL.revokeObjectURL(blobUrl)

  const phone = client?.phone?.replace(/\D/g, '') ?? ''
  const waUrl = phone
    ? `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`

  setTimeout(() => {
    window.open(waUrl, '_blank')
  }, 600)
}
