//app\(authenticated)\purchases\page.tsx
// app/(authenticated)/purchases/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { useCurrency } from '@/context/CurrencyContext'
import PurchaseModal from '@/components/Purchases/PurchaseModal'
import PurchaseDetailsModal from '@/components/Purchases/PurchaseDetailsModal'

interface Purchase {
  id: string
  invoiceNo: string 
  supplier: string | null
  total: number
  status: string
  cancelReason?: string
  createdAt: string
  user: { name: string; email?: string }
  items: Array<{
    id: string
    quantity: number
    price: number
    total: number
    product: { name: string; sku: string; unit: string } 
  }>
}

export default function PurchasesPage() {
  const { formatCurrency } = useCurrency()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancellingPurchaseId, setCancellingPurchaseId] = useState<string | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchPurchases()
  }, [])

  useEffect(() => {
    filterPurchases()
  }, [searchTerm, statusFilter, startDate, endDate, purchases])

  const fetchPurchases = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/purchases', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setPurchases(data.purchases || [])
    } catch (error) {
      toast.error('Failed to fetch purchases')
    } finally {
      setLoading(false)
    }
  }

  const filterPurchases = () => {
    let filtered = [...purchases]

    if (searchTerm) {
      filtered = filtered.filter(purchase =>
        purchase.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(purchase => purchase.status === statusFilter)
    }

    if (startDate && endDate) {
      filtered = filtered.filter(purchase => {
        const purchaseDate = new Date(purchase.createdAt)
        const start = new Date(startDate)
        const end = new Date(endDate)
        end.setHours(23, 59, 59)
        return purchaseDate >= start && purchaseDate <= end
      })
    }

    setFilteredPurchases(filtered)
  }

  const totalAmount = filteredPurchases.reduce((sum, purchase) => sum + purchase.total, 0)

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

  const handleCancelPurchase = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please provide a reason for cancellation')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/purchases/${cancellingPurchaseId}`, {
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
        toast.success('Purchase cancelled successfully')
        setShowCancelModal(false)
        setCancelReason('')
        setCancellingPurchaseId(null)
        fetchPurchases()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to cancel purchase')
      }
    } catch (error) {
      toast.error('An error occurred')
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>
  }

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Purchases</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Create Purchase
        </button>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search by Invoice #</label>
            <input
              type="text"
              placeholder="Invoice number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>
      </div>

      {/* Summary and Print */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Purchases (Filtered)</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totalAmount)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{filteredPurchases.length} transactions</p>
          </div>
          <button
            onClick={handlePrint}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Report
          </button>
        </div>
      </div>

      {/* Printable Report */}
      <div ref={printRef} className="hidden">
        <div className="p-8">
          <h1 className="text-2xl font-bold text-center mb-4">Purchase Report</h1>
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
                <th className="px-4 py-2 text-left">Invoice #</th>
                <th className="px-4 py-2 text-left">Supplier</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.map((purchase) => (
                <tr key={purchase.id}>
                  <td className="px-4 py-2">{purchase.invoiceNo}</td>
                  <td className="px-4 py-2">{purchase.supplier || 'N/A'}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(purchase.total)}</td>
                  <td className="px-4 py-2">{new Date(purchase.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2">{purchase.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-right font-bold text-lg">
            Total: {formatCurrency(totalAmount)}
          </div>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-800 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Invoice #</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-white uppercase tracking-wider">Total</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Date</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Purchased By</th>
                <th className="px-6 py-3.5 text-center text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                <th className="px-6 py-3.5 text-center text-xs font-semibold text-white uppercase tracking-wider">Items</th>
                <th className="px-6 py-3.5 text-center text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredPurchases.map((purchase, index) => (
                <tr 
                  key={purchase.id} 
                  className={`
                    ${purchase.status === 'CANCELLED' 
                      ? 'bg-red-50 dark:bg-red-900/20' 
                      : index % 2 === 0 
                        ? 'bg-white dark:bg-gray-800' 
                        : 'bg-gray-50 dark:bg-gray-800/70'
                    }
                    hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors duration-150
                  `}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {purchase.invoiceNo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {purchase.supplier || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(purchase.total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {new Date(purchase.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {purchase.user?.name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      purchase.status === 'ACTIVE' 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800' 
                        : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                    }`}>
                      {purchase.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600 dark:text-gray-400">
                    <span className="inline-flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2.5 py-0.5 rounded-full text-xs font-medium">
                      {purchase.items?.length || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    <button
                      onClick={() => setSelectedPurchase(purchase)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium mr-3 transition-colors"
                    >
                      View
                    </button>
                    {purchase.status === 'ACTIVE' && (
                      <button
                        onClick={() => {
                          setCancellingPurchaseId(purchase.id)
                          setShowCancelModal(true)
                        }}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium transition-colors"
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

      {/* Modals */}
      <PurchaseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchPurchases}
      />

      <PurchaseDetailsModal
        isOpen={!!selectedPurchase}
        onClose={() => setSelectedPurchase(null)}
        purchase={selectedPurchase}
      />

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-medium mb-4 dark:text-white">Cancel Purchase</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reason for Cancellation *</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={3}
                placeholder="Please provide a reason for cancelling this purchase..."
                required
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowCancelModal(false)
                  setCancelReason('')
                  setCancellingPurchaseId(null)
                }}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleCancelPurchase}
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