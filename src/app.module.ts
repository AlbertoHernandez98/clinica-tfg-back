import { PersonaModule } from './persona/persona.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    PersonaModule,
    TypeOrmModule.forRoot({
      'type': 'mysql',
      'host': 'localhost',
      'port': 3307,
      'username': 'root',
      'password': '',
      'database': 'alhersa2_mydb',
      'entities': [join(__dirname, '**', '*.entity.{ts,js}')],
      'synchronize': true
    })],
  controllers: [
    AppController],
  providers: [AppService],
})
export class AppModule { }
