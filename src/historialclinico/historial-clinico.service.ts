import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuditoriaHistorialService } from './auditoria-historial.service';

type Actor = { idPersona: number; idRolNativo: number };
type Input = { idCliente: unknown; idServicio: unknown; idCita?: unknown; comentarios: unknown };
type OperationInput = { comentarios?: unknown; motivo: unknown };

@Injectable()
export class HistorialClinicoService {
  constructor(private readonly db: DataSource, private readonly audit: AuditoriaHistorialService) {}

  private id(value: unknown): number {
    if ((typeof value !== 'number' && (typeof value !== 'string' || !/^\d+$/.test(value))) ||
        !Number.isSafeInteger(Number(value)) || Number(value) < 1 || Number(value) > 4294967295) {
      throw new BadRequestException('Identificador inválido');
    }
    return Number(value);
  }

  async patient(actor: Actor, patientValue: unknown) {
    if (![1, 2, 3, 4].includes(actor.idRolNativo)) throw new ForbiddenException();
    const patient = this.id(patientValue);
    if (actor.idRolNativo === 4 && actor.idPersona !== patient) throw new ForbiddenException();
    const canReadAudit = actor.idRolNativo === 1 || actor.idRolNativo === 2;
    const people = await this.db.query('SELECT idPersona, nombre, apellidos FROM persona WHERE idPersona = ? AND idRolNativo = 4', [patient]);
    if (!people.length) throw new NotFoundException('Paciente no encontrado');
    const entries = await this.db.query(
      `SELECT h.idHistorialClinico, h.comentarios, h.fecha, h.hora, h.idCita${canReadAudit ? ', h.anulada' : ''},
              h.idMedico, h.idServicio, p.nombre AS autorNombre, p.apellidos AS autorApellidos, s.servicio
       FROM historialclinico h
       LEFT JOIN persona p ON p.idPersona = h.idMedico
       LEFT JOIN servicio s ON s.idServicio = h.idServicio
       WHERE h.idCliente = ?${canReadAudit ? '' : ' AND h.anulada = 0'} ORDER BY h.idHistorialClinico DESC`, [patient],
    );
    const versions = canReadAudit
      ? await this.db.query(
        `SELECT v.idHistorialClinico, v.comentarios, v.fecha, v.hora, v.idMedico, v.idServicio, v.idCita,
                v.tipoOperacion, v.motivo, v.idUsuario, v.fechaOperacion,
                p.nombre AS usuarioNombre, p.apellidos AS usuarioApellidos
         FROM historialclinicohistorico v
         INNER JOIN historialclinico h ON h.idHistorialClinico = v.idHistorialClinico
         LEFT JOIN persona p ON p.idPersona = v.idUsuario
         WHERE h.idCliente = ? ORDER BY v.idVersionHistorial ASC`, [patient],
      )
      : [];
    const versionsByEntry = new Map<number, unknown[]>();
    versions.forEach(version => {
      const id = Number(version.idHistorialClinico);
      const history = versionsByEntry.get(id) || [];
      history.push(version);
      versionsByEntry.set(id, history);
    });
    await this.audit.record(this.db, actor, 'CONSULTA', 'PERMITIDO', patient, null);
    return {
      paciente: people[0],
      entradas: canReadAudit
        ? entries.map(entry => ({
          ...entry,
          anulada: Boolean(entry.anulada),
          versiones: versionsByEntry.get(Number(entry.idHistorialClinico)) || [],
        }))
        : entries,
    };
  }

  async appointment(actor: Actor, appointmentValue: unknown) {
    if (![1, 2, 3].includes(actor.idRolNativo)) throw new ForbiddenException();
    const appointment = this.id(appointmentValue);
    const rows = await this.db.query(
      'SELECT idCita, idCliente, idServicio FROM cita WHERE idCita = ?', [appointment],
    );
    if (!rows.length) throw new NotFoundException('Cita no encontrada');
    await this.audit.record(this.db, actor, 'CONSULTA', 'PERMITIDO', rows[0].idCliente, null);
    return rows[0];
  }

