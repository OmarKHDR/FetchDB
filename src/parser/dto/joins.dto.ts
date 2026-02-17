import { IsEnum, IsString } from 'class-validator';

enum join_types {
  'inner',
  'left',
  'right',
  'full outer',
  'outer',
  'cross',
  'self',
}

export class JoinDto {
  @IsString()
  table_name: string;

  @IsEnum(join_types)
  join_type:
    | 'inner'
    | 'left'
    | 'right'
    | 'full outer'
    | 'outer'
    | 'cross'
    | 'self';
}
