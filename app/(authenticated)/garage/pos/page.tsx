'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useCurrency } from '@/context/CurrencyContext'
import WorkOrderPrint from '@/components/Garage/WorkOrderPrint'

interface ServiceCategory {
  id: string
  name: string
  description: string | null
}

interface Customer {
  id: string
  name: string
  phone: string | null
}

export default function GaragePOSPage() {
  const { formatCurrency } = useCurrency()
  const router = useRouter()
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [formData, setFormData] = useState({
    serviceCategoryId: '',
    description: '',
    customerId: '',
    customerName: '',
    vehicleRegNo: '',
    agreedAmount: '',
    depositPaid: '',
    dueDate: ''
  })

    const [showPrintDialog, setShowPrintDialog] = useState(false)
    const [createdWorkOrder, setCreatedWorkOrder] = useState<any>(null)
    const [companyInfo, setCompanyInfo] = useState({
    name: 'Stock Management System',
    email: 'info@stockmanager.co.ke',
    phone: '+254 700 000 000',
    address: 'Nairobi, Kenya'
    })

    // Fetch company info from settings
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
    fetchCategories()
    fetchCustomers()
    // Set default due date to 7 days from now
    const defaultDueDate = new Date()
    defaultDueDate.setDate(defaultDueDate.getDate() + 7)
    setFormData(prev => ({ ...prev, dueDate: defaultDueDate.toISOString().split('T')[0] }))
  }, [])

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/garage/categories?status=ACTIVE', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setCategories(data)
    } catch (error) {
      toast.error('Failed to load service categories')
    }
  }

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/customers', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setCustomers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch customers')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.serviceCategoryId || !formData.vehicleRegNo || !formData.agreedAmount || !formData.dueDate) {
        toast.error('Please fill in all required fields')
        return
    }

    setLoading(true)
    try {
        const token = localStorage.getItem('token')
        const res = await fetch('/api/garage/services', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            serviceCategoryId: formData.serviceCategoryId,
            description: formData.description,
            customerId: formData.customerId || null,
            customerName: formData.customerName,
            vehicleRegNo: formData.vehicleRegNo,
            agreedAmount: parseFloat(formData.agreedAmount),
            depositPaid: parseFloat(formData.depositPaid) || 0,
            dueDate: formData.dueDate
        })
        })

        if (res.ok) {
        const newWorkOrder = await res.json()
        setCreatedWorkOrder(newWorkOrder)
        setShowPrintDialog(true)
        // Don't redirect yet, wait for user choice
        } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to create work order')
        }
    } catch (error) {
        toast.error('An error occurred')
    } finally {
        setLoading(false)
    }
    }

  const selectedCustomer = customers.find(c => c.id === formData.customerId)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Create Work Order</h1>
        <p className="text-gray-600 dark:text-gray-400">Create a new service work order for a customer</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
        {/* Service Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Service Category *
          </label>
          <select
            value={formData.serviceCategoryId}
            onChange={(e) => setFormData({ ...formData, serviceCategoryId: e.target.value })}
            className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
            required
          >
            <option value="">Select a service category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Service Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Service Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
            placeholder="Detailed description of the work to be done..."
          />
        </div>

        {/* Customer Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Customer
          </label>
          <div className="relative">
            <input
              type="text"
              value={selectedCustomer?.name || formData.customerName || ''}
              onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
              onChange={(e) => {
                setFormData({ ...formData, customerName: e.target.value, customerId: '' })
                setShowCustomerDropdown(true)
              }}
              placeholder="Select existing customer or enter name..."
              className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
            />
            {showCustomerDropdown && customers.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded shadow-lg max-h-60 overflow-y-auto">
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    onClick={() => {
                      setFormData({ ...formData, customerId: customer.id, customerName: customer.name })
                      setShowCustomerDropdown(false)
                    }}
                    className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer border-b dark:border-gray-600"
                  >
                    <div className="font-medium dark:text-white">{customer.name}</div>
                    {customer.phone && <div className="text-xs text-gray-500">{customer.phone}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Vehicle Registration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Vehicle Registration Number *
          </label>
          <input
            type="text"
            value={formData.vehicleRegNo}
            onChange={(e) => setFormData({ ...formData, vehicleRegNo: e.target.value.toUpperCase() })}
            placeholder="e.g., KCA 123A"
            className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
            required
          />
        </div>

        {/* Financial Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Agreed Amount *
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.agreedAmount}
              onChange={(e) => setFormData({ ...formData, agreedAmount: e.target.value })}
              className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Deposit (Optional)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.depositPaid}
              onChange={(e) => setFormData({ ...formData, depositPaid: e.target.value })}
              className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
            />
          </div>
        </div>

        {/* Due Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Due Date *
          </label>
          <input
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
            required
          />
        </div>

        {/* Summary Preview */}
        {formData.agreedAmount && (
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="font-semibold mb-2 dark:text-white">Summary</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Agreed Amount:</span>
                <span>{formatCurrency(parseFloat(formData.agreedAmount))}</span>
              </div>
              {formData.depositPaid && parseFloat(formData.depositPaid) > 0 && (
                <>
                  <div className="flex justify-between text-green-600">
                    <span>Deposit Paid:</span>
                    <span>{formatCurrency(parseFloat(formData.depositPaid))}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Balance Due:</span>
                    <span>{formatCurrency(parseFloat(formData.agreedAmount) - parseFloat(formData.depositPaid))}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.push('/garage/services')}
            className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Work Order'}
          </button>
        </div>
      </form>
        {showPrintDialog && createdWorkOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-40 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 mb-4">
                <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Work Order Created Successfully!</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Would you like to print the work order sheet?</p>
                <div className="flex justify-center space-x-3">
                <button
                    onClick={() => {
                    setShowPrintDialog(false)
                    router.push('/garage/services')
                    }}
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-white rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                    No
                </button>
                <button
                    onClick={() => {
                    setShowPrintDialog(false)
                    // Open print dialog and redirect after
                    setTimeout(() => {
                        const printWindow = window.open('', '_blank')
                        if (printWindow) {
                        // Will be handled by the print component
                        }
                    }, 100)
                    router.push('/garage/services')
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Yes
                </button>
                </div>
            </div>
            </div>
        </div>
        )}
        {createdWorkOrder && !showPrintDialog && (
        <div className="hidden">
            <WorkOrderPrint 
            workOrder={createdWorkOrder}
            companyInfo={companyInfo}
            />
        </div>
        )}
    </div>
  )
}