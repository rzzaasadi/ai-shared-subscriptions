import { Markup, Telegraf } from 'telegraf';

import { PrismaClient } from '@prisma/client';

import { createReservation }
from '../services/reservations';

import {
  notifyAdminsPoolReady
} from '../services/notifications';

const prisma = new PrismaClient();

export async function handleSeatSelection(
  bot: Telegraf,
  ctx: any,
  userSessions: Map<any, any>,
  processingUsers: Set<any>
) {

  const session = userSessions.get(ctx.from.id);

  if (!session) return;

  if (session.action !== 'SELECTING_QUANTITY') {
    return;
  }

  if (processingUsers.has(ctx.from.id)) {
    return;
  }

  processingUsers.add(ctx.from.id);

  try {

    const quantity = Number(ctx.message.text);

    const product =
      await prisma.product.findUnique({
        where: {
          id: session.productId,
        },
      });

    if (!product) return;

    const result =
      await createReservation({
        telegramId: ctx.from.id.toString(),
        firstName: ctx.from.first_name,
        username: ctx.from.username,
        productId: product.id,
        quantity,
      });

    userSessions.delete(ctx.from.id);

    if (result.totalSeats >= product.capacity) {

      await notifyAdminsPoolReady(
        bot,
        {
          poolId: result.pool.id,
          poolCode: result.pool.code,
          productName: product.name,
          totalSeats: result.totalSeats,
          capacity: product.capacity,
        }
      );

    }

    await ctx.reply(
      `✅ رزرو شما ثبت شد

🧩 گروه: ${result.pool.code}

🪑 تعداد سیت: ${quantity}
👥 ظرفیت گروه: ${result.totalSeats}/${product.capacity}

💰 مبلغ کل:
${(product.price * quantity).toLocaleString()} تومان

${
  result.totalSeats >= product.capacity
    ? '🔥 ظرفیت گروه تکمیل شد و به زودی فعال می‌شود.'
    : `⏳ ${
        product.capacity - result.totalSeats
      } ظرفیت دیگر باقی مانده است.`
}`,
      Markup.keyboard([
        ['🛒 خرید اشتراک AI'],
        ['📦 اشتراک‌های من', '📡 وضعیت سرویس‌ها'],
        ['🛟 پشتیبانی'],
      ]).resize()
    );

  } finally {

    processingUsers.delete(ctx.from.id);

  }

}