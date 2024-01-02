/*
https://docs.nestjs.com/controllers#controllers
*/

import { Controller, Get, Delete, Post, Put, Param, Body } from '@nestjs/common';
import { HistorialClinicoEntity } from './historial-clinico.entity';
import { HistorialClinicoClinica } from './historial-clinico.interface';
import { HistorialClinicoService } from './historial-clinico.service';

@Controller('historialclinico')
export class HistorialClinicoController {
    constructor(private readonly historialClinicoService: HistorialClinicoService) { }

   
    @Get()
    async getAllPersonas(): Promise<HistorialClinicoEntity[]> {
        return await this.historialClinicoService.getAllHistoriales();
    }  

    @Post()
    async addHistorial(@Body() historial: HistorialClinicoClinica): Promise<HistorialClinicoEntity> {
        return await this.historialClinicoService.addHistorial(historial)
    }

    @Put('/changeUser')
    async editarHistorial(@Body() requestBody) {
        return await this.historialClinicoService.editarHistorial(requestBody)
    }


    @Delete(':id')
    async deletePersona(@Param() params) {
        return await this.historialClinicoService.deleteHistorial(params.id)
    }

}
