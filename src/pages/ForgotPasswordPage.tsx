import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

export function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [code,    setCode]    = useState('')
  const [error,   setError]   = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao processar.'); return }
      // token vazio = e-mail não cadastrado (não revelamos qual)
      setCode(data.token ?? '')
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
            <p className="text-[#28AEA4] text-xs tracking-[0.3em] uppercase">Recuperar Senha</p>
            <div className="h-px w-10 bg-[#28AEA4]/40" />
          </div>
        </div>

        <div className="bg-[#0f0f0f] border border-[#222222] rounded-2xl p-8 shadow-[0_0_80px_rgba(0,0,0,0.8)]">
          {code ? (
            /* Estado de sucesso — exibe o código */
            <div className="text-center space-y-5">
              <div className="w-14 h-14 rounded-full bg-[#28AEA4]/10 border border-[#28AEA4]/30 flex items-center justify-center mx-auto">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#28AEA4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.63 3.47 2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91A16 16 0 0 0 16 17l.91-.91a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 23.73 18l-.81-.08z"/>
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold mb-1">Código gerado!</p>
                <p className="text-gray-500 text-sm">Use o código abaixo para criar uma nova senha.</p>
              </div>
              <div className="bg-[#171717] border border-[#28AEA4]/30 rounded-xl px-6 py-4">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Seu código</p>
                <p className="text-[#28AEA4] text-3xl font-bold tracking-[0.3em]">{code}</p>
                <p className="text-gray-600 text-xs mt-2">Válido por 30 minutos</p>
              </div>
              <Link
                to={`/redefinir-senha?code=${code}`}
                className="block w-full bg-[#28AEA4] hover:bg-[#3cbdb6] text-white font-bold py-3 rounded-xl transition-all text-sm tracking-[0.15em] uppercase"
              >
                Criar nova senha →
              </Link>
            </div>
          ) : (
            /* Formulário de e-mail */
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-gray-500 text-sm text-center leading-relaxed">
                Informe seu e-mail e vamos gerar um código para você criar uma nova senha.
              </p>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-[0.2em] mb-2">
                  E-mail cadastrado
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

              {error && (
                <div className="bg-red-950/40 border border-red-800/40 rounded-xl px-4 py-2.5 text-center">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-[#28AEA4] hover:bg-[#3cbdb6] disabled:bg-[#0c5a55] disabled:text-[#6edbd5] text-white font-bold py-3.5 rounded-xl transition-all text-sm tracking-[0.15em] uppercase"
              >
                {loading ? 'Gerando código...' : 'Gerar código'}
              </button>
            </form>
          )}
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
