import { useEffect, useState } from 'react'
import { addBrandCatalog, deleteBrandCatalog, getBrandCatalogs, getClients } from '../api/client'
import type { BrandCatalog, Client } from '../types'
import { ConfirmModal } from './ConfirmModal'

function extractDriveFileId(url: string): string | null {
  const idParam = url.match(/[?&]id=([^&]+)/)
  if (idParam) return idParam[1]
  const pathId = url.match(/\/d\/([^/]+)/)
  if (pathId) return pathId[1]
  return null
}

function driveThumbnailUrl(driveUrl: string): string | null {
  const fileId = extractDriveFileId(driveUrl)
  return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w500` : null
}

function CatalogPoster({ driveUrl }: { driveUrl: string }) {
  const thumbUrl = driveThumbnailUrl(driveUrl)
  const [failed, setFailed] = useState(false)

  if (!thumbUrl || failed) {
    return (
      <div className="aspect-[2/3] w-full rounded-xl bg-[#1a1a1a] border border-[#272727] flex items-center justify-center text-gray-600 text-5xl">
        📄
      </div>
    )
  }
  return (
    <img
      src={thumbUrl}
      alt="Capa do catálogo"
      onError={() => setFailed(true)}
      className="aspect-[2/3] w-full rounded-xl object-cover border border-[#272727] bg-[#1a1a1a]"
    />
  )
}

interface SendCatalogModalProps {
  catalog: BrandCatalog
  clients: Client[]
  onClose: () => void
}

function SendCatalogModal({ catalog, clients, onClose }: SendCatalogModalProps) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Client | null>(null)

  const filtered = search.trim().length > 0
    ? clients.filter(c => c.name.toLowerCase().startsWith(search.toLowerCase()))
    : []

  const sendWhatsApp = (client: Client) => {
    const msg = `Olá ${client.name}! Segue o catálogo da ${catalog.brand_name}:\n${catalog.drive_url}`
    window.open(`https://wa.me/55${client.phone}?text=${encodeURIComponent(msg)}`, '_blank')
    onClose()
  }

  const sendEmail = (client: Client) => {
    const subject = `Catálogo ${catalog.brand_name}`
    const body = `Olá ${client.name}!\n\nSegue o catálogo da ${catalog.brand_name}:\n${catalog.drive_url}`
    window.open(`mailto:${client.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#0f0f0f] border border-[#1c1c1c] rounded-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1c1c1c]">
          <CatalogPoster driveUrl={catalog.drive_url} />
          <div className="min-w-0">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Enviar catálogo</p>
            <p className="text-white font-semibold text-sm truncate">{catalog.brand_name}</p>
          </div>
        </div>

        <div className="px-5 py-5 space-y-3">
          <div className="relative">
            <input
              type="text"
              autoFocus
              value={selected ? selected.name : search}
              onChange={e => { setSearch(e.target.value); setSelected(null) }}
              placeholder="Buscar cliente pelo nome…"
              className="w-full bg-[#141414] border border-[#272727] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#28AEA4]/50 placeholder-gray-700"
            />
            {!selected && search.trim().length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#272727] rounded-xl overflow-hidden z-10 max-h-48 overflow-y-auto shadow-xl">
                {filtered.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-600">Nenhum cliente encontrado</p>
                ) : filtered.map(c => (
                  <button key={c.id} onClick={() => setSelected(c)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-[#272727] transition-colors text-left">
                    <span className="text-gray-200">{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selected && (
            <div className="flex gap-2">
              <button
                onClick={() => sendWhatsApp(selected)}
                disabled={!selected.phone}
                title={!selected.phone ? 'Cliente sem telefone cadastrado' : undefined}
                className="flex-1 py-2.5 bg-[#111111] hover:bg-[#161616] text-white border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-xl text-sm font-semibold disabled:opacity-30 transition-all"
              >
                📱 WhatsApp
              </button>
              <button
                onClick={() => sendEmail(selected)}
                disabled={!selected.email}
                title={!selected.email ? 'Cliente sem e-mail cadastrado' : undefined}
                className="flex-1 py-2.5 bg-[#111111] hover:bg-[#161616] text-white border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-xl text-sm font-semibold disabled:opacity-30 transition-all"
              >
                ✉ E-mail
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function BrandCatalogsSection() {
  const [catalogs, setCatalogs] = useState<BrandCatalog[]>([])
  const [clients, setClients] = useState<Client[]>([])

  const [brandName, setBrandName] = useState('')
  const [driveUrl, setDriveUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [sendingCatalog, setSendingCatalog] = useState<BrandCatalog | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    getBrandCatalogs().then(d => setCatalogs(d ?? []))
    getClients().then(d => setClients(d ?? []))
  }, [])

  const handleAdd = async () => {
    if (!brandName.trim() || !driveUrl.trim()) {
      setError('Nome da marca e link são obrigatórios')
      return
    }
    setSaving(true); setError('')
    try {
      const created = await addBrandCatalog({ brand_name: brandName.trim(), drive_url: driveUrl.trim() })
      setCatalogs(prev => [...prev, created])
      setBrandName(''); setDriveUrl('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao cadastrar catálogo')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await deleteBrandCatalog(deleteId)
    setCatalogs(prev => prev.filter(c => c.id !== deleteId))
    setDeleteId(null)
  }

  return (
    <div className="bg-[#111111] border border-[#1e1e1e] rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-white mb-1">Catálogos de Marca (PDF)</h2>
      <p className="text-xs text-gray-600 mb-4">Cadastre o link do Google Drive de cada catálogo e envie direto pra um cliente</p>

      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <input
          type="text"
          value={brandName}
          onChange={e => setBrandName(e.target.value)}
          placeholder="Nome da marca"
          className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#28AEA4]/50 placeholder-gray-700"
        />
        <input
          type="text"
          value={driveUrl}
          onChange={e => setDriveUrl(e.target.value)}
          placeholder="Link do Google Drive"
          className="flex-[2] bg-[#0a0a0a] border border-[#2a2a2a] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#28AEA4]/50 placeholder-gray-700"
        />
        <button
          onClick={handleAdd}
          disabled={saving}
          className="px-5 py-2.5 bg-[#28AEA4] hover:bg-[#3cbdb6] text-white rounded-xl text-sm font-semibold disabled:opacity-40 transition-colors"
        >
          {saving ? 'Adicionando…' : '+ Adicionar'}
        </button>
      </div>
      {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

      {catalogs.length === 0 ? (
        <p className="text-gray-600 text-sm">Nenhum catálogo de marca cadastrado ainda.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {catalogs.map(catalog => (
            <div key={catalog.id} className="group">
              <button
                onClick={() => setSendingCatalog(catalog)}
                className="block w-full transition-transform group-hover:scale-[1.03]"
                title="Enviar para cliente"
              >
                <CatalogPoster driveUrl={catalog.drive_url} />
              </button>
              <p className="text-xs text-white font-medium mt-2 truncate">{catalog.brand_name}</p>
              <div className="flex items-center gap-1 mt-1">
                <a
                  href={catalog.drive_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir PDF"
                  className="flex-1 text-center py-1 rounded-lg text-[11px] text-gray-500 hover:text-[#28AEA4] hover:bg-[#28AEA4]/10 transition-colors"
                >
                  ↗ Abrir
                </a>
                <button
                  onClick={() => setSendingCatalog(catalog)}
                  title="Enviar"
                  className="flex-1 text-center py-1 rounded-lg text-[11px] text-gray-500 hover:text-[#28AEA4] hover:bg-[#28AEA4]/10 transition-colors"
                >
                  📤 Enviar
                </button>
                <button
                  onClick={() => setDeleteId(catalog.id)}
                  title="Excluir"
                  className="text-center py-1 px-2 rounded-lg text-[11px] text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {sendingCatalog && (
        <SendCatalogModal
          catalog={sendingCatalog}
          clients={clients}
          onClose={() => setSendingCatalog(null)}
        />
      )}

      <ConfirmModal
        open={deleteId !== null}
        title="Excluir catálogo?"
        message="Essa ação não pode ser desfeita."
        confirmLabel="Sim, excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
