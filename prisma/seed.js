// prisma/seed.js
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seeding...')
  
  try {
    // Clean up existing data in correct order (to avoid foreign key constraints)
    console.log('Cleaning up existing data...')
    
    // Delete in correct order (child tables first)
    await prisma.purchaseItem.deleteMany({})
    await prisma.saleItem.deleteMany({})
    await prisma.purchase.deleteMany({})
    await prisma.sale.deleteMany({})
    await prisma.product.deleteMany({})
    await prisma.user.deleteMany({})
    await prisma.customer.deleteMany({})
    
    console.log('✅ Database cleaned')

    // Create admin user
    console.log('Creating admin user...')
    const adminHashedPassword = await bcrypt.hash('admin123', 10)
    
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password: adminHashedPassword,
        name: 'Admin User',
        role: 'ADMIN'
      }
    })
    console.log(`✅ Admin user created: ${adminUser.email} (ID: ${adminUser.id})`)

    // Create regular user
    console.log('Creating regular user...')
    const userHashedPassword = await bcrypt.hash('user123', 10)
    
    const regularUser = await prisma.user.create({
      data: {
        email: 'user@example.com',
        password: userHashedPassword,
        name: 'Regular User',
        role: 'USER'
      }
    })
    console.log(`✅ Regular user created: ${regularUser.email} (ID: ${regularUser.id})`)

    // Create a sample customer
    console.log('Creating sample customer...')
    const customer = await prisma.customer.create({
      data: {
        name: 'John Doe',
        phone: '+254 700 000 000',
        email: 'john@example.com',
        address: 'Nairobi, Kenya'
      }
    })
    console.log(`✅ Customer created: ${customer.name}`)

    console.log('\n🎉 Database seeded successfully!')
    console.log('📊 Summary:')
    const userCount = await prisma.user.count()
    const productCount = await prisma.product.count()
    const customerCount = await prisma.customer.count()
    const purchaseCount = await prisma.purchase.count()
    const saleCount = await prisma.sale.count()
    
    console.log(`   - Users: ${userCount}`)
    console.log(`   - Products: ${productCount}`)
    console.log(`   - Customers: ${customerCount}`)
    console.log(`   - Purchases: ${purchaseCount}`)
    console.log(`   - Sales: ${saleCount}`)
    console.log('\n🔑 Login credentials:')
    console.log('   Admin:')
    console.log('   Email: admin@example.com')
    console.log('   Password: admin123')
    console.log('   Role: ADMIN')
    console.log('')
    console.log('   Regular User:')
    console.log('   Email: user@example.com')
    console.log('   Password: user123')
    console.log('   Role: USER')
    console.log('\n👤 Sample Customer:')
    console.log(`   Name: ${customer.name}`)
    console.log(`   Phone: ${customer.phone}`)
    
  } catch (error) {
    console.error('❌ Error during seeding:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })