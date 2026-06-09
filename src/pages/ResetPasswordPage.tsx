import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [params]  = useSearchParams()
  const [code,     setCode]     = useState(params.get('code') ?? '')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [done,     setDone]     = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    if (password.length < 6)  { setError('A senha deve ter ao menos 6 caracteres.'); return }

    setLoading(true)
    try {
      const res  = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: code, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Código inválido ou expirado.'); return }
      setDone(true)
      setTimeout(() => navigate('/login', { replace: true }), 2500)
    } catch {
      setError('Sem conexão com o servidor.')
    } finally {
      setLoading(false)
    }
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
            <p className="text-[#28AEA4] text-xs tracking-[0.3em] uppercase">Nova Senha</p>
            <div className="h-px w-10 bg-[#28AEA4]/40" />
          </div>
        </div>

        <div className="bg-[#0f0f0f] border border-[#222222] rounded-2xl p-8 shadow-[0_0_80px_rgba(0,0,0,0.8)]">
          {done ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6edbd5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <p className="text-white font-semibold">Senha redefinida!</p>
              <p className="text-gray-500 text-sm">Redirecionando para o login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-[0.2em] mb-2">
                  Código de verificação
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full bg-[#171717] border border-[#2a2a2a] focus:border-[#28AEA4] text-white rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder-gray-700 tracking-[0.3em] text-center font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-[0.2em] mb-2">
                  Nova senha
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
                  Confirmar nova senha
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
                disabled={loading || !code || !password || !confirm}
                className="w-full bg-[#28AEA4] hover:bg-[#3cbdb6] disabled:bg-[#0c5a55] disabled:text-[#6edbd5] text-white font-bold py-3.5 rounded-xl transition-all text-sm tracking-[0.15em] uppercase"
              >
                {loading ? 'Salvando...' : 'Salvar nova senha'}
              </button>
            </form>
          )}
        </div>

        {!done && (
          <div className="mt-5 text-center">
            <Link to="/esqueci-senha" className="text-gray-600 hover:text-gray-400 text-xs transition-colors">
              ← Voltar
            </Link>
          </div>
        )}

        <p className="text-center text-gray-700 text-xs mt-6 tracking-wider">
          RinoSeller © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
