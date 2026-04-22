export interface Product {
  id: string
  name: string
  description?: string
  sku: string
  price: number
  cost: number
  quantity: number
  lowStockThreshold: number
}

export interface CartItem {
  productId: string
  name: string
  sku: string
  price: number
  quantity: number
  availableStock: number
}

export interface SaleData {
  items: CartItem[]
  customer?: string
  paymentMethod: string
  subtotal: number
  tax: number
  total: number
}

export interface ProfitLossReport {
  startDate: Date
  endDate: Date
  totalSales: number
  totalPurchases: number
  grossProfit: number
  netProfit: number
  salesCount: number
  purchaseCount: number
}