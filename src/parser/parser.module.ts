import { Module } from '@nestjs/common';
import { ParserService } from './parser.service';
import { ExpressionsEvaluatorService } from './expressions-evaluator/expressions-evaluator.service';
import { MathService } from './math/math.service';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [SharedModule],
  providers: [ParserService, ExpressionsEvaluatorService, MathService],
})
export class ParserModule {}
