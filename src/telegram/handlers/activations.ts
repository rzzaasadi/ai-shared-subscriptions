import { Telegraf } from 'telegraf';

import { PrismaClient } from '@prisma/client';

import { activatePool }
from '../services/activations';

const prisma = new PrismaClient();

export async function handleActivationFlow(
  bot: Telegraf,
  ctx: any,
  adminActivationSessions: Map<any, any>
) {

  const activationSession =
    adminActivationSessions.get(ctx.from.id);

  if (!activationSession) return false;

  // EMAIL

  if (
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

    return true;
  }

  // PASSWORD

  if (
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

    return true;
  }

  // EXPIRE DATE

  if (
    activationSession.step === 'WAITING_EXPIRE_DATE'
  ) {

    const expiresAt =
      new Date(ctx.message.text);

    if (
      isNaN(expiresAt.getTime())
    ) {

      await ctx.reply(
        '❌ فرمت تاریخ نامعتبر است\n\nمثال صحیح:\n2026-06-30'
      );

      return true;
    }

    const pool =
      await prisma.pool.findUnique({
        where: {
          id: activationSession.poolId,
        },
      });

    if (!pool) {

      await ctx.reply(
        '❌ گروه پیدا نشد'
      );

      return true;
    }

    await activatePool(
      bot,
      {
        poolId:
          activationSession.poolId,

        email:
          activationSession.email,

        password:
          activationSession.password,

        expiresAt,
      }
    );

    adminActivationSessions.delete(
      ctx.from.id
    );

    await ctx.reply(
      `✅ گروه ${pool.code} فعال شد`
    );

    return true;
  }

  return false;

}