import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'

// Define the Product type
interface Product {
  id: string
  name: string
  sku: string
  price: number
  cost: number
  quantity: number
  lowStockThreshold: number
  vatCategory: string
  description: string | null
  createdAt: Date
  updatedAt: Date
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
    const lowStock = searchParams.get('lowStock') === 'true'

    const where: any = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Fetch products based on search
    let products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    // Apply low stock filter in JavaScript with proper typing
    if (lowStock) {
      products = products.filter((product: Product) => product.quantity <= product.lowStockThreshold)
    }

    // Apply pagination
    const total = products.length
    const paginatedProducts = products.slice((page - 1) * limit, page * limit)

    return NextResponse.json({
      products: paginatedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Get products error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, sku, price, cost, quantity, lowStockThreshold, vatCategory, description } = body

    if (!name || !sku || !price || !cost) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const existingProduct = await prisma.product.findUnique({
      where: { sku }
    })

    if (existingProduct) {
      return NextResponse.json(
        { error: 'Product with this SKU already exists' },
        { status: 400 }
      )
    }

    const product = await prisma.product.create({
      data: {
        name,
        sku,
        price: parseFloat(price),
        cost: parseFloat(cost),
        quantity: parseInt(quantity) || 0,
        lowStockThreshold: parseInt(lowStockThreshold) || 5,
        vatCategory: vatCategory || 'VATABLE',
        description
      }
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Create product error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}