'use client'

import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { useCurrency } from '@/context/CurrencyContext'
import CompactTable from '@/components/UI/CompactTable'

interface Sale {
  id: string
  receiptNo: string
  customer: string | null | { id: string; name: string; phone: string | null }
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
    product: { name: string; sku: string; vatCategory: string }
  }>
}

export default function SalesPage() {
  const { formatCurrency, vatPercentage } = useCurrency()
  const [sales, setSales] = useState<Sale[]>([])
  const [filteredSales, setFilteredSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancellingSaleId, setCancellingSaleId] = useState<string | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchSales()
  }, [])

  useEffect(() => {
    filterSales()
  }, [searchTerm, statusFilter, startDate, endDate, sales])

  const fetchSales = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/sales', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setSales(data.sales || [])
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

  const getCustomerName = (sale: Sale): string => {
    if (sale.customerName) return sale.customerName
    if (typeof sale.customer === 'string') return sale.customer
    if (sale.customer && typeof sale.customer === 'object') return sale.customer.name
    return 'Walk-in Customer'
  }

  const totalAmount = filteredSales.reduce((sum, sale) => sum + sale.total, 0)

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

  const saleColumns = [
    { key: 'receiptNo', header: 'Receipt #', align: 'left' as const },
    { key: 'customer', header: 'Customer', align: 'left' as const, render: (value: any, row: any) => getCustomerName(row) },
    { key: 'total', header: 'Total', align: 'right' as const, render: (value: number) => formatCurrency(value) },
    { key: 'createdAt', header: 'Date', align: 'left' as const, render: (value: string) => new Date(value).toLocaleDateString() },
    { key: 'user', header: 'Sold By', align: 'left' as const, render: (value: any) => value?.name || 'Unknown' },
    { key: 'status', header: 'Status', align: 'center' as const, render: (value: string) => (
      <span className={`px-1.5 py-0.5 text-xs rounded-full ${
        value === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      }`}>
        {value}
      </span>
    )},
    { key: 'actions', header: 'Actions', align: 'center' as const, render: (_: any, row: any) => (
      <select
        onChange={(e) => {
          const action = e.target.value
          if (action === 'view') {
            setSelectedSale(row)
          } else if (action === 'cancel' && row.status === 'ACTIVE') {
            setCancellingSaleId(row.id)
            setShowCancelModal(true)
          }
          e.target.value = ''
        }}
        className="text-xs border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-1.5 py-0.5"
        defaultValue=""
      >
        <option value="" disabled>Actions</option>
        <option value="view">View Details</option>
        {row.status === 'ACTIVE' && <option value="cancel">Cancel Sale</option>}
      </select>
    )}
  ]

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">Sales History</h1>

      {/* Search and Filter Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search by Receipt #</label>
            <input
              type="text"
              placeholder="Receipt number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
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
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Sales (Filtered)</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalAmount)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{filteredSales.length} transactions</p>
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
          <h1 className="text-2xl font-bold text-center mb-4">Sales Report</h1>
          <p className="text-center text-gray-600 mb-6">
            Generated on {new Date().toLocaleString()}
          </p>
          {startDate && endDate && (
            <p className="text-center text-sm text-gray-500 mb-4">
              Period: {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
            </p>
          )}
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
          <div className="text-right font-bold text-lg">
            Total: {formatCurrency(totalAmount)}
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <CompactTable columns={saleColumns} data={filteredSales} />

      {/* View Details Modal */}
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