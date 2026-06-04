import { Markup, Telegraf } from 'telegraf';

import { PrismaClient } from '@prisma/client';

import { createReservation }
from '../services/reservations';


import {
  notifyAdminsPoolReady,
  notifyAdminsNewPurchase
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

    if (!product) {
  throw new Error('Product not found');
}



    /*
    const result =
      await createReservation({
        telegramId: ctx.from.id.toString(),
        firstName: ctx.from.first_name,
        username: ctx.from.username,
        productId: product.id,
        quantity,
      });
*/
    userSessions.set(ctx.from.id, {
  action: 'PAYMENT_CONFIRM',
  productId: product.id,
  quantity,
});

await ctx.reply(
  `🎬 ${product.name}

🪑 تعداد سیت: ${quantity}

💰 مبلغ کل:
${(product.price * quantity).toLocaleString()} تومان

آیا مایل به ادامه پرداخت هستید؟`,
  Markup.inlineKeyboard([
    [
      Markup.button.callback(
        '✅ پرداخت',
        'start_payment'
      ),
    ],
    [
      Markup.button.callback(
        '❌ لغو',
        'cancel_payment'
      ),
    ],
  ])
);


} catch (error: any) {

  if (
    error.message ===
    'MAX_POOLS_REACHED'
  ) {

    await ctx.reply(
      '⚠️ در حال حاضر ظرفیت همه گروه‌ها تکمیل است.\n\nدر صورت باز شدن ظرفیت به شما اطلاع داده خواهد شد.'
    );

    return;

  }

  throw error;



} finally {

    processingUsers.delete(ctx.from.id);

  }

}
