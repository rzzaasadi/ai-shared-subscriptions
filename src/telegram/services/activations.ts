import { PrismaClient } from '@prisma/client';
import { Telegraf } from 'telegraf';

const prisma = new PrismaClient();

export async function activatePool(
  bot: Telegraf,
  params: {
  poolId: string;
  email: string;
  password: string;
  expiresAt: Date;
}) {

  const {
    poolId,
    email,
    password,
    expiresAt,
  } = params;

  const pool = await prisma.pool.findUnique({
    where: {
      id: poolId,
    },
    include: {
      reservations: {
        include: {
          user: true,
        },
      },
      product: true,
    },
  });

  if (!pool) {
    throw new Error('Pool not found');
  }

  await prisma.pool.update({
    where: {
      id: pool.id,
    },
    data: {
      status: 'ACTIVE',
      email,
      password,
      expiresAt,
    },
  });

  for (const reservation of pool.reservations) {

    await prisma.membership.create({
      data: {
        userId: reservation.userId,
        poolId: pool.id,
        status: 'ACTIVE',
        expiresAt,
      },
    });

    await prisma.reservation.update({
      where: {
        id: reservation.id,
      },
      data: {
        status: 'CONFIRMED',
      },
    });

        // notify user

    await bot.telegram.sendMessage(
      reservation.user.telegramId,
      `🎉 اشتراک شما فعال شد

🎬 ${pool.product.name}
🧩 ${pool.code}

📧 ایمیل:
${email}

🔑 پسورد:
${password}

📅 تاریخ انقضا:
${expiresAt.toLocaleDateString('fa-IR')}`
    );

  }

  return pool;

}