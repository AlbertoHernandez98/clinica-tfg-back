import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CitasService } from './citas.service';

describe('Available appointment start times', () => {
  const query = jest.fn();
  const transaction = jest.fn(async work => work({ query }));
  const service = new CitasService({ transaction } as unknown as DataSource);
  const actor = { idPersona: 2, idRolNativo: 2 };
  const input = { fecha: '2031-02-04', idMedico: 2, duracion: 60 };

  beforeEach(() => {
    jest.clearAllMocks();
    query.mockImplementation(async (sql: string, params: unknown[]) => {
      if (sql.includes('SELECT idCita, idMedico FROM cita WHERE idCita')) return [{ idCita: 12, idMedico: 2 }];
      if (sql.includes('FOR UPDATE')) return [{ idRolNativo: 2 }];
      if (sql.includes('FROM cita')) {
        const start = params[2] as string;
        return start === '2031-02-04 10:00:00' ? [{ idCita: 10 }] : [];
      }
      if (sql.includes('vacaciones_medico')) return [];
      throw new Error('Unexpected query');
    });
  });

  it('returns half-hour starts that fit within opening hours and excludes conflicts', async () => {
    const result = await service.slots(actor, input);
    expect(result.huecos).toEqual(['09:30', '10:30', '11:00', '11:30', '12:00', '12:30']);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('FROM cita'), [2, -1, '2031-02-04 10:00:00', 60, '2031-02-04 10:00:00']);
    expect(JSON.stringify(result)).not.toContain('idCita');
  });

  it('returns no slots during a holiday or on a closed day', async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FOR UPDATE')) return [{ idRolNativo: 2 }];
      if (sql.includes('vacaciones_medico')) return [{ idVacacion: 1 }];
      return [];
    });
    await expect(service.slots(actor, input)).resolves.toEqual({ huecos: [] });
    await expect(service.slots(actor, { ...input, fecha: '2031-02-08' })).resolves.toEqual({ huecos: [] });
  });

  it('excludes the current appointment while editing', async () => {
    await service.slots(actor, { ...input, idCita: 12 });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('FROM cita'), [2, 12, '2031-02-04 09:30:00', 60, '2031-02-04 09:30:00']);
  });

  it('respects allowed durations and closing time', async () => {
    query.mockImplementation(async (sql: string) => sql.includes('FOR UPDATE') ? [{ idRolNativo: 2 }] : []);
    const short = await service.slots(actor, { ...input, duracion: 30 });
    const longer = await service.slots(actor, { ...input, duracion: 90 });
    expect(short.huecos).toEqual(['09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00']);
    expect(longer.huecos).toEqual(['09:30', '10:00', '10:30', '11:00', '11:30', '12:00']);
  });

  it.each([15, 45, 75, 120, 0, -30, null, true, '30.0'])('rejects duration %p', async duration => {
    await expect(service.slots(actor, { ...input, duracion: duration })).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it.each([30, 60, 90, '30', '60', '90'])('accepts duration %p', async duration => {
    await expect(service.slots(actor, { ...input, duracion: duration })).resolves.toHaveProperty('huecos');
  });

  it('conservatively blocks every start when a conflicting legacy record exists', async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FOR UPDATE')) return [{ idRolNativo: 2 }];
      if (sql.includes('FROM cita')) return [{ idCita: 10 }];
      return [];
    });
    await expect(service.slots(actor, input)).resolves.toEqual({ huecos: [] });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('duracion IS NULL OR fecha IS NULL OR hora IS NULL'), expect.any(Array));
  });

  it('rejects unauthorized users and creation for another doctor', async () => {
    await expect(service.slots({ idPersona: 4, idRolNativo: 4 }, input)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.slots(actor, { ...input, idMedico: 3 })).rejects.toBeInstanceOf(ForbiddenException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects invalid dates, durations and doctors', async () => {
    await expect(service.slots(actor, { ...input, fecha: '2031-02-30' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.slots(actor, { ...input, duracion: 0 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.slots(actor, { ...input, idMedico: -1 })).rejects.toBeInstanceOf(BadRequestException);
  });
});
