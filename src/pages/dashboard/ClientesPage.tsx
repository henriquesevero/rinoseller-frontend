import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getClients, createClient } from '../../api/client'
import { exportClientsPDF } from '../../utils/clientDocument'
import type { Client } from '../../types'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  const n = d.length
  if (n === 0) return ''
  if (n <= 2) return `(${d}`
  if (n <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`
  if (n <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

function maskCpfCnpj(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 14)
  const n = d.length
  if (n <= 11) {
    if (n <= 3) return d
    if (n <= 6) return `${d.slice(0,3)}.${d.slice(3)}`
    if (n <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`
    return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
  }
  const r = `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}`
  return n > 12 ? `${r}-${d.slice(12)}` : r
}

const EMPTY = { name: '', phone: '', email: '', notes: '', cpf_cnpj: '', address: '', payment_cycle_days: 0, payment_cycle_amount: 0, debt_limit: 0 }

export function ClientesPage() {
  const navigate = useNavigate()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'todos' | 'em_dia' | 'devedores'>('todos')
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [creating, setCreating] = useState(false)

  const load = async () => {
    setLoading(true)
    const data = await getClients().catch(() => [])
    setClients((data ?? []).sort((a, b) => a.name.localeCompare(b.name)))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return clients
      .filter(c =>
        statusFilter === 'todos' ? true :
        statusFilter === 'em_dia' ? c.debt <= 0 : c.debt > 0
      )
      .filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q)
      )
  }, [clients, search, statusFilter])

  const countEmDia    = clients.filter(c => c.debt <= 0).length
  const countDevedores = clients.filter(c => c.debt > 0).length
  const totalDevendo   = clients.reduce((s, c) => s + (c.debt > 0 ? c.debt : 0), 0)

  const handleCreate = async () => {
    if (!form.name.trim() || creating) return
    setCreating(true)
    try {
      await createClient(form)
      await load()
      setShowNew(false)
      setForm(EMPTY)
    } catch { alert('Erro ao cadastrar cliente.') }
    finally { setCreating(false) }
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="px-6 py-7 border-b border-[#1c1c1c] flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Clientes</h1>
          <p className="text-gray-500 text-sm mt-0.5">{clients.length} clientes cadastrados</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => exportClientsPDF(clients)}
            disabled={clients.length === 0}
            className="bg-[#141414] hover:bg-[#1a1a1a] disabled:opacity-40 border border-[#2a2a2a] text-gray-300 font-semibold px-4 py-2.5 rounded-xl text-sm tracking-wide transition-colors flex items-center gap-2"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <path d="M14 2v6h6"/>
            </svg>
            Exportar PDF
          </button>
          <button
            onClick={() => setShowNew(true)}
            className="bg-[#28AEA4] hover:bg-[#3cbdb6] text-white font-bold px-5 py-2.5 rounded-xl text-sm tracking-wide transition-colors"
          >
            + Novo Cliente
          </button>
        </div>
      </div>


      <div className="px-6 py-5 space-y-4">
        {/* Stat blocks */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#111111] border border-[#1e1e1e] rounded-2xl p-4 sm:p-5">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-[0.2em] mb-1">Cadastrados</p>
            <p className="text-lg sm:text-2xl font-bold text-white tabular-nums">{clients.length}</p>
            <p className="text-xs text-gray-600 mt-1">clientes no total</p>
          </div>
          <div className="bg-[#111111] border border-[#1e1e1e] rounded-2xl p-4 sm:p-5">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-[0.2em] mb-1">Em dia</p>
            <p className="text-lg sm:text-2xl font-bold text-emerald-500 tabular-nums">{countEmDia}</p>
            <p className="text-xs text-gray-600 mt-1">sem dívida pendente</p>
          </div>
          <div className="bg-[#111111] border border-[#1e1e1e] rounded-2xl p-4 sm:p-5">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-[0.2em] mb-1">Devendo</p>
            <p className="text-lg sm:text-2xl font-bold text-red-400 tabular-nums">{countDevedores}</p>
            <p className="text-xs text-gray-600 mt-1 truncate">{formatBRL(totalDevendo)} em aberto</p>
          </div>
        </div>

        {/* Search */}
        <input
          type="search"
          placeholder="Buscar por nome, telefone ou e-mail..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#111111] border border-[#222] focus:border-[#28AEA4] text-white rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder-gray-600"
        />

        {/* Status filters */}
        <div className="flex gap-1.5">
          {([
            { value: 'todos' as const, label: 'Todos', count: clients.length },
            { value: 'em_dia' as const, label: 'Em dia', count: countEmDia },
            { value: 'devedores' as const, label: 'Quem deve', count: countDevedores },
          ]).map(f => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === f.value
                  ? 'bg-[#28AEA4]/15 text-[#28AEA4] border border-[#28AEA4]/25'
                  : 'bg-[#141414] text-gray-500 border border-[#1e1e1e] hover:text-gray-300'
              }`}>
              {f.label} <span className="opacity-60">({f.count})</span>
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-[#28AEA4]/30 border-t-[#28AEA4] rounded-full animate-spin" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">👤</p>
            <p className="text-gray-500 font-medium">
              {search ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado ainda.'}
            </p>
            {!search && (
              <button onClick={() => setShowNew(true)} className="text-[#28AEA4] text-sm hover:underline mt-2">
                Cadastrar primeiro cliente →
              </button>
            )}
          </div>
        )}

        {/* Client list */}
        {!loading && filtered.map(client => (
          <button
            key={client.id}
            onClick={() => navigate(`/dashboard/clientes/${client.id}`)}
            className="w-full text-left bg-[#111111] hover:bg-[#161616] border border-[#1e1e1e] hover:border-[#2a2a2a] rounded-2xl px-5 py-4 transition-all group"
          >
            <div className="flex items-center justify-between gap-3">
              {/* Avatar + info */}
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[#28AEA4]/10 border border-[#28AEA4]/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[#28AEA4] font-bold text-base">
                    {client.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate group-hover:text-[#28AEA4] transition-colors">
                    {client.name}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {client.phone && (
                      <span className="text-xs text-gray-500">{client.phone}</span>
                    )}
                    {client.notes && (
                      <span className="text-xs text-gray-600 truncate">{client.notes}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right side */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {client.debt > 0 ? (
                  <div className="text-right">
                    <p className="text-[10px] text-red-400/70 uppercase tracking-widest">Deve</p>
                    <p className="text-red-400 font-bold tabular-nums text-sm">{formatBRL(client.debt)}</p>
                  </div>
                ) : (
                  <span className="text-[10px] text-emerald-500 bg-emerald-950/40 border border-emerald-800/30 rounded-full px-2.5 py-1 font-semibold">
                    Em dia
                  </span>
                )}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-700 group-hover:text-[#28AEA4] transition-colors">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* New Client Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#1c1c1c]">
              <h2 className="text-lg font-bold text-white">Novo Cliente</h2>
              <button onClick={() => { setShowNew(false); setForm(EMPTY) }} className="text-gray-600 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="field-label">Nome *</label>
                <input className="field-input" placeholder="Ex: Cleide Souza" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
              </div>
              <div>
                <label className="field-label">CPF / CNPJ</label>
                <input className="field-input" placeholder="000.000.000-00" value={form.cpf_cnpj}
                  onChange={e => setForm(f => ({ ...f, cpf_cnpj: maskCpfCnpj(e.target.value) }))} />
              </div>
              <div>
                <label className="field-label">Telefone / WhatsApp</label>
                <input className="field-input" placeholder="(11) 99999-9999" type="tel" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: maskPhone(e.target.value) }))} />
              </div>
              <div>
                <label className="field-label">Endereço</label>
                <input className="field-input" placeholder="Rua, número, bairro, cidade" value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">E-mail</label>
                <input className="field-input" placeholder="email@exemplo.com" type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Observações</label>
                <input className="field-input" placeholder="Ex: Salão Bella Vita, Centro" value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Limite de dívida (R$)</label>
                <input className="field-input" type="number" step="0.01" min="0" placeholder="Sem limite"
                  value={form.debt_limit || ''}
                  onChange={e => setForm(f => ({ ...f, debt_limit: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => { setShowNew(false); setForm(EMPTY) }}
                  className="flex-1 border border-[#2a2a2a] text-gray-400 rounded-xl py-3 text-sm hover:bg-[#141414] transition-colors">
                  Cancelar
                </button>
                <button onClick={handleCreate} disabled={creating || !form.name.trim()}
                  className="flex-1 bg-[#28AEA4] hover:bg-[#3cbdb6] disabled:bg-[#0c5a55] disabled:text-[#6edbd5] text-white font-bold rounded-xl py-3 text-sm transition-colors">
                  {creating ? 'Cadastrando...' : 'Cadastrar Cliente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .field-label { display:block; font-size:10px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:0.15em; margin-bottom:6px; }
        .field-input { width:100%; background:#171717; border:1px solid #2a2a2a; color:white; border-radius:12px; padding:10px 14px; font-size:14px; outline:none; transition:border-color 0.2s; }
        .field-input:focus { border-color:#28AEA4; }
      `}</style>
    </div>
  )
}
