import type { BrandCatalog, CapitalContribution, CapitalMovementType, Client, Expense, Order, OrderItem, Product, Quote } from '../types'
import type { AuthUser } from '../contexts/AuthContext'

const BASE = '/api'

function authHeader(): Record<string, string> {
  const token = localStorage.getItem('korav_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    ...options,
  })
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('korav_token')
      localStorage.removeItem('korav_user')
      window.location.href = '/login'
    }
    if (res.status === 402 && window.location.pathname !== '/dashboard/cobranca') {
      window.location.href = '/dashboard/cobranca'
    }
    const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

// ── Users (admin) ─────────────────────────────────────────────────────────────

export const getUsers = () =>
  request<AuthUser[]>('/users')

export const createUser = (data: { name: string; email: string; password: string; role: string }) =>
  request<AuthUser>('/users', { method: 'POST', body: JSON.stringify(data) })

export const updateUser = (id: string, data: { name: string; email: string; active: boolean }) =>
  request<AuthUser>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) })

export const deleteMyAccount = () =>
  request<{ message: string }>('/auth/me', { method: 'DELETE' })

// ── Products ──────────────────────────────────────────────────────────────────

export const getProducts = () =>
  request<Product[]>('/products')

export const createProduct = (p: Omit<Product, 'id'>) =>
  request<Product>('/products', { method: 'POST', body: JSON.stringify(p) })

export const updatePrice = (id: string, price: number) =>
  request<{ message: string }>(`/products/${id}/price`, {
    method: 'PATCH',
    body: JSON.stringify({ price }),
  })

export const updateStock = (id: string, quantity: number) =>
  request<{ message: string }>(`/products/${id}/stock`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity }),
  })

export const deleteProduct = (id: string) =>
  request<{ message: string }>(`/products/${id}`, { method: 'DELETE' })

// ── Orders ────────────────────────────────────────────────────────────────────

export const getOrders = () =>
  request<Order[]>('/orders')

export const createOrder = (order: {
  client_name: string
  client_phone: string
  items: Pick<OrderItem, 'product_id' | 'quantity'>[]
}) => request<Order>('/orders', { method: 'POST', body: JSON.stringify(order) })

// ── Clients ───────────────────────────────────────────────────────────────────

export const getClients = () =>
  request<Client[]>('/clients')

export const createClient = (c: Omit<Client, 'id' | 'debt' | 'created_at'>) =>
  request<Client>('/clients', { method: 'POST', body: JSON.stringify(c) })

export const getClient = (id: string) =>
  request<Client>(`/clients/${id}`)

export const updateClient = (id: string, data: Omit<Client, 'id' | 'debt' | 'created_at'>) =>
  request<Client>(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) })

export const registerPayment = (id: string, amount: number, notes?: string, countAsRevenue?: boolean) =>
  request<Client>(`/clients/${id}/payment`, { method: 'POST', body: JSON.stringify({ amount, notes, count_as_revenue: countAsRevenue ?? false }) })

export const getClientPaymentHistory = (id: string) =>
  request<import('../types').ClientPayment[]>(`/clients/${id}/payment-history`)

export const clearClientPaymentHistory = (id: string) =>
  request<{ message: string }>(`/clients/${id}/payment-history`, { method: 'DELETE' })

export const getAllPayments = () =>
  request<import('../types').ClientPayment[]>('/payments')

export const addDebt = (id: string, amount: number) =>
  request<Client>(`/clients/${id}/debt`, { method: 'POST', body: JSON.stringify({ amount }) })

export const deleteClient = (id: string) =>
  request<{ message: string }>(`/clients/${id}`, { method: 'DELETE' })

export const getClientOrders = (id: string) =>
  request<Order[]>(`/clients/${id}/orders`)

export const clearClientOrders = (id: string) =>
  request<{ message: string }>(`/clients/${id}/orders`, { method: 'DELETE' })

export const getClientQuotes = (id: string) =>
  request<Quote[]>(`/clients/${id}/quotes`)

export const clearClientQuotes = (id: string) =>
  request<{ message: string }>(`/clients/${id}/quotes`, { method: 'DELETE' })

// ── Quotes ────────────────────────────────────────────────────────────────────

export const getQuotes = () =>
  request<Quote[]>('/quotes')

export const createQuote = (data: {
  client_id: string
  items: { product_id: string; quantity: number }[]
  notes?: string
  payment_type?: string
  installments?: number
}) => request<Quote>('/quotes', { method: 'POST', body: JSON.stringify(data) })

export const approveQuote = (id: string) =>
  request<Quote>(`/quotes/${id}/approve`, { method: 'POST' })

export const deliverQuote = (id: string) =>
  request<Quote>(`/quotes/${id}/deliver`, { method: 'POST' })

export const invoiceQuote = (id: string) =>
  request<Quote>(`/quotes/${id}/invoice`, { method: 'POST' })

export const cancelQuote = (id: string) =>
  request<Quote>(`/quotes/${id}/cancel`, { method: 'POST' })

export const deleteQuote = (id: string) =>
  request<{ message: string }>(`/quotes/${id}`, { method: 'DELETE' })

export const sendQuoteEmail = (id: string, kind: 'orcamento' | 'pedido', pdfBase64: string) =>
  request<{ message: string }>(`/quotes/${id}/send-email`, {
    method: 'POST',
    body: JSON.stringify({ kind, pdf_base64: pdfBase64 }),
  })

export const deleteOrder = (id: string) =>
  request<{ message: string }>(`/orders/${id}`, { method: 'DELETE' })


// ── Expenses (Contas a Pagar) ─────────────────────────────────────────────────

export const getExpenses = () =>
  request<Expense[]>('/expenses')

export const createExpense = (e: {
  description: string
  supplier?: string
  amount: number
  payment_method?: string
  due_date?: string
  notes?: string
}) => request<Expense>('/expenses', { method: 'POST', body: JSON.stringify(e) })

export const payExpense = (id: string) =>
  request<Expense>(`/expenses/${id}/pay`, { method: 'POST' })

export const deleteExpense = (id: string) =>
  request<{ message: string }>(`/expenses/${id}`, { method: 'DELETE' })

// ── Capital Contributions (Aportes de Capital) ───────────────────────────────

export const getCapitalContributions = () =>
  request<CapitalContribution[]>('/capital-contributions')

export const addCapitalContribution = (e: { description?: string; amount: number; type?: CapitalMovementType; hidden?: boolean }) =>
  request<CapitalContribution>('/capital-contributions', { method: 'POST', body: JSON.stringify(e) })

export const deleteCapitalContribution = (id: string) =>
  request<{ message: string }>(`/capital-contributions/${id}`, { method: 'DELETE' })

// ── Brand Catalogs (Catálogos de Marca) ──────────────────────────────────────

export const getBrandCatalogs = () =>
  request<BrandCatalog[]>('/brand-catalogs')

export const addBrandCatalog = (c: { brand_name: string; drive_url: string }) =>
  request<BrandCatalog>('/brand-catalogs', { method: 'POST', body: JSON.stringify(c) })

export const deleteBrandCatalog = (id: string) =>
  request<{ message: string }>(`/brand-catalogs/${id}`, { method: 'DELETE' })

// ── Subscriptions ─────────────────────────────────────────────────────────────

export interface CheckoutCardData {
  email: string
  plan: 'base' | 'professional'
  holder_name: string
  number: string
  expiry_month: string
  expiry_year: string
  cvv: string
}

export const checkoutSubscription = (data: CheckoutCardData) =>
  request<{ message: string }>('/subscriptions/checkout', { method: 'POST', body: JSON.stringify(data) })
