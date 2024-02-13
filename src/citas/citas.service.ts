/*
https://docs.nestjs.com/providers#services
*/

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CitasEntity } from './citas.entity';
import { CitasClinica } from './citas.interface';


@Injectable()
export class CitasService {
  constructor(
    @InjectRepository(CitasEntity)
    private CitasRepository: Repository<CitasEntity>,
  ) {}


  async addCita(historial: CitasClinica): Promise<any> {
    let newCita = new CitasEntity();

    newCita.fecha = historial.fecha;
    newCita.idCliente = historial.idCliente;
    newCita.idMedico = historial.idMedico;
    newCita.historial = historial.historial;
    newCita.idServicio = historial.idServicio;

    const item = await this.CitasRepository.save(newCita);

    return item;
  }

  getAllCitas(): Promise<CitasEntity[]> {
    return this.CitasRepository.find();
  }


  async deleteCita(id: number): Promise<void> {
    await this.CitasRepository.delete(id);
  }
}
