interface SplashScreenProps {
  fadingOut: boolean
}

export function SplashScreen({ fadingOut }: SplashScreenProps) {
  return (
    <div
      className={`fixed inset-0 z-[100] bg-[#0a0a0a] flex items-center justify-center transition-opacity duration-300 ${
        fadingOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,_rgba(40,174,164,0.12)_0%,_transparent_70%)]" />
      <div className="relative flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-[#28AEA4]/15 border border-[#28AEA4]/40 flex items-center justify-center animate-[splash-pulse_1.1s_ease-in-out_infinite]">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="#28AEA4">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <span className="text-white font-bold text-lg tracking-wide">RinoSeller</span>
      </div>
      <style>{`
        @keyframes splash-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.75; }
        }
      `}</style>
    </div>
  )
}
