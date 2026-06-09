import { useState, useEffect, useCallback } from 'react'
import { getProducts, getOrders, updatePrice, updateStock } from '../api/client'
import type { Order, Product } from '../types'

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type Tab = 'stock' | 'orders'
type EditField = 'price' | 'stock'

interface EditState {
  productId: string
  field: EditField
  value: string
}

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('stock')
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [prods, ords] = await Promise.all([getProducts(), getOrders()])
      // Ordena produtos por nome para exibição consistente
      setProducts((prods ?? []).sort((a, b) => a.name.localeCompare(b.name)))
      setOrders(ords ?? [])
    } catch {
      alert('Erro ao carregar dados. Verifique se o backend está rodando.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const startEdit = (product: Product, field: EditField) => {
    setEdit({
      productId: product.id,
      field,
      value: field === 'price' ? String(product.price) : String(product.stock_quantity),
    })
  }

  const cancelEdit = () => setEdit(null)

  const saveEdit = async () => {
    if (!edit || saving) return
    const num = parseFloat(edit.value)
    if (isNaN(num) || num < 0) {
      alert('Valor inválido.')
      return
    }
    setSaving(true)
    try {
      if (edit.field === 'price') {
        await updatePrice(edit.productId, num)
      } else {
        await updateStock(edit.productId, Math.floor(num))
      }
      await loadData()
      setEdit(null)
    } catch {
      alert('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEdit()
    if (e.key === 'Escape') cancelEdit()
  }

  const ordersDesc = [...orders].reverse()
  const readyCount = orders.filter(o => o.status === 'Pronta-Entrega').length
  const backorderCount = orders.filter(o => o.status === 'Encomenda').length

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-gray-900 text-white px-4 py-5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-xs tracking-widest uppercase font-medium">
              RinoSeller
            </p>
            <h1 className="text-xl font-bold mt-0.5">Painel Administrativo</h1>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="text-gray-400 hover:text-white text-sm border border-gray-700 hover:border-gray-500 rounded-xl px-3 py-2 transition-colors disabled:opacity-50"
          >
            {loading ? '...' : '↻ Atualizar'}
          </button>
        </div>
      </header>

      {/* Stats bar */}
      {!loading && (
        <div className="bg-gray-800 text-white px-4 py-2">
          <div className="max-w-2xl mx-auto flex gap-6 text-xs">
            <span className="text-gray-400">
              <span className="text-white font-semibold">{products.length}</span> produtos
            </span>
            <span className="text-gray-400">
              <span className="text-green-400 font-semibold">{readyCount}</span> Pronta-Entrega
            </span>
            <span className="text-gray-400">
              <span className="text-amber-400 font-semibold">{backorderCount}</span> Encomenda
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex">
          {(['stock', 'orders'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-rose-500 text-rose-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'stock' ? '📦 Gestão de Estoque' : '🧾 Pedidos Recebidos'}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-4">
        {loading && (
          <div className="text-center py-16">
            <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
            <p className="text-gray-400 text-sm mt-3">Carregando...</p>
          </div>
        )}

        {/* ── STOCK TAB ── */}
        {!loading && tab === 'stock' && (
          <div className="space-y-3">
            {products.map(product => {
              const isEditing = edit?.productId === product.id
              const lowStock = product.stock_quantity <= 3

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4"
                >
                  {/* Product title */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm leading-snug">
                        {product.name}
                      </p>
                      <span className="text-xs bg-rose-50 text-rose-600 rounded-full px-2.5 py-0.5 inline-block mt-1 font-medium">
                        {product.category}
                      </span>
                    </div>
                    {lowStock && (
                      <span className="text-xs bg-amber-50 text-amber-600 rounded-full px-2.5 py-0.5 font-semibold flex-shrink-0">
                        Estoque baixo
                      </span>
                    )}
                  </div>

                  {/* Editable fields grid */}
                  <div className="grid grid-cols-2 gap-3">

                    {/* Price */}
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-500 mb-1 font-medium">Preço de Venda</p>
                      {isEditing && edit?.field === 'price' ? (
                        <>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500 text-sm">R$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={edit.value}
                              onChange={e => setEdit({ ...edit, value: e.target.value })}
                              onKeyDown={handleKeyDown}
                              className="w-full border border-rose-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                              autoFocus
                            />
                          </div>
                          <div className="flex gap-1.5 mt-2">
                            <button
                              onClick={saveEdit}
                              disabled={saving}
                              className="flex-1 bg-rose-500 disabled:bg-rose-300 text-white text-xs rounded-lg py-1.5 font-medium"
                            >
                              {saving ? '...' : 'Salvar'}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="flex-1 border border-gray-300 text-gray-600 text-xs rounded-lg py-1.5"
                            >
                              Cancelar
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="font-bold text-rose-600 text-lg tabular-nums">
                            {formatBRL(product.price)}
                          </p>
                          <button
                            onClick={() => startEdit(product, 'price')}
                            className="text-xs text-rose-500 hover:text-rose-700 hover:underline mt-1 font-medium"
                          >
                            Editar Preço
                          </button>
                        </>
                      )}
                    </div>

                    {/* Stock */}
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-500 mb-1 font-medium">Estoque</p>
                      {isEditing && edit?.field === 'stock' ? (
                        <>
                          <input
                            type="number"
                            min="0"
                            value={edit.value}
                            onChange={e => setEdit({ ...edit, value: e.target.value })}
                            onKeyDown={handleKeyDown}
                            className="w-full border border-rose-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                            autoFocus
                          />
                          <div className="flex gap-1.5 mt-2">
                            <button
                              onClick={saveEdit}
                              disabled={saving}
                              className="flex-1 bg-rose-500 disabled:bg-rose-300 text-white text-xs rounded-lg py-1.5 font-medium"
                            >
                              {saving ? '...' : 'Salvar'}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="flex-1 border border-gray-300 text-gray-600 text-xs rounded-lg py-1.5"
                            >
                              Cancelar
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className={`font-bold text-lg tabular-nums ${
                            lowStock ? 'text-amber-500' : 'text-gray-800'
                          }`}>
                            {product.stock_quantity}
                            <span className="text-sm font-normal text-gray-400 ml-1">unid.</span>
                          </p>
                          <button
                            onClick={() => startEdit(product, 'stock')}
                            className="text-xs text-rose-500 hover:text-rose-700 hover:underline mt-1 font-medium"
                          >
                            Ajustar Estoque
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── ORDERS TAB ── */}
        {!loading && tab === 'orders' && (
          <div className="space-y-3">
            {ordersDesc.length === 0 && (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🛒</p>
                <p className="text-gray-500 font-medium">Nenhum pedido recebido ainda.</p>
                <p className="text-gray-400 text-sm mt-1">
                  Compartilhe o link do catálogo com seus clientes.
                </p>
              </div>
            )}

            {ordersDesc.map(order => (
              <div
                key={order.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4"
              >
                {/* Order header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{order.client_name}</p>
                    {order.client_phone && (
                      <p className="text-sm text-gray-500">{order.client_phone}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.created_at)}</p>
                  </div>
                  <span
                    className={`flex-shrink-0 text-xs font-bold rounded-full px-3 py-1.5 ${
                      order.status === 'Pronta-Entrega'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {order.status === 'Pronta-Entrega' ? '✓ Pronta-Entrega' : '⏳ Encomenda'}
                  </span>
                </div>

                {/* Items */}
                <div className="border-t border-gray-100 pt-3 space-y-1.5">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-700">
                        <span className="font-medium">{item.quantity}x</span>{' '}
                        {item.product_name}
                      </span>
                      <span className="text-gray-600 tabular-nums flex-shrink-0 ml-2">
                        {formatBRL(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-gray-800 pt-2 border-t border-gray-100 mt-1">
                    <span>Total do Pedido</span>
                    <span className="text-rose-600 tabular-nums">
                      {formatBRL(order.total)}
                    </span>
                  </div>
                </div>

                {/* Alert for backorder */}
                {order.status === 'Encomenda' && (
                  <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700">
                    <strong>Atenção:</strong> Estoque insuficiente no momento do pedido.
                    Verifique o que precisa ser reabastecido na distribuidora.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
