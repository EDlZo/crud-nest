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
  // When client uses `credentials: 'include'`, the server must not use a wildcard
  // origin. Use CLIENT_ORIGIN env var (comma-separated) or default to Vite dev origin.
  const clientOrigins = process.env.CLIENT_ORIGIN
    ? process.env.CLIENT_ORIGIN.split(',').map(s => s.trim())
    : ['http://localhost:5173'];
  const allowedOrigins = Array.isArray(clientOrigins) ? clientOrigins : [clientOrigins];
  // Log configured origins for debugging in hosted environments
  console.log('CORS allowed origins:', allowedOrigins);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like curl, server-to-server)
      if (!origin) return callback(null, true);
      // Support wildcard '*' to allow all origins (USE WITH CAUTION, dev-only)
      if (allowedOrigins.includes('*')) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy: origin not allowed (${origin})`), false);
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization, Accept, X-Requested-With',
  });

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
