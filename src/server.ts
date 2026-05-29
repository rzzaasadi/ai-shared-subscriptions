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

      export async function notifyUserPaymentSuccess(
  bot: Telegraf,
  params: {
    telegramId: string;
    productName: string;
    poolCode: string;
    totalSeats: number;
    capacity: number;
  }
) {

  await bot.telegram.sendMessage(
    params.telegramId,
    `✅ پرداخت شما با موفقیت ثبت شد

🎬 محصول:
${params.productName}

🧩 گروه:
${params.poolCode}

📊 وضعیت گروه:
${params.totalSeats}/${params.capacity}

⏳ اشتراک شما در انتظار فعال‌سازی توسط ادمین است.

به محض فعال شدن، اطلاعات ورود برای شما ارسال خواهد شد.`
  );

}
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

<!DOCTYPE html>

<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>پرداخت موفق</title>

<style>
body{
margin:0;
font-family:tahoma;
background:#0f172a;
color:white;
display:flex;
justify-content:center;
align-items:center;
height:100vh;
}

.card{
background:#1e293b;
padding:40px;
border-radius:20px;
text-align:center;
max-width:500px;
width:90%;
}

.btn{
display:inline-block;
margin-top:20px;
padding:12px 24px;
background:#22c55e;
color:white;
text-decoration:none;
border-radius:10px;
font-weight:bold;
}
</style>

</head>

<body>

<div class="card">

<h1>✅ پرداخت موفق</h1>

<p>
اشتراک شما با موفقیت ثبت شد.
</p>

<p>
اطلاعات ورود از طریق ربات تلگرام ارسال خواهد شد.
</p>

<a
class="btn"
href="https://t.me/@dimoonaiaccessbot"

>

بازگشت به ربات </a>

</div>

</body>
</html>
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