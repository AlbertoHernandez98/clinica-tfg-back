import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CitasService } from './citas.service';
import { withinClinicHours, workingDateRange } from './horario';

describe('Clinic working hours', () => {
  const query = jest.fn();
  const transaction = jest.fn(async work => work({ query }));
  const service = new CitasService({ transaction } as unknown as DataSource);
  const actor = { idPersona: 2, idRolNativo: 2 };
  const input = { idServicio: 1, idCliente: 4, idMedico: 2, fechaInicio: '2031-02-03T16:00', duracion: 30 };

  beforeEach(() => {
    jest.clearAllMocks();
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FOR UPDATE')) return [{ idRolNativo: 2 }];
      if (sql.includes('COUNT(*)')) return [{ total: 0 }];
      if (sql.includes('INSERT INTO vacaciones_medico')) return { insertId: 5 };
      return [];
    });
  });

  it.each([
    ['2031-02-03', '16:00:00', 240, true],
    ['2031-02-04', '09:30:00', 240, true],
    ['2031-02-05', '19:30:00', 30, true],
    ['2031-02-06', '13:00:00', 30, true],
    ['2031-02-07', '15:59:59', 30, false],
    ['2031-02-03', '19:30:01', 30, false],
    ['2031-02-04', '09:29:59', 30, false],
    ['2031-02-06', '13:00:01', 30, false],
    ['2031-02-08', '16:00:00', 30, false],
    ['2031-02-09', '10:00:00', 30, false],
  ])('checks %s %s for %i minutes', (date, time, duration, expected) => {
    expect(withinClinicHours(date, time, duration)).toBe(expected);
  });

  it('rejects saving or moving appointments outside opening hours, while availability explains why', async () => {
    const outside = { ...input, fechaInicio: '2031-02-04T13:15' };
    await expect(service.check(actor, outside)).resolves.toEqual({ disponible: false, motivo: 'fuera_horario' });
    await expect(service.save(actor, outside)).rejects.toBeInstanceOf(ConflictException);
    await expect(service.save(actor, outside, 7)).rejects.toBeInstanceOf(ConflictException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('normalizes weekends at the edges but preserves the intervening week', async () => {
    expect(workingDateRange('2031-02-01', '2031-02-09')).toEqual({ start: '2031-02-03', end: '2031-02-07' });
    await expect(service.addHoliday(actor, 2, { fechaInicio: '2031-02-01', fechaFin: '2031-02-09' }))
      .resolves.toEqual({ idVacacion: 5, citasExistentes: 0 });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO vacaciones_medico'), [2, '2031-02-03', '2031-02-07']);
  });

  it('rejects vacation periods without weekdays', async () => {
    await expect(service.addHoliday(actor, 2, { fechaInicio: '2031-02-08', fechaFin: '2031-02-09' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });
});
