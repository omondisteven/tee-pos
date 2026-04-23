'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import CompactTable from '@/components/UI/CompactTable'

interface Customer {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  status: string
  createdAt: string
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  })
  const [editFormData, setEditFormData] = useState({
    phone: '',
    email: ''
  })

  useEffect(() => {
    fetchCustomers()
  }, [])

  useEffect(() => {
    filterCustomers()
  }, [searchTerm, statusFilter, customers])

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/customers', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setCustomers(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error('Failed to fetch customers')
    } finally {
      setLoading(false)
    }
  }

  const filterCustomers = () => {
    let filtered = [...customers]

    if (searchTerm) {
      filtered = filtered.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(customer => customer.status === statusFilter)
    }

    setFilteredCustomers(filtered)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        toast.success('Customer added successfully')
        setShowModal(false)
        setFormData({ name: '', phone: '', email: '', address: '' })
        fetchCustomers()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to add customer')
      }
    } catch (error) {
      toast.error('An error occurred')
    }
  }

  const handleUpdateCustomer = async () => {
    if (!selectedCustomer) return

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/customers?id=${selectedCustomer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          phone: editFormData.phone,
          email: editFormData.email
        })
      })

      if (res.ok) {
        toast.success('Customer updated successfully')
        setShowEditModal(false)
        setSelectedCustomer(null)
        fetchCustomers()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to update customer')
      }
    } catch (error) {
      toast.error('An error occurred')
    }
  }

  const handleToggleStatus = async (customer: Customer) => {
    const newStatus = customer.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    const action = newStatus === 'ACTIVE' ? 'activate' : 'deactivate'
    
    if (!confirm(`Are you sure you want to ${action} this customer?`)) return

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/customers?id=${customer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus
        })
      })

      if (res.ok) {
        toast.success(`Customer ${action}d successfully`)
        fetchCustomers()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to update status')
      }
    } catch (error) {
      toast.error('An error occurred')
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>
  }

  const customerColumns = [
    { key: 'name', header: 'Name', align: 'left' as const },
    { key: 'phone', header: 'Phone', align: 'left' as const, render: (value: string) => value || '-' },
    { key: 'email', header: 'Email', align: 'left' as const, render: (value: string) => value || '-' },
    { key: 'address', header: 'Address', align: 'left' as const, render: (value: string) => value || '-' },
    { key: 'status', header: 'Status', align: 'center' as const, render: (value: string) => (
      <span className={`px-1.5 py-0.5 text-xs rounded-full ${
        value === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      }`}>
        {value}
      </span>
    )},
    { key: 'actions', header: 'Actions', align: 'center' as const, render: (_: any, row: any) => (
      <select
        onChange={(e) => {
          const action = e.target.value
          if (action === 'view') {
            setSelectedCustomer(row)
            setShowViewModal(true)
          } else if (action === 'edit') {
            setSelectedCustomer(row)
            setEditFormData({ phone: row.phone || '', email: row.email || '' })
            setShowEditModal(true)
          } else if (action === 'status') {
            handleToggleStatus(row)
          }
          e.target.value = ''
        }}
        className="text-xs border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-1.5 py-0.5"
        defaultValue=""
      >
        <option value="" disabled>Actions</option>
        <option value="view">View Details</option>
        <option value="edit">Edit</option>
        <option value="status">{row.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</option>
      </select>
    )}
  ]

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Customers</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add Customer
        </button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search by name, phone or email..."
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
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <CompactTable columns={customerColumns} data={filteredCustomers} />

      {/* Add Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-medium mb-4 dark:text-white">Add Customer</h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Name *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
                  required
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
                />
                <textarea
                  placeholder="Address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
                  rows={2}
                />
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Customer Modal */}
      {showViewModal && selectedCustomer && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-medium mb-4 dark:text-white">Customer Details</h3>
            <div className="space-y-2">
              <p><strong>Name:</strong> {selectedCustomer.name}</p>
              <p><strong>Phone:</strong> {selectedCustomer.phone || '-'}</p>
              <p><strong>Email:</strong> {selectedCustomer.email || '-'}</p>
              <p><strong>Address:</strong> {selectedCustomer.address || '-'}</p>
              <p><strong>Status:</strong> {selectedCustomer.status}</p>
              <p><strong>Registered:</strong> {new Date(selectedCustomer.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditModal && selectedCustomer && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-medium mb-4 dark:text-white">Edit Customer</h3>
            <div className="mb-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">Name: {selectedCustomer.name}</p>
            </div>
            <div className="space-y-3">
              <input
                type="tel"
                placeholder="Phone"
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
              />
              <input
                type="email"
                placeholder="Email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
              />
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedCustomer(null)
                }}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateCustomer}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}