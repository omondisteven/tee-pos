'use client'

import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { useCurrency } from '@/context/CurrencyContext'
import CompactTable from '@/components/UI/CompactTable'

interface Debtor {
  id: string
  receiptNo: string
  customerName: string | null
  customerId: string | null
  total: number
  amountPaid: number
  balance: number
  paymentStatus: string
  createdAt: string
  payments: Array<{
    id: string
    amount: number
    paymentMethod: string
    notes: string
    createdAt: string
  }>
}

interface Customer {
  id: string
  name: string
  phone: string | null
}

export default function DebtorsReportPage() {
  const { formatCurrency, decimalPlaces } = useCurrency()
  const [debtors, setDebtors] = useState<Debtor[]>([])
  const [filteredDebtors, setFilteredDebtors] = useState<Debtor[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedDebtor, setSelectedDebtor] = useState<Debtor | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [processingPayment, setProcessingPayment] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchDebtors()
    fetchCustomers()
  }, [])

  useEffect(() => {
    filterDebtors()
  }, [selectedCustomerId, startDate, endDate, debtors])

  const fetchDebtors = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/reports/debtors', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setDebtors(data.debtors || [])
    } catch (error) {
      toast.error('Failed to fetch debtors')
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/customers', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setCustomers(data)
    } catch (error) {
      console.error('Failed to fetch customers')
    }
  }

  const filterDebtors = () => {
    let filtered = [...debtors]

    if (selectedCustomerId) {
      filtered = filtered.filter(debtor => debtor.customerId === selectedCustomerId)
    }

    if (startDate && endDate) {
      filtered = filtered.filter(debtor => {
        const debtorDate = new Date(debtor.createdAt)
        const start = new Date(startDate)
        const end = new Date(endDate)
        end.setHours(23, 59, 59)
        return debtorDate >= start && debtorDate <= end
      })
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
      const res = await fetch(`/api/sales?id=${selectedDebtor.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'ADD_PAYMENT',
          paymentAmount: amount,
          paymentMethod
        })
      })

      if (res.ok) {
        toast.success('Payment recorded successfully')
        setShowPaymentModal(false)
        setPaymentAmount('')
        fetchDebtors()
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

  const totalOutstanding = filteredDebtors.reduce((sum, debtor) => sum + debtor.balance, 0)

  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>
  }

  const formatAmountForInput = (value: string) => {
  if (!value) return ''
  const num = parseFloat(value)
  if (isNaN(num)) return ''
  return num.toFixed(decimalPlaces)
}

    const handlePaymentAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value
        // Remove any non-digit characters except decimal point
        value = value.replace(/[^\d.]/g, '')
        // Ensure only one decimal point
        const parts = value.split('.')
        if (parts.length > 2) {
            value = parts[0] + '.' + parts.slice(1).join('')
        }
        // Limit decimal places
        if (parts.length === 2 && parts[1].length > decimalPlaces) {
            value = parts[0] + '.' + parts[1].substring(0, decimalPlaces)
        }
        setPaymentAmount(value)
    }

    const debtorColumns = [
    { key: 'receiptNo', header: 'Receipt #', align: 'left' as const },
    { key: 'customer', header: 'Customer', align: 'left' as const, render: (value: any, row: any) => row.customerName || row.customer || 'Walk-in' },
    { key: 'phone', header: 'Phone', align: 'left' as const, render: (value: any, row: any) => row.customer?.phone || '-' },
    { key: 'total', header: 'Total', align: 'right' as const, render: (value: number) => formatCurrency(value) },
    { key: 'amountPaid', header: 'Paid', align: 'right' as const, render: (value: number) => formatCurrency(value) },
    { key: 'balance', header: 'Balance', align: 'right' as const, render: (value: number) => (
      <span className="text-red-600 font-semibold">{formatCurrency(value)}</span>
    )},
    { key: 'createdAt', header: 'Date', align: 'left' as const, render: (value: string) => new Date(value).toLocaleDateString() },
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Debtors Report</h1>
        <p className="text-gray-600 dark:text-gray-400">Customers with outstanding balances</p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
            >
              <option value="">All Customers</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} {customer.phone ? `(${customer.phone})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
            />
          </div>
        </div>
      </div>

      {/* Summary and Print */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Outstanding</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{formatCurrency(totalOutstanding)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{filteredDebtors.length} invoices</p>
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
          <h1 className="text-2xl font-bold text-center mb-4">Debtors Report</h1>
          <p className="text-center text-gray-600 mb-6">
            Generated on {new Date().toLocaleString()}
          </p>
          {selectedCustomerId && (
            <p className="text-center text-sm text-gray-500 mb-4">
              Customer: {customers.find(c => c.id === selectedCustomerId)?.name}
            </p>
          )}
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
                <th className="px-4 py-2 text-left">Phone</th>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2 text-right">Paid</th>
                <th className="px-4 py-2 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {filteredDebtors.map((debtor) => {
                const customer = customers.find(c => c.id === debtor.customerId)
                return (
                  <tr key={debtor.id}>
                    <td className="px-4 py-2">{debtor.receiptNo}</td>
                    <td className="px-4 py-2">{debtor.customerName || 'Unknown'}</td>
                    <td className="px-4 py-2">{customer?.phone || '-'}</td>
                    <td className="px-4 py-2">{new Date(debtor.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(debtor.total)}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(debtor.amountPaid)}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(debtor.balance)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={6} className="px-4 py-2 text-right font-bold">Total Outstanding:</td>
                <td className="px-4 py-2 text-right font-bold">{formatCurrency(totalOutstanding)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Debtors Table */}
      <CompactTable columns={debtorColumns} data={filteredDebtors} />
      {/* Payment Modal */}
      {showPaymentModal && selectedDebtor && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-medium mb-4 dark:text-white">Record Payment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer</label>
                <p className="text-gray-900 dark:text-white">{selectedDebtor.customerName || 'Walk-in Customer'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Invoice #</label>
                <p className="text-gray-900 dark:text-white">{selectedDebtor.receiptNo}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Outstanding Balance</label>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(selectedDebtor.balance)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Payment Amount ({decimalPlaces} decimal places)
                </label>
                <input
                    type="text"
                    inputMode="decimal"
                    value={paymentAmount}
                    onChange={handlePaymentAmountChange}
                    onBlur={() => {
                    if (paymentAmount) {
                        const num = parseFloat(paymentAmount)
                        if (!isNaN(num)) {
                        setPaymentAmount(num.toFixed(decimalPlaces))
                        }
                    }
                    }}
                    className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
                    placeholder={`0.${'0'.repeat(decimalPlaces)}`}
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
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => {
                  setShowPaymentModal(false)
                  setPaymentAmount('')
                }}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded"
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