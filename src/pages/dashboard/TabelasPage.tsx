import { useEffect, useState } from 'react'
import { getProducts, getClients } from '../../api/client'
import type { Product, Client } from '../../types'
import {
  downloadPriceTablePDF,
  sendPriceTableEmailToMany,
  sharePriceTableWhatsApp,
  sharePriceTableWhatsAppToMany,
} from '../../utils/priceTableDocument'

interface BrandGroup {
  name: string
  products: Product[]
}

// ── Modal de envio ────────────────────────────────────────────────────────────

interface SendTableModalProps {
  brand: BrandGroup
  clients: Client[]
  onClose: () => void
}

function SendTableModal({ brand, clients, onClose }: SendTableModalProps) {
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState<Client[]>([])
  const [sending, setSending]   = useState<'whatsapp' | 'email' | null>(null)
  const [feedback, setFeedback] = useState('')

  const filtered = search.trim().length > 0
    ? clients.filter(c =>
        !selected.some(s => s.id === c.id) &&
        c.name.toLowerCase().includes(search.trim().toLowerCase())
      )
    : []

  const addClient = (c: Client) => { setSelected(prev => [...prev, c]); setSearch('') }
  const removeClient = (id: string) => setSelected(prev => prev.filter(c => c.id !== id))

  const withPhone = selected.filter(c => c.phone)
  const withEmail = selected.filter(c => c.email)

  const handleWhatsApp = async () => {
    setSending('whatsapp'); setFeedback('')
    try {
      await sharePriceTableWhatsAppToMany(brand.products, brand.name, withPhone)
      onClose()
    } catch {
      setFeedback('Não foi possível gerar o PDF. Tente novamente.')
    } finally {
      setSending(null)
    }
  }

  const handleEmail = async () => {
    setSending('email'); setFeedback('')
    try {
      const result = await sendPriceTableEmailToMany(brand.products, brand.name, withEmail)
      if (result.failed.length === 0) {
        onClose()
      } else {
        setFeedback(`Enviado para ${result.ok.length} cliente(s). Falhou para: ${result.failed.map(f => f.client.name).join(', ')}.`)
      }
    } catch {
      setFeedback('Não foi possível gerar o PDF. Tente novamente.')
    } finally {
      setSending(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#0f0f0f] border border-[#1c1c1c] rounded-2xl w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1c1c1c]">
          <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-[#28AEA4]/10 border border-[#28AEA4]/30 flex items-center justify-center text-[#28AEA4] text-lg">
            💰
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Enviar tabela de preços</p>
            <p className="text-white font-semibold text-sm truncate">{brand.name} · {brand.products.length} produtos</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-[#222] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-5 space-y-3">
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selected.map(c => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1.5 bg-[#28AEA4]/10 border border-[#28AEA4]/30 text-[#1d9992] dark:text-[#6edbd5] text-xs font-medium pl-2.5 pr-1.5 py-1 rounded-full"
                >
                  {c.name}
                  <button
                    onClick={() => removeClient(c.id)}
                    className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-[#28AEA4]/20 transition-colors"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="relative">
            <input
              type="text"
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={selected.length === 0 ? 'Buscar cliente pelo nome…' : 'Adicionar outro cliente…'}
              className="w-full bg-[#141414] border border-[#272727] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#28AEA4]/50 placeholder-gray-700"
            />
            {search.trim().length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#272727] rounded-xl overflow-hidden z-10 max-h-48 overflow-y-auto shadow-xl">
                {filtered.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-600">Nenhum cliente encontrado</p>
                ) : filtered.map(c => (
                  <button key={c.id} onClick={() => addClient(c)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-[#272727] transition-colors text-left">
                    <span className="text-gray-200">{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {feedback && <p className="text-xs text-amber-400">{feedback}</p>}

          {selected.length > 0 && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleWhatsApp}
                disabled={withPhone.length === 0 || sending !== null}
                title={withPhone.length === 0 ? 'Nenhum cliente selecionado tem telefone cadastrado' : undefined}
                className="flex-1 py-2.5 bg-[#111111] hover:bg-[#161616] text-white border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-xl text-sm font-semibold disabled:opacity-30 transition-all"
              >
                {sending === 'whatsapp' ? 'Gerando PDF...' : `📱 WhatsApp${withPhone.length > 1 ? ` (${withPhone.length})` : ''}`}
              </button>
              <button
                onClick={handleEmail}
                disabled={withEmail.length === 0 || sending !== null}
                title={withEmail.length === 0 ? 'Nenhum cliente selecionado tem e-mail cadastrado' : undefined}
                className="flex-1 py-2.5 bg-[#111111] hover:bg-[#161616] text-white border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-xl text-sm font-semibold disabled:opacity-30 transition-all"
              >
                {sending === 'email' ? 'Enviando...' : `✉ E-mail${withEmail.length > 1 ? ` (${withEmail.length})` : ''}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export function TabelasPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [clients, setClients]   = useState<Client[]>([])
  const [loading, setLoading]   = useState(true)
  const [sendingBrand, setSendingBrand] = useState<BrandGroup | null>(null)
  const [downloadingBrand, setDownloadingBrand] = useState<string | null>(null)
  const [sharingBrand, setSharingBrand] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getProducts(), getClients()])
      .then(([p, c]) => { setProducts(p ?? []); setClients(c ?? []) })
      .finally(() => setLoading(false))
  }, [])

  const sellable = products.filter(p => !p.is_kit || p.kit_items?.length)
  const brandMap = new Map<string, Product[]>()
  sellable.forEach(p => {
    const name = p.brand?.trim()
    if (!name) return
    brandMap.set(name, [...(brandMap.get(name) ?? []), p])
  })
  const brands: BrandGroup[] = [...brandMap.entries()]
    .map(([name, ps]) => ({ name, products: ps }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const allBrand: BrandGroup = { name: 'Todos os produtos', products: sellable }

  const handleDownload = async (brand: BrandGroup) => {
    setDownloadingBrand(brand.name)
    try {
      await downloadPriceTablePDF(brand.products, brand.name)
    } catch {
      alert('Não foi possível gerar o PDF.')
    } finally {
      setDownloadingBrand(null)
    }
  }

  const handleShareWhatsApp = async (brand: BrandGroup) => {
    setSharingBrand(brand.name)
    try {
      await sharePriceTableWhatsApp(brand.products, brand.name)
    } catch {
      alert('Não foi possível gerar o PDF.')
    } finally {
      setSharingBrand(null)
    }
  }

  return (
    <div className="min-h-full">
      <div className="px-6 py-7 border-b border-[#1c1c1c]">
        <h1 className="text-2xl font-bold text-white">Tabelas</h1>
        <p className="text-gray-500 text-sm mt-0.5">Gere e envie tabelas de preços por marca para seus clientes</p>
      </div>

      <div className="px-6 py-6">
        {loading ? (
          <p className="text-gray-600 text-sm py-12 text-center">Carregando produtos…</p>
        ) : sellable.length === 0 ? (
          <p className="text-gray-600 text-sm py-12 text-center">Cadastre produtos para gerar tabelas de preços.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* Todos os produtos */}
            <BrandCard
              brand={allBrand}
              highlight
              downloading={downloadingBrand === allBrand.name}
              sharing={sharingBrand === allBrand.name}
              onDownload={() => handleDownload(allBrand)}
              onShareWhatsApp={() => handleShareWhatsApp(allBrand)}
              onSend={() => setSendingBrand(allBrand)}
            />

            {brands.map(brand => (
              <BrandCard
                key={brand.name}
                brand={brand}
                downloading={downloadingBrand === brand.name}
                sharing={sharingBrand === brand.name}
                onDownload={() => handleDownload(brand)}
                onShareWhatsApp={() => handleShareWhatsApp(brand)}
                onSend={() => setSendingBrand(brand)}
              />
            ))}
          </div>
        )}
      </div>

      {sendingBrand && (
        <SendTableModal brand={sendingBrand} clients={clients} onClose={() => setSendingBrand(null)} />
      )}
    </div>
  )
}

function BrandCard({ brand, highlight, downloading, sharing, onDownload, onShareWhatsApp, onSend }: {
  brand: BrandGroup
  highlight?: boolean
  downloading: boolean
  sharing: boolean
  onDownload: () => void
  onShareWhatsApp: () => void
  onSend: () => void
}) {
  return (
    <div className={`rounded-2xl border p-5 flex flex-col ${highlight ? 'bg-[#28AEA4]/[0.06] border-[#28AEA4]/25' : 'bg-[#111111] border-[#1e1e1e]'}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <p className={`font-semibold text-sm truncate ${highlight ? 'text-[#0f4f49] dark:text-[#ffffff]' : 'text-white'}`}>{brand.name}</p>
        <span className="flex-shrink-0 text-[10px] font-bold bg-[#28AEA4]/10 text-[#28AEA4] border border-[#28AEA4]/20 rounded-full px-2 py-0.5 uppercase tracking-wider">
          {brand.products.length} {brand.products.length === 1 ? 'item' : 'itens'}
        </span>
      </div>

      <div className="flex gap-2 mt-auto">
        <button
          onClick={onDownload}
          disabled={downloading}
          title="Gerar PDF"
          className="flex-1 py-2 bg-[#171717] hover:bg-[#1c1c1c] text-gray-300 border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-lg text-xs font-semibold disabled:opacity-40 transition-all"
        >
          {downloading ? 'Gerando...' : '⬇ PDF'}
        </button>
        <button
          onClick={onShareWhatsApp}
          disabled={sharing}
          title="Enviar pelo WhatsApp (igual aos pedidos de venda)"
          className="flex-1 py-2 flex items-center justify-center gap-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 rounded-lg text-xs font-semibold disabled:opacity-40 transition-all"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.075-.3-.15-1.263-.465-2.403-1.485-.888-.795-1.484-1.77-1.66-2.07-.174-.3-.019-.465.13-.615.15-.15.3-.345.45-.523.149-.181.198-.301.297-.504.099-.21.05-.375-.025-.524-.075-.15-.673-1.62-.923-2.206-.244-.584-.5-.51-.673-.51-.172-.015-.371-.015-.57-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475 0 1.455 1.07 2.86 1.219 3.06.149.195 2.05 3.135 4.999 4.27 2.95 1.137 2.95.757 3.483.71.522-.046 1.703-.696 1.94-1.367.24-.673.24-1.245.165-1.367-.074-.121-.273-.196-.574-.346z"/>
            <path d="M12.05 1.5c-5.83 0-10.55 4.72-10.55 10.55 0 1.99.55 3.85 1.51 5.44L1.5 22.5l4.86-1.49a10.5 10.5 0 0 0 5.69 1.59c5.83 0 10.55-4.72 10.55-10.55S17.88 1.5 12.05 1.5zm0 19.05c-1.86 0-3.59-.55-5.05-1.5l-.36-.21-3.6 1.11 1.13-3.47-.23-.36a8.48 8.48 0 0 1-1.39-4.62c0-4.7 3.83-8.53 8.53-8.53s8.53 3.83 8.53 8.53-3.84 8.55-8.56 8.55z"/>
          </svg>
          {sharing ? 'Gerando...' : 'WhatsApp'}
        </button>
        <button
          onClick={onSend}
          title="Enviar para um cliente específico (e-mail ou WhatsApp)"
          className="flex-1 py-2 bg-[#28AEA4] hover:bg-[#3cbdb6] text-white rounded-lg text-xs font-bold transition-all"
        >
          Enviar
        </button>
      </div>
    </div>
  )
}
