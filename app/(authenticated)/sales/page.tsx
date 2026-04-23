'use client'

import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { useCurrency } from '@/context/CurrencyContext'

interface Sale {
  id: string
  receiptNo: string
  customer: string | null
  customerName: string | null
  customerId: string | null
  subtotal: number
  tax: number
  total: number
  paymentMethod: string
  status: string
  cancelReason?: string
  createdAt: string
  user: { name: string; email: string }
  items: Array<{
    id: string
    quantity: number
    price: number
    total: number
    product: { 
      id: string
      name: string
      sku: string
      vatCategory: string
    }
  }>
}

interface SalesItem {
  productId: string
  productName: string
  productSku: string
  totalQuantity: number
  totalRevenue: number
  vatCategory: string
  saleCount: number
}

export default function SalesPage() {
  const { formatCurrency, vatPercentage } = useCurrency()
  const [sales, setSales] = useState<Sale[]>([])
  const [filteredSales, setFilteredSales] = useState<Sale[]>([])
  const [salesItems, setSalesItems] = useState<SalesItem[]>([])
  const [filteredItems, setFilteredItems] = useState<SalesItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancellingSaleId, setCancellingSaleId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'receipts' | 'items'>('receipts')
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchSales()
  }, [])

  useEffect(() => {
    if (viewMode === 'receipts') {
      filterSales()
    } else {
      filterItems()
    }
  }, [searchTerm, statusFilter, startDate, endDate, sales, viewMode])

  const fetchSales = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/sales', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setSales(data.sales || [])
      
      // Process items data
      const itemsMap = new Map<string, SalesItem>()
      for (const sale of (data.sales || [])) {
        for (const item of sale.items) {
          const key = item.product.id
          if (itemsMap.has(key)) {
            const existing = itemsMap.get(key)!
            existing.totalQuantity += item.quantity
            existing.totalRevenue += item.total
            existing.saleCount += 1
          } else {
            itemsMap.set(key, {
              productId: item.product.id,
              productName: item.product.name,
              productSku: item.product.sku,
              totalQuantity: item.quantity,
              totalRevenue: item.total,
              vatCategory: item.product.vatCategory,
              saleCount: 1
            })
          }
        }
      }
      setSalesItems(Array.from(itemsMap.values()))
    } catch (error) {
      toast.error('Failed to fetch sales')
    } finally {
      setLoading(false)
    }
  }

  const filterSales = () => {
    let filtered = [...sales]

    if (searchTerm) {
      filtered = filtered.filter(sale =>
        sale.receiptNo.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(sale => sale.status === statusFilter)
    }

    if (startDate && endDate) {
      filtered = filtered.filter(sale => {
        const saleDate = new Date(sale.createdAt)
        const start = new Date(startDate)
        const end = new Date(endDate)
        end.setHours(23, 59, 59)
        return saleDate >= start && saleDate <= end
      })
    }

    setFilteredSales(filtered)
  }

  const filterItems = () => {
    let filtered = [...salesItems]

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.productSku.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // For items, we don't filter by status (status is for receipts)
    // Date filtering for items - need to filter based on sales within date range
    if (startDate && endDate) {
      // Recalculate items based on date-filtered sales
      const dateFilteredSales = sales.filter(sale => {
        const saleDate = new Date(sale.createdAt)
        const start = new Date(startDate)
        const end = new Date(endDate)
        end.setHours(23, 59, 59)
        return saleDate >= start && saleDate <= end
      })
      
      const itemsMap = new Map<string, SalesItem>()
      for (const sale of dateFilteredSales) {
        for (const item of sale.items) {
          const key = item.product.id
          if (itemsMap.has(key)) {
            const existing = itemsMap.get(key)!
            existing.totalQuantity += item.quantity
            existing.totalRevenue += item.total
            existing.saleCount += 1
          } else {
            itemsMap.set(key, {
              productId: item.product.id,
              productName: item.product.name,
              productSku: item.product.sku,
              totalQuantity: item.quantity,
              totalRevenue: item.total,
              vatCategory: item.product.vatCategory,
              saleCount: 1
            })
          }
        }
      }
      filtered = Array.from(itemsMap.values())
    }

    // Apply search filter again after date filtering
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.productSku.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredItems(filtered)
  }

  // Fix the getCustomerName function
  const getCustomerName = (sale: Sale): string => {
    // Check customerName first (denormalized field)
    if (sale.customerName) return sale.customerName
    
    // Check if customer is a string
    if (typeof sale.customer === 'string') return sale.customer
    
    // Check if customer is an object with name property
    if (sale.customer && typeof sale.customer === 'object' && 'name' in sale.customer) {
      return (sale.customer as { name: string }).name
    }
    
    return 'Walk-in Customer'
  }

  const totalAmount = viewMode === 'receipts' 
    ? filteredSales.reduce((sum, sale) => sum + sale.total, 0)
    : filteredItems.reduce((sum, item) => sum + item.totalRevenue, 0)

  const handlePrint = () => {
    const printContent = printRef.current
    if (printContent) {
      const originalContents = document.body.innerHTML
      document.body.innerHTML = printContent.innerHTML
      window.print()
      document.body.innerHTML = originalContents
      window.location.reload()
    }
  }

  const handleCancelSale = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please provide a reason for cancellation')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/sales?id=${cancellingSaleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'CANCEL',
          cancelReason
        })
      })

      if (res.ok) {
        toast.success('Sale cancelled successfully')
        setShowCancelModal(false)
        setCancelReason('')
        setCancellingSaleId(null)
        fetchSales()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to cancel sale')
      }
    } catch (error) {
      toast.error('An error occurred')
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">Sales History</h1>

      {/* View Mode Toggle */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('receipts')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'receipts'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              By Receipts
            </button>
            <button
              onClick={() => setViewMode('items')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'items'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              By Items
            </button>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {viewMode === 'receipts' 
              ? 'Viewing sales by receipt. Click on a receipt to see details.' 
              : 'Viewing sales by product. Shows total quantity sold and revenue per item.'}
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {viewMode === 'receipts' ? 'Search by Receipt #' : 'Search by Product'}
            </label>
            <input
              type="text"
              placeholder={viewMode === 'receipts' ? "Receipt number..." : "Product name or SKU..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {viewMode === 'receipts' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Summary and Print */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {viewMode === 'receipts' ? 'Total Sales (Filtered)' : 'Total Revenue (Filtered)'}
            </p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalAmount)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {viewMode === 'receipts' 
                ? `${filteredSales.length} transactions`
                : `${filteredItems.length} products sold`}
            </p>
          </div>
          <button
            onClick={handlePrint}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Print Report
          </button>
        </div>
      </div>

      {/* Printable Report */}
      <div ref={printRef} className="hidden">
        <div className="p-8">
          <h1 className="text-2xl font-bold text-center mb-4">
            {viewMode === 'receipts' ? 'Sales Report' : 'Product Sales Report'}
          </h1>
          <p className="text-center text-gray-600 mb-6">
            Generated on {new Date().toLocaleString()}
          </p>
          {startDate && endDate && (
            <p className="text-center text-sm text-gray-500 mb-4">
              Period: {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
            </p>
          )}
          
          {viewMode === 'receipts' ? (
            <table className="min-w-full divide-y divide-gray-200 mb-4">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Receipt #</th>
                  <th className="px-4 py-2 text-left">Customer</th>
                  <th className="px-4 py-2 text-right">Total</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="px-4 py-2">{sale.receiptNo}</td>
                    <td className="px-4 py-2">{getCustomerName(sale)}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(sale.total)}</td>
                    <td className="px-4 py-2">{new Date(sale.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2">{sale.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 mb-4">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Product Name</th>
                  <th className="px-4 py-2 text-left">SKU</th>
                  <th className="px-4 py-2 text-right">Quantity Sold</th>
                  <th className="px-4 py-2 text-right">Total Revenue</th>
                  <th className="px-4 py-2 text-center">VAT</th>
                  <th className="px-4 py-2 text-right">Times Sold</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.productId}>
                    <td className="px-4 py-2">{item.productName}</td>
                    <td className="px-4 py-2">{item.productSku}</td>
                    <td className="px-4 py-2 text-right">{item.totalQuantity}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(item.totalRevenue)}</td>
                    <td className="px-4 py-2 text-center">
                      {item.vatCategory === 'VATABLE' ? `${vatPercentage}%` : '0%'}
                    </td>
                    <td className="px-4 py-2 text-right">{item.saleCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          
          <div className="text-right font-bold text-lg">
            {viewMode === 'receipts' ? 'Total: ' : 'Total Revenue: '}
            {formatCurrency(totalAmount)}
          </div>
        </div>
      </div>

      {/* Data Table - Receipts View */}
      {viewMode === 'receipts' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Receipt #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Customer</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Sold By</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className={sale.status === 'CANCELLED' ? 'bg-red-50 dark:bg-red-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{sale.receiptNo}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {getCustomerName(sale)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(sale.total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {new Date(sale.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {sale.user?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        sale.status === 'ACTIVE' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                      }`}>
                        {sale.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      <select
                        onChange={(e) => {
                          const action = e.target.value
                          if (action === 'view') {
                            setSelectedSale(sale)
                          } else if (action === 'cancel' && sale.status === 'ACTIVE') {
                            setCancellingSaleId(sale.id)
                            setShowCancelModal(true)
                          }
                          e.target.value = ''
                        }}
                        className="text-sm border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-2 py-1"
                        defaultValue=""
                      >
                        <option value="" disabled>Actions</option>
                        <option value="view">View Details</option>
                        {sale.status === 'ACTIVE' && (
                          <option value="cancel">Cancel Sale</option>
                        )}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Data Table - Items View */}
      {viewMode === 'items' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Product Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">SKU</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Quantity Sold</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total Revenue</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">VAT</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Times Sold</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No items found for the selected period
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.productId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {item.productName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {item.productSku}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900 dark:text-white">
                        {item.totalQuantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(item.totalRevenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          item.vatCategory === 'VATABLE' 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {item.vatCategory === 'VATABLE' ? `${vatPercentage}%` : '0%'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600 dark:text-gray-400">
                        {item.saleCount}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Details Modal - Only for receipts view */}
      {selectedSale && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold dark:text-white">Sale Details</h3>
              <button
                onClick={() => setSelectedSale(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p><strong>Receipt #:</strong> {selectedSale.receiptNo}</p>
                  <p><strong>Customer:</strong> {getCustomerName(selectedSale)}</p>
                </div>
                <div>
                  <p><strong>Date:</strong> {new Date(selectedSale.createdAt).toLocaleString()}</p>
                  <p><strong>Sold By:</strong> {selectedSale.user?.name || 'Unknown'}</p>
                </div>
              </div>
              <table className="min-w-full divide-y divide-gray-200 mb-4">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Product</th>
                    <th className="px-4 py-2 text-right">Quantity</th>
                    <th className="px-4 py-2 text-right">Price</th>
                    <th className="px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSale.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2">{item.product.name}</td>
                      <td className="px-4 py-2 text-right">{item.quantity}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(item.price)}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-right font-bold">Subtotal:</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(selectedSale.subtotal)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-right font-bold">VAT ({vatPercentage}%):</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(selectedSale.tax)}</td>
                  </tr>
                  <tr className="border-t">
                    <td colSpan={3} className="px-4 py-2 text-right text-lg font-bold">Total:</td>
                    <td className="px-4 py-2 text-right text-lg font-bold">{formatCurrency(selectedSale.total)}</td>
                  </tr>
                </tfoot>
              </table>
              {selectedSale.cancelReason && (
                <div className="mt-4 p-3 bg-red-50 rounded">
                  <p className="text-sm text-red-600"><strong>Cancellation Reason:</strong> {selectedSale.cancelReason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-medium mb-4 dark:text-white">Cancel Sale</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reason for Cancellation *</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={3}
                placeholder="Please provide a reason for cancelling this sale..."
                required
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowCancelModal(false)
                  setCancelReason('')
                  setCancellingSaleId(null)
                }}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleCancelSale}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}