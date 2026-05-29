import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function isAdmin(
  telegramId: string
) {

  const user = await prisma.user.findUnique({
    where: {
      telegramId,
    },
  });

  if (!user) return false;

  return [
    'OWNER',
    'ADMIN',
    'SUPPORT',
  ].includes(user.role);

}