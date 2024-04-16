/*
https://docs.nestjs.com/providers#services
*/

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MedicoHasServicioEntity } from './medico-has-servicio.entity';
import { MedicoHasServicioClinica } from './medico-has-servicio.interface';



@Injectable()
export class MedicoHasServicioService {
  constructor(
    @InjectRepository(MedicoHasServicioEntity)
    private medicoHasServicioRepository: Repository<MedicoHasServicioEntity>,
  ) {}


  getAllMedicoHasServicio(): Promise<MedicoHasServicioEntity[]> {
    return this.medicoHasServicioRepository.find();
  }

}
