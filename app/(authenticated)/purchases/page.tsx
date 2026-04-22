'use client'

import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
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
    product: { name: string; sku: string }
  }>
}

export default function PurchasesPage() {
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

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(purchase =>
        purchase.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(purchase => purchase.status === statusFilter)
    }

    // Date range filter
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Purchases</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Create Purchase
        </button>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search by Invoice #</label>
            <input
              type="text"
              placeholder="Invoice number..."
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
            <p className="text-sm text-gray-600">Total Purchases (Filtered)</p>
            <p className="text-2xl font-bold text-blue-600">${totalAmount.toFixed(2)}</p>
            <p className="text-xs text-gray-500">{filteredPurchases.length} transactions</p>
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
                  <td className="px-4 py-2 text-right">${purchase.total.toFixed(2)}</td>
                  <td className="px-4 py-2">{new Date(purchase.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2">{purchase.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-right font-bold text-lg">
            Total: ${totalAmount.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchased By</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPurchases.map((purchase) => (
                <tr key={purchase.id} className={purchase.status === 'CANCELLED' ? 'bg-red-50' : 'hover:bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{purchase.invoiceNo}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{purchase.supplier || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold">${purchase.total.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(purchase.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{purchase.user?.name || 'Unknown'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      purchase.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {purchase.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600">
                    {purchase.items?.length || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    <button
                      onClick={() => setSelectedPurchase(purchase)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      View
                    </button>
                    {purchase.status === 'ACTIVE' && (
                      <button
                        onClick={() => {
                          setCancellingPurchaseId(purchase.id)
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
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium mb-4">Cancel Purchase</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Cancellation *</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500"
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
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
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