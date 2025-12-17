import { Controller, Get, Res, HttpCode } from '@nestjs/common';
import type { Response } from 'express';
import { ThailandService } from './thailand.service';

@Controller('thailand')
export class ThailandController {
  constructor(private readonly svc: ThailandService) {}

  @Get('hierarchy')
  @HttpCode(200)
  async getHierarchy(@Res() res: Response) {
    try {
      const data = await this.svc.getHierarchy();
      return res.json(data);
    } catch (err) {
      return res.status(502).json({ error: 'failed to load thailand hierarchy' });
    }
  }
}
