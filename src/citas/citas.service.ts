import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { clinicHours, clinicToday, withinClinicHours, workingDateRange } from './horario';

type Actor = { idPersona: number; idRolNativo: number };
type AppointmentInput = { idServicio: unknown; idCliente: unknown; idMedico: unknown; fechaInicio: unknown; duracion: unknown };

@Injectable()
export class CitasService {
  constructor(private readonly db: DataSource) {}

  private id(value: unknown): number {
    const n = Number(value);
    if ((typeof value !== 'number' && (typeof value !== 'string' || !/^\d+$/.test(value))) ||
        !Number.isSafeInteger(n) || n < 0) throw new BadRequestException('Identificador inválido');
    return n;
  }

  private date(value: unknown): string {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException('Fecha inválida');
    const parsed = new Date(`${value}T00:00:00Z`);
    if (Number(value.slice(0, 4)) < 1000 || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new BadRequestException('Fecha inválida');
    return value;
  }

  private duration(value: unknown): number {
    if ((typeof value !== 'number' && (typeof value !== 'string' || !/^\d+$/.test(value))) ||
        ![30, 60, 90].includes(Number(value))) {
      throw new BadRequestException('La duración debe ser de 30, 60 o 90 minutos');
    }
    return Number(value);
  }

  private appointment(input: AppointmentInput) {
    if (!input || typeof input !== 'object') throw new BadRequestException('Cita inválida');
    const raw = input.fechaInicio;
    if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(raw)) {
      throw new BadRequestException('Fecha y hora inválidas');
    }
    this.date(raw.slice(0, 10));
    const duracion = this.duration(input.duracion);
    return {
      idServicio: this.id(input.idServicio), idCliente: this.id(input.idCliente), idMedico: this.id(input.idMedico),
      fecha: raw.slice(0, 10), hora: raw.slice(11) + (raw.length === 16 ? ':00' : ''), duracion,
    };
  }

  private async lockDoctor(manager: EntityManager, id: number): Promise<void> {
    const rows = await manager.query('SELECT idRolNativo FROM persona WHERE idPersona = ? FOR UPDATE', [id]);
    if (!rows.length || rows[0].idRolNativo !== 2) throw new BadRequestException('Médico no válido');
  }

  private async authorizeAppointment(manager: EntityManager, actor: Actor, id: number): Promise<void> {
    const rows = await manager.query('SELECT idCita, idMedico FROM cita WHERE idCita = ? FOR UPDATE', [id]);
    if (!rows.length) throw new NotFoundException('Cita no encontrada');
    if (actor.idRolNativo === 2 && Number(rows[0].idMedico) !== actor.idPersona) throw new ForbiddenException();
  }

  private canManageHoliday(actor: Actor, person: number): void {
    if (![2, 3].includes(actor.idRolNativo) || actor.idPersona !== person) throw new ForbiddenException();
  }

  async list(actor: Actor) {
    if (![1, 2, 3].includes(actor.idRolNativo)) throw new ForbiddenException();
    return this.db.query("SELECT idCita, idServicio, idCliente, idMedico, duracion, CONCAT(fecha, 'T', hora) AS fechaInicio FROM cita");
  }

  async myAppointments(actor: Actor) {
    if (actor.idRolNativo !== 4) throw new ForbiddenException();
    const patient = this.id(actor.idPersona);
    return this.db.query(
      `SELECT c.idCita, DATE_FORMAT(c.fecha, '%Y-%m-%d') AS fecha,
              TIME_FORMAT(c.hora, '%H:%i') AS hora, c.duracion,
              p.nombre AS medicoNombre, p.apellidos AS medicoApellidos, s.servicio
       FROM cita c
       LEFT JOIN persona p ON p.idPersona = c.idMedico
       LEFT JOIN servicio s ON s.idServicio = c.idServicio
       WHERE c.idCliente = ?
       ORDER BY c.fecha IS NULL, c.fecha, c.hora IS NULL, c.hora, c.idCita`,
      [patient],
    );
  }

  async agenda(actor: Actor, inicio: unknown) {
    if (actor.idRolNativo !== 2) throw new ForbiddenException();
    const doctor = this.id(actor.idPersona);
    const start = this.date(inicio);
    return this.agendaForDoctor(this.db, doctor, start);
  }

