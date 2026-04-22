'use client'

import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function Navbar() {
  const router = useRouter()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    toast.success('Logged out successfully')
    router.push('/login')
  }

  return (
    <nav className="bg-white shadow-sm">
      <div className="px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <h2 className="text-xl font-semibold text-gray-800">
            Welcome, {user.name || 'User'}
          </h2>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm text-red-600 hover:text-red-800 transition-colors"
        >
          Logout
        </button>
      </div>
    </nav>
  )
}