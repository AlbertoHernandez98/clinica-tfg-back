import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CitasService } from './citas.service';
import { clinicToday } from './horario';

describe('Appointment date restrictions', () => {
  const query = jest.fn();
  const transaction = jest.fn(async work => work({ query }));
  const service = new CitasService({ transaction } as unknown as DataSource);
  const actor = { idPersona: 2, idRolNativo: 2 };
  const appointment = { idServicio: 1, idCliente: 4, idMedico: 2, fechaInicio: '2031-02-03T16:00', duracion: 30 };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2031-02-04T11:00:00Z'));
    jest.clearAllMocks();
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT idCita, idMedico FROM cita WHERE idCita')) return [{ idCita: 9, idMedico: 2 }];
      if (sql.includes('SELECT idPersona, idRolNativo FROM persona')) return [{ idPersona: 4, idRolNativo: 4 }];
      if (sql.includes('FOR UPDATE')) return [{ idRolNativo: 2 }];
      if (sql.includes('FROM cita') || sql.includes('vacaciones_medico')) return [];
      if (sql.includes('FROM servicio')) return [{ idServicio: 1 }];
      if (sql.includes('FROM persona')) return [{ idPersona: 4, idRolNativo: 4 }];
      if (sql.includes('INSERT INTO cita')) return { insertId: 7 };
      return { affectedRows: 1 };
    });
  });

  afterEach(() => jest.useRealTimers());

  it('rejects creating or checking slots and availability for yesterday', async () => {
    await expect(service.save(actor, appointment)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.check(actor, appointment)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.slots(actor, { fecha: '2031-02-03', idMedico: 2, duracion: 30 })).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('allows appointments today and later', async () => {
    await expect(service.save(actor, { ...appointment, fechaInicio: '2031-02-04T10:00' })).resolves.toEqual({ idCita: 7 });
    await expect(service.save(actor, { ...appointment, fechaInicio: '2031-02-05T16:00' })).resolves.toEqual({ idCita: 7 });
  });

  it('keeps existing past appointments editable', async () => {
    await expect(service.save(actor, appointment, 9)).resolves.toEqual({ idCita: 9 });
    await expect(service.check(actor, { ...appointment, idCita: 9 })).resolves.toEqual({ disponible: true });
    await expect(service.slots(actor, { fecha: '2031-02-03', idMedico: 2, duracion: 30, idCita: 9 })).resolves.toHaveProperty('huecos');
  });

  it('uses Madrid calendar dates even around midnight', () => {
    expect(clinicToday(new Date('2031-02-03T23:30:00Z'))).toBe('2031-02-04');
    expect(clinicToday(new Date('2031-08-03T22:30:00Z'))).toBe('2031-08-04');
  });
});
