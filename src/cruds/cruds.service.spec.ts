import { Test, TestingModule } from '@nestjs/testing';
import { CrudsService } from './cruds.service';

describe('CrudsService', () => {
  let service: CrudsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CrudsService],
    }).compile();

    service = module.get<CrudsService>(CrudsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
