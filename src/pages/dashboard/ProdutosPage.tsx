import { useState, useEffect, useCallback, useRef } from 'react'
import { getProducts, createProduct, updatePrice, updateStock, deleteProduct } from '../../api/client'
import type { Product, KitItem } from '../../types'
import { ConfirmModal } from '../../components/ConfirmModal'
import { exportProductsPDF } from '../../utils/productDocument'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const DEFAULT_CATEGORIES: CategoryDef[] = [
  { name: 'Lavatório',    showFilter: true },
  { name: 'Químicos',     showFilter: true },
  { name: 'Finalizadores',showFilter: true },
  { name: 'Tratamentos',  showFilter: true },
  { name: 'Coloração',    showFilter: true },
  { name: 'Outros',       showFilter: true },
]

interface CategoryDef { name: string; showFilter: boolean }

function loadCategories(): CategoryDef[] {
  try {
    const raw = localStorage.getItem('korav_categories')
    if (raw) return JSON.parse(raw) as CategoryDef[]
  } catch { /* ignore */ }
  return DEFAULT_CATEGORIES
}

function saveCategories(cats: CategoryDef[]) {
  localStorage.setItem('korav_categories', JSON.stringify(cats))
}

type EditField = 'price' | 'stock'
interface EditState { productId: string; field: EditField; value: string }

interface ImportRow {
  name: string; category: string; price: number; cost_price: number
  stock_quantity: number; code: string; error?: string
}

function nextCodeNum(products: Product[]): number {
  return products.reduce((max, p) => {
    const n = parseInt(p.code ?? '0', 10)
    return isNaN(n) ? max : Math.max(max, n)
  }, 0) + 1
}

function padCode(n: number): string {
  return n.toString().padStart(3, '0')
}

const EMPTY_NEW = { name: '', category: '', price: '', cost_price: '', stock_quantity: '', code: '' }

