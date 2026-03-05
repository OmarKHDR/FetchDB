import { Module } from '@nestjs/common';
import { StringManipulationService } from './string-manipulation.service';
@Module({
  providers: [StringManipulationService],
  exports: [StringManipulationService],
})
export class SharedModule {}
