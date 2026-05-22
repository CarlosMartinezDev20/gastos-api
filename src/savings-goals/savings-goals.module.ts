import { Module } from '@nestjs/common';
import { SavingsGoalsService } from './savings-goals.service';
import { SavingsGoalsController } from './savings-goals.controller';
import { CategoriesModule } from '../categories/categories.module';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [CategoriesModule, TransactionsModule],
  controllers: [SavingsGoalsController],
  providers: [SavingsGoalsService],
})
export class SavingsGoalsModule {}
