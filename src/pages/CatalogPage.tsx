import { useState, useEffect, useCallback } from 'react'
import { getProducts, createOrder } from '../api/client'
import type { CartItem, Product } from '../types'

// Número WhatsApp do vendedor — configure em frontend/.env.local
// VITE_WHATSAPP_NUMBER=5511999999999
const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER ?? '5511999999999'

const CATEGORIES = ['Todos', 'Lavatório', 'Químicos', 'Finalizadores']

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map())
  const [category, setCategory] = useState('Todos')
  const [showModal, setShowModal] = useState(false)
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getProducts()
      .then(data => setProducts(data ?? []))
      .catch(() => setError('Não foi possível carregar o catálogo. Verifique a conexão.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = category === 'Todos'
    ? products
    : products.filter(p => p.category === category)

  const cartItems = Array.from(cart.values())
  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0)
  const cartTotal = cartItems.reduce((s, i) => s + i.product.price * i.quantity, 0)

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const next = new Map(prev)
      const existing = next.get(product.id)
      next.set(product.id, { product, quantity: (existing?.quantity ?? 0) + 1 })
      return next
    })
  }, [])

  const updateQty = useCallback((productId: string, delta: number) => {
    setCart(prev => {
      const next = new Map(prev)
      const existing = next.get(productId)
      if (!existing) return next
      const newQty = existing.quantity + delta
      if (newQty <= 0) next.delete(productId)
      else next.set(productId, { ...existing, quantity: newQty })
      return next
    })
  }, [])

  const handleSubmit = async () => {
    if (!clientName.trim() || submitting) return
    setSubmitting(true)
    try {
      const items = cartItems.map(i => ({
        product_id: i.product.id,
        quantity: i.quantity,
      }))
      const order = await createOrder({
        client_name: clientName.trim(),
        client_phone: clientPhone.trim(),
        items,
      })

      // Monta mensagem formatada para WhatsApp
      const lines = order.items.map(
        i => `${i.quantity}x ${i.product_name} (${formatBRL(i.price * i.quantity)})`
      )
      const msg = [
        'Olá! Montei meu pedido pelo catálogo:',
        '----------------------------------',
        ...lines,
        '----------------------------------',
        `Total: ${formatBRL(order.total)}`,
        `Nome: ${clientName.trim()}`,
        clientPhone.trim() ? `Tel: ${clientPhone.trim()}` : '',
      ]
        .filter(Boolean)
        .join('\n')

      window.open(
        `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`,
        '_blank'
      )

      setCart(new Map())
      setShowModal(false)
      setClientName('')
      setClientPhone('')
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao registrar pedido. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">

      {/* Header */}
      <header className="bg-gradient-to-r from-rose-500 to-pink-600 text-white px-4 py-6 shadow-md">
        <div className="max-w-lg mx-auto">
          <p className="text-rose-100 text-xs font-medium tracking-widest uppercase mb-1">
            Distribuidora Oficial
          </p>
          <h1 className="text-2xl font-bold tracking-tight">RinoSeller</h1>
          <p className="text-rose-100 text-sm mt-0.5">
            Catálogo exclusivo para profissionais
          </p>
        </div>
      </header>

      {/* Category Tabs */}
      <div className="sticky top-0 bg-white shadow-sm z-10 border-b border-gray-100">
        <div className="max-w-lg mx-auto flex overflow-x-auto gap-2 px-4 py-3 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                category === cat
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product List */}
      <main className="max-w-lg mx-auto px-4 pt-4 space-y-3">
        {loading && (
          <div className="text-center py-16">
            <div className="inline-block w-8 h-8 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
            <p className="text-gray-400 text-sm mt-3">Carregando catálogo...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm text-center">
            {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            Nenhum produto nesta categoria.
          </div>
        )}

        {filtered.map(product => {
          const cartItem = cart.get(product.id)
          return (
            <div
              key={product.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-4"
            >
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 leading-tight">{product.name}</p>
                <span className="inline-block text-xs bg-rose-50 text-rose-600 rounded-full px-2.5 py-0.5 mt-1.5 font-medium">
                  {product.category}
                </span>
                <p className="text-rose-600 font-bold text-xl mt-1.5 tabular-nums">
                  {formatBRL(product.price)}
                </p>
              </div>

              {/* Cart control */}
              <div className="flex-shrink-0">
                {!cartItem ? (
                  <button
                    onClick={() => addToCart(product)}
                    className="bg-rose-500 hover:bg-rose-600 active:scale-95 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-all"
                  >
                    + Adicionar
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(product.id, -1)}
                      className="w-9 h-9 rounded-full border-2 border-rose-400 text-rose-500 text-lg font-bold hover:bg-rose-50 active:scale-95 transition-all flex items-center justify-center"
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-bold text-gray-800 text-base tabular-nums">
                      {cartItem.quantity}
                    </span>
                    <button
                      onClick={() => updateQty(product.id, 1)}
                      className="w-9 h-9 rounded-full bg-rose-500 text-white text-lg font-bold hover:bg-rose-600 active:scale-95 transition-all flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </main>

      {/* Floating Cart Bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 px-4 pb-safe">
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-4 flex items-center gap-4 mb-4">
              <div className="bg-rose-500 text-white rounded-xl w-10 h-10 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {cartCount}
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">
                  {cartCount === 1 ? '1 item no carrinho' : `${cartCount} itens no carrinho`}
                </p>
                <p className="font-bold text-gray-800 text-lg tabular-nums">
                  {formatBRL(cartTotal)}
                </p>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="bg-rose-500 hover:bg-rose-600 active:scale-95 text-white rounded-xl px-5 py-3 font-semibold text-sm transition-all flex-shrink-0"
              >
                Finalizar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-30 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Confirmar Pedido</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Order Summary */}
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                {cartItems.map(item => (
                  <div
                    key={item.product.id}
                    className="flex justify-between text-sm text-gray-700"
                  >
                    <span className="font-medium">
                      {item.quantity}x {item.product.name}
                    </span>
                    <span className="tabular-nums text-gray-600">
                      {formatBRL(item.product.price * item.quantity)}
                    </span>
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold text-gray-800">
                  <span>Total</span>
                  <span className="text-rose-600 tabular-nums">{formatBRL(cartTotal)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nome do Salão / Profissional <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="Ex: Cleide — Salão Bella Vita"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Telefone <span className="text-gray-400 text-xs">(opcional)</span>
                </label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={e => setClientPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 text-gray-600 rounded-xl py-3 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!clientName.trim() || submitting}
                  className="flex-1 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 disabled:cursor-not-allowed text-white rounded-xl py-3 font-semibold transition-colors"
                >
                  {submitting ? 'Enviando...' : '📱 Enviar via WhatsApp'}
                </button>
              </div>

              <p className="text-center text-xs text-gray-400">
                Seu pedido será registrado e você será redirecionado ao WhatsApp.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
