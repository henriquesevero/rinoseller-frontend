import { BrandCatalogsSection } from '../../components/BrandCatalogsSection'

export function CatalogosPage() {
  return (
    <div className="min-h-full">
      <div className="px-6 py-7 border-b border-[#1c1c1c]">
        <h1 className="text-2xl font-bold text-white">Catálogos</h1>
        <p className="text-gray-500 text-sm mt-0.5">Catálogos de marca em PDF</p>
      </div>

      <div className="px-6 py-6 space-y-5">
        <BrandCatalogsSection />
      </div>
    </div>
  )
}
