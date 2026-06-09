import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const STEPS = [
  {
    n: '1',
    title: 'Crie sua conta',
    desc: 'Cadastro rápido com nome, e-mail e senha. Sem cartão de crédito.',
  },
  {
    n: '2',
    title: 'Cadastre seus clientes e produtos',
    desc: 'Adicione seu catálogo e sua base de clientes em minutos.',
  },
  {
    n: '3',
    title: 'Comece a gerenciar suas vendas',
    desc: 'Emita pedidos, controle estoque e acompanhe seu financeiro.',
  },
]

export function RegisterPage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    if (password.length < 6)  { setError('A senha deve ter ao menos 6 caracteres.'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao criar conta.'); setLoading(false); return }

      localStorage.setItem('korav_token', data.token)
      localStorage.setItem('korav_user', JSON.stringify(data.user))
      navigate('/dashboard', { replace: true })
      window.location.reload()
    } catch {
      setError('Sem conexão com o servidor.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Lado esquerdo — passo a passo ── */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] flex-shrink-0 bg-[#28AEA4] px-14 py-12 relative overflow-hidden">
        <div className="absolute bottom-[-80px] right-[-80px] w-[300px] h-[300px] bg-white rounded-full blur-[120px] opacity-[0.08] pointer-events-none" />

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 relative z-10">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="font-bold text-white text-base">RinoSeller</span>
        </Link>

        {/* Conteúdo central */}
        <div className="relative z-10">
          <p className="text-xs font-bold text-white/60 uppercase tracking-[0.2em] mb-4">Comece agora</p>
          <h2 className="text-2xl font-extrabold text-white leading-snug mb-10">
            Comece gratuitamente<br />em menos de 2 minutos.
          </h2>

          <div className="space-y-8">
            {STEPS.map((s, i) => (
              <div key={s.n} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-white/20 border border-white/40 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-extrabold text-white">{s.n}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="w-px flex-1 mt-2 bg-gradient-to-b from-white/30 to-transparent min-h-[28px]" />
                  )}
                </div>
                <div className="pb-2">
                  <p className="text-sm font-semibold text-white mb-1">{s.title}</p>
                  <p className="text-xs text-white/60 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-white/40 relative z-10">
          © {new Date().getFullYear()} RinoSeller
        </p>
      </div>

      {/* ── Lado direito — formulário ── */}
      <div className="flex-1 bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-300 transition-colors mb-6">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Voltar para o início
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-white mb-1">Criar conta</h1>
            <p className="text-sm text-gray-500">Preencha os dados abaixo para começar.</p>
          </div>

          <div className="bg-[#0f0f0f] border border-[#222222] rounded-2xl p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-[0.2em] mb-2">
                  Seu nome
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Nome completo"
                  autoComplete="name"
                  className="w-full bg-[#171717] border border-[#2a2a2a] focus:border-[#28AEA4] text-white rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder-gray-700"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-[0.2em] mb-2">
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  className="w-full bg-[#171717] border border-[#2a2a2a] focus:border-[#28AEA4] text-white rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder-gray-700"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-[0.2em] mb-2">
                  Senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="mínimo 6 caracteres"
                  autoComplete="new-password"
                  className="w-full bg-[#171717] border border-[#2a2a2a] focus:border-[#28AEA4] text-white rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder-gray-700"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-[0.2em] mb-2">
                  Confirmar senha
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="repita a senha"
                  autoComplete="new-password"
                  className="w-full bg-[#171717] border border-[#2a2a2a] focus:border-[#28AEA4] text-white rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder-gray-700"
                />
              </div>

              {error && (
                <div className="bg-red-950/40 border border-red-800/40 rounded-xl px-4 py-2.5 text-center">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !name || !email || !password || !confirm}
                className="w-full bg-[#28AEA4] hover:bg-[#3cbdb6] active:bg-[#1d9992] disabled:bg-[#0c5a55] disabled:text-[#6edbd5] text-white font-bold py-3.5 rounded-xl transition-all text-sm tracking-[0.15em] uppercase mt-2"
              >
                {loading ? 'Criando conta...' : 'Criar conta'}
              </button>
            </form>
          </div>

          <div className="mt-5 text-center">
            <Link to="/login" className="text-gray-600 hover:text-gray-400 text-xs transition-colors">
              ← Já tenho conta, quero entrar
            </Link>
          </div>
        </div>
      </div>

    </div>
  )
}
