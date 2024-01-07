/*
https://docs.nestjs.com/controllers#controllers
*/

import { Controller, Get, Delete, Post, Put, Param, Body } from '@nestjs/common';
import { ServiciosEntity } from './servicios.entity';
import { ServiciosService } from './servicios.service';


@Controller('servicio')
export class ServiciosController {
    constructor(private readonly serviciosService: ServiciosService) { }

    @Get()
    async getAllServicios(): Promise<ServiciosEntity[]> {
        return await this.serviciosService.getAllServicios();
    } 
}
