const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
(async () => {
  const email = process.env.ADMIN_EMAIL || 'admin@electrosoftsystem.com';
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.admin.upsert({ where: { email }, update: { passwordHash }, create: { email, passwordHash } });
  console.log(`Admin ready: ${email}`);
})().finally(() => prisma.$disconnect());
