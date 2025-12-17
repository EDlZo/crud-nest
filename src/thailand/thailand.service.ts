import { Injectable, Logger } from '@nestjs/common';
import { join } from 'path';
import { promises as fs } from 'fs';

@Injectable()
export class ThailandService {
  private readonly logger = new Logger(ThailandService.name);
  private cache: any = null;

  private async loadFile() {
    if (this.cache) return this.cache;
    const candidate = join(process.cwd(), 'client', 'src', 'data', 'thailand-hierarchy-full.json');
    try {
      const raw = await fs.readFile(candidate, 'utf-8');
      this.cache = JSON.parse(raw);
      this.logger.log(`Loaded thailand hierarchy from ${candidate}`);
      return this.cache;
    } catch (err) {
      this.logger.warn('Failed to load client-side hierarchy, trying dist/static-provinces.json', err?.message);
    }

    // fallback to possible static file under src/thailand
    try {
      const alt = join(process.cwd(), 'src', 'thailand', 'static-provinces.json');
      const raw2 = await fs.readFile(alt, 'utf-8');
      this.cache = JSON.parse(raw2);
      this.logger.log(`Loaded thailand hierarchy from ${alt}`);
      return this.cache;
    } catch (err) {
      this.logger.error('No thailand hierarchy file found', err?.message);
      throw err;
    }
  }

  async getHierarchy() {
    return this.loadFile();
  }
}
