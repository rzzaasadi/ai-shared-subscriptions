import { Markup }
from 'telegraf';

import { PrismaClient }
from '@prisma/client';

const prisma = new PrismaClient();

export async function handleReadyPools(
  ctx: any
) {

  const pools =
    await prisma.pool.findMany({
      where: {
        status: 'READY_TO_BUY',
      },
      include: {
        product: true,
      },
    });

  if (pools.length === 0) {

    await ctx.reply(
      '⚠️ No READY pools found.'
    );

    return;
  }

  let message =
    '🟢 READY Pools\n\n';

  pools.forEach((pool, index) => {

    message +=
      `${index + 1}. ${pool.product.name}\n`;

    message +=
      `👥 ${pool.currentMembers}/${pool.product.capacity}\n`;

    message +=
      `🧩 ${pool.code}\n\n`;

  });

  const buttons =
    pools.map((pool) => [

      Markup.button.callback(
        `👥 ${pool.code}`,
        `members_${pool.id}`
      ),

      Markup.button.callback(
        `🔐 فعال‌سازی`,
        `activate_${pool.id}`
      ),

    ]);

  await ctx.reply(
    message,
    Markup.inlineKeyboard(buttons)
  );

}

export async function handlePoolMembers(
  ctx: any,
  poolId: string
) {

  const reservations =
    await prisma.reservation.findMany({
      where: {
        poolId,
      },
      include: {
        user: true,
      },
    });

  if (reservations.length === 0) {

    await ctx.reply(
      '⚠️ عضوی پیدا نشد'
    );

    return;
  }

  let message =
    '👥 اعضای گروه\n\n';

  reservations.forEach(
    (reservation, index) => {

      message += `${index + 1}. `;

      message +=
        `${reservation.user.firstName || 'User'}\n`;

      message +=
        `🪑 ${reservation.quantity} سیت\n`;

      message +=
        `📱 @${
          reservation.user.username || 'unknown'
        }\n\n`;

    }
  );

  await ctx.reply(message);

}

export async function handleActivateButton(
  ctx: any,
  adminActivationSessions: Map<any, any>
) {

  const poolId = ctx.match[1];

  const pool =
    await prisma.pool.findUnique({
      where: {
        id: poolId,
      },
    });

  if (!pool) {

    await ctx.reply(
      '❌ گروه پیدا نشد'
    );

    return;
  }

  adminActivationSessions.set(
    ctx.from.id,
    {
      step: 'WAITING_EMAIL',
      poolId: pool.id,
    }
  );

  await ctx.reply(
    `📧 ایمیل اکانت برای ${pool.code} را ارسال کنید`
  );

}