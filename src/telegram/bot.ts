import { Telegraf, Markup } from 'telegraf';
import * as dotenv from 'dotenv';

import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

const bot = new Telegraf(process.env.BOT_TOKEN!);
const userSessions = new Map();
const processingUsers = new Set();
const adminActivationSessions = new Map();

async function generatePoolCode(
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
    console.log(safePrefix);
    return `${safePrefix}-100`;
  }

  const parts = latestPool.code.split('-');

  const number = Number(parts[1]) + 1;
console.log(`${safePrefix}-${number}`);
  return `${safePrefix}-${number}`;

}

async function isAdmin(telegramId: string) {

  const user = await prisma.user.findUnique({
    where: {
      telegramId,
    },
  });

  if (!user) return false;

  return ['OWNER', 'ADMIN', 'SUPPORT'].includes(user.role);

}

bot.start(async (ctx) => {
  await ctx.reply(
    `🚀 به پلتفرم دسترسی اشتراکی ابزارهای AI خوش اومدی

👇 یکی از گزینه‌ها رو انتخاب کن

Premium Shared Access to AI Tools

👇 Choose an option`,
    Markup.keyboard([
      ['🛒 خرید اشتراک AI'],
      ['📦 My Subscriptions', '📡 Service Status'],
      ['🛟 Support'],
    ]).resize()
  );
});

bot.hears('🛒 خرید اشتراک AI', async (ctx) => {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
    },
  });

  const buttons = products.map((product) => [product.name]);

  buttons.push(['⬅️ بازگشت']);

  await ctx.reply(
    `🤖 ابزارهای موجود`,
    Markup.keyboard(buttons).resize()
  );
});

bot.hears('⬅️ بازگشت', async (ctx) => {
  await ctx.reply(
    `🏠 Main Menu`,
    Markup.keyboard([
      ['🛒 Buy AI Subscription'],
      ['📦 اشتراک‌های من', '📡 وضعیت سرویس‌ها'],
      ['🛟 پشتیبانی'],
    ]).resize()
  );
});

bot.command('admin', async (ctx) => {

  const allowed = await isAdmin(
    ctx.from.id.toString()
  );

  if (!allowed) {

    await ctx.reply(
      '⛔ Access Denied'
    );

    return;
  }

  await ctx.reply(
    `🛠 Admin Panel

Choose an option`,
    Markup.keyboard([
      ['🟢 READY Pools'],
      ['🟡 ACTIVE Pools'],
      ['👥 Users'],
      ['📢 Broadcast'],
      ['⬅️ بازگشت'],
    ]).resize()
  );

});

bot.hears('🟢 READY Pools', async (ctx) => {

  const allowed = await isAdmin(
    ctx.from.id.toString()
  );

  if (!allowed) {
    await ctx.reply('⛔ Access Denied');
    return;
  }

  const pools = await prisma.pool.findMany({
    where: {
      status: 'READY_TO_BUY',
    },
    include: {
      product: true,
    },
  });

  if (pools.length === 0) {

    await ctx.reply(
      '⚠️ No READY pools found.'
    );

    return;
  }

  let message = '🟢 READY Pools\n\n';

  pools.forEach((pool, index) => {

    message += `${index + 1}. ${pool.product.name}\n`;
    message += `👥 ${pool.currentMembers}/${pool.product.capacity}\n`;
    
message += `🧩 ${pool.code}\n`;
message += `👥 ${pool.currentMembers}/${pool.product.capacity}\n\n`;
  });

  const buttons = pools.map((pool) => [

  Markup.button.callback(
    `👥 ${pool.code}`,
    `members_${pool.id}`
  ),

  Markup.button.callback(
    `🔐 فعال‌سازی`,
    `activate_${pool.id}`
  ),

]);

await ctx.reply(
  message,
  Markup.inlineKeyboard(buttons)
);
await ctx.reply(
  '🧩 کد گروه موردنظر را ارسال کنید'
);

});

bot.command('activate', async (ctx) => {

  const allowed = await isAdmin(
    ctx.from.id.toString()
  );

  if (!allowed) {
    await ctx.reply('⛔ Access Denied');
    return;
  }

  const parts = ctx.message.text.split(' ');

  if (parts.length < 4) {

    await ctx.reply(
      'Usage:\n/activate POOL_ID EMAIL PASSWORD'
    );

    return;
  }

  const poolId = parts[1];
  const email = parts[2];
  const password = parts.slice(3).join(' ');

  const pool = await prisma.pool.findUnique({
    where: {
      id: poolId,
    },
    include: {
      reservations: {
        include: {
          user: true,
        },
      },
      product: true,
    },
  });

  if (!pool) {

    await ctx.reply(
      '❌ Pool not found.'
    );

    return;
  }

  await prisma.pool.update({
    where: {
      id: pool.id,
    },
    data: {
      status: 'ACTIVE',
      email,
      password,
    },
  });

  for (const reservation of pool.reservations) {

  await prisma.membership.create({
    data: {
      userId: reservation.userId,
      poolId: pool.id,
      status: 'ACTIVE',
    },
  });

  await prisma.reservation.update({
    where: {
      id: reservation.id,
    },
    data: {
      status: 'CONFIRMED',
    },
  });

}
});


 

  
    













