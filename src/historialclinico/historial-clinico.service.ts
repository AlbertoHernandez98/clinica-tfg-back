import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

type Actor = { idPersona: number; idRolNativo: number };
type Input = { idCliente: unknown; idServicio: unknown; idCita?: unknown; comentarios: unknown };

@Injectable()
export class HistorialClinicoService {
  constructor(private readonly db: DataSource) {}

  private id(value: unknown): number {
    if ((typeof value !== 'number' && (typeof value !== 'string' || !/^\d+$/.test(value))) ||
        !Number.isSafeInteger(Number(value)) || Number(value) < 1) {
      throw new BadRequestException('Identificador inválido');
    }
    return Number(value);
  }

  async patient(actor: Actor, patientValue: unknown) {
    if (![1, 2, 3, 4].includes(actor.idRolNativo)) throw new ForbiddenException();
    const patient = this.id(patientValue);
    if (actor.idRolNativo === 4 && actor.idPersona !== patient) throw new ForbiddenException();
    const people = await this.db.query('SELECT idPersona, nombre, apellidos FROM persona WHERE idPersona = ? AND idRolNativo = 4', [patient]);
    if (!people.length) throw new NotFoundException('Paciente no encontrado');
    const entries = await this.db.query(
      `SELECT h.idHistorialClinico, h.comentarios, h.fecha, h.hora, h.idCita,
              h.idMedico, h.idServicio, p.nombre AS autorNombre, p.apellidos AS autorApellidos, s.servicio
       FROM historialclinico h
       LEFT JOIN persona p ON p.idPersona = h.idMedico
       LEFT JOIN servicio s ON s.idServicio = h.idServicio
       WHERE h.idCliente = ? ORDER BY h.idHistorialClinico DESC`, [patient],
    );
    return { paciente: people[0], entradas: entries };
  }

  async appointment(actor: Actor, appointmentValue: unknown) {
    if (![1, 2, 3].includes(actor.idRolNativo)) throw new ForbiddenException();
    const appointment = this.id(appointmentValue);
    const rows = await this.db.query(
      'SELECT idCita, idCliente, idServicio FROM cita WHERE idCita = ?', [appointment],
    );
    if (!rows.length) throw new NotFoundException('Cita no encontrada');
    return rows[0];
  }

  async add(actor: Actor, input: Input) {
    if (![1, 2].includes(actor.idRolNativo)) throw new ForbiddenException();
    if (!input || typeof input !== 'object') throw new BadRequestException('Solicitud inválida');
    const patient = this.id(input.idCliente);
    const service = this.id(input.idServicio);
    const appointment = input.idCita === undefined ? undefined : this.id(input.idCita);
    if (typeof input.comentarios !== 'string' || !input.comentarios.trim() || input.comentarios.length > 10000) {
      throw new BadRequestException('Comentarios inválidos');
    }
    const comments = input.comentarios.trim();
    return this.db.transaction(async manager => {
      const people = await manager.query('SELECT idPersona FROM persona WHERE idPersona = ? AND idRolNativo = 4', [patient]);
      if (!people.length) throw new NotFoundException('Paciente no encontrado');
      if (appointment !== undefined) {
        const rows = await manager.query('SELECT idCliente, idServicio FROM cita WHERE idCita = ? FOR UPDATE', [appointment]);
        if (!rows.length) throw new NotFoundException('Cita no encontrada');
        if (Number(rows[0].idCliente) !== patient || Number(rows[0].idServicio) !== service) {
          throw new BadRequestException('La cita no corresponde al paciente y servicio indicados');
        }
      } else {
        const services = await manager.query('SELECT idServicio FROM servicio WHERE idServicio = ?', [service]);
        if (!services.length) throw new BadRequestException('Servicio no válido');
      }
      const result = await manager.query(
        `INSERT INTO historialclinico (comentarios, fecha, hora, idCliente, idMedico, idServicio, idCita)
         VALUES (?, DATE_FORMAT(CURRENT_DATE(), '%Y-%m-%d'), TIME_FORMAT(CURRENT_TIME(), '%H:%i:%s'), ?, ?, ?, ?)`,
        [comments, patient, this.id(actor.idPersona), service, appointment === undefined ? null : appointment],
      );
      return { idHistorialClinico: result.insertId };
    });
  }
}
