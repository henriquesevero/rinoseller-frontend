import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import type { Client, Product } from '../types'
import { sendDocumentEmail } from '../api/client'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ── CSS ───────────────────────────────────────────────────────────────────────

const DOC_CSS = `
* { margin:0; padding:0; box-sizing:border-box; }
body, div { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; background:#fff; }
.wrap { background:#fff; }
.hero { background:linear-gradient(135deg,#0f172a 0%,#0c2625 60%,#0f4f49 100%); padding:36px 56px 26px; position:relative; overflow:hidden; }
.hero::after { content:''; position:absolute; top:-60px; right:-60px; width:220px; height:220px; border-radius:50%; background:rgba(40,174,164,0.18); }
.hero-eyebrow { color:#6edbd5; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.2em; }
.hero-brand { color:#ffffff; font-size:25px; font-weight:800; letter-spacing:-.01em; margin-top:7px; line-height:1.15; }
.hero-sub { color:#94a3b8; font-size:10px; margin-top:6px; }
.hero-count { display:inline-block; margin-top:12px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.14); color:#e2e8f0; font-size:10px; font-weight:600; padding:5px 12px; border-radius:99px; }
.body { padding:18px 56px 4px; }
table { width:100%; border-collapse:collapse; }
thead th { color:#94a3b8; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.12em; padding:0 0 7px; text-align:left; border-bottom:2px solid #0f4f49; }
th.r,td.r { text-align:right; }
tbody td { padding:6.5px 0; font-size:11px; color:#0f172a; border-bottom:1px solid #f1f5f9; }
tbody tr:last-child td { border-bottom:none; }
.prod-name { font-weight:600; }
.prod-price { font-weight:800; color:#0f766e; font-size:11.5px; font-variant-numeric:tabular-nums; }
.footer { margin:14px 56px 0; padding:12px 0 20px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; }
.footer-brand { font-size:12px; font-weight:800; color:#0f172a; }
.footer-note { font-size:9px; color:#94a3b8; margin-top:2px; }
.footer-tag { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:#28AEA4; }
`

// ── Conteúdo ──────────────────────────────────────────────────────────────────

function buildBodyContent(products: Product[], brandLabel: string): string {
  const sorted = [...products].sort((a, b) => a.name.localeCompare(b.name))
  const dateLabel = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  const rows = sorted.map(p => `
    <tr>
      <td class="prod-name">${p.name}</td>
      <td class="r prod-price">${fmt(p.price)}</td>
    </tr>
  `).join('')

  return `
  <div class="wrap">
    <div class="hero">
      <div class="hero-eyebrow">Tabela de Preços</div>
      <div class="hero-brand">${brandLabel}</div>
      <div class="hero-sub">Atualizada em ${dateLabel} · valores finais, prontos para venda</div>
      <div class="hero-count">${sorted.length} ${sorted.length === 1 ? 'produto' : 'produtos'}</div>
    </div>
    <div class="body">
      <table>
        <thead>
          <tr><th>Produto</th><th class="r">Preço</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="footer">
      <div>
        <div class="footer-brand">RinoSeller</div>
        <div class="footer-note">Tabela gerada especialmente para você</div>
      </div>
      <div class="footer-tag">Fale com a gente</div>
    </div>
  </div>`
}

// ── Gera PDF como Blob ────────────────────────────────────────────────────────
// Pagina cortando apenas entre linhas da tabela (nunca no meio de uma linha ou
// do cabeçalho), capturando cada página separadamente em vez de fatiar uma
// única imagem por altura fixa.

const CONTAINER_WIDTH = 794
const A4_RATIO = 297 / 210 // altura/largura — mesma proporção em px

async function generatePDFBlob(products: Product[], brandLabel: string): Promise<Blob> {
  const container = document.createElement('div')
  container.style.cssText = `position:fixed;left:-99999px;top:0;width:${CONTAINER_WIDTH}px;background:#fff;pointer-events:none;`

  const styleEl = document.createElement('style')
  styleEl.textContent = DOC_CSS
  container.appendChild(styleEl)

  const bodyDiv = document.createElement('div')
  bodyDiv.innerHTML = buildBodyContent(products, brandLabel)
  container.appendChild(bodyDiv)

  document.body.appendChild(container)

  try {
    const pageHeightPx = CONTAINER_WIDTH * A4_RATIO
    const totalHeight  = container.scrollHeight
    const containerTop = container.getBoundingClientRect().top

    // Pontos seguros para cortar: o topo de cada linha da tabela, e o fim do documento.
    const rowTops = Array.from(container.querySelectorAll('tbody tr'))
      .map(tr => tr.getBoundingClientRect().top - containerTop)
      .filter(y => y > 0)
    const safeBreaks = [...rowTops, totalHeight]

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

function slug(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// ── API pública ───────────────────────────────────────────────────────────────

export async function downloadPriceTablePDF(products: Product[], brandLabel: string): Promise<void> {
  const pdfBlob = await generatePDFBlob(products, brandLabel)
  const blobUrl = URL.createObjectURL(pdfBlob)
  const link    = document.createElement('a')
  link.href     = blobUrl
  link.download = `tabela-precos-${slug(brandLabel)}.pdf`
  link.click()
  URL.revokeObjectURL(blobUrl)
}

export interface SendResult { ok: Client[]; failed: { client: Client; error: string }[] }

// Envia a mesma tabela (gerada uma única vez) por e-mail para vários clientes.
export async function sendPriceTableEmailToMany(products: Product[], brandLabel: string, recipients: Client[]): Promise<SendResult> {
  const pdfBlob   = await generatePDFBlob(products, brandLabel)
  const pdfBase64 = await blobToBase64(pdfBlob)
  const filename  = `tabela-precos-${slug(brandLabel)}.pdf`
  const subject   = `Tabela de Preços — ${brandLabel}`
  const message   = `Segue em anexo nossa tabela de preços atualizada de ${brandLabel}. Qualquer dúvida, estamos à disposição!`

  const result: SendResult = { ok: [], failed: [] }
  for (const client of recipients) {
    try {
      await sendDocumentEmail(client.id, { subject, message, filename, pdf_base64: pdfBase64 })
      result.ok.push(client)
    } catch (e) {
      result.failed.push({ client, error: e instanceof Error ? e.message : 'erro desconhecido' })
    }
  }
  return result
}

// Gera a tabela uma única vez, baixa o arquivo e abre uma conversa de WhatsApp por cliente
// (o vendedor anexa o PDF já baixado em cada conversa).
export async function sharePriceTableWhatsAppToMany(products: Product[], brandLabel: string, recipients: Client[]): Promise<void> {
  const pdfBlob = await generatePDFBlob(products, brandLabel)
  const fileName = `tabela-precos-${slug(brandLabel)}.pdf`

  const blobUrl = URL.createObjectURL(pdfBlob)
  const link    = document.createElement('a')
  link.href     = blobUrl
  link.download = fileName
  link.click()
  URL.revokeObjectURL(blobUrl)

  recipients.forEach((client, i) => {
    const message = `Olá, ${client.name}! Segue a tabela de preços de ${brandLabel} (arquivo já baixado, só anexar aqui).`
    const phone = client.phone?.replace(/\D/g, '') ?? ''
    const waUrl = phone
      ? `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`
    setTimeout(() => window.open(waUrl, '_blank'), 600 + i * 300)
  })
}
