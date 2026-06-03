import { Markup } from 'telegraf';

export const mainMenuKeyboard =
  Markup.keyboard([
    ['🛒 خرید اشتراک AI'],
    ['📦 اشتراک‌های من', '📜 قوانین و سوالات متداول'],
    ['💬 پشتیبانی'],
  ]).resize();

export const adminKeyboard =
  Markup.keyboard([
    ['🟢 READY Pools'],
    ['🟡 ACTIVE Pools'],
    ['👥 Users'],
    ['📢 Broadcast'],
    ['⬅️ بازگشت'],
  ]).resize();