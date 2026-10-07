import { PartialType } from '@nestjs/swagger';
import { CreateSavingsGoalDto } from './create-savings-goal.dto';

export class UpdateSavingsGoalDto extends PartialType(CreateSavingsGoalDto) {}