bot.hears(['1', '2', '3'], async (ctx) => {

  const session = userSessions.get(ctx.from.id);

  if (!session) return;

  if (session.action !== 'SELECTING_QUANTITY') return;

  if (processingUsers.has(ctx.from.id)) return;

  processingUsers.add(ctx.from.id);

  try {

    const quantity = Number(ctx.message.text);

    const product = await prisma.product.findUnique({
      where: {
        id: session.productId,
      },
    });

    if (!product) return;

    let pool: any = null;

    const availablePools = await prisma.pool.findMany({
      where: {
        productId: product.id,
        status: 'FILLING',
      },
    });

    for (const existingPool of availablePools) {

      const remainingSeats =
        product.capacity - existingPool.currentMembers;

      if (remainingSeats >= quantity) {
        pool = existingPool;
        break;
      }

    }

    if (!pool) {

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

    userSessions.delete(ctx.from.id);

    let user = await prisma.user.findUnique({
      where: {
        telegramId: ctx.from.id.toString(),
      },
    });

    if (!user) {

      user = await prisma.user.create({
        data: {
          telegramId: ctx.from.id.toString(),
          firstName: ctx.from.first_name,
          username: ctx.from.username,
        },
      });

    }

    await prisma.reservation.create({
      data: {
        userId: user.id,
        productId: product.id,
        poolId: pool.id,
        quantity,
      },
    });

    const reservations = await prisma.reservation.findMany({
      where: {
        poolId: pool.id,
        status: 'PENDING',
      },
    });

    const totalSeats = reservations.reduce(
      (sum, reservation) => sum + reservation.quantity,
      0
    );

    await prisma.pool.update({
      where: {
        id: pool.id,
      },
      data: {
        currentMembers: totalSeats,
        status:
          totalSeats >= product.capacity
            ? 'READY_TO_BUY'
            : 'FILLING',
      },
    });

    if (totalSeats >= product.capacity) {

  const admins = await prisma.user.findMany({
    where: {
      role: 'OWNER',
    },
  });

  for (const admin of admins) {

    await bot.telegram.sendMessage(
      admin.telegramId,
      `🔥 گروه ${pool.code} تکمیل شد

🎬 محصول: ${product.name}
👥 ظرفیت: ${totalSeats}/${product.capacity}

⚡ آماده خرید و فعال‌سازی`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '👥 اعضا',
                callback_data: `members_${pool.id}`,
              },
              {
                text: '🔐 فعال‌سازی',
                callback_data: `activate_${pool.id}`,
              },
            ],
          ],
        },
      }
    );

  }

}

    



    await ctx.reply(
      `✅ رزرو شما ثبت شد

🧩 گروه: ${pool.code}

🪑 تعداد سیت: ${quantity}
👥 ظرفیت گروه: ${totalSeats}/${product.capacity}

💰 مبلغ کل: ${(product.price * quantity).toLocaleString()} تومان

${
  totalSeats >= product.capacity
    ? '🔥 ظرفیت گروه تکمیل شد و به زودی فعال می‌شود.'
    : `⏳ ${product.capacity - totalSeats} ظرفیت دیگر باقی مانده است.`
}`,
      Markup.keyboard([
        ['🛒 خرید اشتراک AI'],
        ['📦 اشتراک‌های من', '📡 وضعیت سرویس‌ها'],
        ['🛟 پشتیبانی'],
      ]).resize()
    );

  } finally {

    processingUsers.delete(ctx.from.id);

  }

});




bot.on('text', async (ctx, next) => {

  const text = ctx.message.text;

  const pool = await prisma.pool.findFirst({
    where: {
      code: text,
      status: 'READY_TO_BUY',
    },
  });

  if (!pool) {
    return next();
  }

  adminActivationSessions.set(ctx.from.id, {
    step: 'WAITING_EMAIL',
    poolId: pool.id,
  });

  await ctx.reply(
    `📧 ایمیل اکانت برای ${pool.code} را ارسال کنید`
  );

});

bot.action(/activate_(.+)/, async (ctx) => {

  const poolId = ctx.match[1];

  const pool = await prisma.pool.findUnique({
    where: {
      id: poolId,
    },
  });

  if (!pool) return;

  adminActivationSessions.set(
    ctx.from.id,
    {
      step: 'WAITING_EMAIL',
      poolId: pool.id,
    }
  );

  await ctx.reply(
    `📧 ایمیل اکانت برای ${pool.code} را ارسال کنید`
  );

});

