import { useState, type FormEvent } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { PasswordInput } from '../components/PasswordInput'
import { AuthErrorBanner } from '../components/AuthErrorBanner'
import { PlanPicker, type PlanId } from '../components/PlanPicker'
import { FakeCardForm } from '../components/FakeCardForm'

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

type Step = 'form' | 'plan' | 'card' | 'success'

const PLAN_LABELS: Record<'base' | 'professional', { label: string; price: string }> = {
  base:         { label: 'Plano Base',         price: 'R$ 29/mês' },
  professional: { label: 'Plano Profissional', price: 'R$ 99/mês' },
}

export function RegisterPage() {
  const { isAuthenticated } = useAuth()
  const [name,       setName]       = useState('')
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [confirm,    setConfirm]    = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [error,     setError]     = useState('')
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined)
  const [loading,   setLoading]   = useState(false)
  const [step,      setStep]      = useState<Step>('form')
  const [plan,      setPlan]      = useState<PlanId | null>(null)

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setErrorCode(undefined)
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    if (password.length < 6)  { setError('A senha deve ter ao menos 6 caracteres.'); return }
    setStep('plan')
  }

  const handlePlanContinue = async () => {
    if (!plan) return
    setError('')
    setErrorCode(undefined)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, plan, access_code: accessCode }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao criar conta.'); setErrorCode(data.code); setLoading(false); return }

      setStep(plan === 'trial' ? 'success' : 'card')
    } catch {
      setError('Sem conexão com o servidor.')
    } finally {
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
            <h1 className="text-2xl font-extrabold text-white mb-1">
              {step === 'form' && 'Criar conta'}
              {step === 'plan' && 'Escolha como começar'}
              {step === 'card' && 'Dados de pagamento'}
              {step === 'success' && 'Tudo certo!'}
            </h1>
            <p className="text-sm text-gray-500">
              {step === 'form' && 'Preencha os dados abaixo para começar.'}
              {step === 'plan' && 'Teste grátis por 3 dias ou assine um plano agora.'}
              {step === 'card' && 'Simulação de cobrança — nenhum dado real é necessário aqui.'}
              {step === 'success' && 'Falta só confirmar seu e-mail.'}
            </p>
          </div>

          {step === 'form' && (
            <div className="bg-[#0f0f0f] border border-[#222222] rounded-2xl p-8">
              <form onSubmit={handleFormSubmit} className="space-y-4">
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
                  <PasswordInput
                    value={password}
                    onChange={setPassword}
                    placeholder="mínimo 6 caracteres"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-[0.2em] mb-2">
                    Confirmar senha
                  </label>
                  <PasswordInput
                    value={confirm}
                    onChange={setConfirm}
                    placeholder="repita a senha"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-[0.2em] mb-2">
                    Código de acesso
                  </label>
                  <input
                    type="text"
                    value={accessCode}
                    onChange={e => setAccessCode(e.target.value)}
                    placeholder="fornecido por quem te convidou"
                    autoComplete="off"
                    className="w-full bg-[#171717] border border-[#2a2a2a] focus:border-[#28AEA4] text-white rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder-gray-700"
                  />
                  <p className="text-[10px] text-gray-600 mt-1.5">Estamos em fase de testes — o cadastro é só por convite.</p>
                </div>

                {error && <AuthErrorBanner code={errorCode} message={error} email={email.trim()} />}

                <button
                  type="submit"
                  disabled={!name || !email || !password || !confirm || !accessCode}
                  className="w-full bg-[#28AEA4] hover:bg-[#3cbdb6] active:bg-[#1d9992] disabled:bg-[#0c5a55] disabled:text-[#6edbd5] text-white font-bold py-3.5 rounded-xl transition-all text-sm tracking-[0.15em] uppercase mt-2"
                >
                  Continuar
                </button>
              </form>
            </div>
          )}

          {step === 'plan' && (
            <div className="bg-[#0f0f0f] border border-[#222222] rounded-2xl p-8">
              <PlanPicker value={plan} onChange={setPlan} />

              {error && <div className="mt-4"><AuthErrorBanner code={errorCode} message={error} email={email.trim()} /></div>}

              <button
                type="button"
                onClick={handlePlanContinue}
                disabled={!plan || loading}
                className="w-full bg-[#28AEA4] hover:bg-[#3cbdb6] active:bg-[#1d9992] disabled:bg-[#0c5a55] disabled:text-[#6edbd5] text-white font-bold py-3.5 rounded-xl transition-all text-sm tracking-[0.15em] uppercase mt-6"
              >
                {loading ? 'Criando conta...' : 'Continuar'}
              </button>
              <button
                type="button"
                onClick={() => setStep('form')}
                disabled={loading}
                className="w-full text-center text-gray-600 hover:text-gray-400 text-xs transition-colors pt-3"
              >
                ← Voltar
              </button>
            </div>
          )}

          {step === 'card' && plan && plan !== 'trial' && (
            <FakeCardForm
              email={email}
              plan={plan}
              planLabel={PLAN_LABELS[plan].label}
              planPrice={PLAN_LABELS[plan].price}
              onSuccess={() => setStep('success')}
            />
          )}

          {step === 'success' && (
            <div className="bg-[#0f0f0f] border border-[#222222] rounded-2xl p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-[#28AEA4]/10 border border-[#28AEA4]/30 flex items-center justify-center mx-auto mb-5">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#28AEA4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-white mb-2">Confira seu e-mail</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Enviamos um link de confirmação para <span className="text-gray-300">{email}</span>.
                Clique nele para ativar sua conta e poder entrar.
              </p>
            </div>
          )}

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
