'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import PurchaseModal from '@/components/Purchases/PurchaseModal'
import PurchaseDetailsModal from '@/components/Purchases/PurchaseDetailsModal'

interface PurchaseItem {
  id: string
  quantity: number
  price: number
  total: number
  product: {
    name: string
    sku: string
  }
}

interface Purchase {
  id: string
  invoiceNo: string
  supplier: string
  total: number
  createdAt: string
  user: { 
    name: string
    email?: string
  }
  items: PurchaseItem[]
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null)

  useEffect(() => {
    fetchPurchases()
  }, [])

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

  const handleView = async (id: string) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/purchases/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setSelectedPurchase(data)
    } catch (error) {
      toast.error('Failed to load purchase details')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this purchase? This will reverse stock changes.')) return
    
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/purchases/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        toast.success('Purchase deleted')
        fetchPurchases()
      } else {
        toast.error('Failed to delete purchase')
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
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Purchases</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700"
        >
          Create Purchase
        </button>
      </div>

      {/* Scrollable Table Container */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchased By</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-500">
                    No purchases found. Click "Create Purchase" to add one.
                  </td>
                </tr>
              ) : (
                purchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                      {purchase.invoiceNo}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                      {purchase.supplier || 'N/A'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                      ${purchase.total.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                      {new Date(purchase.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                      {purchase.user?.name || 'Unknown'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-600">
                      {purchase.items?.length || 0}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-center">
                      <button
                        onClick={() => handleView(purchase.id)}
                        className="text-blue-600 hover:text-blue-800 mr-2 text-xs font-medium"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDelete(purchase.id)}
                        className="text-red-600 hover:text-red-800 text-xs font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <PurchaseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchPurchases}
      />

      {/* View Details Modal */}
      <PurchaseDetailsModal
        isOpen={!!selectedPurchase}
        onClose={() => setSelectedPurchase(null)}
        purchase={selectedPurchase}
      />
    </div>
  )
}