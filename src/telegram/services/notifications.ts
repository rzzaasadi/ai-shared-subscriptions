import { Telegraf } from 'telegraf';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function notifyAdminsPoolReady(
  bot: Telegraf,
  params: {
    poolId: string;
    poolCode: string;
    productName: string;
    totalSeats: number;
    capacity: number;
  }
) {

  const {
    poolId,
    poolCode,
    productName,
    totalSeats,
    capacity,
  } = params;

  const admins = await prisma.user.findMany({
    where: {
      role: 'OWNER',
    },
  });

  for (const admin of admins) {

  try {

    await bot.telegram.sendMessage(
      admin.telegramId,
      `🔥 گروه ${poolCode} تکمیل شد

🎬 محصول: ${productName}
👥 ظرفیت: ${totalSeats}/${capacity}

⚡ آماده خرید و فعال‌سازی`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '👥 اعضا',
                callback_data: `members_${poolId}`,
              },
              {
                text: '🔐 فعال‌سازی',
                callback_data: `activate_${poolId}`,
              },
            ],
          ],
        },
      }
    );

  } catch (err) {

    console.error(
      'ADMIN MESSAGE FAILED',
      admin.telegramId
    );

  }

}



export async function notifyAdminsNewPurchase(
  bot: Telegraf,
  params: {
    poolCode: string;
    productName: string;
    quantity: number;
    totalSeats: number;
    capacity: number;
    userName?: string;
    firstName?: string;
  }
) {

  const admins = await prisma.user.findMany({
    where: {
      role: 'OWNER',
    },
  });

  for (const admin of admins) {

  try {

    await bot.telegram.sendMessage(
      admin.telegramId,
      `💰 خرید جدید

🎬 محصول: ${params.productName}

👤 کاربر:
${params.firstName || '-'}
${params.userName ? '@' + params.userName : ''}

🪑 سیت خریداری شده:
${params.quantity}

🧩 گروه:
${params.poolCode}

📊 وضعیت:
${params.totalSeats}/${params.capacity}

باقی‌مانده:
${params.capacity - params.totalSeats}`
    );

  } catch (err) {

    console.error(
      'ADMIN MESSAGE FAILED',
      admin.telegramId
    );

  }

}


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

