'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import CompactTable from '@/components/UI/CompactTable'

interface ServiceCategory {
  id: string
  name: string
  description: string | null
  status: string
  createdAt: string
}

export default function ManageServiceCategoriesPage() {
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/garage/categories', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setCategories(data)
    } catch (error) {
      toast.error('Failed to fetch categories')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      const url = editingCategory ? `/api/garage/categories?id=${editingCategory.id}` : '/api/garage/categories'
      const method = editingCategory ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        toast.success(editingCategory ? 'Category updated' : 'Category created')
        setShowModal(false)
        setEditingCategory(null)
        setFormData({ name: '', description: '' })
        fetchCategories()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Operation failed')
      }
    } catch (error) {
      toast.error('An error occurred')
    }
  }

  const handleToggleStatus = async (category: ServiceCategory) => {
    const newStatus = category.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/garage/categories?id=${category.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (res.ok) {
        toast.success(`Category ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`)
        fetchCategories()
      } else {
        toast.error('Failed to update status')
      }
    } catch (error) {
      toast.error('An error occurred')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? This may affect existing services.')) return
    
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/garage/categories?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        toast.success('Category deleted')
        fetchCategories()
      } else {
        toast.error('Failed to delete category')
      }
    } catch (error) {
      toast.error('An error occurred')
    }
  }

  // Define columns for the compact table
  const categoryColumns = [
    { key: 'name', header: 'Name', align: 'left' as const },
    { key: 'description', header: 'Description', align: 'left' as const, render: (value: string) => value || '-' },
    { key: 'status', header: 'Status', align: 'center' as const, render: (value: string) => (
      <span className={`px-1.5 py-0.5 text-xs rounded-full ${
        value === 'ACTIVE' 
          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      }`}>
        {value}
      </span>
    )},
    { key: 'actions', header: 'Actions', align: 'center' as const, render: (_: any, row: ServiceCategory) => (
      <select
        onChange={(e) => {
          const action = e.target.value
          if (action === 'edit') {
            setEditingCategory(row)
            setFormData({ name: row.name, description: row.description || '' })
            setShowModal(true)
          } else if (action === 'status') {
            handleToggleStatus(row)
          } else if (action === 'delete') {
            handleDelete(row.id)
          }
          e.target.value = ''
        }}
        className="text-xs border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-1.5 py-0.5"
        defaultValue=""
      >
        <option value="" disabled>Actions</option>
        <option value="edit">Edit</option>
        <option value="status">{row.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</option>
        <option value="delete">Delete</option>
      </select>
    )}
  ]

  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold dark:text-white">Service Categories</h1>
        <button
          onClick={() => {
            setEditingCategory(null)
            setFormData({ name: '', description: '' })
            setShowModal(true)
          }}
          className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700"
        >
          Add Category
        </button>
      </div>

      {/* Compact Table */}
      <CompactTable columns={categoryColumns} data={categories} />

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-medium mb-4 dark:text-white">
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Category Name *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-sm"
                  required
                />
                <textarea
                  placeholder="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-sm"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 bg-gray-300 dark:bg-gray-600 rounded text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  {editingCategory ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}