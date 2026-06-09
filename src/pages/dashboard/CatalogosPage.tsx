import { useState, useEffect } from 'react'
import { getProducts } from '../../api/client'
import type { Product } from '../../types'

const CATALOG_URL = `${window.location.protocol}//${window.location.hostname}:${window.location.port}/`
const WHATSAPP = import.meta.env.VITE_WHATSAPP_NUMBER ?? '5511999999999'

export function CatalogosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    getProducts().then(d => setProducts(d ?? []))
  }, [])

  const categories = [...new Set(products.map(p => p.category))]
  const categoryCount = (cat: string) => products.filter(p => p.category === cat).length

  const handleCopy = async () => {
    await navigator.clipboard.writeText(CATALOG_URL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShareWhatsApp = () => {
    const msg = `Olá! Acesse o nosso catálogo exclusivo RinoSeller e monte seu pedido:\n${CATALOG_URL}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <div className="min-h-full">
      <div className="px-6 py-7 border-b border-[#1c1c1c]">
        <h1 className="text-2xl font-bold text-white">Catálogos</h1>
        <p className="text-gray-500 text-sm mt-0.5">Compartilhe o catálogo com seus clientes</p>
      </div>

      <div className="px-6 py-6 space-y-5">

        {/* Catalog link */}
        <div className="bg-[#28AEA4]/5 border border-[#28AEA4]/20 rounded-2xl p-6">
          <p className="text-[10px] font-semibold text-[#28AEA4]/70 uppercase tracking-[0.2em] mb-2">Link do Catálogo Público</p>
          <p className="text-white font-mono text-sm bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 break-all mb-4">
            {CATALOG_URL}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleCopy}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                copied
                  ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/40'
                  : 'bg-[#28AEA4] hover:bg-[#3cbdb6] text-white'
              }`}
            >
              {copied ? '✓ Link copiado!' : '⎘ Copiar Link'}
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-[#111111] hover:bg-[#161616] text-white border border-[#2a2a2a] hover:border-[#3a3a3a] transition-all"
            >
              📱 Compartilhar no WhatsApp
            </button>
            <a
              href={CATALOG_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-[#111111] hover:bg-[#161616] text-white border border-[#2a2a2a] hover:border-[#3a3a3a] transition-all"
            >
              ↗ Abrir Catálogo
            </a>
          </div>
        </div>

        {/* How to share */}
        <div className="bg-[#111111] border border-[#1e1e1e] rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Como compartilhar</h2>
          <div className="space-y-4">
            {[
              { step: '1', title: 'Copie o link acima', desc: 'Clique em "Copiar Link" para salvar o endereço do catálogo.' },
              { step: '2', title: 'Envie pelo WhatsApp', desc: 'Cole o link na conversa com a cabeleireira ou use o botão direto acima.' },
              { step: '3', title: 'A cliente faz o pedido', desc: 'Ela adiciona produtos ao carrinho e finaliza. O pedido chega aqui no painel.' },
              { step: '4', title: 'Mensagem automática', desc: 'Você recebe a mensagem formatada com todos os itens pelo WhatsApp.' },
            ].map(item => (
              <div key={item.step} className="flex gap-4">
                <div className="w-7 h-7 rounded-full border border-[#28AEA4]/40 flex items-center justify-center flex-shrink-0 bg-[#28AEA4]/5">
                  <span className="text-[#28AEA4] text-xs font-bold">{item.step}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Categories overview */}
        <div className="bg-[#111111] border border-[#1e1e1e] rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Categorias no Catálogo</h2>
          {categories.length === 0 ? (
            <p className="text-gray-600 text-sm">Nenhum produto cadastrado.</p>
          ) : (
            <div className="space-y-2">
              {categories.map(cat => (
                <div key={cat} className="flex items-center justify-between py-2.5 border-b border-[#1a1a1a] last:border-0">
                  <span className="text-sm text-gray-300">{cat}</span>
                  <span className="text-xs bg-[#28AEA4]/10 text-[#28AEA4] border border-[#28AEA4]/20 rounded-full px-3 py-0.5 font-semibold">
                    {categoryCount(cat)} {categoryCount(cat) === 1 ? 'produto' : 'produtos'}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-semibold text-white">Total</span>
                <span className="text-sm font-bold text-[#28AEA4]">{products.length} produtos</span>
              </div>
            </div>
          )}
        </div>

        {/* WhatsApp config */}
        <div className="bg-[#111111] border border-[#1e1e1e] rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-1">Número do WhatsApp configurado</h2>
          <p className="text-xs text-gray-600 mb-3">
            Os pedidos são redirecionados para este número. Para alterar, edite o arquivo{' '}
            <code className="text-[#28AEA4] bg-[#28AEA4]/5 px-1 rounded">frontend/.env.local</code>.
          </p>
          <p className="font-mono text-sm text-white bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-2.5">
            {WHATSAPP}
          </p>
        </div>
      </div>
    </div>
  )
}
