import { Telegraf, Markup } from 'telegraf';
import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

import { generatePoolCode }
from './utils/poolCode';

import { isAdmin }
from './utils/roles';

import {
  mainMenuKeyboard,
  adminKeyboard,
} from './utils/keyboards';


dotenv.config();

const prisma = new PrismaClient();

import { createReservation }
from './services/reservations';

import {
  notifyAdminsPoolReady
} from './services/notifications';

import { activatePool }
from './services/activations';

import {
  handleSeatSelection
} from './handlers/reservations';

import {
  handleActivationFlow
} from './handlers/activations';

import {
  handleSubscriptions
} from './handlers/subscriptions';


import {
  handleReadyPools,
  handlePoolMembers,
  handleActivateButton
} from './handlers/admin';

import { createZarinpalPayment }
from './services/payments';



import { bot }
from './bot-instance';

import {
  handleUsers,
} from './handlers/users';

import {
  isChannelMember
} from './utils/channel';




import cron from 'node-cron';

const userSessions = new Map();
const processingUsers = new Set();
const adminActivationSessions = new Map();



bot.start(async (ctx) => {

  await prisma.user.upsert({
  where: {
    telegramId: ctx.from.id.toString(),
  },
  update: {
    firstName: ctx.from.first_name,
    username: ctx.from.username,
  },
  create: {
    telegramId: ctx.from.id.toString(),
    firstName: ctx.from.first_name,
    username: ctx.from.username,
  },
});

  const joined =
  await isChannelMember(
    bot,
    ctx.from.id
  );

if (!joined) {

  await ctx.reply(
`🚀 به Dimoon AI خوش اومدی

در کانال Dimoon Labs آموزش‌های هوش مصنوعی، ابزارهای جدید، بروزرسانی سرویس‌ها و اطلاعیه‌های مهم منتشر میشه.

⚡ ظرفیت اشتراک‌ها محدود است و ابتدا در کانال اطلاع‌رسانی می‌شود.

📢 @dimoonlab

بعد از عضویت روی «بررسی عضویت» بزن 👇`,
{
  reply_markup: {
    inline_keyboard: [
      [
        {
          text: '📢 عضویت در کانال',
          url: 'https://t.me/dimoonlab'
        }
      ],
      [
        {
          text: '✅ بررسی عضویت',
          callback_data: 'check_join'
        }
      ]
    ]
  }
}
  );

  return;

}

  await ctx.reply(
    `🚀 به پلتفرم دسترسی اختصاصی و اشتراکی ابزارهای AI خوش اومدی

یکی از گزینه‌ها رو انتخاب کن `,
    mainMenuKeyboard
  );
});

