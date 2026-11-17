// Creates the first officer so you can log in. Run with: npm run seed
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_EMAIL || 'officer@sacco.local';
  const password = process.env.SEED_PASSWORD || 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(password, 10);

  const officer = await prisma.officer.upsert({
    where: { email },
    update: {},
    create: { name: 'SACCO Officer', email, passwordHash },
  });
  console.log(`Officer ready: ${officer.email}`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
