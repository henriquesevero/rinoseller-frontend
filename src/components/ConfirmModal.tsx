interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({ open, title, message, confirmLabel = 'Confirmar', danger = false, onConfirm, onCancel }: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/70 z-[60] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl w-full max-w-sm shadow-[0_8px_40px_rgba(0,0,0,0.18)] overflow-hidden">

        {/* Content */}
        <div className="px-6 pt-6 pb-5 text-center">
          <h3 className="text-[#1d1d1f] dark:text-white font-semibold text-[15px] leading-snug mb-2">
            {title}
          </h3>
          <p className="text-[#3a3a3c] dark:text-gray-400 text-[13px] leading-relaxed">
            {message}
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-black/[0.08] dark:bg-[#2a2a2a]" />

        {/* Actions */}
        <div className="flex">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 text-[15px] font-medium text-[#6e6e73] dark:text-gray-400
                       hover:bg-black/[0.04] dark:hover:bg-white/[0.05]
                       transition-colors border-r border-black/[0.08] dark:border-[#2a2a2a]"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3.5 text-[15px] font-semibold transition-colors
              hover:bg-black/[0.04] dark:hover:bg-white/[0.05]
              ${danger
                ? 'text-red-500 dark:text-red-400'
                : 'text-[#28AEA4]'
              }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
