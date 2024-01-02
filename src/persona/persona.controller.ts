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

    @Put('/changeUser')
    async editarPersona(@Body() requestBody) {
        return await this.personaService.editarPersona(requestBody)
    }

    @Put('/changePassword')
    async cambiarContrasena(@Body() requestBody) {
        const { username, contrasena, newPassword } = requestBody;
      try {
        const personaActualizada = await this.personaService.cambiarContrasena(requestBody);
        return { mensaje: 'Contraseña cambiada exitosamente', persona: personaActualizada };
      } catch (error) {
        throw new Error(error.message);
      }
    }

    @Delete(':id')
    async deletePersona(@Param() params) {
        return await this.personaService.deletePersona(params.id)
    }

}
