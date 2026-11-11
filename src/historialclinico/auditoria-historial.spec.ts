import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuditoriaHistorialService } from './auditoria-historial.service';
import { HistorialClinicoController } from './historial-clinico.controller';
import { HistorialClinicoService } from './historial-clinico.service';

describe('Clinical history access audit', () => {
  const query = jest.fn();
  const db = { query } as unknown as DataSource;
  const audit = new AuditoriaHistorialService(db);
  const admin = { idPersona: 1, idRolNativo: 1 };
  const patient = { idPersona: 4, idRolNativo: 4 };

  beforeEach(() => query.mockReset());

  it('records only metadata without clinical content', async () => {
    query.mockResolvedValue({});
    await audit.denied(patient, 'EDICION', null, '6');
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO auditoria_historial'),
      [4, 4, 'EDICION', 'DENEGADO', null, 6],
    );
  });

  it('allows only administrators to list and validates the cursor', async () => {
    await expect(audit.list(patient, undefined)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(audit.list(admin, '1 OR 1=1')).rejects.toBeInstanceOf(BadRequestException);
    expect(query).not.toHaveBeenCalled();
    query.mockResolvedValue([{ idAuditoria: '2', operacion: 'CONSULTA' }]);
    await expect(audit.list(admin, '3')).resolves.toEqual({
      eventos: [{ idAuditoria: '2', operacion: 'CONSULTA' }], siguiente: null,
    });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE idAuditoria < ?'), ['3']);
  });

  it('validates the full unsigned BIGINT cursor without losing precision', async () => {
    await expect(audit.list(admin, '18446744073709551616')).rejects.toBeInstanceOf(BadRequestException);
    expect(query).not.toHaveBeenCalled();
    query.mockResolvedValue([]);
    await expect(audit.list(admin, '18446744073709551615')).resolves.toEqual({ eventos: [], siguiente: null });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE idAuditoria < ?'), ['18446744073709551615']);
  });

  it('records rejected requests and propagates the denial', async () => {
    query.mockResolvedValue({});
    const history = { patient: jest.fn().mockRejectedValue(new ForbiddenException()) };
    const controller = new HistorialClinicoController(history as unknown as HistorialClinicoService, audit);
    await expect(controller.patient({ user: patient }, '8')).rejects.toBeInstanceOf(ForbiddenException);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO auditoria_historial'),
      [4, 4, 'CONSULTA', 'DENEGADO', 8, null]);
  });

  it('does not silently ignore failures to record denied access', async () => {
    query.mockRejectedValue(new Error('audit unavailable'));
    const history = { patient: jest.fn().mockRejectedValue(new ForbiddenException()) };
    const controller = new HistorialClinicoController(history as unknown as HistorialClinicoService, audit);
    await expect(controller.patient({ user: patient }, '8')).rejects.toThrow('audit unavailable');
  });

  it('uses the supplied transaction for successful changes', async () => {
    const transaction = { query: jest.fn().mockResolvedValue({}) };
    await audit.record(transaction as unknown as DataSource, admin, 'ALTA', 'PERMITIDO', 4, 7);
    expect(transaction.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO auditoria_historial'),
      [1, 1, 'ALTA', 'PERMITIDO', 4, 7]);
    expect(query).not.toHaveBeenCalled();
  });
});
