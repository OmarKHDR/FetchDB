import { Test, TestingModule } from '@nestjs/testing';
import { DbCreatorService } from './db-creator.service';

describe('DbCreatorService', () => {
  let service: DbCreatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DbCreatorService],
    }).compile();

    service = module.get<DbCreatorService>(DbCreatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('try creating new user space', async () => {
    await service.createUser('omar');
  });
});