  private async agendaForDoctor(source: DataSource | EntityManager, doctor: number, start: string) {
    const citas = await source.query(
      `SELECT c.idCita, c.idCliente, c.idServicio, c.idMedico, DATE_FORMAT(c.fecha, '%Y-%m-%d') AS fecha,
              CONCAT(DATE_FORMAT(c.fecha, '%Y-%m-%d'), 'T', TIME_FORMAT(c.hora, '%H:%i:%s')) AS fechaInicio,
              c.duracion, p.nombre, p.apellidos, s.servicio
       FROM cita c
       LEFT JOIN persona p ON p.idPersona = c.idCliente
       LEFT JOIN servicio s ON s.idServicio = c.idServicio
       WHERE c.idMedico = ? AND (
         (c.fecha >= ? AND c.fecha < DATE_ADD(?, INTERVAL 7 DAY)) OR
         (c.fecha < ? AND c.hora IS NOT NULL AND c.duracion IS NOT NULL
          AND DATE_ADD(TIMESTAMP(c.fecha, c.hora), INTERVAL c.duracion MINUTE) > ?)
       ) ORDER BY c.fecha, c.hora, c.idCita`,
      [doctor, start, start, start, start],
    );
    const vacaciones = await source.query(
      `SELECT DATE_FORMAT(fechaInicio, '%Y-%m-%d') AS fechaInicio, DATE_FORMAT(fechaFin, '%Y-%m-%d') AS fechaFin
       FROM vacaciones_medico WHERE idMedico = ? AND fechaInicio < DATE_ADD(?, INTERVAL 7 DAY) AND fechaFin >= ?
       ORDER BY fechaInicio`,
      [doctor, start, start],
    );
    const sinFecha = await source.query(
      'SELECT COUNT(*) AS total FROM cita WHERE idMedico = ? AND fecha IS NULL', [doctor],
    );
    return { citas, vacaciones, sinFecha: Number(sinFecha[0].total) };
  }

  async managedAgenda(actor: Actor, inicio: unknown, idMedico: unknown) {
    if (![1, 2, 3].includes(actor.idRolNativo)) throw new ForbiddenException();
    const doctor = this.id(idMedico);
    if (actor.idRolNativo === 2 && doctor !== actor.idPersona) throw new ForbiddenException();
    const start = this.date(inicio);
    return this.db.transaction(async manager => {
      await this.lockDoctor(manager, doctor);
      const agenda = await this.agendaForDoctor(manager, doctor, start);
      const huecos: Record<string, string[]> = {};
      const startDate = new Date(`${start}T00:00:00Z`);
      for (let day = 0; day < 7; day++) {
        const date = new Date(startDate.getTime() + day * 86400000).toISOString().slice(0, 10);
        huecos[date] = date < clinicToday() ? [] : await this.availableSlots(manager, doctor, date, 30);
      }
      return { ...agenda, huecos };
    });
  }

  private async available(manager: EntityManager, item: ReturnType<CitasService['appointment']>, appointmentId?: number): Promise<boolean> {
    const start = `${item.fecha} ${item.hora}`;
    const conflicts = await manager.query(
      `SELECT idCita FROM cita WHERE idMedico = ? AND idCita <> ?
       AND (duracion IS NULL OR fecha IS NULL OR hora IS NULL OR
       (TIMESTAMP(fecha, hora) < DATE_ADD(?, INTERVAL ? MINUTE)
       AND DATE_ADD(TIMESTAMP(fecha, hora), INTERVAL duracion MINUTE) > ?)) LIMIT 1`,
      [item.idMedico, appointmentId ?? -1, start, item.duracion, start],
    );
    const holidays = await manager.query(
      `SELECT idVacacion FROM vacaciones_medico WHERE idMedico = ?
       AND TIMESTAMP(fechaInicio) < DATE_ADD(?, INTERVAL ? MINUTE)
       AND DATE_ADD(TIMESTAMP(fechaFin), INTERVAL 1 DAY) > ? LIMIT 1`,
      [item.idMedico, start, item.duracion, start],
    );
    return !conflicts.length && !holidays.length;
  }

  private async patientAvailable(manager: EntityManager, item: ReturnType<CitasService['appointment']>, appointmentId?: number): Promise<boolean> {
    const start = `${item.fecha} ${item.hora}`;
    const conflicts = await manager.query(
      `SELECT idCita FROM cita WHERE idCliente = ? AND idCita <> ?
       AND (duracion IS NULL OR fecha IS NULL OR hora IS NULL OR
       (TIMESTAMP(fecha, hora) < DATE_ADD(?, INTERVAL ? MINUTE)
       AND DATE_ADD(TIMESTAMP(fecha, hora), INTERVAL duracion MINUTE) > ?)) LIMIT 1`,
      [item.idCliente, appointmentId ?? -1, start, item.duracion, start],
    );
    return !conflicts.length;
  }

