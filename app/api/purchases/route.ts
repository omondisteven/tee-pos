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
    const { invoiceNo, supplier, items, total } = body

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'No items in purchase' },
        { status: 400 }
      )
    }

    if (!invoiceNo) {
      return NextResponse.json(
        { error: 'Invoice number is required' },
        { status: 400 }
      )
    }

    // Check if invoice number already exists
    const existingPurchase = await prisma.purchase.findUnique({
      where: { invoiceNo }
    })

    if (existingPurchase) {
      return NextResponse.json(
        { error: 'Invoice number already exists' },
        { status: 400 }
      )
    }

    // Verify user exists
    const userExists = await prisma.user.findUnique({
      where: { id: authUser.userId }
    })

    if (!userExists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 400 }
      )
    }

    try {
      // Create purchase
      const purchase = await prisma.purchase.create({
        data: {
          invoiceNo,
          supplier: supplier || null,
          total,
          status: 'ACTIVE',
          userId: authUser.userId
        }
      })

      // Create purchase items
      for (const item of items) {
        await prisma.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.cost,
            total: item.cost * item.quantity
          }
        })
      }

      // Update stock quantities
      for (const item of items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            quantity: {
              increment: item.quantity
            }
          }
        })
      }

      const completePurchase = await prisma.purchase.findUnique({
        where: { id: purchase.id },
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

      return NextResponse.json(completePurchase, { status: 201 })
      
    } catch (error) {
      console.error('Error in purchase creation:', error)
      return NextResponse.json(
        { error: 'Failed to create purchase' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Create purchase error:', error)
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
    const status = searchParams.get('status') || ''
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}

    if (search) {
      where.invoiceNo = { contains: search, mode: 'insensitive' }
    }

    if (status && status !== 'ALL') {
      where.status = status
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
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
      prisma.purchase.count({ where })
    ])

    const totalAmount = purchases.reduce((sum, purchase) => sum + purchase.total, 0)

    return NextResponse.json({
      purchases,
      totalAmount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Get purchases error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}