bot.hears('🛒 خرید اشتراک AI', async (ctx) => {

  const user =
  await prisma.user.findUnique({
    where: {
      telegramId:
        ctx.from.id.toString(),
    },
  });


  /*
if (!user?.phoneNumber) {

  await ctx.reply(
`📱 برای تکمیل خرید، شماره موبایل خود را ثبت کنید.

این شماره فقط برای اطلاع‌رسانی سفارش‌ها، پشتیبانی و تمدید اشتراک استفاده می‌شود.`,
    Markup.keyboard([
      [
        Markup.button.contactRequest(
          '📱 ارسال شماره موبایل'
        )
      ],
      ['⬅️ بازگشت']
    ]).resize()
  );

  return;
}
*/


  userSessions.delete(ctx.from.id);
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


bot.hears('📜 قوانین و سوالات متداول', async (ctx) => {
  await ctx.reply(`
📜 قوانین دیمون AI

• هر اشتراک به صورت اشتراکی ارائه می‌شود.
• پس از خرید امکان لغو یا بازگشت وجه وجود ندارد.
• مسئولیت رعایت قوانین سرویس اصلی بر عهده کاربر است.
• هرگونه سوءاستفاده ممکن است منجر به قطع دسترسی شود.

❓ سوالات متداول

سرویس‌ها قانونی هستند؟
بله، اشتراک‌های اصلی خریداری می‌شوند.

دسترسی چه زمانی فعال می‌شود؟
پس از تکمیل ظرفیت گروه و فعال‌سازی توسط تیم دیمون.

اگر مشکلی پیش بیاید؟
از طریق پشتیبانی با ما در ارتباط باشید.
`);
});

bot.hears('💬 پشتیبانی', async (ctx) => {
  await ctx.reply(
    'برای ارتباط با پشتیبانی روی دکمه زیر کلیک کنید:',
    Markup.inlineKeyboard([
      [
        Markup.button.url(
          '💬 ارتباط با پشتیبانی',
          'https://t.me/dimoonadmin'
        )
      ]
    ])
  );
});


bot.hears('بازگشت', async (ctx) => {
  userSessions.delete(ctx.from.id);

  const products = await prisma.product.findMany({
    where: { isActive: true }
  });

  await ctx.reply(
    '🤖 ابزارهای موجود',
    Markup.keyboard(
      products.map(p => [p.name])
    ).resize()
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


bot.hears(
  '🟢 READY Pools',
  async (ctx) => {

    const allowed =
      await isAdmin(
        ctx.from.id.toString()
      );

    if (!allowed) {

      await ctx.reply(
        '⛔ Access Denied'
      );

      return;
    }

    await handleReadyPools(ctx);

  }
);

bot.hears(
  '👥 Users',
  async (ctx) => {

    const allowed =
      await isAdmin(
        ctx.from.id.toString()
      );

    if (!allowed) {
      return;
    }

    await handleUsers(ctx);

  }
);

bot.hears(['1', '2', '3'], async (ctx) => {

  await handleSeatSelection(
    bot,
    ctx,
    userSessions,
    processingUsers
  );

});

 

  

bot.on('text', async (ctx, next) => {

  const text = ctx.message.text;
  
  
  console.log(
  'TEXT RECEIVED:',
  text
);

console.log(
  'SEARCHING PRODUCT...'
);

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

bot.action(
  /activate_(.+)/,
  async (ctx) => {

    await handleActivateButton(
      ctx,
      adminActivationSessions
    );

  }
);

bot.action(
  /members_(.+)/,
  async (ctx) => {

    const poolId =
      ctx.match[1];

    await handlePoolMembers(
      ctx,
      poolId
    );

  }
);
bot.action(
  'cancel_payment',
  async (ctx) => {

    userSessions.delete(
      ctx.from.id
    );

    await ctx.reply(
      '❌ پرداخت لغو شد'
    );

  }
);


bot.action(
  'start_payment',
  async (ctx) => {

       try {
    const session =
      userSessions.get(ctx.from.id);

      console.log('SESSION', session);


    if (!session) {
      return;
    }

    const product =
      await prisma.product.findUnique({
        where: {
          id: session.productId,
        },
      });

      console.log('PRODUCT_ID', session.productId);
    console.log('PRODUCT', product);

    if (!product) {
      return;
    }

    const payment =
  await createZarinpalPayment({
    amount:
      product.price *
      session.quantity,

    description:
      `${product.name} Shared Account`,

    callbackUrl:
      'https://api.dimoon.ir/payment/callback'
  });

console.log('PAYMENT RESPONSE');
console.log(payment);


  const authority = payment.data.authority;
console.log('AUTHORITY', authority);





  let user =
  await prisma.user.findUnique({
    where: {
      telegramId:
        ctx.from.id.toString(),
    },
  });

console.log('USER', user);

if (!user) {

  user =
    await prisma.user.create({
      data: {
        telegramId:
          ctx.from.id.toString(),

        firstName:
          ctx.from.first_name,

        username:
          ctx.from.username,
      },
    });

}


  await prisma.payment.create({
  data: {
    authority,
    amount:
      product.price *
      session.quantity,

    userId: user.id,

    productId: product.id,

    quantity:
      session.quantity,

    status: 'PENDING',
  },
});
console.log('PAYMENT SAVED');


const paymentUrl =
  `https://payment.zarinpal.com/pg/StartPay/${authority}`;

  console.log('PAYMENT URL', paymentUrl);

await ctx.reply(
`📜 قوانین و شرایط استفاده

• اشتراک‌ها به صورت گروهی ارائه می‌شوند.
• فعال‌سازی پس از تکمیل ظرفیت انجام می‌شود.
• اگر تا ۱۰ روز گروه تکمیل نشود امکان عودت وجه وجود دارد.
• پس از فعال‌سازی اشتراک امکان بازگشت وجه وجود ندارد.
• رعایت قوانین سرویس اصلی بر عهده کاربر است.
• در صورت بن شدن یا محدود شدن حساب توسط سرویس اصلی، مسئولیتی متوجه دیمون نیست.

با پرداخت، تمامی قوانین فوق را می‌پذیرید.`,
Markup.inlineKeyboard([
[
Markup.button.url(
'✅ تایید قوانین و پرداخت',
paymentUrl
)
]
])
);

console.log('LINK SENT');
console.log(payment);

} catch (error) {

  console.log('PAYMENT ERROR');
  console.log(error);

  await ctx.reply(
    '❌ خطا در ایجاد پرداخت'
  );

}

}
);





bot.hears(
  '📦 اشتراک‌های من',
  async (ctx) => {

    await handleSubscriptions(ctx);

  }
);

bot.action(
  'check_join',
  async (ctx) => {

    const joined =
      await isChannelMember(
        bot,
        ctx.from.id
      );

    if (!joined) {

      await ctx.answerCbQuery(
        'هنوز عضو کانال نیستید'
      );

      return;
    }

    await ctx.reply(
      `✅ عضویت شما تأیید شد`
    );

    await ctx.reply(
      `🚀 به پلتفرم دسترسی اشتراکی ابزارهای AI خوش اومدی

👇 یکی از گزینه‌ها رو انتخاب کن`,
      mainMenuKeyboard
    );

  }
);


bot.on('contact', async (ctx) => {

  await prisma.user.update({
    where: {
      telegramId:
        ctx.from.id.toString(),
    },
    data: {
      phoneNumber:
        ctx.message.contact.phone_number,
    },
  });

  const products =
    await prisma.product.findMany({
      where: {
        isActive: true,
      },
    });

  const buttons =
    products.map(
      (product) => [product.name]
    );

  buttons.push(['⬅️ بازگشت']);

  await ctx.reply(
`✅ شماره موبایل شما ثبت شد

🤖 ابزارهای موجود`,
    Markup.keyboard(
      buttons
    ).resize()
  );

});



 bot.on('text', async (ctx) => {

  const handledActivation =
    await handleActivationFlow(
      bot,
      ctx,
      adminActivationSessions
    );

  if (handledActivation) {
    return;
  }

  const session =
    userSessions.get(ctx.from.id);

  if (session) return;

  const text =
    ctx.message.text;



  const product = await prisma.product.findFirst({
    where: {
      name: text,
    },
  });
  console.log(
  'PRODUCT FOUND:',
  product?.name
);

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

💰 قیمت هر سهم: ${product.price.toLocaleString()} تومان
👥 ظرفیت کل: ${product.capacity} نفر
🟢 ظرفیت باقی‌مانده گروه فعلی: ${remainingSeats} نفر

📝 توضیحات: ${product.description || 'ندارد'}

🪑 چند جای خالی می‌خواهید؟`,
    Markup.keyboard([
      buttons,
      ['بازگشت'],
    ]).resize()
  );


});
  



cron.schedule('0 */12 * * *', async () => {

  const now = new Date();

  const threeDaysLater = new Date();

  threeDaysLater.setDate(
    now.getDate() + 3
  );

  const pools = await prisma.pool.findMany({
    where: {
      status: 'ACTIVE',
      expiresAt: {
        lte: threeDaysLater,
        gte: now,
      },
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

  for (const pool of pools) {

    for (const reservation of pool.reservations) {

      await bot.telegram.sendMessage(
        reservation.user.telegramId,
        `⏰ اشتراک شما تا ۳ روز دیگر منقضی می‌شود

🎬 ${pool.product.name}
🧩 ${pool.code}

📅 تاریخ انقضا:
${pool.expiresAt?.toLocaleDateString('fa-IR')}

برای تمدید،
دوباره اشتراک رزرو کنید 🙌`
      );

    }

  }

});



bot.launch();

console.log('🤖 Telegram Bot Running...');
