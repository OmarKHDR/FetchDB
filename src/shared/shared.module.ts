import { Module } from '@nestjs/common';
import { StringManipulationService } from './string-manipulation.service';
import { NameValidationService } from './name-validation.service';
import { ValidatorService } from './validator.service';
@Module({
  providers: [StringManipulationService, NameValidationService, ValidatorService],
  exports: [StringManipulationService, NameValidationService, ValidatorService],
})
export class SharedModule {}
