import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BotModule } from './bot/bot.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [BotModule, PrismaModule, ProductsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
