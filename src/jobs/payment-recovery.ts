import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function recoverPendingPayments() {

  const thirtyMinutesAgo = new Date(
    Date.now() - 30 * 60 * 1000
  );

  const payments =
    await prisma.payment.findMany({
      where: {
        status: 'PENDING',
        createdAt: {
          gte: thirtyMinutesAgo
        }
      }
    });

  console.log(
    `RECOVERY CHECK ${payments.length}`
  );

  const oneDayAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000
  );

  await prisma.payment.updateMany({
    where: {
      status: 'PENDING',
      createdAt: {
        lt: oneDayAgo
      }
    },
    data: {
      status: 'EXPIRED'
    }
  });

}