bot.action(/members_(.+)/, async (ctx) => {

  const poolId = ctx.match[1];

  const reservations =
    await prisma.reservation.findMany({
      where: {
        poolId,
      },
      include: {
        user: true,
      },
    });

  if (reservations.length === 0) {

    await ctx.reply(
      '⚠️ عضوی پیدا نشد'
    );

    return;
  }

  let message =
    '👥 اعضای گروه\n\n';

  reservations.forEach((reservation, index) => {

    message += `${index + 1}. `;
    message += `${reservation.user.firstName || 'User'}\n`;

    message += `🪑 ${reservation.quantity} سیت\n`;

    message += `📱 @${reservation.user.username || 'unknown'}\n\n`;

  });

  await ctx.reply(message);

});









bot.on('text', async (ctx) => {

  const session = userSessions.get(ctx.from.id);

  if (session) return;

  const text = ctx.message.text;

  const activationSession =
  adminActivationSessions.get(ctx.from.id);

if (
  activationSession &&
  activationSession.step === 'WAITING_EMAIL'
) {

  activationSession.email =
    ctx.message.text;

  activationSession.step =
    'WAITING_PASSWORD';

  adminActivationSessions.set(
    ctx.from.id,
    activationSession
  );

  await ctx.reply(
    '🔑 پسورد اکانت را ارسال کنید'
  );

  return;
}

if (
  activationSession &&
  activationSession.step === 'WAITING_PASSWORD'
) {

  activationSession.password =
    ctx.message.text;

  activationSession.step =
    'WAITING_EXPIRE_DATE';

  adminActivationSessions.set(
    ctx.from.id,
    activationSession
  );

  await ctx.reply(
    '📅 تاریخ انقضا را ارسال کنید\n\nمثال:\n2026-06-30'
  );

  return;
}

if (
  activationSession &&
  activationSession.step === 'WAITING_EXPIRE_DATE'
) {

  const expiresAt = new Date(
    ctx.message.text
  );

  const pool = await prisma.pool.findUnique({
    where: {
      id: activationSession.poolId,
    },
    include: {
      reservations: {
        include: {
          user: true,
        },
      },
      product: true,
    },
  });

  if (!pool) {

    await ctx.reply(
      '❌ گروه پیدا نشد'
    );

    return;
  }

  await prisma.pool.update({
    where: {
      id: pool.id,
    },
    data: {
      status: 'ACTIVE',
      email: activationSession.email,
      password: activationSession.password,
      expiresAt,
    },
  });

  for (const reservation of pool.reservations) {

    await prisma.membership.create({
      data: {
        userId: reservation.userId,
        poolId: pool.id,
        status: 'ACTIVE',
      },
    });

    await prisma.reservation.update({
      where: {
        id: reservation.id,
      },
      data: {
        status: 'CONFIRMED',
      },
    });

    await bot.telegram.sendMessage(
      reservation.user.telegramId,
      `🎉 اشتراک شما فعال شد

🧩 گروه: ${pool.code}

🎬 محصول: ${pool.product.name}

📧 ایمیل:
${activationSession.email}

🔑 پسورد:
${activationSession.password}

📅 تاریخ انقضا:
${ctx.message.text}

⚠️ لطفاً اطلاعات اکانت را تغییر ندهید.`
    );

  }

  adminActivationSessions.delete(
    ctx.from.id
  );

  await ctx.reply(
    `✅ گروه ${pool.code} فعال شد`
  );

  return;
}



  const product = await prisma.product.findFirst({
    where: {
      name: text,
    },
  });

  if (!product) return;

  const fillingPool = await prisma.pool.findFirst({
    where: {
      productId: product.id,
      status: 'FILLING',
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  let activePool = fillingPool;

if (
  fillingPool &&
  fillingPool.currentMembers >= product.capacity
) {

  activePool = await prisma.pool.create({
    data: {
      title: `${product.name} Pool`,
      productId: product.id,
    },
  });

}

let remainingSeats = product.capacity;

if (activePool) {
  remainingSeats =
    product.capacity - activePool.currentMembers;
}

  userSessions.set(ctx.from.id, {
    action: 'SELECTING_QUANTITY',
    productId: product.id,
  });

  const buttons: string[] = [];

  if (remainingSeats >= 1) buttons.push('1');
  if (remainingSeats >= 2) buttons.push('2');
  if (remainingSeats >= 3) buttons.push('3');

  await ctx.reply(
    `🎬 ${product.name} اشتراکی

💰 قیمت هر سیت: ${product.price.toLocaleString()} تومان
👥 ظرفیت کل: ${product.capacity} نفر
🟢 ظرفیت باقی‌مانده گروه فعلی: ${remainingSeats} نفر

🪑 چند سیت می‌خواهید؟`,
    Markup.keyboard([
      buttons,
      ['بازگشت'],
    ]).resize()
  );

  

});


bot.launch();

console.log('🤖 Telegram Bot Running...');
