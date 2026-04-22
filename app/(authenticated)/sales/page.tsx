'use client'

import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'

interface Sale {
  id: string
  receiptNo: string
  customer: string
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
    product: { name: string; sku: string }
  }>
}

export default function SalesPage() {
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

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(sale =>
        sale.receiptNo.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(sale => sale.status === statusFilter)
    }

    // Date range filter
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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Sales History</h1>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search by Receipt #</label>
            <input
              type="text"
              placeholder="Receipt number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Summary and Print */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">Total Sales (Filtered)</p>
            <p className="text-2xl font-bold text-green-600">${totalAmount.toFixed(2)}</p>
            <p className="text-xs text-gray-500">{filteredSales.length} transactions</p>
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
                  <td className="px-4 py-2">{sale.customer || 'Walk-in'}</td>
                  <td className="px-4 py-2 text-right">${sale.total.toFixed(2)}</td>
                  <td className="px-4 py-2">{new Date(sale.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2">{sale.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-right font-bold text-lg">
            Total: ${totalAmount.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receipt #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sold By</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className={sale.status === 'CANCELLED' ? 'bg-red-50' : 'hover:bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sale.receiptNo}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{sale.customer || 'Walk-in'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold">${sale.total.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(sale.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{sale.user?.name || 'Unknown'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      sale.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {sale.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    <button
                      onClick={() => setSelectedSale(sale)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      View
                    </button>
                    {sale.status === 'ACTIVE' && (
                      <button
                        onClick={() => {
                          setCancellingSaleId(sale.id)
                          setShowCancelModal(true)
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Details Modal - Same as before with print option */}
      {selectedSale && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Sale Details</h3>
              <div>
                <button
                  onClick={() => {
                    const printContent = document.getElementById('sale-print-content')
                    if (printContent) {
                      const originalContents = document.body.innerHTML
                      document.body.innerHTML = printContent.innerHTML
                      window.print()
                      document.body.innerHTML = originalContents
                      window.location.reload()
                    }
                  }}
                  className="mr-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Print
                </button>
                <button
                  onClick={() => setSelectedSale(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div id="sale-print-content">
              <div className="p-6">
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold">SALE RECEIPT</h1>
                  <p className="text-gray-600">Stock Management System</p>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p><strong>Receipt #:</strong> {selectedSale.receiptNo}</p>
                    <p><strong>Customer:</strong> {selectedSale.customer || 'Walk-in'}</p>
                  </div>
                  <div>
                    <p><strong>Date:</strong> {new Date(selectedSale.createdAt).toLocaleString()}</p>
                    <p><strong>Sold By:</strong> {selectedSale.user?.name || 'Unknown'}</p>
                  </div>
                </div>
                <table className="min-w-full divide-y divide-gray-200 mb-4">
                  <thead>
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
                        <td className="px-4 py-2 text-right">${item.price.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right">${item.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="text-right">
                  <p>Subtotal: ${selectedSale.subtotal.toFixed(2)}</p>
                  <p>Tax: ${selectedSale.tax.toFixed(2)}</p>
                  <p className="text-xl font-bold">Total: ${selectedSale.total.toFixed(2)}</p>
                </div>
                {selectedSale.cancelReason && (
                  <div className="mt-4 p-3 bg-red-50 rounded">
                    <p className="text-sm text-red-600"><strong>Cancellation Reason:</strong> {selectedSale.cancelReason}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium mb-4">Cancel Sale</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Cancellation *</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500"
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
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
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