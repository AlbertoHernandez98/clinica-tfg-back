import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuditoriaHistorialService } from './auditoria-historial.service';
import { HistorialClinicoService } from './historial-clinico.service';

describe('Clinical history input validation', () => {
  const query = jest.fn();
  const transaction = jest.fn();
  const audit = { record: jest.fn() };
  const service = new HistorialClinicoService(
    { query, transaction } as unknown as DataSource,
    audit as unknown as AuditoriaHistorialService,
  );
  const actor = { idPersona: 1, idRolNativo: 1 };
  const body = { idCliente: 4, idServicio: 1, idCita: 9, comentarios: 'Nota' };

  beforeEach(() => {
    query.mockReset();
    transaction.mockReset();
    audit.record.mockReset();
  });

  it.each([0, -1, 1.5, '1e0', '0x1', '', '4294967296', 4294967296, true, null])(
    'rejects invalid identifier %p before querying', async id => {
      await expect(service.patient(actor, id)).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.appointment(actor, id)).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.edit(actor, id, { comentarios: 'Texto', motivo: 'Corrección' })).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.annul(actor, id, { motivo: 'Corrección' })).rejects.toBeInstanceOf(BadRequestException);
      expect(query).not.toHaveBeenCalled();
      expect(transaction).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    },
  );

  it.each(['idCliente', 'idServicio', 'idCita'])('rejects out-of-range %s on creation', async field => {
    await expect(service.add(actor, { ...body, [field]: '4294967296' })).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it.each([null, [], 'invalid', 2])('rejects malformed body %p without a transaction', async input => {
    await expect(Reflect.apply(service.add, service, [actor, input])).rejects.toBeInstanceOf(BadRequestException);
    await expect(Reflect.apply(service.edit, service, [actor, 1, input])).rejects.toBeInstanceOf(BadRequestException);
    await expect(Reflect.apply(service.annul, service, [actor, 1, input])).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects invalid comment and reason lengths before any write', async () => {
    for (const comments of ['', ' ', 'a'.repeat(10001), 123]) {
      await expect(service.add(actor, { ...body, comentarios: comments })).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.edit(actor, 1, { comentarios: comments, motivo: 'Corrección' })).rejects.toBeInstanceOf(BadRequestException);
    }
    for (const reason of ['', ' ', 'a'.repeat(1001), 123]) {
      await expect(service.edit(actor, 1, { comentarios: 'Nota', motivo: reason })).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.annul(actor, 1, { motivo: reason })).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(transaction).not.toHaveBeenCalled();
  });

  it('retains the maximum identifier and configured comment and reason boundaries', async () => {
    query.mockResolvedValueOnce([{ idCita: 4294967295, idCliente: 4 }]);
    audit.record.mockResolvedValue(undefined);
    await expect(service.appointment(actor, '4294967295')).resolves.toMatchObject({ idCita: 4294967295 });
    const txQuery = jest.fn(async sql => {
      if (sql.startsWith('SELECT idHistorialClinico')) return [{ idHistorialClinico: 1, idCliente: 4, idMedico: 1, anulada: 0 }];
      return {};
    });
    transaction.mockImplementation(async work => work({ query: txQuery }));
    await expect(service.edit(actor, 1, { comentarios: 'a'.repeat(10000), motivo: 'b'.repeat(1000) }))
      .resolves.toEqual({ idHistorialClinico: 1 });
    expect(audit.record).toHaveBeenCalledWith(expect.anything(), actor, 'EDICION', 'PERMITIDO', 4, 1);
  });

  it('still rejects unauthorized roles before processing bodies', async () => {
    await expect(Reflect.apply(service.add, service, [{ idPersona: 4, idRolNativo: 4 }, null]))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(transaction).not.toHaveBeenCalled();
  });
});
