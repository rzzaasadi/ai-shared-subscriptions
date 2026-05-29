import express from 'express';
import axios from 'axios';

import { PrismaClient } from '@prisma/client';

import { createReservation }
from './telegram/services/reservations';

import {
  notifyAdminsNewPurchase,
  notifyAdminsPoolReady,
} from './telegram/services/notifications';



const prisma = new PrismaClient();

const app = express();

app.use(express.json());

app.get('/', (_, res) => {
  res.send('🚀 AI Shared Backend Running');
});


app.get(
  '/payment/callback',
  async (req, res) => {

    try {

      const authority =
        req.query.Authority as string;

      const status =
        req.query.Status as string;

      if (
        !authority ||
        status !== 'OK'
      ) {

        return res.send(
          '❌ Payment Cancelled'
        );

      }

      const payment =
        await prisma.payment.findUnique({
          where: {
            authority,
          },
        });

      if (!payment) {

        return res.send(
          '❌ Payment Not Found'
        );

      }

      const verify =
        await axios.post(
          'https://payment.zarinpal.com/pg/v4/payment/verify.json',
          {
            merchant_id:
              process.env.ZARINPAL_MERCHANT_ID,

            amount:
              payment.amount,

            authority,
          }
        );

      if (
        verify.data.data.code !== 100
      ) {

        return res.send(
          '❌ Verify Failed'
        );

      }


      if (payment.status === 'SUCCESS') {
  return res.send('Payment already verified');
}


      await prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: 'SUCCESS',
        },
      });

      const user =
        await prisma.user.findUnique({
          where: {
            id: payment.userId,
          },
        });

      if (!user) {

        return res.send(
          '❌ User Not Found'
        );

      }



        console.log('START CREATE RESERVATION');

      const reservationResult =  
      await createReservation({

        


        telegramId:
          user.telegramId,

        firstName:
          user.firstName || '',

        username:
          user.username || '',

        productId:
          payment.productId,

        quantity:
          payment.quantity,
      });

      console.log('RESERVATION CREATED');
/*
      await notifyAdminsNewPurchase(
  bot,
  {
    poolCode:
      reservationResult.pool.code,

    productName:
      reservationResult.product.name,

    quantity:
      payment.quantity,

    totalSeats:
      reservationResult.totalSeats,

    capacity:
      reservationResult.product.capacity,

    firstName:
      user.firstName || undefined,

    userName:
      user.username || undefined,
  }
);
*/
      res.send(`
        <h1>✅ Payment Successful</h1>
        <p>Your subscription has been registered.</p>
      `);

    } catch (error) {

      console.log(error);

      res.send(
        '❌ Internal Server Error'
      );

    }

  }
);


app.listen(3000, () => {
  console.log('🌐 Server running on port 3000');
});