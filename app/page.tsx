'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    
    // Verify if token is valid
    const verifyAndRedirect = async () => {
      if (token) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          })
          
          if (res.ok) {
            router.replace('/dashboard')
          } else {
            // Invalid token, clear storage
            localStorage.clear()
            sessionStorage.clear()
            router.replace('/login')
          }
        } catch (error) {
          router.replace('/login')
        }
      } else {
        router.replace('/login')
      }
    }

    verifyAndRedirect()
  }, [router])

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-xl">Loading...</div>
    </div>
  )
}