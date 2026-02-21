import { Test, TestingModule } from '@nestjs/testing';
import { MathService } from './math.service';
import { WinstonLoggerModule } from '../../winston-logger/winston-logger.module';

describe('MathService', () => {
  let service: MathService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [WinstonLoggerModule],
      providers: [MathService],
    }).compile();

    service = module.get<MathService>(MathService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  it('test math parser', () => {
    expect(
      service.parseExpression({
        tokens: ['12', '*', '13', '+', '7'],
        cursor: 0,
      }),
    ).toEqual({
      lhs: {
        lhs: '12',
        operator: '*',
        rhs: '13',
      },
      operator: '+',
      rhs: '7',
    });
  });
});
