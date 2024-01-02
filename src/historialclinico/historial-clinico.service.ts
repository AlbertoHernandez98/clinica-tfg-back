/*
https://docs.nestjs.com/providers#services
*/

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HistorialClinicoEntity } from './historial-clinico.entity';
import { HistorialClinicoClinica } from './historial-clinico.interface';


@Injectable()
export class HistorialClinicoService {
  constructor(
    @InjectRepository(HistorialClinicoEntity)
    private historialClinicoRepository: Repository<HistorialClinicoEntity>,
  ) {}

  async findByIdHistorial(idHistorialClinico: number): Promise<HistorialClinicoEntity | undefined> {
    return this.historialClinicoRepository.findOne({ where: { idHistorialClinico } });
  }


  async addHistorial(historial: HistorialClinicoClinica): Promise<any> {
    let newHistorial = new HistorialClinicoEntity();
    newHistorial.idHistorialClinico = historial.idHistorialClinico;
    newHistorial.comentarios = historial.comentarios;
    newHistorial.fecha = historial.fecha;
    newHistorial.idCliente = historial.idCliente;
    newHistorial.idMedico = historial.idMedico;
    newHistorial.idServicio = historial.idServicio;

    const item = await this.historialClinicoRepository.save(newHistorial);

    return item;
  }

  getAllHistoriales(): Promise<HistorialClinicoEntity[]> {
    return this.historialClinicoRepository.find();
  }


  async editarHistorial(requestBody) {
  //   const { oldUsername, username, password, email, idRolNativo, dni, telefono, domicilio } = requestBody;

  //     const persona = await this.historialClinicoRepository.findOneBy({
  //       idCliente: idCliente,
  //     });
      
  //     if(persona) {
  //       persona.username = username;
  //       persona.password = password;
  //       persona.email = email;
  //       persona.idRolNativo = idRolNativo;
  //       persona.dni = dni;
  //       persona.telefono = telefono;
  //       persona.domicilio = domicilio;
  //       await this.historialClinicoRepository.save(persona);
  //     } else {
  //       throw new Error('Las persona no ha sido encontrada, intenta de nuevo');
  //     }

  }

  async deleteHistorial(id: number): Promise<void> {
    await this.historialClinicoRepository.delete(id);
  }
}
