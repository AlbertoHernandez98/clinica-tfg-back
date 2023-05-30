import { PersonaModule } from './persona/persona.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    PersonaModule,
    TypeOrmModule.forRoot({
      "type": "mysql",
      "host": "localhost",
      "port": 3307,
      "username": "root",
      "password": "",
      "database": "test",
      "entities": [join(__dirname, '**', '*.entity.{ts,js}')],
      "synchronize": true,
      "autoLoadEntities": true,

    }),
    PassportModule.register({
      defaultStrategy: 'jwt',
      property: 'user',
      session: false,
    }),
    JwtModule.register({
      secret: process.env.SECRETKEY, signOptions: {
        expiresIn: process.env.EXPIRESIN,
      },
    })],
  controllers: [
    AppController,
  ], 
  providers: [AppService],
  // AuthService, JwtStrategy
})
export class AppModule { }
