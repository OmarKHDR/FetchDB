import { Module } from '@nestjs/common';
import { StringManipulationService } from './string-manipulation.service';
import { NameValidationService } from './name-validation.service';
@Module({
  providers: [StringManipulationService, NameValidationService],
  exports: [StringManipulationService, NameValidationService],
})
export class SharedModule {}
