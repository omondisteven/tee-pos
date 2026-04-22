'use client'

import { useRef } from 'react'

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

export interface PurchaseDetails {
  id: string
  invoiceNo: string
  supplier: string | null
  total: number
  createdAt: string | Date
  user: {
    name: string
    email?: string
  }
  items: PurchaseItem[]
}

interface PurchaseDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  purchase: PurchaseDetails | null
}

export default function PurchaseDetailsModal({ isOpen, onClose, purchase }: PurchaseDetailsModalProps) {
  const printRef = useRef<HTMLDivElement>(null)

  if (!isOpen || !purchase) return null

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

  // Safe check for items array
  const items = purchase.items || []

  return (
    <>
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Purchase Details</h3>
            <div>
              <button
                onClick={handlePrint}
                className="mr-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Print
              </button>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
          </div>

          {/* Printable Content */}
          <div ref={printRef}>
            <div className="p-6">
              {/* Header */}
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold">PURCHASE ORDER</h1>
                <p className="text-gray-600">Stock Management System</p>
              </div>

              {/* Purchase Info */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p><strong>Invoice Number:</strong> {purchase.invoiceNo}</p>
                  <p><strong>Supplier:</strong> {purchase.supplier || 'N/A'}</p>
                </div>
                <div>
                  <p><strong>Date:</strong> {new Date(purchase.createdAt).toLocaleString()}</p>
                  <p><strong>Purchased By:</strong> {purchase.user?.name || 'Unknown'}</p>
                  {purchase.user?.email && (
                    <p><strong>Email:</strong> {purchase.user.email}</p>
                  )}
                </div>
              </div>

              {/* Items Table */}
              {items.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200 mb-6">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2">{item.product?.name || 'Unknown'}</td>
                        <td className="px-4 py-2">{item.product?.sku || 'N/A'}</td>
                        <td className="px-4 py-2 text-right">{item.quantity}</td>
                        <td className="px-4 py-2 text-right">${item.price?.toFixed(2) || '0.00'}</td>
                        <td className="px-4 py-2 text-right">${item.total?.toFixed(2) || '0.00'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-right font-bold">Grand Total:</td>
                      <td className="px-4 py-2 text-right font-bold">${purchase.total?.toFixed(2) || '0.00'}</td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No items found for this purchase
                </div>
              )}

              {/* Footer */}
              <div className="text-center text-sm text-gray-500 mt-8">
                <p>Thank you for your business!</p>
                <p>This is a computer-generated document. No signature required.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .fixed.inset-0,
          .fixed.inset-0 > div {
            visibility: visible;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            margin: 0;
            padding: 0;
          }
        }
      `}</style>
    </>
  )
}