import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'

// Define types for better TypeScript support
interface DebtorPayment {
  id: string
  amount: number
  paymentMethod: string
  notes: string | null
  createdAt: Date
}

interface DebtorItem {
  id: string
  quantity: number
  price: number
  total: number
  productId: string
  product: {
    id: string
    name: string
    sku: string
    price: number
    cost: number
    quantity: number
    vatCategory: string
  }
}

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const customer = searchParams.get('customer') || ''
    const minBalance = parseFloat(searchParams.get('minBalance') || '0')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {
      paymentStatus: { in: ['PARTIAL', 'PENDING'] },
      status: 'ACTIVE'
    }

    if (customer) {
      where.customer = { contains: customer, mode: 'insensitive' }
    }

    if (minBalance > 0) {
      where.balance = { gte: minBalance }
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const debtors = await prisma.sale.findMany({
      where,
      include: {
        payments: {
          orderBy: { createdAt: 'desc' }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        },
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate totals using simple loop
    let totalOutstanding = 0
    const customerIds = new Set()

    for (const debtor of debtors) {
      totalOutstanding += debtor.balance
      if (debtor.customerId) {
        customerIds.add(debtor.customerId)
      }
    }

    return NextResponse.json({
      debtors,
      summary: {
        totalOutstanding,
        totalCustomers: customerIds.size,
        totalInvoices: debtors.length
      }
    })
  } catch (error) {
    console.error('Debtors report error:', error)
    return NextResponse.json(
      { 
        debtors: [],
        summary: {
          totalOutstanding: 0,
          totalCustomers: 0,
          totalInvoices: 0
        }
      },
      { status: 200 }
    )
  }
}