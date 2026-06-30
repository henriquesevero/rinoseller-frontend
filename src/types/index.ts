export interface KitItem {
  product_id: string
  product_name: string
  quantity: number
}

export interface Product {
  id: string
  code?: string
  name: string
  category: string
  brand?: string
  price: number
  cost_price: number
  stock_quantity: number
  is_kit?: boolean
  kit_items?: KitItem[]
}

export interface OrderItem {
  product_id: string
  product_name: string
  quantity: number
  price: number
}

export interface Order {
  id: string
  client_name: string
  client_phone: string
  items: OrderItem[]
  total: number
  status: 'Pronta-Entrega' | 'Encomenda'
  created_at: string
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface Client {
  id: string
  name: string
  phone: string
  email: string
  notes: string
  cpf_cnpj: string
  address: string
  debt: number
  debt_limit: number
  payment_cycle_days: number
  payment_cycle_amount: number
  created_at: string
}

export interface ClientPayment {
  id: string
  client_id: string
  amount: number
  notes: string
  count_as_revenue: boolean
  created_at: string
}

export type CapitalMovementType = 'aporte' | 'retirada'

export interface CapitalContribution {
  id: string
  description: string
  amount: number
  type: CapitalMovementType
  hidden?: boolean
  created_at: string
}

export interface BrandCatalog {
  id: string
  brand_name: string
  drive_url: string
  created_at: string
}

export type ExpenseStatus = 'Pendente' | 'Pago'

export interface Expense {
  id: string
  description: string
  supplier: string
  amount: number
  payment_method: string
  due_date?: string
  status: ExpenseStatus
  paid_at?: string
  notes: string
  created_at: string
}

export interface QuoteItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  cost_price?: number
  subtotal: number
  kit_items?: KitItem[]
}

export type QuoteStatus = 'Aguardando Aprovação' | 'Aprovado' | 'Entregue' | 'Faturado' | 'Faturado Gradual' | 'Cancelado' | 'Entregue/Faturado'

export interface Quote {
  id: string
  client_id: string
  client_name: string
  items: QuoteItem[]
  total: number
  status: QuoteStatus
  notes: string
  payment_type: string
  installments: number
  discount_type: string
  discount_value: number
  created_at: string
  approved_at?: string
  invoiced_at?: string
}
