/*
https://docs.nestjs.com/providers#services
*/

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MedicoHasServicioEntity } from './medico-has-servicio.entity';



@Injectable()
export class MedicoHasServicioService {
  constructor(
    @InjectRepository(MedicoHasServicioEntity)
    private medicoHasServicioRepository: Repository<MedicoHasServicioEntity>,
  ) {}


  getAllMedicoHasServicio(): Promise<MedicoHasServicioEntity[]> {
    return this.medicoHasServicioRepository.find();
  }

  async replace(actor: { idRolNativo: number }, doctorValue: unknown, values: unknown) {
    if (![1, 3].includes(actor.idRolNativo)) throw new ForbiddenException();
    const parseId = (value: unknown) => {
      if ((typeof value !== 'number' && (typeof value !== 'string' || !/^\d+$/.test(value))) ||
          !Number.isSafeInteger(Number(value)) || Number(value) < 0 || Number(value) > 4294967295) {
        throw new BadRequestException('Identificador inválido');
      }
      return Number(value);
    };
    const doctor = parseId(doctorValue);
    if (!Array.isArray(values)) throw new BadRequestException('Lista de servicios inválida');
    const ids = values.map(parseId);
    if (new Set(ids).size !== ids.length) throw new BadRequestException('Servicios duplicados');
    return this.medicoHasServicioRepository.manager.transaction(async manager => {
      const people = await manager.query('SELECT idRolNativo FROM persona WHERE idPersona = ? FOR UPDATE', [doctor]);
      if (!people.length || Number(people[0].idRolNativo) !== 2) throw new NotFoundException('Médico no encontrado');
      for (const id of ids) {
        const services = await manager.query('SELECT idServicio FROM servicio WHERE idServicio = ?', [id]);
        if (!services.length) throw new BadRequestException('Servicio no válido');
      }
      await manager.query('DELETE FROM medico_has_servicio WHERE idPersona = ?', [doctor]);
      for (const id of ids) {
        await manager.query('INSERT INTO medico_has_servicio (idPersona, idServicio) VALUES (?, ?)', [doctor, id]);
      }
      return { idPersona: doctor, servicios: ids };
    });
  }
}
