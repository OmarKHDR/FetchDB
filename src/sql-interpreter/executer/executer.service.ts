import { Injectable } from '@nestjs/common';
import { WinstonLoggerService } from '../../winston-logger/winston-logger.service';
@Injectable()
export class ExecuterService {
  constructor(private winston: WinstonLoggerService) {}

  execute(ASTtree: Record<any, any>) {
    switch (ASTtree.statement) {
      case 'create':
        this.executeCreate(ASTtree);
        break;
      default:
        throw new Error(`not implemented yet: statement ${ASTtree.statement}`);
    }
  }

	executeCreate(ASTtree: Record<any, any>) {
		
	}
}
