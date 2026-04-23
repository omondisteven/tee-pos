'use client'

import { useRef } from 'react'
import { useCurrency } from '@/context/CurrencyContext'

interface WorkOrderPrintProps {
  workOrder: {
    workOrderNo: string
    customerName: string | null
    vehicleRegNo: string
    serviceCategory: { name: string }
    description: string | null
    agreedAmount: number
    depositPaid: number
    balance: number
    dueDate: string
    createdAt: string
    status: string
    user: { name: string }
    payments?: Array<{ amount: number; paymentMethod: string; createdAt: string }>
  }
  companyInfo: {
    name: string
    email: string
    phone: string
    address: string
  }
}

export default function WorkOrderPrint({ workOrder, companyInfo }: WorkOrderPrintProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const { formatCurrency } = useCurrency()

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

  return (
    <>
      <button
        onClick={handlePrint}
        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 mr-2"
      >
        Print
      </button>

      <div ref={printRef} className="hidden">
        <div className="p-8 max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold">{companyInfo.name}</h1>
            <p className="text-gray-600">{companyInfo.address}</p>
            <p className="text-gray-600">Tel: {companyInfo.phone} | Email: {companyInfo.email}</p>
            <h2 className="text-xl font-bold mt-4">WORK ORDER</h2>
          </div>

          {/* Work Order Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p><strong>Work Order #:</strong> {workOrder.workOrderNo}</p>
              <p><strong>Date:</strong> {new Date(workOrder.createdAt).toLocaleString()}</p>
              <p><strong>Due Date:</strong> {new Date(workOrder.dueDate).toLocaleDateString()}</p>
              <p><strong>Status:</strong> {workOrder.status}</p>
            </div>
            <div>
              <p><strong>Customer:</strong> {workOrder.customerName || 'Walk-in Customer'}</p>
              <p><strong>Vehicle Reg:</strong> {workOrder.vehicleRegNo}</p>
              <p><strong>Service Type:</strong> {workOrder.serviceCategory.name}</p>
              <p><strong>Created By:</strong> {workOrder.user?.name || 'System'}</p>
            </div>
          </div>

          {/* Service Description */}
          <div className="mb-6">
            <h3 className="font-semibold border-b pb-2 mb-2">Service Description</h3>
            <p className="text-gray-700">{workOrder.description || 'No description provided'}</p>
          </div>

          {/* Financial Details */}
          <div className="mb-6">
            <h3 className="font-semibold border-b pb-2 mb-2">Financial Details</h3>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Agreed Amount:</span>
                <span className="font-semibold">{formatCurrency(workOrder.agreedAmount)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Deposit Paid:</span>
                <span>{formatCurrency(workOrder.depositPaid)}</span>
              </div>
              <div className="flex justify-between text-red-600 font-bold">
                <span>Balance Due:</span>
                <span>{formatCurrency(workOrder.balance)}</span>
              </div>
            </div>
          </div>

          {/* Payment History */}
          {workOrder.payments && workOrder.payments.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold border-b pb-2 mb-2">Payment History</h3>
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1">Date</th>
                    <th className="text-right py-1">Amount</th>
                    <th className="text-left py-1">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {workOrder.payments.map((payment, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-1">{new Date(payment.createdAt).toLocaleDateString()}</td>
                      <td className="text-right">{formatCurrency(payment.amount)}</td>
                      <td className="py-1">{payment.paymentMethod}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Terms & Conditions */}
          <div className="text-center text-sm text-gray-500 mt-8 pt-4 border-t">
            <p>This is a computer-generated work order. Please review all details before signing.</p>
            <p>Thank you for choosing {companyInfo.name}!</p>
          </div>
        </div>
      </div>
    </>
  )
}