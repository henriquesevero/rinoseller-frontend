import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import type { Client } from '../types'

function fmtDate(s: Date) {
  return s.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

const DOC_CSS = `
* { margin:0; padding:0; box-sizing:border-box; }
body, div { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; font-size:12px; color:#0f172a; background:#fff; }
.wrap { padding:36px 44px; background:#fff; }
.top-bar { height:3px; background:#28AEA4; margin:-36px -44px 32px; }
.header { display:flex; align-items:flex-start; justify-content:space-between; padding-bottom:20px; border-bottom:1px solid #e2e8f0; margin-bottom:24px; }
.brand-name { font-size:18px; font-weight:800; letter-spacing:.03em; color:#0f172a; }
.brand-sub { font-size:9px; letter-spacing:.2em; text-transform:uppercase; color:#28AEA4; margin-top:4px; font-weight:600; }
.doc-type { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.16em; color:#94a3b8; text-align:right; }
.doc-date { font-size:10px; color:#64748b; margin-top:4px; text-align:right; }
.title { text-align:center; font-size:15px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; margin-bottom:24px; color:#0f172a; }
.section { margin-bottom:18px; }
.section-title { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.18em; color:#94a3b8; margin-bottom:8px; padding-bottom:5px; border-bottom:1px solid #f1f5f9; }
.parties-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px 28px; }
.field-label { font-size:9px; color:#94a3b8; text-transform:uppercase; letter-spacing:.1em; }
.field-value { font-size:12px; color:#0f172a; font-weight:500; margin-top:2px; }
.clause { margin-bottom:14px; }
.clause-title { font-size:11px; font-weight:700; color:#0f172a; margin-bottom:4px; }
.clause-text { font-size:11.5px; line-height:1.6; color:#334155; text-align:justify; }
.highlight { margin-top:16px; padding:12px 14px; background:#fff7ed; border-left:3px solid #ea580c; font-size:11.5px; color:#7c2d12; line-height:1.6; border-radius:0 6px 6px 0; font-weight:600; }
.signatures { margin-top:56px; display:flex; justify-content:space-between; gap:40px; }
.sign-block { flex:1; text-align:center; }
.sign-line { border-top:1px solid #cbd5e1; margin-bottom:6px; }
.sign-name { font-size:11px; font-weight:600; color:#0f172a; }
.sign-label { font-size:9px; color:#94a3b8; letter-spacing:.08em; text-transform:uppercase; margin-top:2px; }
.footer { margin-top:40px; padding-top:14px; border-top:1px solid #e2e8f0; }
.footer-info { font-size:9px; color:#94a3b8; line-height:1.7; }
.footer-accent { color:#28AEA4; font-weight:700; }
`

function buildBodyContent(client: Client, now: Date): string {
  return `
  <div class="wrap">
    <div class="top-bar"></div>
    <div class="header">
      <div>
        <div class="brand-name">Mirra Cosméticos</div>
        <div class="brand-sub">Comodato de Expositor</div>
      </div>
      <div>
        <div class="doc-type">Termo de Comodato</div>
        <div class="doc-date">${fmtDate(now)}</div>
      </div>
    </div>

    <div class="title">Termo de Comodato de Expositor — Linha Mirra</div>

    <div class="section">
      <div class="section-title">Partes</div>
      <div class="parties-grid">
        <div>
          <div class="field-label">Comodante</div>
          <div class="field-value">Mirra Cosméticos</div>
        </div>
        <div>
          <div class="field-label">Comodatário</div>
          <div class="field-value">${client.name}</div>
        </div>
        ${client.cpf_cnpj ? `<div><div class="field-label">CPF / CNPJ</div><div class="field-value">${client.cpf_cnpj}</div></div>` : ''}
        ${client.phone ? `<div><div class="field-label">Telefone</div><div class="field-value">${client.phone}</div></div>` : ''}
        ${client.address ? `<div style="grid-column:1/-1"><div class="field-label">Endereço</div><div class="field-value">${client.address}</div></div>` : ''}
      </div>
    </div>

    <div class="section">
      <div class="clause">
        <div class="clause-title">1. Do Objeto</div>
        <div class="clause-text">A COMODANTE cede ao COMODATÁRIO, a título gratuito de comodato, um expositor destinado à exposição e venda dos produtos da linha Mirra, permanecendo o bem de propriedade exclusiva da COMODANTE.</div>
      </div>
      <div class="clause">
        <div class="clause-title">2. Das Obrigações do Comodatário</div>
        <div class="clause-text">O COMODATÁRIO compromete-se a manter o expositor em bom estado de conservação, utilizá-lo exclusivamente para exposição dos produtos Mirra, e a não cedê-lo, emprestá-lo ou transferi-lo a terceiros sem autorização da COMODANTE.</div>
      </div>
      <div class="clause">
        <div class="clause-title">3. Da Vigência</div>
        <div class="clause-text">Este comodato vigora por prazo indeterminado, enquanto o COMODATÁRIO mantiver a comercialização dos produtos da linha Mirra.</div>
      </div>
    </div>

    <div class="highlight">
      Caso o COMODATÁRIO deixe de comercializar os produtos da linha Mirra, o expositor deverá ser devolvido à COMODANTE, que poderá retirá-lo do estabelecimento a qualquer momento, independentemente de aviso prévio.
    </div>

    <div class="signatures">
      <div class="sign-block">
        <div class="sign-line"></div>
        <div class="sign-name">Mirra Cosméticos</div>
        <div class="sign-label">Comodante</div>
      </div>
      <div class="sign-block">
        <div class="sign-line"></div>
        <div class="sign-name">${client.name}</div>
        <div class="sign-label">Comodatário</div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-info">
        Mirra Cosméticos · <span class="footer-accent">Emitido via RinoSeller</span><br>
        Emitido em ${now.toLocaleString('pt-BR')}
      </div>
    </div>
  </div>`
}

async function generatePDFBlob(client: Client): Promise<Blob> {
  const now = new Date()
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-99999px;top:0;width:794px;background:#fff;pointer-events:none;'

  const styleEl = document.createElement('style')
  styleEl.textContent = DOC_CSS
  container.appendChild(styleEl)

  const bodyDiv = document.createElement('div')
  bodyDiv.innerHTML = buildBodyContent(client, now)
  container.appendChild(bodyDiv)

  document.body.appendChild(container)

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
    })

    const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
    const pgW     = pdf.internal.pageSize.getWidth()
    const pgH     = pdf.internal.pageSize.getHeight()
    const imgW    = pgW
    const imgH    = (canvas.height * pgW) / canvas.width
    const imgData = canvas.toDataURL('image/jpeg', 0.85)

    pdf.addImage(imgData, 'JPEG', 0, 0, imgW, imgH)

    let remaining = imgH - pgH
    let offset    = -pgH
    while (remaining > 0) {
      pdf.addPage()
      pdf.addImage(imgData, 'JPEG', 0, offset, imgW, imgH)
      offset    -= pgH
      remaining -= pgH
    }

    return pdf.output('blob')
  } finally {
    document.body.removeChild(container)
  }
}

export async function downloadComodatoPDF(client: Client): Promise<void> {
  const safeName = client.name.trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '')
  const fileName = `comodato-expositor-mirra-${safeName || client.id}.pdf`

  const pdfBlob = await generatePDFBlob(client)

  const blobUrl = URL.createObjectURL(pdfBlob)
  const link    = document.createElement('a')
  link.href     = blobUrl
  link.download = fileName
  link.click()
  URL.revokeObjectURL(blobUrl)
}
