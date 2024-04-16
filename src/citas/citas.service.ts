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
    private citasRepository: Repository<CitasEntity>,
  ) {}


  async addCita(cita: CitasClinica): Promise<any> {
    let newCita = new CitasEntity();

    newCita.fechaInicio = cita.fechaInicio;
    newCita.idCliente = cita.idCliente;
    newCita.idMedico = cita.idMedico;
    newCita.idServicio = cita.idServicio;
    newCita.duracion = cita.duracion;

    const item = await this.citasRepository.save(newCita);

    return item;
  }

  getAllCitas(): Promise<CitasEntity[]> {
    return this.citasRepository.find();
  }

  async editarCita(requestBody) {
    const { idCliente, idCita, idServicio, idMedico, duracion, fechaInicio, fechaFin } = requestBody;

      const persona = await this.citasRepository.findOneBy({
        idCliente: idCliente
      });
      
      if(persona) {
        persona.idCliente = idCliente;
        persona.idCita = idCita;
        persona.idMedico = idMedico;
        persona.idServicio = idServicio;
        persona.duracion = duracion;
        persona.fechaInicio = fechaInicio;
        await this.citasRepository.save(persona);
      } else {
        throw new Error('Las persona no ha sido encontrada, intenta de nuevo');
      }
  }

  async deleteCita(id: number): Promise<void> {
    await this.citasRepository.delete(id);
  }
}
