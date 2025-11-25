import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';
import { existsSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Serve frontend build folder (Vite outputs to `dist` by default)
  const clientDistPath = join(__dirname, '..', 'client', 'dist');
  if (existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));

    // สำหรับ API route ที่คุณสร้างไว้ จะยังทำงานปกติ
    // ถ้า route ไม่ตรง API ให้ React handle SPA routing
    // Use an Express-compatible middleware so TypeScript typings stay happy
    app.use((req, res, next) => {
      // skip API routes (adjust prefix if your API uses a different base)
      if (req.path.startsWith('/api')) return next();
      res.sendFile(join(clientDistPath, 'index.html'));
    });
  }

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
