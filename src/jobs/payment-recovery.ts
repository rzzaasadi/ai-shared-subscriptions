import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function recoverPendingPayments() {

  const payments =
    await prisma.payment.findMany({
      where: {
        status: 'PENDING'
      }
    });

  console.log(
    `RECOVERY CHECK ${payments.length}`
  );

}