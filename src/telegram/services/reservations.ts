import { PrismaClient } from '@prisma/client';

import { generatePoolCode }
from '../utils/poolCode';

import { bot } from '../bot-instance';

import {
  notifyAdminsPoolReady,
} from './notifications';

const prisma = new PrismaClient();

export async function createReservation(params: {
  telegramId: string;
  firstName?: string;
  username?: string;
  productId: string;
  quantity: number;
}) {

  const {
    telegramId,
    firstName,
    username,
    productId,
    quantity,
  } = params;

  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },
  });

  if (!product) {
    throw new Error('Product not found');
  }

  let pool: any = null;

  const availablePools =
    await prisma.pool.findMany({
      where: {
        productId: product.id,
        status: 'FILLING',
      },
    });

  for (const existingPool of availablePools) {

    const remainingSeats =
      product.capacity - existingPool.currentMembers;

    if (remainingSeats >= quantity) {
      pool = existingPool;
      break;
    }

  }

  if (!pool) {

    const code = await generatePoolCode(
      product.codePrefix || 'POOL'
    );

    pool = await prisma.pool.create({
      data: {
        code,
        title: `گروه ${code}`,
        productId: product.id,
      },
    });

  }

  let user = await prisma.user.findUnique({
    where: {
      telegramId,
    },
  });

  if (!user) {

    user = await prisma.user.create({
      data: {
        telegramId,
        firstName,
        username,
      },
    });

  }

  await prisma.reservation.create({
    data: {
      userId: user.id,
      productId: product.id,
      poolId: pool.id,
      quantity,
    },
  });

  const reservations =
    await prisma.reservation.findMany({
      where: {
        poolId: pool.id,
        status: 'PENDING',
      },
    });

  const totalSeats = reservations.reduce(
    (sum, reservation) =>
      sum + reservation.quantity,
    0
  );

  await prisma.pool.update({
    where: {
      id: pool.id,
    },
    data: {
      currentMembers: totalSeats,
      status:
        totalSeats >= product.capacity
          ? 'READY_TO_BUY'
          : 'FILLING',
    },
  });

  if (totalSeats >= product.capacity) {

  await notifyAdminsPoolReady(
    bot,
    {
      poolId: pool.id,
      poolCode: pool.code,
      productName: product.name,
      totalSeats,
      capacity: product.capacity,
    }
  );

}


  if (totalSeats >= product.capacity) {
      console.log(
    `POOL READY ${pool.code}`
  );
  
  const fullPool =
  await prisma.pool.findUnique({
    where: {
      id: pool.id,
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

🎬 ${product.name}
🧩 ${pool.code}

✅ گروه آماده فعال‌سازی است.

⏳ اطلاعات ورود حداکثر تا 24 ساعت آینده ارسال خواهد شد.`
    );

  }

}

}
  return {
    product,
    pool,
    totalSeats,
    quantity,
  };

}