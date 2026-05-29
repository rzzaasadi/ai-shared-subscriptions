import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function generatePoolCode(
  prefix: string
) {

  const safePrefix = prefix || 'POOL';

  const latestPool = await prisma.pool.findFirst({
    where: {
      code: {
        startsWith: safePrefix,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!latestPool || !latestPool.code) {
    return `${safePrefix}-100`;
  }

  const parts = latestPool.code.split('-');

  const number = Number(parts[1]) + 1;

  return `${safePrefix}-${number}`;

}