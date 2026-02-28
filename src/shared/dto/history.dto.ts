import { ApiProperty } from '@nestjs/swagger';

export class setVersionDto {
  @ApiProperty({ type: 'number' })
  version: number;
}
export class selectRowDto {
  @ApiProperty({ type: 'number' })
  id: number;

  @ApiProperty({ type: 'string' })
  tablename: string;
}
