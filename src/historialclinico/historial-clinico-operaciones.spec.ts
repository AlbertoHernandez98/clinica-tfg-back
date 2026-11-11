import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HistorialClinicoService } from './historial-clinico.service';
import { AuditoriaHistorialService } from './auditoria-historial.service';

describe('Clinical history edit and annul operations', () => {
  const entry = {
    idHistorialClinico: 6,
    comentarios: 'Previous note',
    fecha: '2025-01-02',
    hora: '10:00:00',
    idCliente: 4,
    idMedico: 12,
    idServicio: 3,
    idCita: 9,
    anulada: 0,
  };
  let transactionQuery: jest.Mock;
  let transaction: jest.Mock;
  let service: HistorialClinicoService;

  beforeEach(() => {
    transactionQuery = jest.fn(async (sql: string) => {
      if (sql.startsWith('SELECT idHistorialClinico')) return [{ ...entry }];
      if (sql.startsWith('INSERT INTO historialclinicohistorico')) return { insertId: 1 };
      if (sql.startsWith('UPDATE historialclinico')) return { affectedRows: 1 };
      throw new Error(`Unexpected query: ${sql}`);
    });
    transaction = jest.fn(async work => work({ query: transactionQuery }));
    service = new HistorialClinicoService(
      { transaction } as unknown as DataSource,
      { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditoriaHistorialService,
    );
  });

  it('records the previous note, reason, actor and operation timestamp before editing', async () => {
    await expect(service.edit(
      { idPersona: 12, idRolNativo: 2 },
      6,
      { comentarios: 'Updated note', motivo: 'Correction' },
    )).resolves.toEqual({ idHistorialClinico: 6 });

    expect(transactionQuery.mock.calls.map(call => call[0])).toEqual([
      expect.stringContaining('FOR UPDATE'),
      expect.stringContaining('INSERT INTO historialclinicohistorico'),
      expect.stringContaining('UPDATE historialclinico SET comentarios'),
    ]);
    expect(transactionQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO historialclinicohistorico'),
      [6, 'Previous note', '2025-01-02', '10:00:00', 12, 3, 9, 'EDICION', 'Correction', 12],
    );
    expect(transactionQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE historialclinico SET comentarios'),
      ['Updated note', 6],
    );
  });

  it('lets an administrator edit an entry authored by another user', async () => {
    await expect(service.edit(
      { idPersona: 1, idRolNativo: 1 },
      6,
      { comentarios: 'Updated note', motivo: 'Correction' },
    )).resolves.toEqual({ idHistorialClinico: 6 });
  });

  it('forbids a doctor from editing another author’s entry without writing an audit row', async () => {
    await expect(service.edit(
      { idPersona: 13, idRolNativo: 2 },
      6,
      { comentarios: 'Updated note', motivo: 'Correction' },
    )).rejects.toBeInstanceOf(ForbiddenException);
    expect(transactionQuery).toHaveBeenCalledTimes(1);
  });

  [3, 4].forEach(role => it(`forbids role ${role} from editing or annulling`, async () => {
    const actor = { idPersona: 12, idRolNativo: role };
    await expect(service.edit(actor, 6, { comentarios: 'Updated note', motivo: 'Correction' }))
      .rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.annul(actor, 6, { motivo: 'Correction' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(transaction).not.toHaveBeenCalled();
  }));

  it('requires a non-blank reason before starting a transaction', async () => {
    await expect(service.edit(
      { idPersona: 12, idRolNativo: 2 },
      6,
      { comentarios: 'Updated note', motivo: '  ' },
    )).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.annul({ idPersona: 12, idRolNativo: 2 }, 6, { motivo: '' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('annuls without deleting and keeps a version containing the reason and acting user', async () => {
    await expect(service.annul(
      { idPersona: 12, idRolNativo: 2 },
      6,
      { motivo: 'Entered in error' },
    )).resolves.toEqual({ idHistorialClinico: 6, anulada: true });

    expect(transactionQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO historialclinicohistorico'),
      [6, 'Previous note', '2025-01-02', '10:00:00', 12, 3, 9, 'ANULACION', 'Entered in error', 12],
    );
    expect(transactionQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE historialclinico SET anulada = 1'),
      [6],
    );
    expect(transactionQuery.mock.calls.some(call => call[0].startsWith('DELETE'))).toBe(false);
  });

  it('rejects repeated changes to an annulled entry', async () => {
    transactionQuery.mockImplementation(async (sql: string) => {
      if (sql.startsWith('SELECT idHistorialClinico')) return [{ ...entry, anulada: 1 }];
      throw new Error(`Unexpected query: ${sql}`);
    });
    await expect(service.annul(
      { idPersona: 12, idRolNativo: 2 },
      6,
      { motivo: 'Second attempt' },
    )).rejects.toBeInstanceOf(ConflictException);
    expect(transactionQuery).toHaveBeenCalledTimes(1);
  });

  it('preserves nullable legacy date, time and author values when writing an audit snapshot', async () => {
    transactionQuery.mockImplementation(async (sql: string) => {
      if (sql.startsWith('SELECT idHistorialClinico')) {
        return [{ ...entry, fecha: null, hora: null, idMedico: null }];
      }
      if (sql.startsWith('INSERT INTO historialclinicohistorico')) return { insertId: 1 };
      if (sql.startsWith('UPDATE historialclinico')) return { affectedRows: 1 };
      throw new Error(`Unexpected query: ${sql}`);
    });

    await expect(service.annul(
      { idPersona: 1, idRolNativo: 1 },
      6,
      { motivo: 'Legacy entry without metadata' },
    )).resolves.toEqual({ idHistorialClinico: 6, anulada: true });

    expect(transactionQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO historialclinicohistorico'),
      [6, 'Previous note', null, null, null, 3, 9, 'ANULACION', 'Legacy entry without metadata', 1],
    );
  });
});
