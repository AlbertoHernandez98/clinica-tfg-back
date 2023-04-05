import { PersonaService } from './persona.service';
import { PersonaController } from './persona.controller';
import { TypeOrmModule } from '@nestjs/typeorm';

/*
https://docs.nestjs.com/modules
*/

import { Module } from '@nestjs/common';
import { PersonaEntity } from './persona.entity';

@Module({
    imports: [TypeOrmModule.forFeature([PersonaEntity])],
    controllers: [
        PersonaController,
    ],
    providers: [
        PersonaService,
    ],
})
export class PersonaModule { }
