import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import type { AuthUser } from '../../contexts/AuthContext'
import { getUsers, createUser, updateUser } from '../../api/client'

const EMPTY_FORM = { name: '', email: '', password: '', role: 'seller' as 'admin' | 'seller' }

export default function UsuariosPage() {
  const { user: me } = useAuth()
  const [users,   setUsers]   = useState<AuthUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState(EMPTY_FORM)
  const [saving,   setSaving]   = useState(false)
  const [formErr,  setFormErr]  = useState('')

  const [editing,  setEditing]  = useState<AuthUser | null>(null)

  if (me?.role !== 'admin') return <Navigate to="/dashboard" replace />

  useEffect(() => {
    getUsers()
      .then(setUsers)
      .catch(() => setError('Erro ao carregar usuários.'))
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) {
      setFormErr('Preencha todos os campos.')
      return
    }
    setSaving(true)
    setFormErr('')
    try {
      const created = await createUser(form)
      setUsers(prev => [...prev, created])
      setForm(EMPTY_FORM)
      setShowForm(false)
    } catch (e) {
      setFormErr((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (u: AuthUser) => {
    try {
      const updated = await updateUser(u.id, { name: u.name, email: u.email, active: !u.active })
      setUsers(prev => prev.map(x => x.id === u.id ? updated : x))
    } catch (e) {
      alert((e as Error).message)
    }
  }

  const handleUpdate = async () => {
    if (!editing) return
    setSaving(true)
    setFormErr('')
    try {
      const updated = await updateUser(editing.id, { name: editing.name, email: editing.email, active: editing.active })
      setUsers(prev => prev.map(x => x.id === updated.id ? updated : x))
      setEditing(null)
    } catch (e) {
      setFormErr((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Usuários</h1>
          <p className="text-gray-500 text-sm mt-0.5">Gerencie os acessos ao sistema</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setFormErr('') }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#28AEA4] hover:bg-[#3cbdb6] text-white font-bold text-sm rounded-xl transition-colors"
        >
          <span className="text-lg leading-none">+</span> Novo Usuário
        </button>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {/* Formulário novo usuário */}
      {showForm && (
        <div className="bg-[#111] border border-[#28AEA4]/30 rounded-2xl p-6 mb-6">
          <h2 className="text-base font-semibold text-white mb-4">Cadastrar Novo Usuário</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-xs">Nome completo</label>
              <input className="inp" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ana Silva" />
            </div>
            <div>
              <label className="label-xs">E-mail</label>
              <input className="inp" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="ana@rinoseller.com" />
            </div>
            <div>
              <label className="label-xs">Senha</label>
              <input className="inp" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="mínimo 6 caracteres" />
            </div>
            <div>
              <label className="label-xs">Perfil</label>
              <select className="inp" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as 'admin' | 'seller' }))}>
                <option value="seller">Vendedor</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>
          {formErr && <p className="text-red-400 text-sm mt-3">{formErr}</p>}
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="px-5 py-2 bg-[#28AEA4] hover:bg-[#3cbdb6] disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors"
            >
              {saving ? 'Salvando...' : 'Cadastrar'}
            </button>
            <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }} className="px-5 py-2 bg-[#1c1c1c] text-gray-400 hover:text-white text-sm rounded-xl transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <p className="text-gray-500 text-sm">Carregando...</p>
      ) : (
        <div className="space-y-3">
          {users.map(u => (
            <div key={u.id} className="bg-[#111] border border-[#1c1c1c] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">

              {editing?.id === u.id ? (
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input className="inp" value={editing.name} onChange={e => setEditing(x => x && ({ ...x, name: e.target.value }))} placeholder="Nome" />
                  <input className="inp" type="email" value={editing.email} onChange={e => setEditing(x => x && ({ ...x, email: e.target.value }))} placeholder="E-mail" />
                  {formErr && <p className="text-red-400 text-xs col-span-2">{formErr}</p>}
                  <div className="flex gap-2 col-span-2">
                    <button onClick={handleUpdate} disabled={saving} className="px-4 py-1.5 bg-[#28AEA4] text-white font-bold text-xs rounded-lg">
                      {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button onClick={() => setEditing(null)} className="px-4 py-1.5 bg-[#1c1c1c] text-gray-400 text-xs rounded-lg">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#28AEA4]/10 border border-[#28AEA4]/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-[#28AEA4] text-sm font-bold">{u.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold">{u.name}</p>
                      <p className="text-gray-500 text-xs">{u.email}</p>
                    </div>
                    <span className={`ml-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${u.role === 'admin' ? 'bg-[#28AEA4]/10 text-[#28AEA4] border-[#28AEA4]/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                      {u.role === 'admin' ? 'Admin' : 'Vendedor'}
                    </span>
                    {!u.active && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-red-500/10 text-red-400 border-red-500/20">
                        Inativo
                      </span>
                    )}
                  </div>
                </div>
              )}

              {editing?.id !== u.id && (
                <div className="flex gap-2 flex-shrink-0">
                  {u.id !== me?.id && (
                    <button
                      onClick={() => toggleActive(u)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${u.active ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' : 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'}`}
                    >
                      {u.active ? 'Desativar' : 'Ativar'}
                    </button>
                  )}
                  <button
                    onClick={() => { setEditing(u); setFormErr('') }}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border bg-[#1c1c1c] border-[#333] text-gray-400 hover:text-white transition-colors"
                  >
                    Editar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`
        .label-xs { display:block; font-size:10px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:.15em; margin-bottom:6px; }
        .inp { width:100%; background:#171717; border:1px solid #2a2a2a; color:#fff; border-radius:10px; padding:10px 14px; font-size:13px; outline:none; transition:border-color .15s; }
        .inp:focus { border-color:#28AEA4; }
        select.inp option { background:#1a1a1a; }
      `}</style>
    </div>
  )
}
