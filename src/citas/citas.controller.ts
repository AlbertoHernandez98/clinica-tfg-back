/*
https://docs.nestjs.com/controllers#controllers
*/

import { Controller, Get, Delete, Post, Put, Param, Body } from '@nestjs/common';
import { CitasEntity } from './citas.entity';
import { CitasClinica } from './citas.interface';
import { CitasService } from './citas.service';

@Controller('citas')
export class CitasController {
    constructor(private readonly citasService: CitasService) { }

   
    @Get()
    async getAllPersonas(): Promise<CitasEntity[]> {
        return await this.citasService.getAllCitas();
    }  

    @Post()
    async addHistorial(@Body() historial: CitasClinica): Promise<CitasEntity> {
        return await this.citasService.addCita(historial)
    }

    @Delete(':id')
    async deletePersona(@Param() params) {
        return await this.citasService.deleteCita(params.id)
    }

}
