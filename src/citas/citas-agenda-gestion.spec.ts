import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CitasService } from './citas.service';

describe('Managed weekly agenda', () => {
  const query = jest.fn();
  const transaction = jest.fn(async work => work({ query }));
  const service = new CitasService({ transaction } as unknown as DataSource);
  const doctor = { idPersona: 2, idRolNativo: 2 };

  beforeEach(() => {
    jest.clearAllMocks();
    query.mockImplementation(async (sql: string, params: unknown[]) => {
      if (sql.includes('FOR UPDATE')) return [{ idRolNativo: 2 }];
      if (sql.includes('COUNT(*)')) return [{ total: 0 }];
      if (sql.includes('FROM cita c')) return [{ idCita: 9, idCliente: 4, idServicio: 1, idMedico: 2 }];
      if (sql.includes('FROM cita WHERE')) return (params[2] as string).endsWith('16:30:00') ? [{ idCita: 9 }] : [];
      if (sql.includes('vacaciones_medico WHERE') && sql.includes('TIMESTAMP(fechaInicio)')) {
        return (params[1] as string).startsWith('2031-02-04') ? [{ idVacacion: 1 }] : [];
      }
      if (sql.includes('FROM vacaciones_medico')) return [{ fechaInicio: '2031-02-04', fechaFin: '2031-02-04' }];
      throw new Error('Unexpected query');
    });
  });

  it('returns only the selected doctor’s appointments and free 30-minute slots', async () => {
    const result = await service.managedAgenda(doctor, '2031-02-03', 2);
    expect(result.citas[0]).toEqual({ idCita: 9, idCliente: 4, idServicio: 1, idMedico: 2 });
    expect(result.huecos['2031-02-03']).toContain('16:00');
    expect(result.huecos['2031-02-03']).not.toContain('16:30');
    expect(result.huecos['2031-02-04']).toEqual([]);
    expect(result.huecos['2031-02-08']).toEqual([]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('c.idMedico = ?'), [2, '2031-02-03', '2031-02-03', '2031-02-03', '2031-02-03']);
  });

  it('allows administrators and receptionists to select a doctor', async () => {
    for (const role of [1, 3]) {
      await expect(service.managedAgenda({ idPersona: 8, idRolNativo: role }, '2031-02-03', 2)).resolves.toHaveProperty('huecos');
    }
  });

  it('rejects other doctors, patients and invalid dates', async () => {
    await expect(service.managedAgenda(doctor, '2031-02-03', 3)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.managedAgenda({ idPersona: 4, idRolNativo: 4 }, '2031-02-03', 2)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.managedAgenda(doctor, '2031-02-30', 2)).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });
});
