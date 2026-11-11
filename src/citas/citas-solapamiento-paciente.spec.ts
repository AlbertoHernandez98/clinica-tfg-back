import { ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CitasService } from './citas.service';

describe('Patient appointment overlaps', () => {
  const query = jest.fn();
  const transaction = jest.fn(async work => work({ query }));
  const service = new CitasService({ transaction } as unknown as DataSource);
  const actor = { idPersona: 1, idRolNativo: 1 };
  const item = { idServicio: 1, idCliente: 4, idMedico: 2, fechaInicio: '2031-02-03T16:00', duracion: 30 };

  beforeEach(() => {
    jest.clearAllMocks();
    query.mockImplementation(async (sql: string, params: unknown[]) => {
      if (sql.includes('SELECT idCita, idMedico')) return [{ idCita: 7, idMedico: 2 }];
      if (sql.includes('SELECT idPersona, idRolNativo FROM persona')) return [{ idPersona: 4, idRolNativo: 4 }];
      if (sql.includes('SELECT idRolNativo FROM persona')) return [{ idRolNativo: 2 }];
      if (sql.includes('WHERE idCliente = ?')) {
        const [patient, excluded, start, duration] = params as [number, number, string, number];
        const begin = new Date(`${start.replace(' ', 'T')}Z`).getTime();
        const existing = new Date('2031-02-03T16:00:00Z').getTime();
        return Number(patient) === 4 && excluded !== 7 &&
          begin < existing + 60 * 60000 && begin + duration * 60000 > existing ? [{ idCita: 7 }] : [];
      }
      if (sql.includes('FROM cita') || sql.includes('vacaciones_medico')) return [];
      if (sql.includes('FROM servicio') || sql.includes('FROM medico_has_servicio')) return [{ idServicio: 1 }];
      if (sql.includes('INSERT INTO cita')) return { insertId: 8 };
      return { affectedRows: 1 };
    });
  });

  it.each(['2031-02-03T16:00', '2031-02-03T16:30'])('rejects overlapping start %s with another doctor', async start => {
    const appointment = { ...item, idMedico: 3, fechaInicio: start };
    await expect(service.check(actor, appointment)).resolves.toEqual({ disponible: false, motivo: 'paciente_ocupado' });
    await expect(service.save(actor, appointment)).rejects.toBeInstanceOf(ConflictException);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE idCliente = ?'), [4, -1, `${start.replace('T', ' ')}:00`, 30, `${start.replace('T', ' ')}:00`]);
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO cita'))).toBe(false);
  });

  it('allows adjacent appointments, another patient, and editing the same appointment', async () => {
    await expect(service.save(actor, { ...item, fechaInicio: '2031-02-03T17:00' })).resolves.toEqual({ idCita: 8 });
    await expect(service.save(actor, { ...item, idCliente: 5 })).resolves.toEqual({ idCita: 8 });
    await expect(service.save(actor, item, 7)).resolves.toEqual({ idCita: 7 });
  });

  it('filters patient overlaps from slots and excludes the appointment being edited', async () => {
    const request = { fecha: '2031-02-03', idMedico: 3, duracion: 30, idCliente: 4 };
    const result = await service.slots(actor, request);
    expect(result.huecos).not.toContain('16:00');
    expect(result.huecos).not.toContain('16:30');
    expect(result.huecos).toContain('17:00');
    expect((await service.slots(actor, { ...request, idCita: 7 })).huecos).toContain('16:00');
  });

  it('locks the patient before checking for overlap and inserting', async () => {
    await service.save(actor, { ...item, fechaInicio: '2031-02-03T17:00' });
    const statements = query.mock.calls.map(([sql]) => sql as string);
    const lock = statements.findIndex(sql => sql.includes('idPersona, idRolNativo FROM persona') && sql.includes('FOR UPDATE'));
    const overlap = statements.findIndex(sql => sql.includes('WHERE idCliente = ?'));
    const insert = statements.findIndex(sql => sql.includes('INSERT INTO cita'));
    expect(lock).toBeGreaterThanOrEqual(0);
    expect(overlap).toBeGreaterThan(lock);
    expect(insert).toBeGreaterThan(overlap);
  });
});
