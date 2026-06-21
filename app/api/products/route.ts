// app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { UnitOfMeasure } from '@prisma/client' // Import the enum from Prisma

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

    // Apply low stock filter
    if (lowStock) {
      products = products.filter((product) => product.quantity <= product.lowStockThreshold)
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
    const { name, sku, unit, price, cost, quantity, lowStockThreshold, vatCategory, description } = body

    // Validate required fields
    if (!name || !sku || !price || !cost) {
      return NextResponse.json(
        { error: 'Missing required fields: name, sku, price, and cost are required' },
        { status: 400 }
      )
    }

    // Check if product with same SKU exists
    const existingProduct = await prisma.product.findUnique({
      where: { sku }
    })

    if (existingProduct) {
      return NextResponse.json(
        { error: 'Product with this SKU already exists' },
        { status: 400 }
      )
    }

    // Validate unit is a valid enum value
    let validUnit: UnitOfMeasure = UnitOfMeasure.GMS // Default to GMS if not provided
    if (unit && Object.values(UnitOfMeasure).includes(unit as UnitOfMeasure)) {
      validUnit = unit as UnitOfMeasure
    }

    // Create product
    const product = await prisma.product.create({
      data: {
        name,
        sku,
        unit: validUnit,
        price: parseFloat(price),
        cost: parseFloat(cost),
        quantity: quantity ? parseFloat(quantity) : 0,
        lowStockThreshold: lowStockThreshold ? parseInt(lowStockThreshold) : 5,
        vatCategory: vatCategory || 'VATABLE',
        description: description || null
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