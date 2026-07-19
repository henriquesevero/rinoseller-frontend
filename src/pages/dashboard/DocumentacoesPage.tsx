import { useEffect, useState } from 'react'
import { getClients } from '../../api/client'
import type { Client } from '../../types'
import { downloadComodatoPDF } from '../../utils/comodatoDocument'

// ── Modal de seleção de cliente ─────────────────────────────────────────────

interface ComodatoModalProps {
  clients: Client[]
  onClose: () => void
}

function ComodatoModal({ clients, onClose }: ComodatoModalProps) {
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState<Client | null>(null)
  const [generating, setGenerating] = useState(false)
  const [feedback, setFeedback] = useState('')

  const filtered = search.trim().length > 0
    ? clients.filter(c => c.name.toLowerCase().includes(search.trim().toLowerCase()))
    : []

  const handleGenerate = async () => {
    if (!selected) return
    setGenerating(true); setFeedback('')
    try {
      await downloadComodatoPDF(selected)
      onClose()
    } catch {
      setFeedback('Não foi possível gerar o termo. Tente novamente.')
    } finally {
      setGenerating(false)
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
            📋
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Gerar documento</p>
            <p className="text-white font-semibold text-sm truncate">Termo de Comodato — Expositor Mirra</p>
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
          {selected ? (
            <div className="flex items-center justify-between bg-[#28AEA4]/10 border border-[#28AEA4]/30 rounded-xl px-4 py-2.5">
              <span className="text-[#1d9992] dark:text-[#6edbd5] text-sm font-medium">{selected.name}</span>
              <button
                onClick={() => setSelected(null)}
                className="w-5 h-5 rounded-full flex items-center justify-center text-[#28AEA4] hover:bg-[#28AEA4]/20 transition-colors"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar cliente pelo nome…"
                className="w-full bg-[#141414] border border-[#272727] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#28AEA4]/50 placeholder-gray-700"
              />
              {search.trim().length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#272727] rounded-xl overflow-hidden z-10 max-h-48 overflow-y-auto shadow-xl">
                  {filtered.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-600">Nenhum cliente encontrado</p>
                  ) : filtered.map(c => (
                    <button key={c.id} onClick={() => { setSelected(c); setSearch('') }}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-[#272727] transition-colors text-left">
                      <span className="text-gray-200">{c.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {feedback && <p className="text-xs text-amber-400">{feedback}</p>}

          <button
            onClick={handleGenerate}
            disabled={!selected || generating}
            className="w-full py-2.5 bg-[#28AEA4] hover:bg-[#3cbdb6] text-white rounded-xl text-sm font-bold disabled:opacity-30 transition-all"
          >
            {generating ? 'Gerando...' : 'Gerar termo (PDF)'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export function DocumentacoesPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showComodatoModal, setShowComodatoModal] = useState(false)

  useEffect(() => {
    getClients().then(c => setClients(c ?? [])).finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-full">
      <div className="px-6 py-7 border-b border-[#1c1c1c]">
        <h1 className="text-2xl font-bold text-white">Documentações</h1>
        <p className="text-gray-500 text-sm mt-0.5">Gere documentos e termos para seus clientes</p>
      </div>

      <div className="px-6 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-[#1e1e1e] bg-[#111111] p-5 flex flex-col">
            <div className="flex items-start justify-between gap-3 mb-4">
              <p className="font-semibold text-sm text-white truncate">Comodato de Expositor Mirra</p>
              <span className="flex-shrink-0 text-[10px] font-bold bg-[#28AEA4]/10 text-[#28AEA4] border border-[#28AEA4]/20 rounded-full px-2 py-0.5 uppercase tracking-wider">
                Termo
              </span>
            </div>
            <p className="text-gray-500 text-xs mb-4">Termo de empréstimo do expositor da linha Mirra, com previsão de devolução caso o cliente pare de vender os produtos.</p>
            <button
              onClick={() => setShowComodatoModal(true)}
              disabled={loading}
              className="mt-auto w-full py-2 bg-[#28AEA4] hover:bg-[#3cbdb6] text-white rounded-lg text-xs font-bold disabled:opacity-40 transition-all"
            >
              Gerar termo de comodato
            </button>
          </div>
        </div>
      </div>

      {showComodatoModal && (
        <ComodatoModal clients={clients} onClose={() => setShowComodatoModal(false)} />
      )}
    </div>
  )
}
