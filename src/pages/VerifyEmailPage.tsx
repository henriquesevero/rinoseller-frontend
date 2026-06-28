import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

type Status = 'loading' | 'success' | 'error'

export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const [status, setStatus] = useState<Status>('loading')
  const [error,  setError]  = useState('')

  useEffect(() => {
    const token = params.get('token')
    if (!token) { setStatus('error'); setError('Link de verificação inválido.'); return }

    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async res => {
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Não foi possível confirmar o e-mail.'); setStatus('error'); return }
        setStatus('success')
      })
      .catch(() => { setError('Sem conexão com o servidor.'); setStatus('error') })
  }, [params])

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
            <p className="text-[#28AEA4] text-xs tracking-[0.3em] uppercase">Confirmação de E-mail</p>
            <div className="h-px w-10 bg-[#28AEA4]/40" />
          </div>
        </div>

        <div className="bg-[#0f0f0f] border border-[#222222] rounded-2xl p-8 shadow-[0_0_80px_rgba(0,0,0,0.8)] text-center space-y-4">
          {status === 'loading' && (
            <>
              <div className="w-14 h-14 rounded-full border-2 border-[#28AEA4]/30 border-t-[#28AEA4] animate-spin mx-auto" />
              <p className="text-gray-400 text-sm">Confirmando seu e-mail...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6edbd5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-white font-semibold">E-mail confirmado!</p>
              <p className="text-gray-500 text-sm">Sua conta está ativa. Já pode entrar normalmente.</p>
              <Link
                to="/login"
                className="inline-block w-full bg-[#28AEA4] hover:bg-[#3cbdb6] text-white font-bold py-3.5 rounded-xl transition-all text-sm tracking-[0.15em] uppercase mt-2"
              >
                Ir para o login
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <p className="text-white font-semibold">Não foi possível confirmar</p>
              <p className="text-gray-500 text-sm">{error}</p>
              <Link to="/login" className="text-gray-600 hover:text-gray-400 text-xs transition-colors block mt-2">
                ← Voltar para o login
              </Link>
            </>
          )}
        </div>

        <p className="text-center text-gray-700 text-xs mt-6 tracking-wider">
          RinoSeller © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
