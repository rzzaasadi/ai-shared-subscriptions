import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { processSuccessfulPayment } from '../services/payment-processor';

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

  for (const payment of payments) {

    try {

      const verify =
        await axios.post(
          'https://payment.zarinpal.com/pg/v4/payment/verify.json',
          {
            merchant_id:
              process.env.ZARINPAL_MERCHANT_ID,

            amount:
              payment.amount,

            authority:
              payment.authority
          }
        );

      if (
        verify.data.data.code === 100
      ) {

        console.log(
          `RECOVERED PAYMENT ${payment.id}`
        );

        await processSuccessfulPayment(
          payment
        );

      }

    } catch (err) {

      console.error(
        `RECOVERY FAILED ${payment.id}`,
        err
      );

    }

  }

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