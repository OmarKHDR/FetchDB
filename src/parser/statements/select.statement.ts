import { JoinDto } from '../dto/joins.dto';
import { ConditionDto } from 'src/shared/dto/condition.dto';
export class SELECT_STATEMENT {
  join?: JoinDto;
  where?: ConditionDto;
}
