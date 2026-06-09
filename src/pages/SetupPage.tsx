import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function SetupPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [name,      setName]      = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [blocked,   setBlocked]   = useState(false)

  useEffect(() => {
    if (isAuthenticated) { navigate('/dashboard', { replace: true }); return }
    fetch('/api/auth/setup-needed')
      .then(r => r.json())
      .then(d => { if (!d.needed) setBlocked(true) })
      .catch(() => {})
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    if (password.length < 6)  { setError('A senha deve ter ao menos 6 caracteres.'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao criar conta.'); return }

      // Faz login automático com o token retornado
      if (data.token) {
        localStorage.setItem('korav_token', data.token)
        localStorage.setItem('korav_user', JSON.stringify(data.user))
        await login(email, password)
      }
      navigate('/dashboard', { replace: true })
    } catch {
      setError('Sem conexão com o servidor.')
    } finally {
      setLoading(false)
    }
  }

  if (blocked) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full border border-[#28AEA4]/40 flex items-center justify-center mx-auto mb-6">
            <span className="text-[#28AEA4] text-2xl font-bold">M</span>
          </div>
          <h2 className="text-white text-xl font-bold mb-2">Sistema já configurado</h2>
          <p className="text-gray-500 text-sm mb-6">O administrador do sistema já foi criado. Faça login para continuar.</p>
          <Link to="/login" className="inline-block px-6 py-3 bg-[#28AEA4] hover:bg-[#3cbdb6] text-white font-bold text-sm rounded-xl transition-colors">
            Ir para o login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,_rgba(212,175,55,0.07)_0%,_transparent_70%)]" />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border border-[#28AEA4]/60 mb-5 relative">
            <div className="absolute inset-0 rounded-full bg-[#28AEA4]/5" />
            <span className="text-[#28AEA4] text-3xl font-bold tracking-tight">K</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-[0.2em]">RinoSeller</h1>
          <div className="flex items-center gap-3 justify-center mt-2">
            <div className="h-px w-10 bg-[#28AEA4]/40" />
            <p className="text-[#28AEA4] text-xs tracking-[0.3em] uppercase">Configuração Inicial</p>
            <div className="h-px w-10 bg-[#28AEA4]/40" />
          </div>
        </div>

        <div className="bg-[#0f0f0f] border border-[#222222] rounded-2xl p-8 shadow-[0_0_80px_rgba(0,0,0,0.8)]">
          <p className="text-gray-500 text-sm mb-6 text-center leading-relaxed">
            Crie a conta de administrador para começar a usar o sistema.
          </p>

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
              {loading ? 'Criando conta...' : 'Criar conta e entrar'}
            </button>
          </form>
        </div>

        <div className="mt-5 text-center">
          <Link to="/login" className="text-gray-600 hover:text-gray-400 text-xs transition-colors">
            ← Voltar para o login
          </Link>
        </div>

        <p className="text-center text-gray-700 text-xs mt-6 tracking-wider">
          RinoSeller © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
