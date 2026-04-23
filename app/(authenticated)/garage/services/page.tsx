'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useCurrency } from '@/context/CurrencyContext'
import WorkOrderPrint from '@/components/Garage/WorkOrderPrint'
import CompactTable from '@/components/UI/CompactTable'

interface Service {
  id: string
  workOrderNo: string
  serviceCategory: { name: string }
  description: string | null
  customerName: string | null
  vehicleRegNo: string
  agreedAmount: number
  depositPaid: number
  balance: number
  dueDate: string
  status: string
  paymentStatus: string
  createdAt: string
  payments: Array<{ id: string; amount: number; paymentMethod: string; createdAt: string }>
}

export default function GarageServicesPage() {
  const { formatCurrency } = useCurrency()
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([])
  const [filteredServices, setFilteredServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [showPastDue, setShowPastDue] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [newStatus, setNewStatus] = useState('')
  const [processing, setProcessing] = useState(false)
  const [printWorkOrder, setPrintWorkOrder] = useState<any>(null)
  const [companyInfo, setCompanyInfo] = useState({
    name: 'Stock Management System',
    email: 'info@stockmanager.co.ke',
    phone: '+254 700 000 000',
    address: 'Nairobi, Kenya'
  })

  // Fetch company info
  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch('/api/settings', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setCompanyInfo({
            name: data.companyName || 'Stock Management System',
            email: data.companyEmail || 'info@stockmanager.co.ke',
            phone: data.companyPhone || '+254 700 000 000',
            address: data.companyAddress || 'Nairobi, Kenya'
          })
        }
      } catch (error) {
        console.error('Failed to fetch company info')
      }
    }
    fetchCompanyInfo()
  }, [])

  useEffect(() => {
    fetchServices()
  }, [])

  useEffect(() => {
    filterServices()
  }, [searchTerm, statusFilter, showPastDue, services])

  const fetchServices = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/garage/services', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setServices(data)
    } catch (error) {
      toast.error('Failed to fetch services')
    } finally {
      setLoading(false)
    }
  }

  const filterServices = () => {
    let filtered = [...services]

    if (searchTerm) {
      filtered = filtered.filter(service =>
        service.workOrderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.vehicleRegNo.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(service => service.status === statusFilter)
    }

    if (showPastDue) {
      const today = new Date()
      filtered = filtered.filter(service => 
        new Date(service.dueDate) < today && 
        !['COMPLETED', 'COLLECTED', 'CANCELLED'].includes(service.status)
      )
    }

    setFilteredServices(filtered)
  }

  const handleRecordPayment = async () => {
    if (!selectedService) return
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    const amount = parseFloat(paymentAmount)
    if (amount > selectedService.balance) {
      toast.error(`Amount cannot exceed balance of ${formatCurrency(selectedService.balance)}`)
      return
    }

    setProcessing(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/garage/services?id=${selectedService.id}`, {
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
        fetchServices()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to record payment')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setProcessing(false)
    }
  }

  const handleUpdateStatus = async () => {
    if (!selectedService || !newStatus) return

    setProcessing(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/garage/services?id=${selectedService.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (res.ok) {
        toast.success(`Service marked as ${newStatus.toLowerCase()}`)
        setShowStatusModal(false)
        setNewStatus('')
        fetchServices()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to update status')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setProcessing(false)
    }
  }

  const handleMarkCollected = async (service: Service) => {
    if (service.balance > 0) {
      toast.error('Cannot mark as collected. Outstanding balance exists.')
      return
    }
    
    if (!confirm('Mark this service as collected? The vehicle will be released to the customer.')) return

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/garage/services?id=${service.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ collected: true })
      })

      if (res.ok) {
        toast.success('Service marked as collected')
        fetchServices()
      } else {
        toast.error('Failed to update')
      }
    } catch (error) {
      toast.error('An error occurred')
    }
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      COLLECTED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getPaymentBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      DEPOSIT_PAID: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      PARTIAL: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      PAID: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>
  }

  const workOrderColumns = [
    { key: 'workOrderNo', header: 'WO #', align: 'left' as const, width: '100px' },
    { key: 'customer', header: 'Customer/Vehicle', align: 'left' as const, render: (value: any, row: any) => (
        <div>
        <div className="font-medium">{row.customerName || 'Walk-in'}</div>
        <div className="text-gray-500 text-xs">{row.vehicleRegNo}</div>
        </div>
    )},
    { key: 'serviceCategory', header: 'Service', align: 'left' as const, render: (value: any) => value?.name || '-' },
    { key: 'agreedAmount', header: 'Amount', align: 'right' as const, render: (value: number) => formatCurrency(value) },
    { key: 'depositPaid', header: 'Paid', align: 'right' as const, render: (value: number) => formatCurrency(value) },
    { key: 'balance', header: 'Balance', align: 'right' as const, render: (value: number) => (
        <span className={value > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
        {formatCurrency(value)}
        </span>
    )},
    { key: 'dueDate', header: 'Due Date', align: 'left' as const, render: (value: string, row: any) => {
        const isPastDue = new Date(value) < new Date() && !['COMPLETED', 'COLLECTED', 'CANCELLED'].includes(row.status)
        return <span className={isPastDue ? 'text-red-600 font-semibold' : ''}>{new Date(value).toLocaleDateString()}</span>
    }},
    { key: 'status', header: 'Status', align: 'center' as const, render: (value: string) => (
        <span className={`px-1.5 py-0.5 text-xs rounded-full ${
        value === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
        value === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
        value === 'COMPLETED' ? 'bg-green-100 text-green-800' :
        value === 'COLLECTED' ? 'bg-purple-100 text-purple-800' :
        'bg-red-100 text-red-800'
        } dark:bg-opacity-20`}>
        {value.replace('_', ' ')}
        </span>
    )},
    { key: 'actions', header: 'Actions', align: 'center' as const, render: (_: any, row: any) => (
        <select
        onChange={(e) => {
            const action = e.target.value
            if (action === 'pay') {
            setSelectedService(row)
            setPaymentAmount(row.balance.toString())
            setShowPaymentModal(true)
            } else if (action === 'update') {
            setSelectedService(row)
            setNewStatus('')
            setShowStatusModal(true)
            } else if (action === 'view') {
            setPrintWorkOrder(row)
            } else if (action === 'collect') {
            handleMarkCollected(row)
            }
            e.target.value = ''
        }}
        className="text-xs border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-1.5 py-0.5"
        defaultValue=""
        >
        <option value="" disabled>Actions</option>
        {row.balance > 0 && row.status !== 'CANCELLED' && row.status !== 'COLLECTED' && (
            <option value="pay">Record Payment</option>
        )}
        {row.status !== 'COLLECTED' && row.status !== 'CANCELLED' && (
            <option value="update">Update Status</option>
        )}
        <option value="view">View & Print</option>
        {row.status === 'COMPLETED' && row.balance === 0 && (
            <option value="collect">Mark as Collected</option>
        )}
        </select>
    )}
    ]

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Work Orders</h1>
        <button
          onClick={() => router.push('/garage/pos')}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          New Work Order
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search by WO#, customer, or vehicle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="COLLECTED">Collected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Past Due</label>
            <label className="flex items-center mt-2">
              <input
                type="checkbox"
                checked={showPastDue}
                onChange={(e) => setShowPastDue(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Show past due only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Services Table */}
      <CompactTable columns={workOrderColumns} data={filteredServices} />

      {/* Payment Modal */}
      {showPaymentModal && selectedService && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-medium mb-4 dark:text-white">Record Payment</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400">Work Order</label>
                <p className="font-medium dark:text-white">{selectedService.workOrderNo}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400">Outstanding Balance</label>
                <p className="text-lg font-bold text-red-600">{formatCurrency(selectedService.balance)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
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
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={processing}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && selectedService && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-medium mb-4 dark:text-white">Update Status</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400">Work Order</label>
                <p className="font-medium dark:text-white">{selectedService.workOrderNo}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
                >
                  <option value="">Select status</option>
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={processing || !newStatus}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {processing ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View & Print Modal */}
      {printWorkOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold dark:text-white">Work Order Details</h3>
              <button
                onClick={() => setPrintWorkOrder(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="mb-4">
              <WorkOrderPrint 
                workOrder={printWorkOrder}
                companyInfo={companyInfo}
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setPrintWorkOrder(null)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}