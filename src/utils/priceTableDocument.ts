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
body, div { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; }
.wrap { background:#fff; }
.hero { background:linear-gradient(135deg,#0f172a 0%,#0c2625 60%,#0f4f49 100%); padding:24px 56px 18px; position:relative; overflow:hidden; }
.hero::after { content:''; position:absolute; top:-60px; right:-60px; width:220px; height:220px; border-radius:50%; background:rgba(40,174,164,0.18); }
.hero-eyebrow { color:#6edbd5; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.2em; }
.hero-brand { color:#ffffff; font-size:25px; font-weight:800; letter-spacing:-.01em; margin-top:7px; line-height:1.15; }
.hero-sub { color:#94a3b8; font-size:10px; margin-top:6px; }
.body { padding:14px 56px 4px; }
table { width:100%; border-collapse:collapse; border:1px solid #d7e4e2; }
thead th { color:#64748b; font-size:7.5px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; padding:5px 8px; text-align:left; background:#f3faf9; border:1px solid #d7e4e2; border-bottom:2px solid #0f4f49; }
th.r,td.r { text-align:right; }
tbody td { padding:5px 8px; font-size:8.5px; color:#0f172a; border:1px solid #e2eeec; }
.prod-name { font-weight:600; }
.prod-price { font-weight:800; color:#0f766e; font-size:8.5px; font-variant-numeric:tabular-nums; }
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
      <div class="hero-sub">Atualizada em ${dateLabel}</div>
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

// Envia a tabela direto, sem escolher cliente (igual ao botão de WhatsApp dos pedidos de venda):
// no celular abre o seletor nativo de compartilhamento já com o PDF; no desktop baixa o PDF
// e abre o WhatsApp para o vendedor escolher a conversa e anexar o arquivo.
export async function sharePriceTableWhatsApp(products: Product[], brandLabel: string): Promise<void> {
  const fileName = `tabela-precos-${slug(brandLabel)}.pdf`
  const message  = `Olá! Segue a tabela de preços de ${brandLabel}.`

  let pdfBlob: Blob
  try {
    pdfBlob = await generatePDFBlob(products, brandLabel)
  } catch {
    throw new Error('Não foi possível gerar o PDF.')
  }

  const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' })

  if (
    navigator.share &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [pdfFile] })
  ) {
    try {
      await navigator.share({ title: `Tabela de Preços — ${brandLabel}`, text: message, files: [pdfFile] })
      return
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
  }

  const blobUrl = URL.createObjectURL(pdfBlob)
  const link    = document.createElement('a')
  link.href     = blobUrl
  link.download = fileName
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

// Gera a tabela, baixa o PDF e abre o WhatsApp Web para cada cliente selecionado.
export async function sharePriceTableWhatsAppToMany(products: Product[], brandLabel: string, recipients: Client[]): Promise<void> {
  const pdfBlob = await generatePDFBlob(products, brandLabel)
  const fileName = `tabela-precos-${slug(brandLabel)}.pdf`

  const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' })

  // Mobile: Web Share API com arquivo (deixa o usuário escolher o contato no WhatsApp)
  if (
    navigator.share &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [pdfFile] })
  ) {
    try {
      await navigator.share({
        title: `Tabela de Preços — ${brandLabel}`,
        text: `Segue a tabela de preços de ${brandLabel}.`,
        files: [pdfFile],
      })
      return
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
  }

  // Desktop: baixa o PDF e abre WhatsApp Web por cliente com mensagem pré-preenchida
  const blobUrl = URL.createObjectURL(pdfBlob)
  const link    = document.createElement('a')
  link.href     = blobUrl
  link.download = fileName
  link.click()
  URL.revokeObjectURL(blobUrl)

  recipients.forEach((client, i) => {
    const phone = client.phone?.replace(/\D/g, '') ?? ''
    const msg   = `Olá, ${client.name}! Segue a tabela de preços de ${brandLabel} (arquivo já baixado, é só anexar aqui).`
    const waUrl = phone
      ? `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`
    setTimeout(() => window.open(waUrl, '_blank'), 600 + i * 400)
  })
}
