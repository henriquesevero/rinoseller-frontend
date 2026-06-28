import { useState } from 'react'
import { Link } from 'react-router-dom'

interface AuthErrorBannerProps {
  code?: string
  message: string
  email?: string
}

const ICON_ALERT = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

const ICON_LOCK = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

const ICON_MAIL = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
)

export function AuthErrorBanner({ code, message, email }: AuthErrorBannerProps) {
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle')

  const handleResend = async () => {
    if (!email) return
    setResendState('sending')
    try {
      await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
    } catch {
      /* falha silenciosa — mensagem genérica é exibida de toda forma */
    } finally {
      setResendState('sent')
    }
  }

  if (code === 'email_not_verified' || code === 'email_already_registered') {
    const title = code === 'email_not_verified' ? 'Confirme seu e-mail' : 'Este e-mail já está cadastrado'
    return (
      <div className="bg-[#28AEA4]/10 border border-[#28AEA4]/30 rounded-xl px-4 py-3.5 text-center space-y-2.5">
        <div className="flex items-center justify-center gap-2 text-[#6edbd5]">
          {ICON_MAIL}
          <p className="font-semibold text-sm">{title}</p>
        </div>
        <p className="text-gray-400 text-xs leading-relaxed">
          {code === 'email_not_verified'
            ? 'Falta confirmar o e-mail enviado no cadastro para liberar o acesso.'
            : 'Se ainda não confirmou o e-mail, finalize a ativação ou entre na sua conta.'}
        </p>

        {resendState === 'sent' ? (
          <p className="text-[#6edbd5] text-xs font-medium">Link reenviado! Confira sua caixa de entrada.</p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={resendState === 'sending' || !email}
            className="text-[#28AEA4] hover:text-[#3cbdb6] disabled:opacity-50 text-xs font-semibold transition-colors"
          >
            {resendState === 'sending' ? 'Enviando...' : 'Reenviar e-mail de confirmação'}
          </button>
        )}

        {code === 'email_already_registered' && (
          <div className="flex items-center justify-center gap-3 pt-1">
            <Link to="/login" className="text-gray-500 hover:text-gray-300 text-xs transition-colors">Entrar</Link>
            <span className="text-gray-700 text-xs">·</span>
            <Link to="/esqueci-senha" className="text-gray-500 hover:text-gray-300 text-xs transition-colors">Esqueci minha senha</Link>
          </div>
        )}
      </div>
    )
  }

  if (code === 'account_inactive') {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3.5 text-center space-y-1.5">
        <div className="flex items-center justify-center gap-2 text-amber-400">
          {ICON_LOCK}
          <p className="font-semibold text-sm">Conta desativada</p>
        </div>
        <p className="text-gray-400 text-xs leading-relaxed">
          Fale com o administrador do sistema para reativar seu acesso.
        </p>
      </div>
    )
  }

  const title = code === 'invalid_credentials' ? 'E-mail ou senha incorretos' : 'Não foi possível continuar'
  const desc  = code === 'invalid_credentials' ? 'Verifique os dados e tente novamente.' : message

  return (
    <div className="bg-red-950/40 border border-red-800/40 rounded-xl px-4 py-3.5 text-center space-y-1.5">
      <div className="flex items-center justify-center gap-2 text-red-400">
        {ICON_ALERT}
        <p className="font-semibold text-sm">{title}</p>
      </div>
      <p className="text-red-300/70 text-xs leading-relaxed">{desc}</p>
    </div>
  )
}
