import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [PrismaModule],
  providers: [ProductsService, PrismaService],
  exports: [ProductsService],
})
export class ProductsModule {}