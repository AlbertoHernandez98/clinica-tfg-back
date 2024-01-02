import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonaEntity } from './persona.entity';
import { PersonaController } from './persona.controller';
import { PersonaService } from './persona.service';

@Module({
  imports: [TypeOrmModule.forFeature([PersonaEntity])],
  controllers: [PersonaController],
  providers: [PersonaService],
  exports: [PersonaService],
})
export class PersonaModule {}