  async add(actor: Actor, input: Input) {
    if (![1, 2].includes(actor.idRolNativo)) throw new ForbiddenException();
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new BadRequestException('Solicitud inválida');
    const patient = this.id(input.idCliente);
    const service = this.id(input.idServicio);
    const appointment = input.idCita === undefined ? undefined : this.id(input.idCita);
    const comments = this.comments(input.comentarios);
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
      await this.audit.record(manager, actor, 'ALTA', 'PERMITIDO', patient, result.insertId);
      return { idHistorialClinico: result.insertId };
    });
  }

  async edit(actor: Actor, entryValue: unknown, input: OperationInput) {
    if (![1, 2].includes(actor.idRolNativo)) throw new ForbiddenException();
    const entryId = this.id(entryValue);
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new BadRequestException('Solicitud inválida');
    const comments = this.comments(input.comentarios);
    const reason = this.reason(input.motivo);

    return this.db.transaction(async manager => {
      const rows = await manager.query(
        'SELECT idHistorialClinico, comentarios, fecha, hora, idCliente, idMedico, idServicio, idCita, anulada FROM historialclinico WHERE idHistorialClinico = ? FOR UPDATE',
        [entryId],
      );
      if (!rows.length) throw new NotFoundException('Anotación no encontrada');
      const entry = rows[0];
      this.assertCanManage(actor, entry);
      if (Boolean(entry.anulada)) throw new ConflictException('No se puede editar una anotación anulada');

      await this.recordVersion(manager, entry, 'EDICION', reason, actor);
      await manager.query(
        'UPDATE historialclinico SET comentarios = ? WHERE idHistorialClinico = ?',
        [comments, entryId],
      );
      await this.audit.record(manager, actor, 'EDICION', 'PERMITIDO', entry.idCliente, entryId);
      return { idHistorialClinico: entryId };
    });
  }

  async annul(actor: Actor, entryValue: unknown, input: { motivo: unknown }) {
    if (![1, 2].includes(actor.idRolNativo)) throw new ForbiddenException();
    const entryId = this.id(entryValue);
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new BadRequestException('Solicitud inválida');
    const reason = this.reason(input.motivo);

    return this.db.transaction(async manager => {
      const rows = await manager.query(
        'SELECT idHistorialClinico, comentarios, fecha, hora, idCliente, idMedico, idServicio, idCita, anulada FROM historialclinico WHERE idHistorialClinico = ? FOR UPDATE',
        [entryId],
      );
      if (!rows.length) throw new NotFoundException('Anotación no encontrada');
      const entry = rows[0];
      this.assertCanManage(actor, entry);
      if (Boolean(entry.anulada)) throw new ConflictException('La anotación ya está anulada');

      await this.recordVersion(manager, entry, 'ANULACION', reason, actor);
      await manager.query(
        'UPDATE historialclinico SET anulada = 1 WHERE idHistorialClinico = ?',
        [entryId],
      );
      await this.audit.record(manager, actor, 'ANULACION', 'PERMITIDO', entry.idCliente, entryId);
      return { idHistorialClinico: entryId, anulada: true };
    });
  }

  private comments(value: unknown): string {
    if (typeof value !== 'string' || !value.trim() || value.length > 10000) {
      throw new BadRequestException('Comentarios inválidos');
    }
    return value.trim();
  }

  private reason(value: unknown): string {
    if (typeof value !== 'string' || !value.trim() || value.length > 1000) {
      throw new BadRequestException('El motivo es obligatorio y no puede superar 1000 caracteres');
    }
    return value.trim();
  }

  private assertCanManage(actor: Actor, entry: { idMedico: number | null }) {
    if (actor.idRolNativo === 2 && Number(entry.idMedico) !== this.id(actor.idPersona)) {
      throw new ForbiddenException();
    }
  }

  private recordVersion(
    manager: { query: (sql: string, parameters?: unknown[]) => Promise<any> },
    entry: {
      idHistorialClinico: number;
      comentarios: string;
      fecha: string | null;
      hora: string | null;
      idMedico: number | null;
      idServicio: number;
      idCita: number | null;
    },
    operation: 'EDICION' | 'ANULACION',
    reason: string,
    actor: Actor,
  ) {
    return manager.query(
      `INSERT INTO historialclinicohistorico
         (idHistorialClinico, comentarios, fecha, hora, idMedico, idServicio, idCita,
          tipoOperacion, motivo, idUsuario, fechaOperacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        entry.idHistorialClinico,
        entry.comentarios,
        entry.fecha,
        entry.hora,
        entry.idMedico,
        entry.idServicio,
        entry.idCita,
        operation,
        reason,
        this.id(actor.idPersona),
      ],
    );
  }
}
