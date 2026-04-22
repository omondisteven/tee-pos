import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'

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
  }
}

interface Sale {
  id: string
  receiptNo: string
  customer: string | null
  subtotal: number
  tax: number
  total: number
  paymentMethod: string
  status: string
  cancelReason: string | null
  cancelledAt: Date | null
  createdAt: Date
  userId: string
  user: {
    name: string
    email: string
  }
  items: SaleItem[]
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { items, customer, paymentMethod, subtotal, tax, total } = body

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'No items in sale' },
        { status: 400 }
      )
    }

    // Check stock availability first (outside transaction)
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

    // Generate receipt number
    const receiptNo = `SALE-${Date.now()}-${Math.floor(Math.random() * 1000)}`

    // Create sale using sequential operations (no transaction to avoid issues)
    try {
      // 1. Create the sale record
      const sale = await prisma.sale.create({
        data: {
          receiptNo,
          customer: customer || null,
          paymentMethod,
          subtotal,
          tax,
          total,
          status: 'ACTIVE',
          userId: authUser.userId
        }
      })

      // 2. Create all sale items
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

      // 3. Update stock quantities
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

      // 4. Fetch the complete sale with items
      const completeSale = await prisma.sale.findUnique({
        where: { id: sale.id },
        include: {
          items: {
            include: {
              product: true
            }
          },
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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}

    if (search) {
      where.receiptNo = { contains: search, mode: 'insensitive' }
    }

    if (statusFilter && statusFilter !== 'ALL') {
      where.status = statusFilter
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

    // Calculate total for filtered sales with proper typing
    const totalAmount: number = (sales as Sale[]).reduce((sum: number, sale: Sale) => {
      return sum + sale.total
    }, 0)

    return NextResponse.json({
      sales,
      totalAmount,
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

export async function PUT(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const { action, cancelReason } = await req.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Sale ID is required' },
        { status: 400 }
      )
    }

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { items: true }
    })

    if (!sale) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      )
    }

    if (action === 'CANCEL') {
      if (!cancelReason || cancelReason.trim() === '') {
        return NextResponse.json(
          { error: 'Cancellation reason is required' },
          { status: 400 }
        )
      }

      // @ts-ignore - status exists in database but TypeScript types haven't updated
      if (sale.status === 'CANCELLED') {
        return NextResponse.json(
          { error: 'Sale is already cancelled' },
          { status: 400 }
        )
      }

      // Reverse stock
      for (const item of sale.items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            quantity: {
              increment: item.quantity
            }
          }
        })
      }

      // Update sale status with type assertion
      const updatedSale = await prisma.sale.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelReason,
          cancelledAt: new Date()
        } as any,
        include: {
          items: {
            include: {
              product: true
            }
          },
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