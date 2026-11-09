import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HistorialClinicoService } from './historial-clinico.service';

describe('Clinical history permissions and appointment association', () => {
  const query = jest.fn();
  const transaction = jest.fn(async work => work({ query }));
  const service = new HistorialClinicoService({ query, transaction } as unknown as DataSource);
  const body = { idCliente: 4, idServicio: 1, idCita: 9, comentarios: 'Clinical note' };

  beforeEach(() => {
    jest.clearAllMocks();
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM persona')) return [{ idPersona: 4, nombre: 'Patient', apellidos: 'Example' }];
      if (sql.includes('FROM cita')) return [{ idCita: 9, idCliente: 4, idServicio: 1 }];
      if (sql.includes('FROM historialclinico')) return [{ idHistorialClinico: 1 }];
      if (sql.includes('FROM servicio')) return [{ idServicio: 1 }];
      if (sql.includes('INSERT INTO')) return { insertId: 7 };
      throw new Error('Unexpected query');
    });
  });

  [1, 2, 3].forEach(role => it(`allows role ${role} to read a patient's records`, async () => {
    const result = await service.patient({ idPersona: 8, idRolNativo: role }, 4);
    expect(result.entradas).toEqual([{ idHistorialClinico: 1 }]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE h.idCliente = ?'), [4]);
  }));

  it('only lets patients read their own records', async () => {
    await expect(service.patient({ idPersona: 4, idRolNativo: 4 }, 4)).resolves.toHaveProperty('paciente');
    query.mockClear();
    await expect(service.patient({ idPersona: 4, idRolNativo: 4 }, 5)).rejects.toBeInstanceOf(ForbiddenException);
    expect(query).not.toHaveBeenCalled();
    await expect(service.appointment({ idPersona: 4, idRolNativo: 4 }, 9)).rejects.toBeInstanceOf(ForbiddenException);
  });

  [1, 2].forEach(role => it(`saves a note linked to an appointment with role ${role} as author`, async () => {
    await expect(service.add({ idPersona: 8, idRolNativo: role }, body)).resolves.toEqual({ idHistorialClinico: 7 });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO historialclinico'), ['Clinical note', 4, 8, 1, 9]);
  }));

  [3, 4].forEach(role => it(`forbids role ${role} from writing`, async () => {
    await expect(service.add({ idPersona: 4, idRolNativo: role }, body)).rejects.toBeInstanceOf(ForbiddenException);
    expect(transaction).not.toHaveBeenCalled();
  }));

  it('rejects mismatched appointment, blank comments, missing patient and invalid IDs', async () => {
    await expect(service.add({ idPersona: 2, idRolNativo: 2 }, { ...body, idServicio: 3 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.add({ idPersona: 2, idRolNativo: 2 }, { ...body, comentarios: '  ' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.patient({ idPersona: 2, idRolNativo: 2 }, 'invalid')).rejects.toBeInstanceOf(BadRequestException);
    query.mockResolvedValueOnce([]);
    await expect(service.patient({ idPersona: 2, idRolNativo: 2 }, 99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('allows unlinked notes with a valid service and stores no client-provided author', async () => {
    await service.add({ idPersona: 8, idRolNativo: 1 }, { idCliente: 4, idServicio: 1, comentarios: ' note ' });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO historialclinico'), ['note', 4, 8, 1, null]);
  });
});
