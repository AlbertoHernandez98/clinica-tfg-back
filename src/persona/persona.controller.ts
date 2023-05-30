/*
https://docs.nestjs.com/controllers#controllers
*/

import { Controller, Get, Delete, Post, Put, Param, Body } from '@nestjs/common';
import { PersonaEntity } from './persona.entity';
import { PersonaClinica } from './persona.interface';
import { PersonaService } from './persona.service';

@Controller('persona')
export class PersonaController {
    constructor(private readonly personaService: PersonaService) { }

    @Get()
    async getAllPersonas(): Promise<PersonaEntity[]> {
        return await this.personaService.getAllPersonas();
    }

    @Post()
    async addPersona(@Body() persona: PersonaClinica): Promise<PersonaEntity> {
        return await this.personaService.addPersona(persona)
    }

    @Put(':id')
    async editarPersona(@Param() params, @Body() persona: PersonaClinica) {
        return await this.personaService.editarPersona(params.id, persona)
    }

    @Delete(':id')
    async deletePersona(@Param() params) {
        return await this.personaService.deletePersona(params.id)
    }

}
