import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const HIGHLIGHTS = [
  {
    title: 'Pedidos e orçamentos em segundos',
    desc: 'Crie, envie e acompanhe pedidos direto pelo celular, com PDF no WhatsApp.',
  },
  {
    title: 'Controle total do seu financeiro',
    desc: 'Veja faturamento, dívidas em aberto e capital disponível em tempo real.',
  },
  {
    title: 'Estoque sempre atualizado',
    desc: 'Alertas automáticos para produtos zerados ou com estoque baixo.',
  },
]

export function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await login(email.trim(), password)
    if (result.ok) {
      navigate('/dashboard', { replace: true })
    } else {
      setError(result.error ?? 'Usuário ou senha incorretos.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Lado esquerdo ── */}
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

        {/* Conteúdo */}
        <div className="relative z-10">
          <h2 className="text-2xl font-extrabold text-white leading-snug mb-10">
            Gerencie suas vendas com<br />
            <span className="text-white/60">mais inteligência.</span>
          </h2>

          <ul className="space-y-6">
            {HIGHLIGHTS.map(h => (
              <li key={h.title} className="flex gap-4 items-start">
                <div className="w-2 h-2 rounded-full bg-white flex-shrink-0 mt-1.5" />
                <div>
                  <p className="text-sm font-semibold text-white mb-0.5">{h.title}</p>
                  <p className="text-xs text-white/60 leading-relaxed">{h.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div />
      </div>

      {/* ── Lado direito — formulário ── */}
      <div className="flex-1 bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="w-full max-w-[360px]">

          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-300 transition-colors mb-6">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Voltar para o início
          </Link>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-extrabold text-white mb-1">Entrar na conta</h1>
            <p className="text-sm text-gray-500">Bem-vindo de volta</p>
          </div>

          <div className="bg-[#0f0f0f] border border-[#222222] rounded-2xl p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-[#171717] border border-[#2a2a2a] focus:border-[#28AEA4] text-white rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder-gray-700"
                />
              </div>

              {error && (
                <div className="bg-red-950/40 border border-red-800/40 rounded-xl px-4 py-2.5">
                  <p className="text-red-400 text-sm text-center">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full bg-[#28AEA4] hover:bg-[#3cbdb6] active:bg-[#1d9992] disabled:bg-[#0c5a55] disabled:text-[#6edbd5] text-white font-bold py-3.5 rounded-xl transition-all text-sm tracking-[0.15em] uppercase mt-2"
              >
                {loading ? 'Verificando...' : 'Entrar'}
              </button>
            </form>
          </div>

          <div className="mt-5 flex flex-col items-center gap-3">
            <Link to="/esqueci-senha" className="text-gray-600 hover:text-gray-400 text-xs transition-colors">
              Esqueci minha senha
            </Link>
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 h-px bg-[#222]" />
              <span className="text-gray-700 text-xs">ou</span>
              <div className="flex-1 h-px bg-[#222]" />
            </div>
            <Link to="/register" className="text-[#28AEA4] hover:text-[#3cbdb6] text-sm font-medium transition-colors">
              Criar conta
            </Link>
          </div>

        </div>
      </div>

    </div>
  )
}
