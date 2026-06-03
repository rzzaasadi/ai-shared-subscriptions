import { PrismaClient } from '@prisma/client';
import { createReservation } from '../telegram/services/reservations';
import { notifyAdminsNewPurchase } from '../telegram/services/notifications';
import { bot } from '../telegram/bot-instance';
import {
  notifyAdminsPoolReady
} from '../telegram/services/notifications';

const prisma = new PrismaClient();

export async function processSuccessfulPayment(payment: any) {
  if (payment.status === 'SUCCESS') return;

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'SUCCESS' }
  });

  const user = await prisma.user.findUnique({ where: { id: payment.userId } });
  if (!user) throw new Error('User not found');

  const reservationResult = await createReservation({
    telegramId: user.telegramId,
    firstName: user.firstName || '',
    username: user.username || '',
    productId: payment.productId,
    quantity: payment.quantity
  });

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

  await notifyAdminsNewPurchase(bot, {
    poolCode: reservationResult.pool.code,
    productName: reservationResult.product.name,
    quantity: payment.quantity,
    totalSeats: reservationResult.totalSeats,
    capacity: reservationResult.product.capacity,
    firstName: user.firstName || undefined,
    userName: user.username || undefined
  });

  // ✅ این قسمت هم باید داخل تابع باشه
  if (reservationResult.totalSeats >= reservationResult.product.capacity) {
    await notifyAdminsPoolReady(bot, {
      poolId: reservationResult.pool.id,
      poolCode: reservationResult.pool.code,
      productName: reservationResult.product.name,
      totalSeats: reservationResult.totalSeats,
      capacity: reservationResult.product.capacity
    });
  }

  return reservationResult;
}