import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CitasService } from './citas.service';

describe('Appointment management permissions', () => {
  const query = jest.fn();
  const transaction = jest.fn(async work => work({ query }));
  const service = new CitasService({ transaction } as unknown as DataSource);
  const input = { idServicio: 1, idCliente: 4, idMedico: 2, fechaInicio: '2031-02-03T16:00', duracion: 30 };

  beforeEach(() => {
    jest.clearAllMocks();
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT idCita, idMedico FROM cita WHERE idCita')) return [{ idCita: 7, idMedico: 2 }];
      if (sql.includes('FOR UPDATE')) return [{ idRolNativo: 2 }];
      if (sql.includes('FROM cita') || sql.includes('vacaciones_medico')) return [];
      if (sql.includes('FROM servicio')) return [{ idServicio: 1 }];
      if (sql.includes('FROM persona')) return [{ idPersona: 4, idRolNativo: 4 }];
      return { affectedRows: 1 };
    });
  });

  it('lets a doctor update and delete their own appointment', async () => {
    const doctor = { idPersona: 2, idRolNativo: 2 };
    await expect(service.save(doctor, input, 7)).resolves.toEqual({ idCita: 7 });
    await expect(service.delete(doctor, 7)).resolves.toBeUndefined();
    expect(query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM cita'), [7]);
  });

  it('rejects editing, deleting or checking another doctor’s appointment', async () => {
    const doctor = { idPersona: 3, idRolNativo: 2 };
    const forged = { ...input, idMedico: 3 };
    await expect(service.save(doctor, forged, 7)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.delete(doctor, 7)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.check(doctor, { ...forged, idCita: 7 })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.check(doctor, { ...forged, fechaInicio: '2031-02-03T03:00', idCita: 7 })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.slots(doctor, { fecha: '2031-02-03', idMedico: 3, duracion: 30, idCita: 7 })).rejects.toBeInstanceOf(ForbiddenException);
    expect(query.mock.calls.some(([sql]) => sql.includes('UPDATE cita') || sql.includes('DELETE FROM cita'))).toBe(false);
  });

  it('does not allow a doctor to reassign an appointment to another doctor', async () => {
    await expect(service.save({ idPersona: 2, idRolNativo: 2 }, { ...input, idMedico: 3 }, 7))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it.each([1, 3])('allows role %i to edit and delete appointments for any doctor', async role => {
    const actor = { idPersona: 8, idRolNativo: role };
    await expect(service.save(actor, { ...input, idMedico: 3 }, 7)).resolves.toEqual({ idCita: 7 });
    await expect(service.delete(actor, 7)).resolves.toBeUndefined();
  });

  it('rejects patients and reports missing appointments', async () => {
    await expect(service.save({ idPersona: 4, idRolNativo: 4 }, input, 7)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.delete({ idPersona: 4, idRolNativo: 4 }, 7)).rejects.toBeInstanceOf(ForbiddenException);
    query.mockResolvedValueOnce([]);
    await expect(service.delete({ idPersona: 1, idRolNativo: 1 }, 7)).rejects.toBeInstanceOf(NotFoundException);
    query.mockResolvedValueOnce([]);
    await expect(service.save({ idPersona: 2, idRolNativo: 2 }, input, 7)).rejects.toBeInstanceOf(NotFoundException);
  });
});
