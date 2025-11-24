import { Test, TestingModule } from '@nestjs/testing';
import { CrudsController } from './cruds.controller';
import { CrudsService } from './cruds.service';

describe('CrudsController', () => {
  let controller: CrudsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CrudsController],
      providers: [CrudsService],
    }).compile();

    controller = module.get<CrudsController>(CrudsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
