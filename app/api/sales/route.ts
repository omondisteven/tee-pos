import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'

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

    // Check stock availability
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      })

      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.name} not found` },
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

    // Create sale in transaction
    const sale = await prisma.$transaction(async (tx) => {
      // Create sale record
      const saleRecord = await tx.sale.create({
        data: {
          receiptNo,
          customer,
          paymentMethod,
          subtotal,
          tax,
          total,
          userId: authUser.userId,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              total: item.price * item.quantity
            }))
          }
        },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      })

      // Update stock quantities
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            quantity: {
              decrement: item.quantity
            }
          }
        })
      }

      return saleRecord
    })

    return NextResponse.json(sale, { status: 201 })
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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}

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

    return NextResponse.json({
      sales,
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