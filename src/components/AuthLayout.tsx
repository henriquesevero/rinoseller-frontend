import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface AuthLayoutProps {
  leftContent: ReactNode
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthLayout({ leftContent, title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">

      {/* ── Lado esquerdo ── */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] flex-shrink-0 bg-[#28AEA4] px-14 py-12 relative overflow-hidden">
        <div className="absolute bottom-[-80px] right-[-80px] w-[300px] h-[300px] bg-white rounded-full blur-[120px] opacity-[0.08] pointer-events-none" />

        <Link to="/" className="flex items-center gap-2.5 relative z-10">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="font-bold text-white text-base">RinoSeller</span>
        </Link>

        <div className="relative z-10">{leftContent}</div>

        <p className="text-xs text-white/40 relative z-10">
          © {new Date().getFullYear()} RinoSeller
        </p>
      </div>

      {/* ── Lado direito — formulário ── */}
      <div className="flex-1 bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-300 transition-colors mb-6">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
            Voltar para o início
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-white mb-1">{title}</h1>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>

          <div className="bg-[#0f0f0f] border border-[#222222] rounded-2xl p-8">
            {children}
          </div>

          {footer && <div className="mt-5 text-center">{footer}</div>}
        </div>
      </div>

    </div>
  )
}
