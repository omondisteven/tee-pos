'use client'

import { useState, useEffect } from 'react'
import { useCurrency } from '@/context/CurrencyContext'
import toast from 'react-hot-toast'
import CompactTable from '@/components/UI/CompactTable'

interface GarageDebtor {
  id: string
  workOrderNo: string
  customerName: string | null
  vehicleRegNo: string
  agreedAmount: number
  depositPaid: number
  balance: number
  dueDate: string
  status: string
  completedAt?: string
  collectedAt?: string
  payments?: Array<{
    id: string
    amount: number
    paymentMethod: string
    notes: string
    createdAt: string
  }>
}

export default function GarageDebtorsPage() {
  const { formatCurrency } = useCurrency()
  const [debtors, setDebtors] = useState<GarageDebtor[]>([])
  const [filteredDebtors, setFilteredDebtors] = useState<GarageDebtor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDebtor, setSelectedDebtor] = useState<GarageDebtor | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [processingPayment, setProcessingPayment] = useState(false)

  useEffect(() => {
    fetchDebtors()
  }, [])

  useEffect(() => {
    filterDebtors()
  }, [searchTerm, debtors])

  const fetchDebtors = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/garage/services', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const allServices = await res.json()
      
      // Filter for services with balance > 0 AND status is COMPLETED or COLLECTED
      const debtorsList = allServices.filter((s: any) => 
        s.balance > 0 && 
        (s.status === 'COMPLETED' || s.status === 'COLLECTED') &&
        s.status !== 'CANCELLED'
      )
      setDebtors(debtorsList)
    } catch (error) {
      toast.error('Failed to fetch debtors')
    } finally {
      setLoading(false)
    }
  }

  const filterDebtors = () => {
    let filtered = [...debtors]

    if (searchTerm) {
      filtered = filtered.filter(debtor =>
        debtor.workOrderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        debtor.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        debtor.vehicleRegNo.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredDebtors(filtered)
  }

  const handleRecordPayment = async () => {
    if (!selectedDebtor) return
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Please enter a valid payment amount')
      return
    }

    const amount = parseFloat(paymentAmount)
    if (amount > selectedDebtor.balance) {
      toast.error(`Payment cannot exceed balance of ${formatCurrency(selectedDebtor.balance)}`)
      return
    }

    setProcessingPayment(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/garage/services?id=${selectedDebtor.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentAmount: amount,
          paymentMethod
        })
      })

      if (res.ok) {
        toast.success('Payment recorded successfully')
        setShowPaymentModal(false)
        setPaymentAmount('')
        setSelectedDebtor(null)
        fetchDebtors() // Refresh the list
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to record payment')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setProcessingPayment(false)
    }
  }

  const totalOutstanding = filteredDebtors.reduce((sum, d) => sum + d.balance, 0)

  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>
  }

  const garageDebtorColumns = [
    { key: 'workOrderNo', header: 'WO #', align: 'left' as const },
    { key: 'customerName', header: 'Customer', align: 'left' as const, render: (value: string) => value || 'Walk-in' },
    { key: 'vehicleRegNo', header: 'Vehicle', align: 'left' as const },
    { key: 'agreedAmount', header: 'Amount', align: 'right' as const, render: (value: number) => formatCurrency(value) },
    { key: 'depositPaid', header: 'Paid', align: 'right' as const, render: (value: number) => formatCurrency(value) },
    { key: 'balance', header: 'Balance', align: 'right' as const, render: (value: number) => (
      <span className="text-red-600 font-semibold">{formatCurrency(value)}</span>
    )},
    { key: 'dueDate', header: 'Due Date', align: 'left' as const, render: (value: string) => new Date(value).toLocaleDateString() },
    { key: 'status', header: 'Status', align: 'center' as const, render: (value: string) => (
      <span className={`px-1.5 py-0.5 text-xs rounded-full ${
        value === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
      } dark:bg-opacity-20`}>
        {value}
      </span>
    )},
    { key: 'actions', header: 'Actions', align: 'center' as const, render: (_: any, row: any) => (
      <button
        onClick={() => {
          setSelectedDebtor(row)
          setPaymentAmount(row.balance.toString())
          setShowPaymentModal(true)
        }}
        className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs hover:bg-blue-700"
      >
        Record Payment
      </button>
    )}
  ]

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">Garage Debtors</h1>
      
      <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        <p>Customers with completed/collected services that have outstanding balances.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Outstanding</p>
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalOutstanding)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{filteredDebtors.length} customers with balances</p>
          </div>
          <input
            type="text"
            placeholder="Search by WO#, customer, or vehicle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded w-full sm:w-64"
          />
        </div>
      </div>

      {/* Debtors Table with Horizontal Scroll */}
      <CompactTable columns={garageDebtorColumns} data={filteredDebtors} />
      {/* Payment Modal */}
      {showPaymentModal && selectedDebtor && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-medium mb-4 dark:text-white">Record Payment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Work Order</label>
                <p className="text-gray-900 dark:text-white font-medium">{selectedDebtor.workOrderNo}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer</label>
                <p className="text-gray-900 dark:text-white">{selectedDebtor.customerName || 'Walk-in Customer'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vehicle</label>
                <p className="text-gray-900 dark:text-white">{selectedDebtor.vehicleRegNo}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <p className="text-gray-900 dark:text-white">{selectedDebtor.status}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Outstanding Balance</label>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(selectedDebtor.balance)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
                  placeholder="Enter amount"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="MOBILE">Mobile Payment</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => {
                  setShowPaymentModal(false)
                  setPaymentAmount('')
                  setSelectedDebtor(null)
                }}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={processingPayment}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {processingPayment ? 'Processing...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}