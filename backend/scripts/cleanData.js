const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function clean() {
  await prisma.nFA.deleteMany({});
  await prisma.cSItem.deleteMany({});
  await prisma.cSQuotation.deleteMany({});
  await prisma.comparativeStatement.deleteMany({});
  await prisma.indentItem.deleteMany({});
  await prisma.indent.deleteMany({});
  console.log('Done — all indents, CS and NFAs deleted');
  await prisma.$disconnect();
}
clean().catch(console.error);
