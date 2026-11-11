/*
https://docs.nestjs.com/controllers#controllers
*/

import { Controller, Get, Delete, Post, Put, Param, Body, Request, UseGuards, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PersonaEntity } from './persona.entity';
import { PersonaClinica } from './persona.interface';
import { assertPersonBody, PersonaService } from './persona.service';

@Controller('persona')
@UseGuards(AuthGuard('jwt'))
export class PersonaController {
    constructor(private readonly personaService: PersonaService) { }

   
    @Get()
    async getAllPersonas(@Request() req): Promise<Omit<PersonaEntity, 'password'>[]> {
        const personas = await this.personaService.getAllPersonas(req.user);
        return personas.map(({ password, ...persona }) => persona);
    } 

    @Post()
    async addPersona(@Body() persona: PersonaClinica, @Request() req): Promise<PersonaEntity> {
        assertPersonBody(persona);
        const role = req.user.idRolNativo;
        if (!(role === 1 && [1, 2, 3, 4].includes(persona?.idRolNativo)) &&
            !(role === 2 && persona?.idRolNativo === 4) &&
            !(role === 3 && [2, 4].includes(persona?.idRolNativo))) {
            throw new ForbiddenException();
        }
        const { password, ...result } = await this.personaService.addPersona(persona);
        return result;
    }

    @Put('/changeUser')
    async editarPersona(@Body() requestBody, @Request() req) {
        assertPersonBody(requestBody);
        if (req.user.idRolNativo !== 1 && req.user.dni === requestBody.oldDni &&
            (req.user.idRolNativo !== Number(requestBody.idRolNativo) || requestBody.password)) {
            throw new ForbiddenException();
        }
        return await this.personaService.editarPersona(requestBody, req.user)
    }

    @Put('/changePassword')
    async cambiarContrasena(@Body() requestBody, @Request() req) {
        assertPersonBody(requestBody);
        if (requestBody.dni !== req.user.dni) throw new ForbiddenException();
        await this.personaService.cambiarContrasena(requestBody);
        return { mensaje: 'Contraseña cambiada exitosamente' };
    }

    @Delete(':id')
    async deletePersona(@Param() params, @Request() req) {
        return await this.personaService.deletePersona(params.id, req.user)
    }

}
