import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { CitasService } from '../citas/citas.service';
import { MedicoHasServicioEntity } from './medico-has-servicio.entity';
import { MedicoHasServicioService } from './medico-has-servicio.service';

describe('Doctor service assignments', () => {
  const query = jest.fn();
  const transaction = jest.fn(async work => work({ query }));
  const assignments = new MedicoHasServicioService({ manager: { transaction } } as unknown as Repository<MedicoHasServicioEntity>);
  const appointments = new CitasService({ transaction } as unknown as DataSource);
  const appointment = { idServicio: 1, idCliente: 4, idMedico: 2, fechaInicio: '2031-02-03T16:00', duracion: 30 };

  beforeEach(() => {
    jest.clearAllMocks();
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT idCita, idMedico')) return [{ idCita: 7, idMedico: 2 }];
      if (sql.includes('idPersona, idRolNativo FROM persona')) return [{ idPersona: 4, idRolNativo: 4 }];
      if (sql.includes('idRolNativo FROM persona')) return [{ idRolNativo: 2 }];
      if (sql.includes('FROM medico_has_servicio')) return [];
      if (sql.includes('FROM cita') || sql.includes('vacaciones_medico')) return [];
      if (sql.includes('FROM servicio')) return [{ idServicio: 1 }];
      if (sql.includes('INSERT INTO cita')) return { insertId: 7 };
      return { affectedRows: 1 };
    });
  });

  it.each([1, 3])('allows role %i to replace assignments, locking the doctor first', async role => {
    await expect(assignments.replace({ idRolNativo: role }, '2', [1, 2])).resolves.toEqual({ idPersona: 2, servicios: [1, 2] });
    expect(query.mock.calls[0][0]).toContain('FOR UPDATE');
    expect(query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM medico_has_servicio'), [2]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO medico_has_servicio'), [2, 2]);
  });

  it.each([2, 4])('rejects role %i before modifying assignments', async role => {
    await expect(assignments.replace({ idRolNativo: role }, 2, [1])).rejects.toBeInstanceOf(ForbiddenException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('can clear assignments for a legacy doctor with identifier zero', async () => {
    await expect(assignments.replace({ idRolNativo: 1 }, '0', [])).resolves.toEqual({ idPersona: 0, servicios: [] });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM medico_has_servicio'), [0]);
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO medico_has_servicio'))).toBe(false);
  });

  it('rejects duplicate, invalid and unknown services before deleting existing assignments', async () => {
    await expect(assignments.replace({ idRolNativo: 1 }, 2, [1, 1])).rejects.toBeInstanceOf(BadRequestException);
    await expect(assignments.replace({ idRolNativo: 1 }, 2, ['bad'])).rejects.toBeInstanceOf(BadRequestException);
    query.mockImplementation(async (sql: string) => sql.includes('persona') ? [{ idRolNativo: 2 }] : []);
    await expect(assignments.replace({ idRolNativo: 1 }, 2, [99])).rejects.toBeInstanceOf(BadRequestException);
    expect(query.mock.calls.some(([sql]) => sql.includes('DELETE'))).toBe(false);
  });

  it.each([
    [-1], [1.5], [true], [null], [''], ['1e2'], ['-1'], ['4294967296'], [4294967296],
  ])('rejects invalid doctor identifier %p before a transaction', async id => {
    await expect(assignments.replace({ idRolNativo: 1 }, id, [])).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it.each([
    [-1], [1.5], [false], [null], [''], ['1e2'], ['4294967296'], [4294967296],
  ])('rejects invalid service identifier %p before a transaction', async id => {
    await expect(assignments.replace({ idRolNativo: 3 }, 2, [id])).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it.each([null, {}, '1', 42])('rejects a non-array service list %p', async values => {
    await expect(assignments.replace({ idRolNativo: 1 }, 2, values)).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects equivalent numeric and string identifiers as duplicates', async () => {
    await expect(assignments.replace({ idRolNativo: 1 }, 2, [1, '01'])).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('accepts the unsigned database limit without numeric truncation', async () => {
    await expect(assignments.replace({ idRolNativo: 1 }, '4294967295', ['4294967295']))
      .resolves.toEqual({ idPersona: 4294967295, servicios: [4294967295] });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO medico_has_servicio'), [4294967295, 4294967295]);
  });

  it('rejects a person who is not a doctor', async () => {
    query.mockResolvedValueOnce([{ idRolNativo: 4 }]);
    await expect(assignments.replace({ idRolNativo: 1 }, 2, [])).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects both creating and editing an appointment when the service is not assigned', async () => {
    for (const id of [undefined, 7]) {
      await expect(appointments.save({ idPersona: 1, idRolNativo: 1 }, appointment, id))
        .rejects.toMatchObject({ response: expect.objectContaining({ code: 'SERVICE_NOT_ASSIGNED' }) });
    }
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO cita') || sql.includes('UPDATE cita'))).toBe(false);
  });
});
