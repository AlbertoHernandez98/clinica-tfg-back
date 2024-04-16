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
    async getAllCitas(): Promise<CitasEntity[]> {
        return await this.citasService.getAllCitas();
    }  

    @Post()
    async addCita(@Body() requestBody: CitasClinica): Promise<CitasEntity> {
        return await this.citasService.addCita(requestBody)
    }

    @Put('/changeCita')
    async editarCita(@Body() requestBody) {
        return await this.citasService.editarCita(requestBody)
    }

    @Delete(':id')
    async deleteCita(@Param() params) {
        return await this.citasService.deleteCita(params.id)
    }

}
