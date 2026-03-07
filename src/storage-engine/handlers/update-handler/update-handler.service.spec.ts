import { Test, TestingModule } from '@nestjs/testing';
import { UpdateHandlerService } from './update-handler.service';

describe('UpdateHandlerService', () => {
  let service: UpdateHandlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UpdateHandlerService],
    }).compile();

    service = module.get<UpdateHandlerService>(UpdateHandlerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
