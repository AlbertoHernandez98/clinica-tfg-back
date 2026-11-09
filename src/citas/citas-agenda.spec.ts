import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CitasService } from './citas.service';

describe('Doctor weekly schedule', () => {
  const query = jest.fn();
  const service = new CitasService({ query } as unknown as DataSource);
  const doctor = { idPersona: 7, idRolNativo: 2 };

  beforeEach(() => {
    jest.resetAllMocks();
    query.mockResolvedValueOnce([{ idCita: 10 }]).mockResolvedValueOnce([{ fechaInicio: '2031-02-02', fechaFin: '2031-02-03' }]).mockResolvedValueOnce([{ total: '2' }]);
  });

  it('scopes every query to the authenticated doctor and includes overlapping events', async () => {
    const result = await service.agenda(doctor, '2031-02-01');
    expect(query).toHaveBeenNthCalledWith(1, expect.stringContaining('c.idMedico = ?'), [7, '2031-02-01', '2031-02-01', '2031-02-01', '2031-02-01']);
    expect(query.mock.calls[0][0]).toContain('INTERVAL c.duracion MINUTE');
    expect(query).toHaveBeenNthCalledWith(2, expect.stringContaining('fechaFin >= ?'), [7, '2031-02-01', '2031-02-01']);
    expect(query).toHaveBeenNthCalledWith(3, expect.stringContaining('fecha IS NULL'), [7]);
    expect(result.sinFecha).toBe(2);
    expect(result.citas).toEqual([{ idCita: 10 }]);
  });

  [1, 3, 4].forEach(role => {
    it(`rejects role ${role}`, async () => {
      await expect(service.agenda({ idPersona: 7, idRolNativo: role }, '2031-02-01')).rejects.toBeInstanceOf(ForbiddenException);
      expect(query).not.toHaveBeenCalled();
    });
  });

  it('rejects invalid dates before querying', async () => {
    await expect(service.agenda(doctor, '2031-02-30')).rejects.toBeInstanceOf(BadRequestException);
    expect(query).not.toHaveBeenCalled();
  });
});
