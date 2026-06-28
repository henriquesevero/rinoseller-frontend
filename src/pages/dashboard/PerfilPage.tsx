import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { UserAvatar } from '../../components/UserAvatar'
import { deleteMyAccount } from '../../api/client'

const PLAN_FEATURES: Record<string, string[]> = {
  basic:        ['Até 10 clientes', 'Até 15 pedidos/mês', 'Controle de estoque', 'Relatórios básicos'],
  professional: ['Clientes ilimitados', 'Pedidos ilimitados', 'Todas as funcionalidades', 'Relatórios em PDF', 'Integração WhatsApp', 'Suporte prioritário'],
  ai:           ['Tudo do Profissional', 'Chatbot para WhatsApp', 'Integração com Instagram', 'Catálogo automático via chat', 'Respostas com IA'],
}

const MOCK_INVOICES = [
  { id: 'INV-2026-06', date: 'Jun 2026', desc: 'Plano Profissional', amount: 'R$ 99,00', status: 'Pago' },
  { id: 'INV-2026-05', date: 'Mai 2026', desc: 'Plano Profissional', amount: 'R$ 99,00', status: 'Pago' },
  { id: 'INV-2026-04', date: 'Abr 2026', desc: 'Plano Profissional', amount: 'R$ 99,00', status: 'Pago' },
]

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {desc && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{desc}</p>}
      </div>
      <div>{children}</div>
    </div>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#111111] border border-[#1e1e1e] rounded-2xl p-6 ${className}`}>
      {children}
    </div>
  )
}

function InputField({ label, value, onChange, type = 'text', placeholder = '', disabled = false }: {
  label: string; value: string; onChange?: (v: string) => void;
  type?: string; placeholder?: string; disabled?: boolean
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-[0.2em] mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] focus:border-[#28AEA4] disabled:opacity-40 text-white rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder-gray-700"
      />
    </div>
  )
}

