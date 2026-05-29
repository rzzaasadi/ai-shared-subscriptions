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

  if (memberships.length === 0) {

    await ctx.reply(
      '⚠️ اشتراک فعالی ندارید'
    );

    return;
  }

  let message =
    '📦 اشتراک‌های فعال شما\n\n';

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

  await ctx.reply(message);

}