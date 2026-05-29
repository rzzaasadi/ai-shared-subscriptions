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

  }

}