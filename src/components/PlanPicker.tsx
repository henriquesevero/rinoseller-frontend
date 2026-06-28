export type PlanId = 'trial' | 'base' | 'professional'

interface PlanOption {
  id: PlanId
  name: string
  price: string
  period?: string
  desc: string
  highlight?: boolean
}

const ALL_PLANS: PlanOption[] = [
  { id: 'trial',        name: 'Teste grátis',  price: '3 dias',  desc: 'Use todas as funções sem compromisso, sem cartão.' },
  { id: 'base',         name: 'Base',          price: 'R$ 29',   period: '/mês', desc: 'Para quem está começando.' },
  { id: 'professional', name: 'Profissional',  price: 'R$ 99',   period: '/mês', desc: 'Clientes e pedidos ilimitados, todas as funções.', highlight: true },
]

interface PlanPickerProps {
  value: PlanId | null
  onChange: (id: PlanId) => void
  includeTrial?: boolean
}

export function PlanPicker({ value, onChange, includeTrial = true }: PlanPickerProps) {
  const plans = includeTrial ? ALL_PLANS : ALL_PLANS.filter(p => p.id !== 'trial')

  return (
    <div className="space-y-3">
      {plans.map(p => {
        const selected = value === p.id
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            className={`w-full text-left rounded-xl border px-4 py-3.5 transition-all ${
              selected
                ? 'border-[#28AEA4] bg-[#28AEA4]/10'
                : 'border-[#2a2a2a] bg-[#171717] hover:border-[#3a3a3a]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`flex-shrink-0 w-4 h-4 rounded-full border flex items-center justify-center ${
                selected ? 'border-[#28AEA4] bg-[#28AEA4]' : 'border-[#3a3a3a]'
              }`}>
                {selected && (
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-bold ${selected ? 'text-[#28AEA4]' : 'text-white'}`}>{p.name}</p>
                  {p.highlight && (
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-[#28AEA4] text-white px-1.5 py-0.5 rounded">
                      Popular
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{p.desc}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className={`text-sm font-extrabold whitespace-nowrap ${selected ? 'text-[#28AEA4]' : 'text-white'}`}>
                  {p.price}<span className="text-xs font-normal text-gray-500">{p.period}</span>
                </p>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
