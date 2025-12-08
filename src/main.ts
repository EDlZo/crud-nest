import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';
import { existsSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
  });
  
  // Increase body size limit for profile image uploads (base64 can be large)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  
  // Enable CORS so frontend (e.g. Vite dev server or deployed client) can call the API
  app.enableCors();

  // Enable global validation pipe for DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  // Serve frontend build folder (Vite outputs to `dist` by default)
  const clientDistPath = join(__dirname, '..', 'client', 'dist');
  if (existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));

    // สำหรับ API route ที่คุณสร้างไว้ จะยังทำงานปกติ
    // ถ้า route ไม่ตรง API ให้ React handle SPA routing
    // Use an Express-compatible middleware so TypeScript typings stay happy
    app.use((req, res, next) => {
      // skip API routes - check for /api prefix or known API endpoints
      if (
        req.path.startsWith('/api') ||
        req.path.startsWith('/cruds') ||
        req.path.startsWith('/auth') ||
        req.path.startsWith('/companies') ||
        req.path.startsWith('/activities') ||
        req.path.startsWith('/deals') ||
        req.path.startsWith('/notification-settings') ||
        req.path.startsWith('/email')
      ) {
        return next();
      }
      res.sendFile(join(clientDistPath, 'index.html'));
    });
  }

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
