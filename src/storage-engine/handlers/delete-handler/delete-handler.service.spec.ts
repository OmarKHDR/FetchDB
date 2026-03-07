import { Test, TestingModule } from '@nestjs/testing';
import { DeleteHandlerService } from './delete-handler.service';

describe('DeleteHandlerService', () => {
  let service: DeleteHandlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeleteHandlerService],
    }).compile();

    service = module.get<DeleteHandlerService>(DeleteHandlerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
