import { Test, TestingModule } from '@nestjs/testing';
import { ExecuterService } from './executer.service';

describe('ExecuterService', () => {
  let service: ExecuterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExecuterService],
    }).compile();

    service = module.get<ExecuterService>(ExecuterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
