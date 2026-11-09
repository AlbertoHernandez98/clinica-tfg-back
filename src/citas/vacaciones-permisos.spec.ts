import { ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CitasService } from './citas.service';

describe('Vacation permissions', () => {
  const query = jest.fn();
  const transaction = jest.fn(async work => work({ query }));
  const service = new CitasService({ query, transaction } as unknown as DataSource);
  const period = { fechaInicio: '2031-02-03', fechaFin: '2031-02-07' };

  beforeEach(() => {
    jest.clearAllMocks();
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FOR UPDATE')) return [{ idRolNativo: 3 }];
      if (sql.includes('INSERT INTO vacaciones_medico')) return { insertId: 5 };
      if (sql.includes('DELETE FROM vacaciones_medico')) return { affectedRows: 1 };
      return [];
    });
  });

  it('allows receptionists to list, add and remove only their own holidays', async () => {
    const receptionist = { idPersona: 3, idRolNativo: 3 };
    await expect(service.holidays(receptionist, 3)).resolves.toEqual([]);
    await expect(service.addHoliday(receptionist, 3, period)).resolves.toEqual({ idVacacion: 5, citasExistentes: 0 });
    expect(query).not.toHaveBeenCalledWith(expect.stringContaining('SELECT COUNT(*) AS total FROM cita'), expect.anything());
    await expect(service.deleteHoliday(receptionist, 3, 5)).resolves.toBeUndefined();
    expect(query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM vacaciones_medico'), [3, 5]);
  });

  it.each([2, 3])('rejects role %i reading or modifying another person’s holidays', async role => {
    const actor = { idPersona: 3, idRolNativo: role };
    await expect(service.holidays(actor, 2)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.addHoliday(actor, 2, period)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.deleteHoliday(actor, 2, 5)).rejects.toBeInstanceOf(ForbiddenException);
    expect(query).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it.each([1, 4])('rejects role %i even for its own identifier', async role => {
    const actor = { idPersona: 3, idRolNativo: role };
    await expect(service.holidays(actor, 3)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.addHoliday(actor, 3, period)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.deleteHoliday(actor, 3, 5)).rejects.toBeInstanceOf(ForbiddenException);
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects a role changed before the transaction obtains the lock', async () => {
    query.mockResolvedValueOnce([{ idRolNativo: 4 }]);
    await expect(service.addHoliday({ idPersona: 3, idRolNativo: 3 }, 3, period)).rejects.toBeInstanceOf(ForbiddenException);
    expect(query).not.toHaveBeenCalledWith(expect.stringContaining('INSERT INTO vacaciones_medico'), expect.anything());
  });
});
