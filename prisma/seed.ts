// // prisma\seed.ts
// import { PrismaClient } from '@prisma/client'
// import bcrypt from 'bcryptjs'

// const prisma = new PrismaClient()

// async function main() {
//   // Create admin user
//   const hashedPassword = await bcrypt.hash('admin123', 10)
  
//   await prisma.user.upsert({
//     where: { email: 'admin@example.com' },
//     update: {},
//     create: {
//       email: 'admin@example.com',
//       password: hashedPassword,
//       name: 'Admin User',
//       role: 'ADMIN'
//     }
//   })

//   // Create sample products
//   const products = [
//     { name: 'Laptop', sku: 'LAP001', price: 999.99, cost: 700.00, quantity: 10, lowStockThreshold: 3 },
//     { name: 'Mouse', sku: 'MOU001', price: 29.99, cost: 15.00, quantity: 50, lowStockThreshold: 10 },
//     { name: 'Keyboard', sku: 'KEY001', price: 79.99, cost: 40.00, quantity: 25, lowStockThreshold: 5 },
//     { name: 'Monitor', sku: 'MON001', price: 299.99, cost: 200.00, quantity: 8, lowStockThreshold: 2 },
//   ]

//   for (const product of products) {
//     await prisma.product.upsert({
//       where: { sku: product.sku },
//       update: {},
//       create: product
//     })
//   }

//   console.log('Database seeded successfully')
// }

// main()
//   .catch(e => {
//     console.error(e)
//     process.exit(1)
//   })
//   .finally(async () => {
//     await prisma.$disconnect()
//   })