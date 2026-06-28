import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PasswordInput } from '../components/PasswordInput'
import { AuthLayout } from '../components/AuthLayout'

const STEPS = [
  { n: '1', title: 'Você pediu uma nova senha', desc: 'Recebemos sua solicitação e enviamos este link para o seu e-mail.' },
  { n: '2', title: 'Crie uma nova senha', desc: 'Escolha uma senha forte com pelo menos 6 caracteres.' },
  { n: '3', title: 'Acesse sua conta', desc: 'Use a nova senha para entrar normalmente no RinoSeller.' },
]

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
    <AuthLayout
      title={done ? 'Tudo certo!' : 'Nova senha'}
      subtitle={done ? 'Sua senha foi redefinida com sucesso.' : 'Defina a nova senha da sua conta.'}
      leftContent={
        <>
          <p className="text-xs font-bold text-white/60 uppercase tracking-[0.2em] mb-4">Recuperação de senha</p>
          <h2 className="text-2xl font-extrabold text-white leading-snug mb-10">
            Quase lá.<br />Defina sua nova senha.
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
        </>
      }
      footer={
        !done && (
          <Link to="/esqueci-senha" className="text-gray-600 hover:text-gray-400 text-xs transition-colors">
            ← Voltar
          </Link>
        )
      }
    >
      {done ? (
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6edbd5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
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
            <PasswordInput
              value={password}
              onChange={setPassword}
              placeholder="mínimo 6 caracteres"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-[0.2em] mb-2">
              Confirmar nova senha
            </label>
            <PasswordInput
              value={confirm}
              onChange={setConfirm}
              placeholder="repita a senha"
              autoComplete="new-password"
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
            className="w-full bg-[#28AEA4] hover:bg-[#3cbdb6] active:bg-[#1d9992] disabled:bg-[#0c5a55] disabled:text-[#6edbd5] text-white font-bold py-3.5 rounded-xl transition-all text-sm tracking-[0.15em] uppercase mt-2"
          >
            {loading ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}
