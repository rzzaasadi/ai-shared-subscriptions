import { PrismaClient }
from '@prisma/client';

const prisma = new PrismaClient();

export async function handleSubscriptions(
  ctx: any
) {

  const user =
    await prisma.user.findUnique({
      where: {
        telegramId:
          ctx.from.id.toString(),
      },
    });

  if (!user) {

    await ctx.reply(
      '⚠️ اشتراکی پیدا نشد'
    );

    return;
  }

  const memberships =
    await prisma.membership.findMany({
      where: {
        userId: user.id,
        status: 'ACTIVE',
      },
      include: {
        pool: {
          include: {
            product: true,
          },
        },
      },
    });

  const reservations =
    await prisma.reservation.findMany({
      where: {
        userId: user.id,
        status: 'PENDING',
      },
      include: {
        pool: {
          include: {
            product: true,
          },
        },
      },
    });

  if (
    memberships.length === 0 &&
    reservations.length === 0
  ) {

    await ctx.reply(
      '⚠️ اشتراکی پیدا نشد'
    );

    return;
  }

  let message =
    '📦 اشتراک‌های شما\n\n';

  if (memberships.length > 0) {

    message +=
      '🟢 اشتراک‌های فعال\n\n';

    memberships.forEach(
      (membership, index) => {

        message += `${index + 1}️⃣ `;
        message += `${membership.pool.product.name}\n`;

        message += `🧩 گروه: ${membership.pool.code}\n\n`;

        message += `📧 ${membership.pool.email}\n`;
        message += `🔑 ${membership.pool.password}\n\n`;

        message += `📅 انقضا:\n`;

        message +=
          `${membership.pool.expiresAt?.toLocaleDateString('fa-IR')}\n`;

        message +=
          '\n━━━━━━━━━━\n\n';

      }
    );

  }

  if (reservations.length > 0) {

  message +=
    '🟡 در انتظار تکمیل ظرفیت\n\n';

    reservations.forEach(
    (reservation, index) => {

      if (!reservation.pool) {
        return;
      }

      message +=
        `${index + 1}️⃣ ${reservation.pool.product.name}\n`;

      message +=
        `🧩 گروه: ${reservation.pool.code}\n`;

      message +=
        `📊 وضعیت:\n`;

      message +=
        `${reservation.pool.currentMembers}/${reservation.pool.product.capacity}\n\n`;

    }
  );

  }

  await ctx.reply(message);

}