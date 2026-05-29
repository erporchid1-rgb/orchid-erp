const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Admin user
  const hashedPassword = await bcrypt.hash('Admin@123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@orchidconstruction.com' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@orchidconstruction.com',
      mobile: '9876543210',
      password: hashedPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  // Other users
  const storePassword = await bcrypt.hash('Store@123', 12);
  await prisma.user.upsert({
    where: { email: 'store@orchidconstruction.com' },
    update: {},
    create: {
      name: 'Rajesh Kumar',
      email: 'store@orchidconstruction.com',
      mobile: '9876543211',
      password: storePassword,
      role: 'STORE_MANAGER',
      status: 'ACTIVE',
    },
  });

  const engineerPassword = await bcrypt.hash('Engineer@123', 12);
  await prisma.user.upsert({
    where: { email: 'engineer@orchidconstruction.com' },
    update: {},
    create: {
      name: 'Amit Sharma',
      email: 'engineer@orchidconstruction.com',
      mobile: '9876543212',
      password: engineerPassword,
      role: 'SITE_ENGINEER',
      status: 'ACTIVE',
    },
  });

  const accountantPassword = await bcrypt.hash('Account@123', 12);
  await prisma.user.upsert({
    where: { email: 'accountant@orchidconstruction.com' },
    update: {},
    create: {
      name: 'Priya Patel',
      email: 'accountant@orchidconstruction.com',
      mobile: '9876543213',
      password: accountantPassword,
      role: 'ACCOUNTANT',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Seed completed successfully');
  console.log('\n👤 Default Users:');
  console.log('  Admin:      admin@orchidconstruction.com      / Admin@123');
  console.log('  Store Mgr:  store@orchidconstruction.com      / Store@123');
  console.log('  Engineer:   engineer@orchidconstruction.com   / Engineer@123');
  console.log('  Accountant: accountant@orchidconstruction.com / Account@123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
