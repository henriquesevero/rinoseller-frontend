import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import type { Client, Quote } from '../types'
import { sendQuoteEmail } from '../api/client'

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
// `buildCss(scale)` gera o CSS com as folgas verticais (padding/margin) e o
// tamanho das linhas da tabela multiplicados por `scale`. Em `scale=1` já é um
// layout compacto (mais produtos cabem por página); quando o conteúdo transborda
// a 1ª página por pouco, `generatePDFBlob` tenta escalas menores para evitar que
// a 2ª página fique só com o bloco de assinatura.

function buildCss(scale = 1): string {
  const s = (n: number) => (n * scale).toFixed(2)
  return `
* { margin:0; padding:0; box-sizing:border-box; }
body, div { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; font-size:${s(12)}px; color:#0f172a; background:#fff; }
.wrap { padding:${s(30)}px ${s(40)}px; background:#fff; }
.top-bar { height:3px; background:#28AEA4; margin:-${s(30)}px -${s(40)}px ${s(22)}px; }
.header { display:flex; align-items:flex-start; justify-content:space-between; padding-bottom:${s(14)}px; border-bottom:1px solid #e2e8f0; margin-bottom:${s(16)}px; }
.brand-name { font-size:${s(18)}px; font-weight:800; letter-spacing:.03em; color:#0f172a; }
.brand-sub { font-size:${s(9)}px; letter-spacing:.2em; text-transform:uppercase; color:#28AEA4; margin-top:${s(4)}px; font-weight:600; }
.doc-type { font-size:${s(10)}px; font-weight:700; text-transform:uppercase; letter-spacing:.16em; color:#94a3b8; text-align:right; }
.doc-number { font-size:${s(20)}px; font-weight:800; text-align:right; color:#0f172a; margin-top:${s(2)}px; }
.doc-date { font-size:${s(10)}px; color:#64748b; margin-top:${s(4)}px; text-align:right; }
.doc-status { display:inline-block; margin-top:${s(6)}px; padding:${s(3)}px ${s(10)}px; border-radius:99px; font-size:${s(9)}px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; background:#f0fdf9; color:#0f766e; border:1px solid #99e6e0; float:right; clear:right; }
.section { margin-bottom:${s(14)}px; }
.section-title { font-size:${s(9)}px; font-weight:700; text-transform:uppercase; letter-spacing:.18em; color:#94a3b8; margin-bottom:${s(6)}px; padding-bottom:${s(4)}px; border-bottom:1px solid #f1f5f9; }
.client-grid { display:grid; grid-template-columns:1fr 1fr; gap:${s(6)}px ${s(28)}px; }
.client-grid .full { grid-column:1/-1; }
.field-label { font-size:${s(9)}px; color:#94a3b8; text-transform:uppercase; letter-spacing:.1em; }
.field-value { font-size:${s(12)}px; color:#0f172a; font-weight:500; margin-top:${s(2)}px; }
table { width:100%; border-collapse:collapse; border:1px solid #e2e8f0; }
thead th { background:#f8fafc; color:#64748b; font-size:${s(9)}px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; padding:${s(6)}px ${s(10)}px; text-align:left; border:1px solid #e2e8f0; border-bottom:1px solid #28AEA4; }
th.center,td.center { text-align:center; }
th.right,td.right { text-align:right; }
tbody tr:nth-child(even) td { background:#f8fafc; }
tbody td { padding:${s(5)}px ${s(10)}px; font-size:${s(10.5)}px; border:1px solid #e2e8f0; color:#0f172a; }
.kit-row td { padding:0 ${s(10)}px ${s(5)}px ${s(10)}px; border:1px solid #e2e8f0; border-top:none; font-size:${s(9.5)}px; color:#888; font-style:italic; }
.totals { display:flex; justify-content:flex-end; margin-top:${s(4)}px; }
.totals-box { width:240px; }
.totals-row { display:flex; justify-content:space-between; padding:${s(5)}px ${s(10)}px; font-size:${s(11)}px; color:#64748b; }
.totals-row.grand { background:#f0fdf9; color:#0f766e; font-size:${s(14)}px; font-weight:700; border-radius:8px; margin-top:${s(3)}px; }
.notes-box { margin-top:${s(10)}px; padding:${s(9)}px ${s(12)}px; background:#f8fafc; border-left:3px solid #28AEA4; font-size:${s(11)}px; color:#475569; line-height:1.5; border-radius:0 6px 6px 0; }
.footer { margin-top:${s(20)}px; padding-top:${s(10)}px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:flex-end; }
.footer-info { font-size:${s(9)}px; color:#94a3b8; line-height:1.7; }
.footer-accent { color:#28AEA4; font-weight:700; }
.sign-line { width:180px; border-top:1px solid #cbd5e1; margin-bottom:${s(4)}px; }
.sign-label { font-size:${s(9)}px; color:#94a3b8; letter-spacing:.08em; text-transform:uppercase; }
`
}

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
            <tr class="kit-row">
              <td colspan="4">
                Kit inclui: ${i.kit_items.map(ki => `${ki.quantity}x ${ki.product_name}`).join(' • ')}
              </td>
            </tr>` : ''}
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="totals">
      <div class="totals-box">
        ${(() => {
          const subtotal = quote.items.reduce((s, i) => s + i.subtotal, 0)
          const hasDiscount = quote.discount_type && quote.discount_value > 0
          const discAmt = hasDiscount
            ? (quote.discount_type === '%'
                ? subtotal * quote.discount_value / 100
                : Math.min(quote.discount_value, subtotal))
            : 0
          const discLabel = hasDiscount
            ? `Desconto (${quote.discount_type === '%' ? `${quote.discount_value}%` : fmt(quote.discount_value)})`
            : ''
          return `
            ${hasDiscount ? `<div class="totals-row"><span>Subtotal (${quote.items.length} ${quote.items.length === 1 ? 'item' : 'itens'})</span><span>${fmt(subtotal)}</span></div>` : `<div class="totals-row"><span>${quote.items.length} ${quote.items.length === 1 ? 'item' : 'itens'}</span><span>${fmt(subtotal)}</span></div>`}
            ${hasDiscount ? `<div class="totals-row" style="color:#d97706"><span>${discLabel}</span><span>− ${fmt(discAmt)}</span></div>` : ''}
            ${fmtPayment(quote) ? `<div class="totals-row" style="color:#666;font-size:11px"><span>Pagamento</span><span>${fmtPayment(quote)}</span></div>` : ''}
            <div class="totals-row grand"><span>TOTAL</span><span>${fmt(quote.total)}</span></div>
          `
        })()}
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
// Pagina cortando apenas entre linhas da tabela ou entre blocos do documento
// (nunca no meio de um texto), capturando cada página separadamente em vez de
// fatiar uma única imagem por altura fixa.

const CONTAINER_WIDTH = 794
const A4_RATIO = 297 / 210 // altura/largura — mesma proporção em px

async function generatePDFBlob(quote: Quote, client?: Client, kind: 'orcamento' | 'pedido' = 'orcamento'): Promise<Blob> {
  const container = document.createElement('div')
  // Renderiza fora da tela (mas totalmente opaco) — opacity:0 faz o html2canvas capturar em branco
  container.style.cssText = `position:fixed;left:-99999px;top:0;width:${CONTAINER_WIDTH}px;background:#fff;pointer-events:none;`

  const styleEl = document.createElement('style')
  styleEl.textContent = buildCss(1)
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
    const pageHeightPx = CONTAINER_WIDTH * A4_RATIO

    // Se o conteúdo transborda a 1ª página só por uma margem pequena (o caso
    // clássico em que a tabela cabe mas o bloco de totais/assinatura empurra
    // uns milímetros a mais), comprime as folgas progressivamente até caber
    // tudo numa única página — evita uma 2ª página quase vazia só com a
    // assinatura. Se o excesso for grande (muitos itens de verdade), mantém o
    // layout normal e deixa paginar mesmo — aí a 2ª página vem com conteúdo real.
    if (container.scrollHeight > pageHeightPx && container.scrollHeight <= pageHeightPx * 1.3) {
      for (const scale of [0.95, 0.9, 0.85, 0.8]) {
        styleEl.textContent = buildCss(scale)
        if (container.scrollHeight <= pageHeightPx) break
      }
    }

    const totalHeight  = container.scrollHeight
    const containerTop = container.getBoundingClientRect().top

    // Pontos seguros para cortar: o topo de cada linha da tabela e de cada
    // bloco principal do documento (cabeçalho, seções, totais, rodapé etc.).
    const blockTops = Array.from(container.querySelectorAll('.wrap > *, tbody tr'))
      .map(el => el.getBoundingClientRect().top - containerTop)
      .filter(y => y > 0)
    const safeBreaks = [...new Set([...blockTops, totalHeight])].sort((a, b) => a - b)

    const slices: { top: number; height: number }[] = []
    let cursor = 0
    while (cursor < totalHeight - 1) {
      const limit = cursor + pageHeightPx
      const candidates = safeBreaks.filter(y => y > cursor && y <= limit)
      const end = candidates.length > 0 ? Math.max(...candidates) : Math.min(limit, totalHeight)
      slices.push({ top: cursor, height: end - cursor })
      cursor = end
    }

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
    const pgW = pdf.internal.pageSize.getWidth()

    for (let i = 0; i < slices.length; i++) {
      const { top, height } = slices[i]
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: top,
        width: CONTAINER_WIDTH,
        height,
      })
      const imgData = canvas.toDataURL('image/jpeg', 0.9)
      const imgH = (canvas.height * pgW) / canvas.width

      if (i > 0) pdf.addPage()
      pdf.addImage(imgData, 'JPEG', 0, 0, pgW, imgH)
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

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export async function sendQuoteByEmail(quote: Quote, clients: Client[], kind: 'orcamento' | 'pedido' = 'orcamento'): Promise<void> {
  const client = findClient(quote, clients)
  if (!client?.email) {
    throw new Error('Este cliente não tem e-mail cadastrado.')
  }

  const pdfBlob = await generatePDFBlob(quote, client, kind)
  const pdfBase64 = await blobToBase64(pdfBlob)
  await sendQuoteEmail(quote.id, kind, pdfBase64)
}

export async function shareQuoteOnWhatsApp(quote: Quote, clients: Client[], kind: 'orcamento' | 'pedido' = 'orcamento'): Promise<void> {
  const client   = findClient(quote, clients)
  const docCode  = kind === 'pedido' ? `PED-${pad(quote.id)}` : `ORC-${pad(quote.id)}`
  const docNoun  = kind === 'pedido' ? 'pedido' : 'orçamento'
  const fileName = `${kind}-${pad(quote.id)}.pdf`

  const greeting = client?.name ? `Olá, ${client.name}!` : 'Olá!'
  const message  = `${greeting} Segue o seu ${docNoun}.`

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
