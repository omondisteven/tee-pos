import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'

// Define types for better TypeScript support
interface SaleItem {
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

interface Payment {
  id: string
  amount: number
  paymentMethod: string
  notes: string | null
  createdAt: Date
}

interface Sale {
  id: string
  receiptNo: string
  customer: string | null
  subtotal: number
  tax: number
  total: number
  amountPaid: number
  balance: number
  paymentMethod: string
  paymentStatus: string
  status: string
  cancelReason: string | null
  cancelledAt: Date | null
  createdAt: Date
  userId: string
  items: SaleItem[]
  payments: Payment[]
  user: {
    name: string
    email: string
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { items, customerId, customerName, paymentMethod, subtotal, tax, total, amountPaid } = body

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'No items in sale' },
        { status: 400 }
      )
    }

    // Check stock availability first
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      })

      if (!product) {
        return NextResponse.json(
          { error: `Product not found` },
          { status: 404 }
        )
      }

      if (product.quantity < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}. Available: ${product.quantity}` },
          { status: 400 }
        )
      }
    }

    // Calculate payment status
    const paidAmount = amountPaid || 0
    const balance = total - paidAmount
    let paymentStatus = 'PAID'
    if (balance > 0 && paidAmount > 0) {
      paymentStatus = 'PARTIAL'
    } else if (paidAmount === 0) {
      paymentStatus = 'PENDING'
    }

    // Generate receipt number
    const receiptNo = `SALE-${Date.now()}-${Math.floor(Math.random() * 1000)}`

    try {
      // Create sale
      const sale = await prisma.sale.create({
        data: {
          receiptNo,
          customerId: customerId || null,
          customerName: customerName || null,
          paymentMethod,
          subtotal,
          tax,
          total,
          amountPaid: paidAmount,
          balance: balance,
          paymentStatus,
          status: 'ACTIVE',
          userId: authUser.userId
        }
      })

      // Create sale items
      for (const item of items) {
        await prisma.saleItem.create({
          data: {
            saleId: sale.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity
          }
        })
      }

      // Create payment record if amount paid > 0
      if (paidAmount > 0) {
        await prisma.payment.create({
          data: {
            saleId: sale.id,
            amount: paidAmount,
            paymentMethod,
            notes: paymentStatus === 'PARTIAL' ? 'Partial payment' : 'Full payment',
            userId: authUser.userId
          }
        })
      }

      // Update stock quantities
      for (const item of items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            quantity: {
              decrement: item.quantity
            }
          }
        })
      }

      const completeSale = await prisma.sale.findUnique({
        where: { id: sale.id },
        include: {
          items: {
            include: {
              product: true
            }
          },
          payments: true,
          customer: true,  // Add this to include customer details
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      })

      return NextResponse.json(completeSale, { status: 201 })
      
    } catch (error) {
      console.error('Error in sale creation:', error)
      return NextResponse.json(
        { error: 'Failed to create sale' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Create sale error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const statusFilter = searchParams.get('status') || ''
    const paymentStatus = searchParams.get('paymentStatus') || ''
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}

    if (search) {
      where.receiptNo = { contains: search, mode: 'insensitive' }
    }

    if (statusFilter && statusFilter !== 'ALL') {
      where.status = statusFilter
    }

    if (paymentStatus && paymentStatus !== 'ALL') {
      where.paymentStatus = paymentStatus
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          items: {
            include: {
              product: true
            }
          },
          payments: true,
          customer: {  // Add this to include customer details
            select: {
              id: true,
              name: true,
              phone: true
            }
          },
          user: {
            select: {
              name: true,
              email: true
            }
          }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.sale.count({ where })
    ])

    const totalAmount = (sales as any[]).reduce((sum: number, sale: any) => sum + sale.total, 0)
    const totalOutstanding = (sales as any[]).reduce((sum: number, sale: any) => sum + sale.balance, 0)

    return NextResponse.json({
      sales,
      totalAmount,
      totalOutstanding,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Get sales error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Add payment to existing sale
export async function PUT(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const { action, cancelReason, paymentAmount, paymentMethod } = await req.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Sale ID is required' },
        { status: 400 }
      )
    }

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { payments: true }
    }) as Sale | null

    if (!sale) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      )
    }

    if (action === 'ADD_PAYMENT') {
      if (!paymentAmount || paymentAmount <= 0) {
        return NextResponse.json(
          { error: 'Valid payment amount is required' },
          { status: 400 }
        )
      }

      if (paymentAmount > sale.balance) {
        return NextResponse.json(
          { error: `Payment amount cannot exceed balance of ${sale.balance}` },
          { status: 400 }
        )
      }

      const newBalance = sale.balance - paymentAmount
      const newPaidAmount = sale.amountPaid + paymentAmount
      let paymentStatus = sale.paymentStatus
      
      if (newBalance === 0) {
        paymentStatus = 'PAID'
      } else if (newBalance > 0 && newPaidAmount > 0) {
        paymentStatus = 'PARTIAL'
      }

      // Add payment record
      await prisma.payment.create({
        data: {
          saleId: id,
          amount: paymentAmount,
          paymentMethod: paymentMethod || sale.paymentMethod,
          notes: 'Additional payment',
          userId: authUser.userId
        }
      })

      // Update sale
      const updatedSale = await prisma.sale.update({
        where: { id },
        data: {
          amountPaid: newPaidAmount,
          balance: newBalance,
          paymentStatus
        },
        include: {
          items: {
            include: {
              product: true
            }
          },
          payments: true,
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      })

      return NextResponse.json(updatedSale)
    }

    if (action === 'CANCEL') {
      if (!cancelReason || cancelReason.trim() === '') {
        return NextResponse.json(
          { error: 'Cancellation reason is required' },
          { status: 400 }
        )
      }

      if (sale.status === 'CANCELLED') {
        return NextResponse.json(
          { error: 'Sale is already cancelled' },
          { status: 400 }
        )
      }

      // Get sale items to reverse stock
      const saleItems = await prisma.saleItem.findMany({
        where: { saleId: id }
      })

      // Reverse stock
      for (const item of saleItems) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            quantity: {
              increment: item.quantity
            }
          }
        })
      }

      // Update sale status
      const updatedSale = await prisma.sale.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelReason,
          cancelledAt: new Date()
        },
        include: {
          items: {
            include: {
              product: true
            }
          },
          payments: true,
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      })

      return NextResponse.json(updatedSale)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Update sale error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}