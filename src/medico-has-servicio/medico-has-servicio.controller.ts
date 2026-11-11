/*
https://docs.nestjs.com/controllers#controllers
*/

import { Controller, Get, Put, Param, Body, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MedicoHasServicioEntity } from './medico-has-servicio.entity';
import { MedicoHasServicioService } from './medico-has-servicio.service';


@Controller('medico_has_servicio')
export class MedicoHasServicioController {
    constructor(private readonly medicoHasServicioService: MedicoHasServicioService) { }

    @Get()
    async getAllMedicoHasServicio(): Promise<MedicoHasServicioEntity[]> {
        return await this.medicoHasServicioService.getAllMedicoHasServicio();
    }  

    @Put(':id')
    @UseGuards(AuthGuard('jwt'))
    async replace(@Param('id') id: string, @Body() body: { servicios: unknown }, @Request() req) {
        return this.medicoHasServicioService.replace(req.user, id, body?.servicios);
    }
}
