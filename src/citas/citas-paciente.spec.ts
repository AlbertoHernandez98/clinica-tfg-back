import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CitasService } from './citas.service';

describe('Patient appointments', () => {
  const query = jest.fn();
  const service = new CitasService({ query } as unknown as DataSource);

  beforeEach(() => {
    jest.resetAllMocks();
    query.mockResolvedValue([{ idCita: 10, servicio: 'Consulta' }]);
  });

  it('only queries appointments belonging to the authenticated patient', async () => {
    await expect(service.myAppointments({ idPersona: 7, idRolNativo: 4 }))
      .resolves.toEqual([{ idCita: 10, servicio: 'Consulta' }]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE c.idCliente = ?'), [7]);
    expect(query.mock.calls[0][0]).toContain('LEFT JOIN');
  });

  [1, 2, 3].forEach(role => {
    it(`rejects role ${role}`, async () => {
      await expect(service.myAppointments({ idPersona: 7, idRolNativo: role })).rejects.toBeInstanceOf(ForbiddenException);
      expect(query).not.toHaveBeenCalled();
    });
  });

  it('rejects invalid patient identity before querying', async () => {
    await expect(service.myAppointments({ idPersona: -1, idRolNativo: 4 })).rejects.toBeInstanceOf(BadRequestException);
    expect(query).not.toHaveBeenCalled();
  });
});
