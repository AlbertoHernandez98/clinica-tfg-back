import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { diskStorage } from 'multer';
import { extname } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const expressApp = app.getHttpAdapter().getInstance();
  const multer = require('multer');


  // Middleware para habilitar CORS
  expressApp.use((req, res, next) => {
    // Configura los encabezados CORS necesarios
    res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Si la solicitud es de tipo OPTIONS, responde con 200 OK
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      // Continúa con el flujo normal de la solicitud
      next();
    }
  });


  // Inicia el servidor
  await app.listen(8080);
}

bootstrap();