export default function PerfilPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [name,        setName]        = useState(user?.name ?? '')
  const [email,       setEmail]       = useState(user?.email ?? '')
  const [currentPass, setCurrentPass] = useState('')
  const [newPass,     setNewPass]     = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)
  const [passError,   setPassError]   = useState('')

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTyped,       setDeleteTyped]       = useState('')
  const [deleting,          setDeleting]          = useState(false)
  const [deleteError,       setDeleteError]       = useState('')

  async function handleDeleteAccount() {
    if (deleteTyped.trim().toLowerCase() !== (user?.email ?? '').toLowerCase()) return
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteMyAccount()
      logout()
      navigate('/', { replace: true })
    } catch {
      setDeleteError('Não foi possível excluir sua conta agora. Tente novamente.')
      setDeleting(false)
    }
  }

  const currentPlan = 'professional'
  const planLabel   = { basic: 'Básico', professional: 'Profissional', ai: 'IA' }[currentPlan]

  async function handleSaveProfile() {
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function handleSavePassword() {
    setPassError('')
    if (!currentPass) { setPassError('Informe a senha atual.'); return }
    if (newPass.length < 6) { setPassError('A nova senha deve ter ao menos 6 caracteres.'); return }
    if (newPass !== confirmPass) { setPassError('As senhas não coincidem.'); return }
    setCurrentPass(''); setNewPass(''); setConfirmPass('')
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-10">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Minha conta</h1>
        <p className="text-sm text-gray-500 mt-1">Gerencie seu perfil, plano e informações de cobrança.</p>
      </div>

      <div className="border-t border-[#1e1e1e]" />

      {/* ── Foto e identidade ── */}
      <Section title="Foto de perfil" desc="Sua foto é a mesma associada ao seu e-mail no Gravatar.">
        <Card>
          <div className="flex items-center gap-6">
            <UserAvatar name={name} email={email} size={80} />
            <div>
              <p className="text-sm font-semibold text-white">{name || 'Seu nome'}</p>
              <p className="text-xs text-gray-500 mt-0.5">{email}</p>
              <a
                href="https://gravatar.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-[11px] text-[#28AEA4] hover:text-[#3cbdb6] transition-colors"
              >
                Alterar foto no Gravatar ↗
              </a>
            </div>
          </div>
        </Card>
      </Section>

      <div className="border-t border-[#1e1e1e]" />

      {/* ── Dados pessoais ── */}
      <Section title="Dados pessoais" desc="Atualize seu nome e e-mail de acesso.">
        <Card className="space-y-4">
          <InputField label="Nome completo" value={name} onChange={setName} placeholder="Seu nome" />
          <InputField label="E-mail" value={email} onChange={setEmail} type="email" placeholder="seu@email.com" />
          <div className="pt-2">
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="bg-[#28AEA4] hover:bg-[#3cbdb6] disabled:opacity-60 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all"
            >
              {saving ? 'Salvando...' : saved ? '✓ Salvo' : 'Salvar alterações'}
            </button>
          </div>
        </Card>
      </Section>

      <div className="border-t border-[#1e1e1e]" />

      {/* ── Senha ── */}
      <Section title="Senha" desc="Use uma senha forte com ao menos 6 caracteres.">
        <Card className="space-y-4">
          <InputField label="Senha atual" value={currentPass} onChange={setCurrentPass} type="password" placeholder="••••••••" />
          <InputField label="Nova senha"   value={newPass}     onChange={setNewPass}     type="password" placeholder="mínimo 6 caracteres" />
          <InputField label="Confirmar nova senha" value={confirmPass} onChange={setConfirmPass} type="password" placeholder="repita a senha" />
          {passError && <p className="text-red-400 text-xs">{passError}</p>}
          <div className="pt-2">
            <button
              onClick={handleSavePassword}
              className="bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all"
            >
              Alterar senha
            </button>
          </div>
        </Card>
      </Section>

      <div className="border-t border-[#1e1e1e]" />

      {/* ── Plano ── */}
      <Section title="Plano atual" desc="Seu plano e funcionalidades disponíveis.">
        <Card>
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-extrabold text-white">{planLabel}</span>
                <span className="text-[10px] font-bold bg-[#28AEA4]/10 text-[#28AEA4] border border-[#28AEA4]/20 rounded-full px-2.5 py-0.5 uppercase tracking-wide">Ativo</span>
              </div>
              <p className="text-2xl font-extrabold text-white">R$ 99<span className="text-sm font-normal text-gray-500">/mês</span></p>
              <p className="text-xs text-gray-500 mt-1">Próxima cobrança em 01/07/2026</p>
            </div>
            <button className="flex-shrink-0 text-xs font-semibold text-[#28AEA4] hover:text-[#3cbdb6] border border-[#28AEA4]/30 hover:border-[#28AEA4]/60 px-4 py-2 rounded-xl transition-all">
              Alterar plano
            </button>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PLAN_FEATURES[currentPlan].map(f => (
              <li key={f} className="flex items-center gap-2 text-xs text-gray-400">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#28AEA4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {f}
              </li>
            ))}
          </ul>
        </Card>
      </Section>

      <div className="border-t border-[#1e1e1e]" />

      {/* ── Forma de pagamento ── */}
      <Section title="Forma de pagamento" desc="Cartão utilizado nas cobranças mensais.">
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-8 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 border border-white/10 flex items-center justify-center flex-shrink-0">
                <svg width="22" height="14" viewBox="0 0 38 24" fill="none">
                  <rect width="38" height="24" rx="4" fill="#1a1a2e"/>
                  <circle cx="15" cy="12" r="7" fill="#eb001b" opacity="0.9"/>
                  <circle cx="23" cy="12" r="7" fill="#f79e1b" opacity="0.9"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">•••• •••• •••• 4242</p>
                <p className="text-xs text-gray-500">Expira em 12/2028</p>
              </div>
            </div>
            <button className="text-xs font-semibold text-gray-400 hover:text-white border border-white/10 hover:border-white/20 px-4 py-2 rounded-xl transition-all">
              Alterar
            </button>
          </div>
        </Card>
      </Section>

      <div className="border-t border-[#1e1e1e]" />

      {/* ── Histórico de cobranças ── */}
      <Section title="Histórico de cobranças" desc="Suas faturas e comprovantes de pagamento.">
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                <th className="text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-6 py-3">Fatura</th>
                <th className="text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-6 py-3 hidden sm:table-cell">Descrição</th>
                <th className="text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-6 py-3">Valor</th>
                <th className="text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-6 py-3">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {MOCK_INVOICES.map((inv, i) => (
                <tr key={inv.id} className={i < MOCK_INVOICES.length - 1 ? 'border-b border-[#1a1a1a]' : ''}>
                  <td className="px-6 py-4">
                    <p className="text-white font-medium text-xs">{inv.id}</p>
                    <p className="text-gray-600 text-[10px]">{inv.date}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs hidden sm:table-cell">{inv.desc}</td>
                  <td className="px-6 py-4 text-white font-semibold text-xs tabular-nums">{inv.amount}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-2.5 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-[11px] text-gray-600 hover:text-[#28AEA4] transition-colors">
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </Section>

      {/* ── Zona de perigo ── */}
      <div className="border-t border-[#1e1e1e]" />
      <Section title="Zona de perigo" desc="Ações irreversíveis na sua conta.">
        <Card className="border-red-900/30">
          {!showDeleteConfirm ? (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">Excluir conta</p>
                <p className="text-xs text-gray-500 mt-0.5">Remove permanentemente sua conta e todos os dados.</p>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-shrink-0 text-xs font-semibold text-red-400 hover:text-red-300 border border-red-900/40 hover:border-red-800/60 px-4 py-2 rounded-xl transition-all"
              >
                Excluir conta
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-red-400">Tem certeza? Essa ação não pode ser desfeita.</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Todos os seus produtos, clientes, pedidos, orçamentos e catálogos serão excluídos permanentemente.
                Para confirmar, digite seu e-mail <span className="text-gray-300">{user?.email}</span> abaixo.
              </p>
              <input
                type="email"
                value={deleteTyped}
                onChange={e => setDeleteTyped(e.target.value)}
                placeholder={user?.email}
                className="w-full bg-[#1a1a1a] border border-red-900/40 focus:border-red-700 text-white rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder-gray-700"
              />
              {deleteError && <p className="text-red-400 text-xs">{deleteError}</p>}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteTyped.trim().toLowerCase() !== (user?.email ?? '').toLowerCase()}
                  className="text-xs font-bold bg-red-500/10 hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed text-red-400 border border-red-900/40 hover:border-red-800/60 px-4 py-2.5 rounded-xl transition-all"
                >
                  {deleting ? 'Excluindo...' : 'Excluir definitivamente'}
                </button>
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteTyped(''); setDeleteError('') }}
                  disabled={deleting}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-300 px-4 py-2.5 rounded-xl transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </Card>
      </Section>

      <div className="h-8" />
    </div>
  )
}
