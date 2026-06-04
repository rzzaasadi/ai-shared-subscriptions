import { PrismaClient } from '@prisma/client';
import { generatePoolCode } from '../utils/poolCode';
import { bot } from '../bot-instance';
import { notifyAdminsPoolReady, notifyAdminsNewPurchase } from './notifications';

const prisma = new PrismaClient();

export async function createReservation(params: {
  telegramId: string;
  firstName?: string;
  username?: string;
  productId: string;
  quantity: number;
}) {
  const { telegramId, firstName, username, productId, quantity } = params;

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) throw new Error('Product not found');

  let pool: any = null;
  const availablePools = await prisma.pool.findMany({
    where: { productId: product.id, status: 'FILLING' },
  });

  // پیدا کردن pool مناسب که ظرفیت داشته باشه
  for (const existingPool of availablePools) {
    const remainingSeats = product.capacity - existingPool.currentMembers;
    if (remainingSeats >= quantity) {
      pool = existingPool;
      break;
    }
  }

  // اگه pool پیدا نشد، ایجاد یک pool جدید
  if (!pool) {

  const activePoolsCount =
    await prisma.pool.count({
      where: {
        productId: product.id,
        status: {
          in: [
            'FILLING',
            'READY_TO_BUY',
            'ACTIVE',
          ],
        },
      },
    });

  if (
    activePoolsCount >=
    product.maxPools
  ) {

    throw new Error(
      'MAX_POOLS_REACHED'
    );

  }

  const code = await generatePoolCode(
    product.codePrefix || 'POOL'
  );

  pool = await prisma.pool.create({
    data: {
      code,
      title: `گروه ${code}`,
      productId: product.id,
    },
  });

}

  // پیدا کردن یا ایجاد کاربر
  let user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user) {
    user = await prisma.user.create({
      data: { telegramId, firstName, username },
    });
  }

  // ایجاد رزرو
  await prisma.reservation.create({
  data: {
    userId: user.id,
    productId: product.id,
    poolId: pool.id,
    quantity,
  },
});

const reservations =
  await prisma.reservation.findMany({
    where: {
      poolId: pool.id,
      status: 'PENDING',
    },
  });

const totalSeats = reservations.reduce(
  (sum, reservation) =>
    sum + reservation.quantity,
  0
);

await prisma.pool.update({
  where: { id: pool.id },
  data: {
    currentMembers: totalSeats,
    status: totalSeats >= product.capacity
      ? 'READY_TO_BUY'
      : 'FILLING',
  },
});

if (totalSeats >= product.capacity) {

  console.log(`POOL READY ${pool.code}`);

  await notifyAdminsPoolReady(bot, {
    poolId: pool.id,
    poolCode: pool.code,
    productName: product.name,
    totalSeats,
    capacity: product.capacity,
  });

}

await notifyAdminsNewPurchase(bot, {
  poolCode: pool.code,
  productName: product.name,
  quantity,
  totalSeats,
  capacity: product.capacity,
  firstName: user.firstName || undefined,
userName: user.username || undefined,
});

return {
  product,
  pool,
  totalSeats,
  quantity,
};
}