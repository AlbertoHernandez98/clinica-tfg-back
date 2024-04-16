/*
https://docs.nestjs.com/controllers#controllers
*/

import { Controller, Get, Delete, Post, Put, Param, Body } from '@nestjs/common';
import { MedicoHasServicioEntity } from './medico-has-servicio.entity';
import { MedicoHasServicioClinica } from './medico-has-servicio.interface';
import { MedicoHasServicioService } from './medico-has-servicio.service';


@Controller('medico_has_servicio')
export class MedicoHasServicioController {
    constructor(private readonly medicoHasServicioService: MedicoHasServicioService) { }

    @Get()
    async getAllMedicoHasServicio(): Promise<MedicoHasServicioEntity[]> {
        return await this.medicoHasServicioService.getAllMedicoHasServicio();
    }  
}
