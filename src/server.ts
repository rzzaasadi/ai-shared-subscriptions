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

import cron from 'node-cron';

import {
  recoverPendingPayments
} from './jobs/payment-recovery';

const prisma = new PrismaClient();

const app = express();

import cors from 'cors';

import {
  processSuccessfulPayment
} from './services/payment-processor';



app.use(cors());

app.use(express.json());

app.get('/', (_, res) => {
  res.send('🚀 AI Shared Backend Running');
});

app.get(
  '/admin/dashboard',
  async (_, res) => {

    const totalUsers =
      await prisma.user.count();

    const activeReservations =
  await prisma.reservation.count({
    where: {
      status: 'CONFIRMED'
    }
  });

    const activeSubscriptions =
      await prisma.membership.count({
        where: {
          status: 'ACTIVE'
        }
      });

    const readyPools =
      await prisma.pool.count({
        where: {
          status: 'READY_TO_BUY'
        }
      });

    const payments =
      await prisma.payment.findMany({
        where: {
          status: 'SUCCESS'
        }
      });

    const totalRevenue =
      payments.reduce(
        (sum, p) => sum + p.amount,
        0
      );

    res.json({
      totalUsers,
      activeReservations,
      activeSubscriptions,
      readyPools,
      totalRevenue
    });

  }
);

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

const reservationResult = await processSuccessfulPayment(payment);


if (!reservationResult) {
  return res.send(
    'Payment already verified'
  );
}

if (reservationResult.totalSeats >= reservationResult.product.capacity) {
  await notifyAdminsPoolReady(bot, {
    poolId: reservationResult.pool.id,
    poolCode: reservationResult.pool.code,
    productName: reservationResult.product.name,
    totalSeats: reservationResult.totalSeats,
    capacity: reservationResult.product.capacity
  });

  // پیام تکمیل گروه
  const fullPool = await prisma.pool.findUnique({
    where: { id: reservationResult.pool.id },
    include: { reservations: { include: { user: true } } }
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




    } catch (error) {

      console.log(error);

      res.send(
        '❌ Internal Server Error'
      );

    }

  }
);


app.get('/admin/users', async (_, res) => {

  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: 'desc'
    }
  });

  res.json(users);

});


app.get('/admin/payments', async (_, res) => {

  const payments =
    await prisma.payment.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: true,
        product: true
      }
    });

  res.json(payments);

});


app.get('/admin/pools', async (_, res) => {

  const pools = await prisma.pool.findMany({
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      product: true,
      reservations: {
        include: {
          user: true
        }
      }
    }
  });

  res.json(pools);

});

app.get('/admin/products', async (_, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});


// --- CREATE PRODUCT ---
app.post('/admin/products', async (req, res) => {
  try {
    const { name, price, capacity, isActive, description } = req.body;

    const product = await prisma.product.create({
      data: {
        name,
        price: Number(price),
        capacity: Number(capacity),
        isActive: Boolean(isActive),
        description,
        codePrefix: name.replace(/[^A-Za-z]/g, '').substring(0, 4).toUpperCase()
      }
    });

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// --- UPDATE PRODUCT ---
app.put('/admin/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, capacity, isActive, description } = req.body;

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        price: Number(price),
        capacity: Number(capacity),
        isActive: Boolean(isActive),
        description
      }
    });

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// --- DELETE PRODUCT ---
app.delete('/admin/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.product.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

app.post('/admin/pools/:id/send-account', async (req, res) => {
  try {

    const { id } = req.params;

    const {
      email,
      password,
      expiry
    } = req.body;

    const pool = await prisma.pool.findUnique({
      where: { id },
      include: {
        product: true,
        reservations: {
          include: {
            user: true
          }
        }
      }
    });

    if (!pool) {
      return res.status(404).json({
        error: 'Pool not found'
      });
    }

    for (const reservation of pool.reservations) {

      await bot.telegram.sendMessage(
        reservation.user.telegramId,
`🎉 اشتراک شما فعال شد

🎬 ${pool.product.name}

📧 ایمیل:
${email}

🔑 رمز عبور:
${password}

📅 تاریخ انقضا:
${expiry}

⚠️ لطفاً اطلاعات اکانت را در اختیار دیگران قرار ندهید.`
      );

    }

    
    res.json({
      success: true
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: 'Failed to send account details'
    });

  }
});


app.post('/admin/broadcast', async (req, res) => {
  try {

    const { target, message } = req.body;

    let users: any[] = [];

    if (target === 'all_users') {

      users = await prisma.user.findMany();

    }

    else if (target === 'active_users') {

      const reservations =
        await prisma.reservation.findMany({
          where: {
            pool: {
              status: 'ACTIVE'
            }
          },
          include: {
            user: true
          }
        });

      users = reservations.map(r => r.user);
      

    }

    else if (target === 'expired_users') {

      

      const reservations =
        await prisma.reservation.findMany({
          where: {
            pool: {
              status: 'EXPIRED'
            }
          },
          include: {
            user: true
          }
        });

      users = reservations.map(r => r.user);

    }
    
    else if (target.startsWith('buyers_')) {

  const productId =
    target.replace('buyers_', '');

  const reservations =
    await prisma.reservation.findMany({
      where: {
        productId
      },
      include: {
        user: true
      }
    });

  users = reservations.map(r => r.user);

}

    const uniqueUsers =
      [...new Map(
        users.map(u => [u.id, u])
      ).values()];

    let sent = 0;

    for (const user of uniqueUsers) {

      try {

        await bot.telegram.sendMessage(
          user.telegramId,
          message
        );

        sent++;

      } catch (e) {

        console.log(
          'SEND FAILED',
          user.telegramId
        );

      }

    }
const adminIds =
  process.env.ADMIN_IDS?.split(',') || [];
    for (const adminId of adminIds) {

  await bot.telegram.sendMessage(
    adminId.trim(),
`📢 پیام گروهی ارسال شد

🎯 گروه هدف:
${target}

👥 تعداد ارسال موفق:
${sent}

📝 متن پیام:

${message}`
  );

}

res.json({
  success: true,
  sent
});

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: 'Broadcast failed'
    });

  }
});

cron.schedule(
  '*/2 * * * *',
  async () => {

    try {

      await recoverPendingPayments();

    } catch (err) {

      console.error(
        'RECOVERY ERROR',
        err
      );

    }

  }
);

app.listen(3000, () => {
  console.log('🌐 Server running on port 3000');
});

