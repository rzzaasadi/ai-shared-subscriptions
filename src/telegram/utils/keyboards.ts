import { Markup } from 'telegraf';

export const mainMenuKeyboard =
  Markup.keyboard([
    ['🛒 خرید اشتراک AI'],
    ['📦 اشتراک‌های من', '📡 وضعیت سرویس‌ها'],
    ['🛟 پشتیبانی'],
  ]).resize();

export const adminKeyboard =
  Markup.keyboard([
    ['🟢 READY Pools'],
    ['🟡 ACTIVE Pools'],
    ['👥 Users'],
    ['📢 Broadcast'],
    ['⬅️ بازگشت'],
  ]).resize();