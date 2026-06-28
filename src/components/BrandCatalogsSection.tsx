import { useEffect, useState } from 'react'
import { addBrandCatalog, deleteBrandCatalog, getBrandCatalogs, getClients } from '../api/client'
import type { BrandCatalog, Client } from '../types'
import { ConfirmModal } from './ConfirmModal'

export function BrandCatalogsSection() {
  const [catalogs, setCatalogs] = useState<BrandCatalog[]>([])
  const [clients, setClients] = useState<Client[]>([])

  const [brandName, setBrandName] = useState('')
  const [driveUrl, setDriveUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [sendingId, setSendingId] = useState<string | null>(null)
  const [clientSearch, setClientSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    getBrandCatalogs().then(d => setCatalogs(d ?? []))
    getClients().then(d => setClients(d ?? []))
  }, [])

  const filteredClients = clientSearch.trim().length > 0
    ? clients.filter(c => c.name.toLowerCase().startsWith(clientSearch.toLowerCase()))
    : []

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

  const openSend = (catalogId: string) => {
    setSendingId(catalogId); setClientSearch(''); setSelectedClient(null)
  }

  const closeSend = () => {
    setSendingId(null); setClientSearch(''); setSelectedClient(null)
  }

  const sendWhatsApp = (catalog: BrandCatalog, client: Client) => {
    const msg = `Olá ${client.name}! Segue o catálogo da ${catalog.brand_name}:\n${catalog.drive_url}`
    window.open(`https://wa.me/55${client.phone}?text=${encodeURIComponent(msg)}`, '_blank')
    closeSend()
  }

  const sendEmail = (catalog: BrandCatalog, client: Client) => {
    const subject = `Catálogo ${catalog.brand_name}`
    const body = `Olá ${client.name}!\n\nSegue o catálogo da ${catalog.brand_name}:\n${catalog.drive_url}`
    window.open(`mailto:${client.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank')
    closeSend()
  }

  return (
    <div className="bg-[#111111] border border-[#1e1e1e] rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-white mb-1">Catálogos de Marca (PDF)</h2>
      <p className="text-xs text-gray-600 mb-4">Cadastre o link do Google Drive de cada catálogo e envie direto pra um cliente</p>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
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
        <div className="space-y-2">
          {catalogs.map(catalog => (
            <div key={catalog.id} className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-white font-medium truncate">{catalog.brand_name}</p>
                  <a href={catalog.drive_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-[#28AEA4]/70 hover:text-[#28AEA4] truncate block">
                    ↗ Abrir PDF
                  </a>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openSend(catalog.id)}
                    className="px-3 py-1.5 bg-[#28AEA4]/10 text-[#28AEA4] border border-[#28AEA4]/20 rounded-lg text-xs font-semibold hover:bg-[#28AEA4]/20 transition-colors"
                  >
                    Enviar
                  </button>
                  <button
                    onClick={() => setDeleteId(catalog.id)}
                    className="px-2.5 py-1.5 text-gray-600 hover:text-red-400 rounded-lg text-xs transition-colors"
                  >
                    Excluir
                  </button>
                </div>
              </div>

              {sendingId === catalog.id && (
                <div className="mt-3 pt-3 border-t border-[#1a1a1a]">
                  <div className="relative">
                    <input
                      type="text"
                      value={selectedClient ? selectedClient.name : clientSearch}
                      onChange={e => { setClientSearch(e.target.value); setSelectedClient(null) }}
                      placeholder="Buscar cliente pelo nome…"
                      className="w-full bg-[#141414] border border-[#272727] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#28AEA4]/50 placeholder-gray-700"
                    />
                    {!selectedClient && clientSearch.trim().length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#272727] rounded-xl overflow-hidden z-10 max-h-48 overflow-y-auto shadow-xl">
                        {filteredClients.length === 0 ? (
                          <p className="px-4 py-3 text-sm text-gray-600">Nenhum cliente encontrado</p>
                        ) : filteredClients.map(c => (
                          <button key={c.id} onClick={() => setSelectedClient(c)}
                            className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-[#272727] transition-colors text-left">
                            <span className="text-gray-200">{c.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedClient && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => sendWhatsApp(catalog, selectedClient)}
                        disabled={!selectedClient.phone}
                        title={!selectedClient.phone ? 'Cliente sem telefone cadastrado' : undefined}
                        className="flex-1 py-2.5 bg-[#111111] hover:bg-[#161616] text-white border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-xl text-sm font-semibold disabled:opacity-30 transition-all"
                      >
                        📱 WhatsApp
                      </button>
                      <button
                        onClick={() => sendEmail(catalog, selectedClient)}
                        disabled={!selectedClient.email}
                        title={!selectedClient.email ? 'Cliente sem e-mail cadastrado' : undefined}
                        className="flex-1 py-2.5 bg-[#111111] hover:bg-[#161616] text-white border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-xl text-sm font-semibold disabled:opacity-30 transition-all"
                      >
                        ✉ E-mail
                      </button>
                      <button
                        onClick={closeSend}
                        className="px-4 py-2.5 text-gray-500 hover:text-white rounded-xl text-sm transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
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
