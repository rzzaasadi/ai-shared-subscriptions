import express from 'express';
import axios from 'axios';

import { PrismaClient } from '@prisma/client';

import { createReservation }
from './telegram/services/reservations';

import {
  notifyAdminsNewPurchase,
  notifyAdminsPoolReady,
} from './telegram/services/notifications';

import { bot }
from './telegram/bot-instance';

import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const app = express();

app.use(express.json());

app.get('/', (_, res) => {
  res.send('🚀 AI Shared Backend Running');
});

app.use(
  express.static('public')
);


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

      await bot.telegram.sendMessage(
  user.telegramId,
  `✅ پرداخت شما با موفقیت ثبت شد

🎬 ${reservationResult.product.name}
🧩 ${reservationResult.pool.code}

📊 وضعیت گروه:
${reservationResult.totalSeats}/${reservationResult.product.capacity}

⏳ منتظر تکمیل ظرفیت گروه باشید.

📦 برای مشاهده وضعیت:
اشتراک‌های من`
);

if (
  reservationResult.totalSeats >=
  reservationResult.product.capacity
) {

  // send group completed messages

}

      
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

if (
  reservationResult.totalSeats >=
  reservationResult.product.capacity
) {

  await notifyAdminsPoolReady(
    bot,
    {
      poolId:
        reservationResult.pool.id,

      poolCode:
        reservationResult.pool.code,

      productName:
        reservationResult.product.name,

      totalSeats:
        reservationResult.totalSeats,

      capacity:
        reservationResult.product.capacity,
    }
  );

  const fullPool =
  await prisma.pool.findUnique({
    where: {
      id: reservationResult.pool.id,
    },
    include: {
      reservations: {
        include: {
          user: true,
        },
      },
    },
  });

if (fullPool) {

  for (const reservation of fullPool.reservations) {

    await bot.telegram.sendMessage(
      reservation.user.telegramId,
      `🎉 ظرفیت گروه تکمیل شد

🎬 ${reservationResult.product.name}
🧩 ${reservationResult.pool.code}

✅ گروه آماده فعال‌سازی است.

⏳ اطلاعات ورود حداکثر تا 24 ساعت آینده ارسال خواهد شد.`
    );

  }

}


}
      

let html = fs.readFileSync(
  path.join(
    process.cwd(),
    'public',
    'success.html'
  ),
  'utf8'
);

html = html.replace(
  '{{POOL_CODE}}',
  reservationResult.pool.code
);

html = html.replace(
  '{{CURRENT_MEMBERS}}',
  reservationResult.totalSeats.toString()
);

html = html.replace(
  '{{CAPACITY}}',
  reservationResult.product.capacity.toString()
);

res.send(html);



/*

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

*/



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