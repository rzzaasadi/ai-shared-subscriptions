import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function handleUsers(
  ctx: any
) {

  const totalUsers =
    await prisma.user.count();

  const activeMemberships =
    await prisma.membership.count({
      where: {
        status: 'ACTIVE',
      },
    });

  const pendingReservations =
    await prisma.reservation.count({
      where: {
        status: 'PENDING',
      },
    });

  const users =
    await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });

  let message =
`👥 کاربران

📊 آمار

👤 کل کاربران: ${totalUsers}
🟢 اشتراک‌های فعال: ${activeMemberships}
🟡 رزروهای فعال: ${pendingReservations}

━━━━━━━━━━

`;

  users.forEach((user, index) => {

    message +=
`${index + 1}️⃣ ${user.firstName || 'Unknown'}

🆔 ${user.telegramId}

${user.username ? '@' + user.username : ''}

\n`;

  });

  await ctx.reply(message);

}