export function ProdutosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newP, setNewP] = useState(EMPTY_NEW)
  const [creating, setCreating] = useState(false)
  const [isKit, setIsKit] = useState(false)
  const [kitItems, setKitItems] = useState<KitItem[]>([])
  const [kitSearch, setKitSearch] = useState('')
  const [filterCat, setFilterCat] = useState('Todos')
  const [categories, setCategories] = useState<CategoryDef[]>(loadCategories)
  const [showCatModal, setShowCatModal] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatFilter, setNewCatFilter] = useState(true)
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importRows, setImportRows] = useState<ImportRow[]>([])
  const [importing, setImporting] = useState(false)
  const [importDone, setImportDone] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getProducts().catch(() => [])
    setProducts((data ?? []).sort((a, b) => a.name.localeCompare(b.name)))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const startEdit = (p: Product, field: EditField) => {
    setEdit({ productId: p.id, field, value: field === 'price' ? String(p.price) : String(p.stock_quantity) })
  }

  const saveEdit = async () => {
    if (!edit || saving) return
    const num = parseFloat(edit.value)
    if (isNaN(num) || num < 0) return
    setSaving(true)
    try {
      if (edit.field === 'price') await updatePrice(edit.productId, num)
      else await updateStock(edit.productId, Math.floor(num))
      await load()
      setEdit(null)
    } catch { alert('Erro ao salvar.') }
    finally { setSaving(false) }
  }

  const openNew = () => {
    setNewP({ ...EMPTY_NEW, code: padCode(nextCodeNum(products)) })
    setIsKit(false)
    setKitItems([])
    setKitSearch('')
    setShowNew(true)
  }

  const addKitItem = (p: Product) => {
    setKitItems(items => {
      const existing = items.find(i => i.product_id === p.id)
      if (existing) {
        return items.map(i => i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...items, { product_id: p.id, product_name: p.name, quantity: 1 }]
    })
    setKitSearch('')
  }

  const setKitItemQty = (productId: string, qty: number) => {
    setKitItems(items => items.map(i => i.product_id === productId ? { ...i, quantity: Math.max(1, qty) } : i))
  }

  const removeKitItem = (productId: string) => {
    setKitItems(items => items.filter(i => i.product_id !== productId))
  }

  const handleCreate = async () => {
    if (!newP.name || !newP.price) return
    if (isKit && kitItems.length === 0) return
    setCreating(true)
    try {
      await createProduct({
        name: newP.name,
        category: newP.category,
        price: parseFloat(newP.price) || 0,
        cost_price: parseFloat(newP.cost_price) || 0,
        stock_quantity: isKit ? 0 : (parseInt(newP.stock_quantity) || 0),
        code: newP.code,
        is_kit: isKit,
        kit_items: isKit ? kitItems : undefined,
      })
      await load()
      setShowNew(false)
      setNewP(EMPTY_NEW)
      setIsKit(false)
      setKitItems([])
    } catch { alert('Erro ao criar produto.') }
    finally { setCreating(false) }
  }

  const doDelete = async () => {
    if (!confirmDelete) return
    const id = confirmDelete
    setConfirmDelete(null)
    try { await deleteProduct(id); await load() }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erro ao excluir produto') }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) ?? ''
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
      let codeNum = nextCodeNum(products)
      const rows: ImportRow[] = lines.map(line => {
        const parts = line.split(';').map(f => f.trim())
        const [nameRaw, catRaw, priceRaw, costRaw, stockRaw] = parts
        const price = parseFloat((priceRaw ?? '').replace(',', '.'))
        const cost_price = parseFloat((costRaw ?? '').replace(',', '.'))
        const stock_quantity = parseInt(stockRaw ?? '0', 10)
        return {
          name: nameRaw ?? '',
          category: catRaw || 'Outros',
          price: isNaN(price) ? 0 : price,
          cost_price: isNaN(cost_price) ? 0 : cost_price,
          stock_quantity: isNaN(stock_quantity) ? 0 : stock_quantity,
          code: padCode(codeNum++),
          error: !nameRaw ? 'Nome ausente' : undefined,
        }
      })
      // detect new categories from CSV and add them (showFilter: false by default)
      const csvCats = [...new Set(rows.map(r => r.category).filter(Boolean))]
      setCategories(prev => {
        const existing = new Set(prev.map(c => c.name))
        const toAdd = csvCats.filter(n => !existing.has(n)).map(n => ({ name: n, showFilter: false }))
        if (toAdd.length === 0) return prev
        const next = [...prev, ...toAdd]
        saveCategories(next)
        return next
      })
      setImportRows(rows)
      setShowImport(true)
    }
    reader.readAsText(file, 'utf-8')
    e.target.value = ''
  }

  const doImport = async () => {
    const valid = importRows.filter(r => !r.error)
    if (!valid.length) return
    setImporting(true)
    setImportDone(0)
    for (const row of valid) {
      try {
        await createProduct({
          name: row.name,
          category: row.category,
          price: row.price,
          cost_price: row.cost_price,
          stock_quantity: row.stock_quantity,
          code: row.code,
        })
      } catch { /* continua mesmo se um falhar */ }
      setImportDone(d => d + 1)
    }
    setShowImport(false)
    setImportRows([])
    setImporting(false)
    await load()
  }

  const filtered = products
    .filter(p => {
      if (filterCat === 'Todos') return true
      if (filterCat === 'Estoque Baixo') return !p.is_kit && p.stock_quantity <= 3
      return p.category === filterCat
    })
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))

  const validImport = importRows.filter(r => !r.error)

  const kitSearchResults = kitSearch.trim()
    ? products
        .filter(p => !p.is_kit)
        .filter(p => p.name.toLowerCase().includes(kitSearch.toLowerCase()))
        .filter(p => !kitItems.some(i => i.product_id === p.id))
        .slice(0, 8)
    : []

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="px-6 py-6 border-b border-[#1c1c1c] flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Produtos</h1>
          <p className="text-gray-500 text-sm mt-0.5">{products.length} produtos cadastrados</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileChange} />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-[#2a2a2a] text-gray-400 hover:text-white hover:border-[#3a3a3a] rounded-xl text-sm transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Importar CSV
          </button>
          <button
            onClick={() => exportProductsPDF(products)}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-[#2a2a2a] text-gray-400 hover:text-white hover:border-[#3a3a3a] rounded-xl text-sm transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Exportar PDF
          </button>
          <button
            onClick={openNew}
            className="bg-[#28AEA4] hover:bg-[#3cbdb6] text-white font-bold px-5 py-2 rounded-xl text-sm tracking-wide transition-colors"
          >
            + Novo Produto
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 pt-5">
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Buscar produto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#111] border border-[#1e1e1e] focus:border-[#28AEA4]/40 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-colors placeholder:text-gray-600"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors">×</button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 pt-3 flex items-center gap-2 overflow-x-auto scrollbar-hide">
        {['Todos', 'Estoque Baixo', ...categories.filter(c => c.showFilter).map(c => c.name)].map(c => (
          <button
            key={c}
            onClick={() => setFilterCat(c)}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              filterCat === c
                ? c === 'Estoque Baixo'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-[#28AEA4]/15 text-[#28AEA4] border border-[#28AEA4]/30'
                : 'bg-[#141414] text-gray-500 border border-[#222] hover:text-gray-300'
            }`}
          >
            {c}
          </button>
        ))}
        <button
          onClick={() => setShowCatModal(true)}
          title="Gerenciar categorias"
          className="flex-shrink-0 ml-1 w-7 h-7 rounded-full bg-[#141414] border border-[#222] text-gray-600 hover:text-[#28AEA4] hover:border-[#28AEA4]/30 flex items-center justify-center transition-all"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>
          </svg>
        </button>
      </div>

      {/* Product list */}
      <div className="px-6 py-4 space-y-1.5">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-[#28AEA4]/30 border-t-[#28AEA4] rounded-full animate-spin" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-gray-600">
            <p>Nenhum produto encontrado</p>
          </div>
        )}

        {!loading && filtered.map(product => {
          const isEditing = edit?.productId === product.id
          const low = product.stock_quantity <= 3

          return (
            <div key={product.id} className="bg-[#111111] border border-[#1e1e1e] hover:border-[#2a2a2a] rounded-xl px-4 py-3 transition-colors">
              <div className="flex items-center gap-3">
                {product.code && (
                  <span className="text-[10px] text-gray-600 font-mono w-7 flex-shrink-0">{product.code}</span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-white text-sm">{product.name}</p>
                    {product.is_kit && (
                      <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full px-2 py-0.5 font-medium tracking-wider uppercase flex-shrink-0">
                        Kit
                      </span>
                    )}
                    <span className="text-[10px] bg-[#28AEA4]/10 text-[#28AEA4] border border-[#28AEA4]/20 rounded-full px-2 py-0.5 font-medium tracking-wider uppercase flex-shrink-0">
                      {product.category}
                    </span>
                    {!product.is_kit && product.stock_quantity === 0 && (
                      <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 rounded-full px-2 py-0.5 font-medium flex-shrink-0">
                        Zerado
                      </span>
                    )}
                    {!product.is_kit && product.stock_quantity > 0 && product.stock_quantity <= 3 && (
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-2 py-0.5 font-medium flex-shrink-0">
                        Estoque baixo
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[#28AEA4] font-bold text-sm tabular-nums">{formatBRL(product.price)}</span>
                    <span className="text-gray-700 text-xs">custo {formatBRL(product.cost_price)}</span>
                    {!product.is_kit && (
                      <span className={`text-xs font-medium ${product.stock_quantity === 0 ? 'text-red-400' : low ? 'text-amber-400' : 'text-gray-500'}`}>{product.stock_quantity} un.</span>
                    )}
                  </div>
                  {product.is_kit && product.kit_items && product.kit_items.length > 0 && (
                    <p className="text-xs text-gray-600 mt-1 truncate">
                      Inclui: {product.kit_items.map(i => `${i.quantity}x ${i.product_name}`).join(' + ')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => startEdit(product, 'price')}
                    title="Editar preço"
                    className={`px-2 py-1.5 text-xs font-bold rounded-lg transition-colors ${isEditing && edit?.field === 'price' ? 'text-[#28AEA4] bg-[#28AEA4]/10' : 'text-gray-600 hover:text-[#28AEA4]'}`}
                  >
                    R$
                  </button>
                  {!product.is_kit && (
                    <button
                      onClick={() => startEdit(product, 'stock')}
                      title="Ajustar estoque"
                      className={`p-1.5 rounded-lg transition-colors ${isEditing && edit?.field === 'stock' ? 'text-[#28AEA4] bg-[#28AEA4]/10' : 'text-gray-600 hover:text-[#28AEA4]'}`}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmDelete(product.id)}
                    title="Excluir produto"
                    className="p-1.5 text-gray-700 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                </div>
              </div>

              {isEditing && (
                <div className="mt-3 pt-3 border-t border-[#1a1a1a] flex items-center gap-2">
                  <span className="text-gray-500 text-xs flex-shrink-0">
                    {edit?.field === 'price' ? 'Novo preço (R$):' : 'Novo estoque:'}
                  </span>
                  <input
                    type="number"
                    step={edit?.field === 'price' ? '0.01' : '1'}
                    min="0"
                    value={edit?.value ?? ''}
                    onChange={e => setEdit(prev => prev ? { ...prev, value: e.target.value } : null)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEdit(null) }}
                    className="w-32 bg-[#171717] border border-[#28AEA4]/40 rounded-lg px-2 py-1.5 text-sm text-white outline-none"
                    autoFocus
                  />
                  <button onClick={saveEdit} disabled={saving}
                    className="px-3 py-1.5 bg-[#28AEA4] disabled:bg-[#0c5a55] text-white text-xs rounded-lg font-bold">
                    {saving ? '...' : 'Salvar'}
                  </button>
                  <button onClick={() => setEdit(null)}
                    className="px-3 py-1.5 border border-[#2a2a2a] text-gray-500 text-xs rounded-lg">
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* New product modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#1c1c1c]">
              <h2 className="text-lg font-bold text-white">Novo Produto</h2>
              <button onClick={() => setShowNew(false)} className="text-gray-600 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Código</label>
                  <input
                    className="field-input"
                    placeholder="001"
                    value={newP.code}
                    onChange={e => setNewP(p => ({ ...p, code: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="field-label">Categoria</label>
                  <select className="field-input" value={newP.category}
                    onChange={e => setNewP(p => ({ ...p, category: e.target.value }))}>
                    <option value="">Selecionar...</option>
                    {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="field-label">Nome do Produto *</label>
                <input className="field-input" placeholder="Ex: Shampoo Lavatório 5L"
                  value={newP.name} onChange={e => setNewP(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Preço de Venda (R$) *</label>
                  <input type="number" className="field-input" placeholder="0,00" value={newP.price}
                    onChange={e => setNewP(p => ({ ...p, price: e.target.value }))} />
                </div>
                <div>
                  <label className="field-label">Preço de Custo (R$)</label>
                  <input type="number" className="field-input" placeholder="0,00" value={newP.cost_price}
                    onChange={e => setNewP(p => ({ ...p, cost_price: e.target.value }))} />
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setIsKit(v => !v); setKitItems([]); setKitSearch('') }}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                  isKit ? 'bg-[#28AEA4]/10 border-[#28AEA4]/30' : 'bg-[#171717] border-[#2a2a2a] hover:border-[#3a3a3a]'
                }`}
              >
                <div>
                  <p className={`text-sm font-medium ${isKit ? 'text-[#28AEA4]' : 'text-gray-300'}`}>Este produto é um kit</p>
                  <p className="text-xs text-gray-600 mt-0.5">Agrupa outros produtos como combo (ex: Kit Elements = shampoo + condicionador)</p>
                </div>
                <div className={`w-10 h-6 rounded-full flex-shrink-0 relative transition-colors ${isKit ? 'bg-[#28AEA4]' : 'bg-[#2a2a2a]'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${isKit ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                </div>
              </button>

              {isKit ? (
                <div>
                  <label className="field-label">Produtos do kit *</label>
                  <div className="relative">
                    <input
                      className="field-input"
                      placeholder="Buscar produto para adicionar..."
                      value={kitSearch}
                      onChange={e => setKitSearch(e.target.value)}
                    />
                    {kitSearchResults.length > 0 && (
                      <div className="absolute z-10 left-0 right-0 mt-1.5 bg-[#171717] border border-[#2a2a2a] rounded-xl overflow-hidden shadow-xl max-h-48 overflow-y-auto">
                        {kitSearchResults.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => addKitItem(p)}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-[#28AEA4]/10 hover:text-[#28AEA4] transition-colors flex items-center justify-between gap-2"
                          >
                            <span className="truncate">{p.name}</span>
                            <span className="text-xs text-gray-600 flex-shrink-0">{formatBRL(p.price)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {kitItems.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {kitItems.map(item => (
                        <div key={item.product_id} className="flex items-center gap-2 bg-[#171717] border border-[#2a2a2a] rounded-xl px-3 py-2">
                          <span className="flex-1 text-sm text-gray-300 truncate">{item.product_name}</span>
                          <button type="button" onClick={() => setKitItemQty(item.product_id, item.quantity - 1)}
                            className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-white border border-[#2a2a2a] rounded-md text-sm">−</button>
                          <span className="w-6 text-center text-sm text-white tabular-nums">{item.quantity}</span>
                          <button type="button" onClick={() => setKitItemQty(item.product_id, item.quantity + 1)}
                            className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-white border border-[#2a2a2a] rounded-md text-sm">+</button>
                          <button type="button" onClick={() => removeKitItem(item.product_id)}
                            className="text-gray-700 hover:text-red-400 transition-colors ml-1">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {kitItems.length === 0 && (
                    <p className="text-xs text-gray-700 mt-2">Adicione ao menos um produto componente do kit.</p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="field-label">Estoque Inicial</label>
                  <input type="number" className="field-input" placeholder="0" value={newP.stock_quantity}
                    onChange={e => setNewP(p => ({ ...p, stock_quantity: e.target.value }))} />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowNew(false)}
                  className="flex-1 border border-[#2a2a2a] text-gray-400 rounded-xl py-3 text-sm hover:bg-[#141414] transition-colors">
                  Cancelar
                </button>
                <button onClick={handleCreate} disabled={creating || !newP.name || !newP.price || (isKit && kitItems.length === 0)}
                  className="flex-1 bg-[#28AEA4] hover:bg-[#3cbdb6] disabled:bg-[#0c5a55] disabled:text-[#6edbd5] text-white font-bold rounded-xl py-3 text-sm transition-colors">
                  {creating ? 'Criando...' : 'Criar Produto'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#1c1c1c]">
              <div>
                <h2 className="text-lg font-bold text-white">Importar Produtos</h2>
                <p className="text-xs text-gray-500 mt-0.5">{importRows.length} linha(s) · {validImport.length} válida(s)</p>
              </div>
              <button onClick={() => { setShowImport(false); setImportRows([]) }} className="text-gray-600 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[#0f0f0f]">
                  <tr className="border-b border-[#1c1c1c] text-gray-500">
                    <th className="text-left px-6 py-3 font-semibold">Cód.</th>
                    <th className="text-left px-3 py-3 font-semibold">Nome</th>
                    <th className="text-left px-3 py-3 font-semibold">Categoria</th>
                    <th className="text-right px-3 py-3 font-semibold">Preço</th>
                    <th className="text-right px-3 py-3 font-semibold">Custo</th>
                    <th className="text-center px-6 py-3 font-semibold">Estoque</th>
                  </tr>
                </thead>
                <tbody>
                  {importRows.map((row, i) => (
                    <tr key={i} className={`border-b border-[#111] ${row.error ? 'opacity-40' : ''}`}>
                      <td className="px-6 py-2.5 text-gray-600 font-mono">{row.code}</td>
                      <td className="px-3 py-2.5 text-white">
                        {row.name || <span className="text-red-400 italic">vazio</span>}
                        {row.error && <span className="ml-2 text-red-400 text-[10px]">({row.error})</span>}
                      </td>
                      <td className="px-3 py-2.5 text-gray-400">{row.category}</td>
                      <td className="px-3 py-2.5 text-right text-[#28AEA4]">{formatBRL(row.price)}</td>
                      <td className="px-3 py-2.5 text-right text-gray-500">{formatBRL(row.cost_price)}</td>
                      <td className="px-6 py-2.5 text-center text-gray-400">{row.stock_quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-[#1c1c1c] flex gap-3">
              <button onClick={() => { setShowImport(false); setImportRows([]) }}
                className="flex-1 border border-[#2a2a2a] text-gray-400 rounded-xl py-2.5 text-sm hover:bg-[#141414] transition-colors">
                Cancelar
              </button>
              <button onClick={doImport} disabled={importing || validImport.length === 0}
                className="flex-1 bg-[#28AEA4] hover:bg-[#1d9992] disabled:bg-[#0c5a55] disabled:text-[#6edbd5] text-white font-bold rounded-xl py-2.5 text-sm transition-colors">
                {importing
                  ? `Importando... ${importDone}/${validImport.length}`
                  : `Importar ${validImport.length} produto(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmDelete !== null}
        title="Excluir produto?"
        message="Esta ação é permanente e não pode ser desfeita. O produto será removido do sistema."
        confirmLabel="Sim, excluir"
        danger
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* ── Modal Categorias ── */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCatModal(false)} />
          <div className="relative bg-[#111111] border border-[#222] rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e]">
              <h2 className="text-sm font-bold text-white">Gerenciar Categorias</h2>
              <button onClick={() => setShowCatModal(false)} className="text-gray-600 hover:text-gray-300 text-xl leading-none">×</button>
            </div>

            {/* Lista */}
            <div className="px-6 py-4 space-y-2 max-h-64 overflow-y-auto scrollbar-hide">
              {categories.length === 0 && (
                <p className="text-xs text-gray-600 text-center py-4">Nenhuma categoria criada.</p>
              )}
              {categories.map((cat, i) => (
                <div key={cat.name} className="flex items-center justify-between gap-3 bg-[#171717] border border-[#222] rounded-xl px-4 py-2.5">
                  <span className="text-sm text-white truncate flex-1">{cat.name}</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        const updated = categories.map((c, idx) => idx === i ? { ...c, showFilter: !c.showFilter } : c)
                        setCategories(updated)
                        saveCategories(updated)
                      }}
                      title={cat.showFilter ? 'Remover dos filtros' : 'Mostrar como filtro'}
                      className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                        cat.showFilter
                          ? 'bg-[#28AEA4]/10 text-[#28AEA4] border-[#28AEA4]/30'
                          : 'bg-white/[0.04] text-gray-600 border-white/[0.07]'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${cat.showFilter ? 'bg-[#28AEA4]' : 'bg-gray-600'}`} />
                      {cat.showFilter ? 'Filtro ativo' : 'Sem filtro'}
                    </button>
                    <button
                      onClick={() => {
                        const updated = categories.filter((_, idx) => idx !== i)
                        setCategories(updated)
                        saveCategories(updated)
                      }}
                      className="text-gray-700 hover:text-red-400 transition-colors text-base leading-none"
                    >×</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Nova categoria */}
            <div className="px-6 pb-5 border-t border-[#1e1e1e] pt-4 space-y-3">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Nova categoria</p>
              <input
                className="field-input"
                placeholder="Nome da categoria"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') e.currentTarget.blur()
                }}
              />
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    const updated = categories.map(c => ({ ...c, showFilter: !newCatFilter ? c.showFilter : c.showFilter }))
                    void updated
                    setNewCatFilter(v => !v)
                  }}
                  className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-xl border transition-all ${
                    newCatFilter
                      ? 'bg-[#28AEA4]/10 text-[#28AEA4] border-[#28AEA4]/30'
                      : 'bg-white/[0.04] text-gray-500 border-white/[0.07]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${newCatFilter ? 'bg-[#28AEA4]' : 'bg-gray-600'}`} />
                  {newCatFilter ? 'Mostrar como filtro' : 'Não mostrar como filtro'}
                </button>
                <button
                  disabled={!newCatName.trim() || categories.some(c => c.name.toLowerCase() === newCatName.trim().toLowerCase())}
                  onClick={() => {
                    const trimmed = newCatName.trim()
                    if (!trimmed) return
                    const updated = [...categories, { name: trimmed, showFilter: newCatFilter }]
                    setCategories(updated)
                    saveCategories(updated)
                    setNewCatName('')
                  }}
                  className="bg-[#28AEA4] hover:bg-[#3cbdb6] disabled:opacity-40 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .field-label { display:block; font-size:10px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:0.15em; margin-bottom:6px; }
        .field-input { width:100%; background:#171717; border:1px solid #2a2a2a; color:white; border-radius:12px; padding:10px 14px; font-size:14px; outline:none; transition:border-color 0.2s; }
        .field-input:focus { border-color:#28AEA4; }
        .field-input option { background:#171717; }
      `}</style>
    </div>
  )
}
