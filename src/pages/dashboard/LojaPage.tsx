const CATALOG_URL = '/'

export function LojaPage() {
  return (
    <div className="flex flex-col h-full min-h-screen">
      {/* Toolbar */}
      <div className="px-6 py-4 border-b border-[#1c1c1c] flex items-center justify-between bg-[#0c0c0c] flex-shrink-0">
        <div>
          <h1 className="text-base font-bold text-white">Prévia da Loja</h1>
          <p className="text-gray-600 text-xs mt-0.5">Visualize como seus clientes veem o catálogo</p>
        </div>
        <a
          href={CATALOG_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#28AEA4] hover:bg-[#3cbdb6] text-white font-bold px-4 py-2 rounded-xl text-xs tracking-wide transition-colors flex items-center gap-2"
        >
          ↗ Abrir em nova aba
        </a>
      </div>

      {/* Iframe */}
      <div className="flex-1 relative bg-[#080808]">
        <iframe
          src={CATALOG_URL}
          title="Catálogo RinoSeller"
          className="w-full h-full border-0 min-h-[calc(100vh-80px)]"
          style={{ minHeight: 'calc(100vh - 130px)' }}
        />
      </div>
    </div>
  )
}
