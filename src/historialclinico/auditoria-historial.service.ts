import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

type Actor = { idPersona: number; idRolNativo: number };
type Operation = 'CONSULTA' | 'ALTA' | 'EDICION' | 'ANULACION';
type Queryable = Pick<DataSource, 'query'>;

@Injectable()
export class AuditoriaHistorialService {
  constructor(private readonly db: DataSource) {}

  async record(
    source: Queryable, actor: Actor, operation: Operation, result: 'PERMITIDO' | 'DENEGADO',
    patient: unknown, entry: unknown,
  ): Promise<void> {
    await source.query(
      `INSERT INTO auditoria_historial (fecha, idUsuario, rolUsuario, operacion, resultado, idPaciente, idHistorialClinico)
       VALUES (UTC_TIMESTAMP(6), ?, ?, ?, ?, ?, ?)`,
      [actor.idPersona, actor.idRolNativo, operation, result, this.safeId(patient), this.safeId(entry)],
    );
  }

  denied(actor: Actor, operation: Operation, patient: unknown, entry: unknown): Promise<void> {
    return this.record(this.db, actor, operation, 'DENEGADO', patient, entry);
  }

  async list(actor: Actor, before: unknown) {
    if (actor.idRolNativo !== 1) throw new ForbiddenException();
    if (before !== undefined && (typeof before !== 'string' || !/^[1-9]\d{0,19}$/.test(before) ||
        (before.length === 20 && before > '18446744073709551615'))) {
      throw new BadRequestException('Cursor inválido');
    }
    const rows = await this.db.query(
      `SELECT CAST(idAuditoria AS CHAR) AS idAuditoria,
              DATE_FORMAT(fecha, '%Y-%m-%dT%H:%i:%s.%fZ') AS fecha, idUsuario, rolUsuario, operacion, resultado,
              idPaciente, idHistorialClinico
       FROM auditoria_historial ${before === undefined ? '' : 'WHERE idAuditoria < ?'}
       ORDER BY idAuditoria DESC LIMIT 100`,
      before === undefined ? [] : [before],
    );
    return { eventos: rows, siguiente: rows.length === 100 ? rows[rows.length - 1].idAuditoria : null };
  }

  private safeId(value: unknown): number | null {
    if ((typeof value !== 'number' && (typeof value !== 'string' || !/^\d+$/.test(value))) ||
        !Number.isSafeInteger(Number(value)) || Number(value) < 0 || Number(value) > 4294967295) return null;
    return Number(value);
  }
}
