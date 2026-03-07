import { Test, TestingModule } from '@nestjs/testing';
import { MathService } from './math.service';
import { WinstonLoggerModule } from '../../winston-logger/winston-logger.module';
import { SharedModule } from '../../shared/shared.module';
import { StringManipulationService } from '../../shared/string-manipulation.service';

describe('MathService', () => {
  let service: MathService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [WinstonLoggerModule, SharedModule],
      providers: [MathService, StringManipulationService],
    }).compile();

    service = module.get<MathService>(MathService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  it('test math parser', () => {
    const expr = service.parseExpression({
      tokens: ['12', '=', '13', '-', '7'],
      cursor: 0,
    });
    expect(expr).toEqual({
      lhs: '12',
      operator: '=',
      rhs: {
        lhs: '13',
        operator: '-',
        rhs: '7',
      },
    });
  });

  it('test math parser', () => {
    const expr = service.parseExpression({
      tokens: ['(','12','-','5',')', '*', '3', '=', '13', '-', '7'],
      cursor: 0,
    });
    console.log(expr)
    expect(expr).toEqual({
        lhs: {
          lhs: { lhs: '12', operator: '-', rhs: '5' },
          operator: '*',
          rhs: '3'
        },
        operator: '=',
        rhs: { lhs: '13', operator: '-', rhs: '7' }
      });
  });
});
