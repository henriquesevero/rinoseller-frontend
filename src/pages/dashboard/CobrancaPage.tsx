import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { PlanPicker, type PlanId } from '../../components/PlanPicker'
import { FakeCardForm } from '../../components/FakeCardForm'
import { trialDaysLeft } from '../../utils/subscription'

const PLAN_LABELS: Record<'base' | 'professional', { label: string; price: string }> = {
  base:         { label: 'Plano Base',         price: 'R$ 29/mês' },
  professional: { label: 'Plano Profissional', price: 'R$ 99/mês' },
}

export function CobrancaPage() {
  const { user, refreshUser, logout } = useAuth()
  const [plan, setPlan]     = useState<PlanId | null>(null)
  const [done, setDone]     = useState(false)
  const daysLeft = trialDaysLeft(user)
  const wasTrial = user?.plan === 'trial'

  if (done) {
    return (
      <div className="min-h-full bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-full bg-[#28AEA4]/10 border border-[#28AEA4]/30 flex items-center justify-center mx-auto mb-5">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#28AEA4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Assinatura ativada!</h2>
          <p className="text-sm text-gray-500 mb-6">Seu acesso já está liberado. Bom trabalho!</p>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="bg-[#28AEA4] hover:bg-[#3cbdb6] text-white font-bold py-3 px-6 rounded-xl text-sm transition-all"
          >
            Ir para o painel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="max-w-sm w-full">
        <div className="text-center mb-7">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="text-xl font-extrabold text-white mb-1">
            {wasTrial && daysLeft === 0 ? 'Seu período de teste acabou' : 'Assine um plano para continuar'}
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Escolha um plano para liberar de novo o acesso ao painel da {user?.name ?? 'sua conta'}.
          </p>
        </div>

        {!plan || plan === 'trial' ? (
          <div className="bg-[#0f0f0f] border border-[#222222] rounded-2xl p-6">
            <PlanPicker value={plan} onChange={setPlan} includeTrial={false} />
            <button
              onClick={logout}
              className="w-full text-center text-gray-600 hover:text-gray-400 text-xs transition-colors pt-4"
            >
              Sair e entrar com outra conta
            </button>
          </div>
        ) : (
          <FakeCardForm
            email={user!.email}
            plan={plan}
            planLabel={PLAN_LABELS[plan].label}
            planPrice={PLAN_LABELS[plan].price}
            onSuccess={async () => { await refreshUser(); setDone(true) }}
            onBack={() => setPlan(null)}
          />
        )}
      </div>
    </div>
  )
}
