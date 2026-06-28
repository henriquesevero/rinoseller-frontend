import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'

type Status = 'loading' | 'success' | 'error'

const STEPS = [
  { n: '1', title: 'Você criou sua conta', desc: 'Cadastro feito! Falta só confirmar o e-mail para liberar o acesso.' },
  { n: '2', title: 'Confirmamos seu e-mail', desc: 'Estamos validando o link que você acabou de clicar.' },
  { n: '3', title: 'Comece a vender', desc: 'Cadastre seus clientes e produtos e gerencie suas vendas.' },
]

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

  const titles: Record<Status, { title: string; subtitle: string }> = {
    loading: { title: 'Confirmando e-mail', subtitle: 'Só um instante, estamos validando seu link.' },
    success: { title: 'E-mail confirmado!', subtitle: 'Sua conta está ativa e pronta para uso.' },
    error:   { title: 'Não foi possível confirmar', subtitle: 'Algo deu errado com esse link.' },
  }
  const { title, subtitle } = titles[status]

  return (
    <AuthLayout
      title={title}
      subtitle={subtitle}
      leftContent={
        <>
          <p className="text-xs font-bold text-white/60 uppercase tracking-[0.2em] mb-4">Ative sua conta</p>
          <h2 className="text-2xl font-extrabold text-white leading-snug mb-10">
            Falta só um passo<br />para começar a vender.
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
        status !== 'loading' && (
          <Link to="/login" className="text-gray-600 hover:text-gray-400 text-xs transition-colors">
            ← Voltar para o login
          </Link>
        )
      }
    >
      {status === 'loading' && (
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-full border-2 border-[#28AEA4]/30 border-t-[#28AEA4] animate-spin mx-auto" />
          <p className="text-gray-500 text-sm">Confirmando seu e-mail...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6edbd5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="text-white font-semibold">E-mail confirmado!</p>
          <p className="text-gray-500 text-sm">Sua conta está ativa. Já pode entrar normalmente.</p>
          <Link
            to="/login"
            className="block w-full bg-[#28AEA4] hover:bg-[#3cbdb6] active:bg-[#1d9992] text-white font-bold py-3.5 rounded-xl transition-all text-sm tracking-[0.15em] uppercase mt-2"
          >
            Ir para o login
          </Link>
        </div>
      )}

      {status === 'error' && (
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
          <p className="text-white font-semibold">Não foi possível confirmar</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      )}
    </AuthLayout>
  )
}
