import { Telegraf } from 'telegraf';
import * as dotenv from 'dotenv';

dotenv.config();

export const bot =
  new Telegraf(
    process.env.BOT_TOKEN!
  );