  async check(actor: Actor, input: AppointmentInput & { idCita?: unknown }) {
    if (![1, 2, 3].includes(actor.idRolNativo)) throw new ForbiddenException();
    const item = this.appointment(input);
    const id = input.idCita === undefined ? undefined : this.id(input.idCita);
    if (id === undefined && item.fecha < clinicToday()) throw new BadRequestException('No se pueden crear citas en días anteriores a hoy');
    if (actor.idRolNativo === 2 && actor.idPersona !== item.idMedico) throw new ForbiddenException();
    const outsideHours = !withinClinicHours(item.fecha, item.hora, item.duracion);
    if (outsideHours && (id === undefined || actor.idRolNativo !== 2)) return { disponible: false, motivo: 'fuera_horario' };
    return this.db.transaction(async manager => {
      if (id !== undefined && actor.idRolNativo === 2) await this.authorizeAppointment(manager, actor, id);
      if (outsideHours) return { disponible: false, motivo: 'fuera_horario' };
      await this.lockDoctor(manager, item.idMedico);
      if (!await this.patientAvailable(manager, item, id)) return { disponible: false, motivo: 'paciente_ocupado' };
      return { disponible: await this.available(manager, item, id) };
    });
  }

  async slots(actor: Actor, input: { fecha: unknown; idMedico: unknown; duracion: unknown; idCita?: unknown; idCliente?: unknown }) {
    if (![1, 2, 3].includes(actor.idRolNativo)) throw new ForbiddenException();
    if (!input || typeof input !== 'object') throw new BadRequestException('Solicitud inválida');
    const date = this.date(input.fecha);
    const doctor = this.id(input.idMedico);
    const id = input.idCita === undefined ? undefined : this.id(input.idCita);
    const patient = input.idCliente === undefined ? undefined : this.id(input.idCliente);
    const duration = this.duration(input.duracion);
    if (id === undefined && date < clinicToday()) throw new BadRequestException('No se pueden crear citas en días anteriores a hoy');
    if (actor.idRolNativo === 2 && actor.idPersona !== doctor) throw new ForbiddenException();
    return this.db.transaction(async manager => {
      if (id !== undefined && actor.idRolNativo === 2) await this.authorizeAppointment(manager, actor, id);
      await this.lockDoctor(manager, doctor);
      return { huecos: await this.availableSlots(manager, doctor, date, duration, id, patient) };
    });
  }

  private async availableSlots(manager: EntityManager, doctor: number, date: string, duration: number, id?: number, patient?: number): Promise<string[]> {
    const hours = clinicHours(date);
    const result: string[] = [];
    if (hours) {
      for (let seconds = hours.opening; seconds + duration * 60 <= hours.closing; seconds += 1800) {
        const time = `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String((seconds % 3600) / 60).padStart(2, '0')}`;
        const item = { fecha: date, hora: `${time}:00`, duracion: duration, idMedico: doctor, idCliente: patient ?? 0, idServicio: 0 };
        if (await this.available(manager, item, id) && (patient === undefined || await this.patientAvailable(manager, item, id))) result.push(time);
      }
    }
    return result;
  }

  async save(actor: Actor, input: AppointmentInput, appointmentId?: number) {
    if (![1, 2, 3].includes(actor.idRolNativo)) throw new ForbiddenException();
    if (appointmentId !== undefined) appointmentId = this.id(appointmentId);
    const item = this.appointment(input);
    if (appointmentId === undefined && item.fecha < clinicToday()) throw new BadRequestException('No se pueden crear citas en días anteriores a hoy');
    if (actor.idRolNativo === 2 && actor.idPersona !== item.idMedico) throw new ForbiddenException();
    if (!withinClinicHours(item.fecha, item.hora, item.duracion)) throw new ConflictException('La cita debe estar dentro del horario de la clínica');
    return this.db.transaction(async manager => {
      if (appointmentId !== undefined) {
        await this.authorizeAppointment(manager, actor, appointmentId);
      }
      await this.lockDoctor(manager, item.idMedico);
      const patients = await manager.query('SELECT idPersona, idRolNativo FROM persona WHERE idPersona = ? FOR UPDATE', [item.idCliente]);
      if (!patients.length) throw new BadRequestException('Servicio o paciente no válido');
      if (!await this.patientAvailable(manager, item, appointmentId)) {
        throw new ConflictException({ code: 'PATIENT_CONFLICT', message: 'El paciente ya tiene otra cita en ese horario' });
      }
      if (!await this.available(manager, item, appointmentId)) throw new ConflictException('El médico no está disponible en ese horario');
      const services = await manager.query('SELECT idServicio FROM servicio WHERE idServicio = ?', [item.idServicio]);
      if (!services.length || !patients.length) throw new BadRequestException('Servicio o paciente no válido');
      const assigned = await manager.query(
        'SELECT idServicio FROM medico_has_servicio WHERE idPersona = ? AND idServicio = ?',
        [item.idMedico, item.idServicio],
      );
      if (!assigned.length) throw new ConflictException({ code: 'SERVICE_NOT_ASSIGNED', message: 'El servicio no está asignado al médico' });
      if (actor.idRolNativo === 2 && appointmentId === undefined && patients[0].idRolNativo !== 4) {
        throw new BadRequestException('La persona seleccionada no es un paciente');
      }
      if (appointmentId === undefined) {
        const result = await manager.query(
          'INSERT INTO cita (idServicio, idCliente, idMedico, fecha, hora, duracion) VALUES (?, ?, ?, ?, ?, ?)',
          [item.idServicio, item.idCliente, item.idMedico, item.fecha, item.hora, item.duracion],
        );
        return { idCita: result.insertId };
      }
      await manager.query(
        'UPDATE cita SET idServicio = ?, idCliente = ?, idMedico = ?, fecha = ?, hora = ?, duracion = ? WHERE idCita = ?',
        [item.idServicio, item.idCliente, item.idMedico, item.fecha, item.hora, item.duracion, appointmentId],
      );
      return { idCita: appointmentId };
    });
  }

