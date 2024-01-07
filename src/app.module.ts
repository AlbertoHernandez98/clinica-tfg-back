import { ServiciosController } from './servicios/servicios.controller';
import { PhotosModule } from './photos/photos.module';
import { PhotosService } from './photos/photos.service';
import { PersonaModule } from './persona/persona.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth/auth.service';
import { AuthModule } from './auth/auth.module';
import { HistorialClinicoModule } from './historialclinico/historial-clinico.module';
import { ServiciosModule } from './servicios/servicios.module';

@Module({
  imports: [
    PhotosModule,
    PersonaModule,
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3307,
      username: 'root',
      password: '',
      database: 'test',
      entities: [join(__dirname, '**', '*.entity.{ts,js}')],
      synchronize: false,
      autoLoadEntities: true,
    }),
    AuthModule,
    HistorialClinicoModule,
    ServiciosModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
