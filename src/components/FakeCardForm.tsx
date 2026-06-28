import { useState, type FormEvent } from 'react'
import { checkoutSubscription } from '../api/client'

interface FakeCardFormProps {
  email: string
  plan: 'base' | 'professional'
  planLabel: string
  planPrice: string
  onSuccess: () => void
  onBack?: () => void
}

function formatCardNumber(value: string): string {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ')
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

export function FakeCardForm({ email, plan, planLabel, planPrice, onSuccess, onBack }: FakeCardFormProps) {
  const [holderName, setHolderName] = useState('')
  const [number,     setNumber]     = useState('')
  const [expiry,     setExpiry]     = useState('')
  const [cvv,         setCvv]       = useState('')
  const [error,       setError]     = useState('')
  const [processing,  setProcessing] = useState(false)

  const valid = holderName.trim().length > 2 && number.replace(/\s/g, '').length === 16 && expiry.length === 5 && cvv.length >= 3

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!valid || processing) return
    setError('')
    setProcessing(true)
    const [expiry_month, expiry_year] = expiry.split('/')
    try {
      await checkoutSubscription({
        email,
        plan,
        holder_name: holderName.trim(),
        number: number.replace(/\s/g, ''),
        expiry_month,
        expiry_year: `20${expiry_year}`,
        cvv,
      })
      onSuccess()
    } catch {
      setError('Não foi possível confirmar o pagamento. Verifique os dados e tente novamente.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="bg-[#0f0f0f] border border-[#222222] rounded-2xl p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-[0.2em] mb-1">Assinando</p>
          <p className="text-sm font-bold text-white">{planLabel} <span className="text-gray-500 font-normal">— {planPrice}</span></p>
        </div>
        <div className="w-9 h-9 rounded-lg bg-[#28AEA4]/10 border border-[#28AEA4]/30 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#28AEA4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
          </svg>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-[0.2em] mb-2">Nome no cartão</label>
          <input
            type="text"
            value={holderName}
            onChange={e => setHolderName(e.target.value)}
            placeholder="Como está impresso no cartão"
            autoComplete="cc-name"
            className="w-full bg-[#171717] border border-[#2a2a2a] focus:border-[#28AEA4] text-white rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder-gray-700"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-[0.2em] mb-2">Número do cartão</label>
          <input
            type="text"
            inputMode="numeric"
            value={number}
            onChange={e => setNumber(formatCardNumber(e.target.value))}
            placeholder="0000 0000 0000 0000"
            autoComplete="cc-number"
            className="w-full bg-[#171717] border border-[#2a2a2a] focus:border-[#28AEA4] text-white rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder-gray-700 tabular-nums"
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-[0.2em] mb-2">Validade</label>
            <input
              type="text"
              inputMode="numeric"
              value={expiry}
              onChange={e => setExpiry(formatExpiry(e.target.value))}
              placeholder="MM/AA"
              autoComplete="cc-exp"
              className="w-full bg-[#171717] border border-[#2a2a2a] focus:border-[#28AEA4] text-white rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder-gray-700 tabular-nums"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-[0.2em] mb-2">CVV</label>
            <input
              type="text"
              inputMode="numeric"
              value={cvv}
              onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="123"
              autoComplete="cc-csc"
              className="w-full bg-[#171717] border border-[#2a2a2a] focus:border-[#28AEA4] text-white rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder-gray-700 tabular-nums"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-xs text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!valid || processing}
          className="w-full bg-[#28AEA4] hover:bg-[#3cbdb6] active:bg-[#1d9992] disabled:bg-[#0c5a55] disabled:text-[#6edbd5] text-white font-bold py-3.5 rounded-xl transition-all text-sm tracking-[0.15em] uppercase mt-2"
        >
          {processing ? 'Processando pagamento...' : 'Confirmar assinatura'}
        </button>

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            disabled={processing}
            className="w-full text-center text-gray-600 hover:text-gray-400 text-xs transition-colors pt-1"
          >
            ← Voltar
          </button>
        )}

        <p className="text-[10px] text-gray-700 text-center leading-relaxed pt-1">
          Pagamento processado de forma segura. Você pode cancelar quando quiser.
        </p>
      </form>
    </div>
  )
}