  async delete(actor: Actor, id: number) {
    if (![1, 2, 3].includes(actor.idRolNativo)) throw new ForbiddenException();
    const appointmentId = this.id(id);
    await this.db.transaction(async manager => {
      await this.authorizeAppointment(manager, actor, appointmentId);
      await manager.query('DELETE FROM cita WHERE idCita = ?', [appointmentId]);
    });
  }

  async holidays(actor: Actor, doctorValue: number) {
    const doctor = this.id(doctorValue);
    this.canManageHoliday(actor, doctor);
    return this.db.query("SELECT idVacacion, idMedico, DATE_FORMAT(fechaInicio, '%Y-%m-%d') AS fechaInicio, DATE_FORMAT(fechaFin, '%Y-%m-%d') AS fechaFin FROM vacaciones_medico WHERE idMedico = ? ORDER BY fechaInicio", [doctor]);
  }

  async addHoliday(actor: Actor, doctorValue: number, body: { fechaInicio: unknown; fechaFin: unknown }) {
    const doctor = this.id(doctorValue);
    this.canManageHoliday(actor, doctor);
    const initial = this.date(body.fechaInicio);
    const final = this.date(body.fechaFin);
    if (final < initial) throw new BadRequestException('El fin debe ser posterior al inicio');
    const period = workingDateRange(initial, final);
    if (!period) throw new BadRequestException('El periodo debe incluir al menos un día laborable');
    const { start, end } = period;
    return this.db.transaction(async manager => {
      const people = await manager.query('SELECT idRolNativo FROM persona WHERE idPersona = ? FOR UPDATE', [doctor]);
      if (!people.length || people[0].idRolNativo !== actor.idRolNativo) throw new ForbiddenException();
      const overlapping = await manager.query('SELECT idVacacion FROM vacaciones_medico WHERE idMedico = ? AND fechaInicio <= ? AND fechaFin >= ? LIMIT 1', [doctor, end, start]);
      if (overlapping.length) throw new ConflictException('Ya existen vacaciones en ese periodo');
      const appointments = actor.idRolNativo === 2 ? await manager.query(
        `SELECT COUNT(*) AS total FROM cita WHERE idMedico = ? AND (fecha IS NULL OR
         (WEEKDAY(fecha) < 5 AND (duracion IS NULL OR hora IS NULL OR
         (TIMESTAMP(fecha, hora) < DATE_ADD(?, INTERVAL 1 DAY)
         AND DATE_ADD(TIMESTAMP(fecha, hora), INTERVAL duracion MINUTE) > ?))))`,
        [doctor, end, start],
      ) : [{ total: 0 }];
      const result = await manager.query('INSERT INTO vacaciones_medico (idMedico, fechaInicio, fechaFin) VALUES (?, ?, ?)', [doctor, start, end]);
      return { idVacacion: result.insertId, citasExistentes: Number(appointments[0].total) };
    });
  }

  async deleteHoliday(actor: Actor, doctorValue: number, holidayValue: number) {
    const doctor = this.id(doctorValue);
    const holiday = this.id(holidayValue);
    this.canManageHoliday(actor, doctor);
    const result = await this.db.query('DELETE FROM vacaciones_medico WHERE idMedico = ? AND idVacacion = ?', [doctor, holiday]);
    if (!result.affectedRows) throw new NotFoundException('Vacaciones no encontradas');
  }
}
