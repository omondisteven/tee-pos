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
    const { 
      serviceCategoryId, 
      description, 
      customerId, 
      customerName, 
      vehicleRegNo, 
      agreedAmount, 
      depositPaid,
      dueDate 
    } = body

    if (!serviceCategoryId || !vehicleRegNo || !agreedAmount || !dueDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const workOrderNo = `WO-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    const deposit = depositPaid || 0
    const balance = agreedAmount - deposit
    let paymentStatus = 'PENDING'
    
    if (deposit > 0 && balance > 0) {
      paymentStatus = 'DEPOSIT_PAID'
    } else if (deposit === agreedAmount) {
      paymentStatus = 'PAID'
    }

    const service = await prisma.service.create({
      data: {
        workOrderNo,
        serviceCategoryId,
        description: description || null,
        customerId: customerId || null,
        customerName: customerName || null,
        vehicleRegNo,
        agreedAmount,
        depositPaid: deposit,
        balance,
        dueDate: new Date(dueDate),
        paymentStatus,
        status: 'PENDING',
        userId: authUser.userId
      }
    })

    // Create payment record if deposit was made
    if (deposit > 0) {
      await prisma.servicePayment.create({
        data: {
          serviceId: service.id,
          amount: deposit,
          paymentMethod: 'CASH',
          notes: 'Initial deposit',
          userId: authUser.userId
        }
      })
    }

    return NextResponse.json(service, { status: 201 })
  } catch (error) {
    console.error('Create service error:', error)
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
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'ALL'
    const pastDue = searchParams.get('pastDue') === 'true'

    const where: any = {}

    if (search) {
      where.OR = [
        { workOrderNo: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { vehicleRegNo: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (status !== 'ALL') {
      where.status = status
    }

    if (pastDue) {
      where.dueDate = { lt: new Date() }
      where.status = { notIn: ['COMPLETED', 'COLLECTED', 'CANCELLED'] }
    }

    const services = await prisma.service.findMany({
      where,
      include: {
        serviceCategory: true,
        customer: true,
        payments: {
          orderBy: { createdAt: 'desc' }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { dueDate: 'asc' }
    })

    return NextResponse.json(services)
  } catch (error) {
    console.error('Get services error:', error)
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
    const body = await req.json()
    const { status, paymentAmount, paymentMethod, collected } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Service ID is required' },
        { status: 400 }
      )
    }

    const service = await prisma.service.findUnique({
      where: { id }
    })

    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      )
    }

    // Handle payment
    if (paymentAmount && paymentAmount > 0) {
      const newDepositPaid = service.depositPaid + paymentAmount
      const newBalance = service.agreedAmount - newDepositPaid
      let paymentStatus = service.paymentStatus

      if (newBalance === 0) {
        paymentStatus = 'PAID'
      } else if (newDepositPaid > 0 && newBalance > 0) {
        paymentStatus = 'PARTIAL'
      }

      await prisma.$transaction([
        prisma.servicePayment.create({
          data: {
            serviceId: id,
            amount: paymentAmount,
            paymentMethod: paymentMethod || 'CASH',
            notes: 'Payment received',
            userId: authUser.userId
          }
        }),
        prisma.service.update({
          where: { id },
          data: {
            depositPaid: newDepositPaid,
            balance: newBalance,
            paymentStatus
          }
        })
      ])
    }

    // Handle status update
    if (status) {
      const updateData: any = { status }
      if (status === 'COMPLETED') {
        updateData.completedAt = new Date()
      }
      if (status === 'COLLECTED') {
        updateData.collectedAt = new Date()
      }
      
      await prisma.service.update({
        where: { id },
        data: updateData
      })
    }

    // Handle collected flag (mark as collected)
    if (collected) {
      await prisma.service.update({
        where: { id },
        data: {
          status: 'COLLECTED',
          collectedAt: new Date()
        }
      })
    }

    const updatedService = await prisma.service.findUnique({
      where: { id },
      include: {
        serviceCategory: true,
        customer: true,
        payments: true,
        user: {
          select: { name: true, email: true }
        }
      }
    })

    return NextResponse.json(updatedService)
  } catch (error) {
    console.error('Update service error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}