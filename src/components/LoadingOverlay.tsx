interface Props {
  show: boolean
  label?: string
}

export function LoadingOverlay({ show, label }: Props) {
  if (!show) return null
  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex flex-col items-center justify-center gap-3 backdrop-blur-[1px]">
      <div className="w-10 h-10 border-[3px] border-[#28AEA4]/30 border-t-[#28AEA4] rounded-full animate-spin" />
      {label && <p className="text-white text-sm font-medium">{label}</p>}
    </div>
  )
}
