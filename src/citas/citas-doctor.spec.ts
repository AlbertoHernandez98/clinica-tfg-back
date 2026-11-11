import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CitasService } from './citas.service';

describe('Doctor appointment creation', () => {
  const doctor = { idPersona: 2, idRolNativo: 2 };
  const appointment = { idServicio: 1, idCliente: 4, idMedico: 2, fechaInicio: '2031-02-03T16:00', duracion: 30 };
  const query = jest.fn();
  const transaction = jest.fn(async work => work({ query }));
  const service = new CitasService({ transaction } as unknown as DataSource);

  beforeEach(() => {
    jest.clearAllMocks();
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT idPersona, idRolNativo FROM persona')) return [{ idPersona: 4, idRolNativo: 4 }];
      if (sql.includes('FOR UPDATE')) return [{ idRolNativo: 2 }];
      if (sql.includes('FROM cita') || sql.includes('vacaciones_medico')) return [];
      if (sql.includes('FROM servicio') || sql.includes('FROM medico_has_servicio')) return [{ idServicio: 1 }];
      if (sql.includes('FROM persona')) return [{ idPersona: 4, idRolNativo: 4 }];
      if (sql.includes('INSERT INTO cita')) return { insertId: 7 };
      throw new Error('Unexpected query');
    });
  });

  it('creates an appointment for a patient with the authenticated doctor', async () => {
    await expect(service.save(doctor, appointment)).resolves.toEqual({ idCita: 7 });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO cita'), [1, 4, 2, '2031-02-03', '16:00:00', 30]);
  });

  it.each([15, 45, 75, 120, null, true])('rejects duration %p when creating, editing or checking', async duration => {
    const invalid = { ...appointment, duracion: duration };
    await expect(service.save(doctor, invalid)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.save(doctor, invalid, 7)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.check(doctor, invalid)).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it.each([30, 60, 90])('accepts an appointment of %i minutes', async duration => {
    await expect(service.save(doctor, { ...appointment, duracion: duration })).resolves.toEqual({ idCita: 7 });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO cita'), [1, 4, 2, '2031-02-03', '16:00:00', duration]);
  });

  it('rejects selecting another doctor when creating or checking an appointment', async () => {
    const otherDoctor = { ...appointment, idMedico: 3 };
    await expect(service.save(doctor, otherDoctor)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.check(doctor, otherDoctor)).rejects.toBeInstanceOf(ForbiddenException);
    expect(transaction).not.toHaveBeenCalled();
  });

  [1, 3].forEach(role => {
    it(`allows role ${role} to create and modify an appointment for any doctor`, async () => {
      const staff = { idPersona: 8, idRolNativo: role };
      const otherDoctor = { ...appointment, idMedico: 3 };
      await expect(service.save(staff, otherDoctor)).resolves.toEqual({ idCita: 7 });
      query.mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT idCita, idMedico FROM cita WHERE idCita')) return [{ idCita: 7, idMedico: 3 }];
        if (sql.includes('SELECT idPersona, idRolNativo FROM persona')) return [{ idPersona: 4, idRolNativo: 4 }];
        if (sql.includes('FOR UPDATE')) return [{ idRolNativo: 2 }];
        if (sql.includes('FROM cita') || sql.includes('vacaciones_medico')) return [];
        if (sql.includes('FROM servicio') || sql.includes('FROM medico_has_servicio')) return [{ idServicio: 1 }];
        if (sql.includes('FROM persona')) return [{ idPersona: 4, idRolNativo: 4 }];
        if (sql.includes('UPDATE cita')) return { affectedRows: 1 };
        throw new Error('Unexpected query');
      });
      await expect(service.save(staff, otherDoctor, 7)).resolves.toEqual({ idCita: 7 });
    });
  });

  it('rejects creating an appointment for a non-patient', async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT idPersona, idRolNativo FROM persona')) return [{ idPersona: 4, idRolNativo: 1 }];
      if (sql.includes('FOR UPDATE')) return [{ idRolNativo: 2 }];
      if (sql.includes('FROM cita') || sql.includes('vacaciones_medico')) return [];
      if (sql.includes('FROM servicio') || sql.includes('FROM medico_has_servicio')) return [{ idServicio: 1 }];
      if (sql.includes('FROM persona')) return [{ idPersona: 4, idRolNativo: 1 }];
      throw new Error('Unexpected query');
    });
    await expect(service.save(doctor, appointment)).rejects.toBeInstanceOf(BadRequestException);
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO cita'))).toBe(false);
  });
});
