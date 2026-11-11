import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, createHmac, randomBytes } from 'crypto';
import { DataSource } from 'typeorm';
import { PersonaService } from '../persona/persona.service';
import { PersonaEntity } from '../persona/persona.entity';
import { jwtConstants } from './constants';

const TOKEN_PATTERN = /^[a-f0-9]{64}$/;
const hash = (token: string) => createHash('sha256').update(token).digest('hex');
const successor = (token: string) =>
  createHmac('sha256', jwtConstants.secret).update('clinica-refresh-rotation:v1:').update(token).digest('hex');
const RECOVERY_MICROSECONDS = 5_000_000;
export const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class RefreshSessionService {
  constructor(private readonly db: DataSource, private readonly personas: PersonaService) {}

  async create(user: PersonaEntity): Promise<string> {
    const token = randomBytes(32).toString('hex');
    await this.db.query(
      'INSERT INTO auth_refresh_session (idPersona, tokenHash, expiresAt) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 DAY))',
      [user.idPersona, hash(token)],
    );
    return token;
  }

  async rotate(token: string | undefined): Promise<{ user: PersonaEntity; token: string; maxAge: number }> {
    if (!token || !TOKEN_PATTERN.test(token)) throw new UnauthorizedException();
    const tokenHash = hash(token);
    const result = await this.db.transaction(async manager => {
      const matches = await manager.query(
        `SELECT idSesion FROM auth_refresh_session WHERE tokenHash = ?
         UNION ALL SELECT idSesion FROM auth_refresh_used_token WHERE tokenHash = ?`,
        [tokenHash, tokenHash],
      );
      if (!matches.length) return null;

      const rows = await manager.query(
        `SELECT idPersona, tokenHash, revokedAt,
                TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), expiresAt) AS remainingSeconds
         FROM auth_refresh_session WHERE idSesion = ? FOR UPDATE`,
        [matches[0].idSesion],
      );
      if (!rows.length || rows[0].revokedAt || Number(rows[0].remainingSeconds) <= 0) return null;
      const session = rows[0];
      if (session.tokenHash !== tokenHash) {
        const used = await manager.query(
          `SELECT TIMESTAMPDIFF(MICROSECOND, usedAt, UTC_TIMESTAMP(6)) AS ageMicros
           FROM auth_refresh_used_token WHERE tokenHash = ? AND idSesion = ? FOR UPDATE`,
          [tokenHash, matches[0].idSesion],
        );
        const age = Number(used[0]?.ageMicros);
        const nextToken = successor(token);
        if (used.length && age >= 0 && age < RECOVERY_MICROSECONDS && hash(nextToken) === session.tokenHash) {
          const user = await this.personas.getPersonaById(Number(session.idPersona));
          if (!user) return null;
          return { user, token: nextToken, maxAge: Number(session.remainingSeconds) * 1000 };
        }
        await manager.query('UPDATE auth_refresh_session SET revokedAt = UTC_TIMESTAMP() WHERE idSesion = ?', [matches[0].idSesion]);
        return null;
      }

      const user = await this.personas.getPersonaById(Number(session.idPersona));
      if (!user) return null;
      const nextToken = successor(token);
      await manager.query('INSERT INTO auth_refresh_used_token (tokenHash, idSesion, usedAt) VALUES (?, ?, UTC_TIMESTAMP(6))', [tokenHash, matches[0].idSesion]);
      await manager.query('UPDATE auth_refresh_session SET tokenHash = ? WHERE idSesion = ?', [hash(nextToken), matches[0].idSesion]);
      return { user, token: nextToken, maxAge: Number(session.remainingSeconds) * 1000 };
    });
    if (!result) throw new UnauthorizedException();
    return result;
  }

  async revoke(token: string | undefined): Promise<void> {
    if (token && TOKEN_PATTERN.test(token)) {
      await this.db.query(
        `UPDATE auth_refresh_session SET revokedAt = UTC_TIMESTAMP()
         WHERE tokenHash = ? OR idSesion IN (SELECT idSesion FROM auth_refresh_used_token WHERE tokenHash = ?)`,
        [hash(token), hash(token)],
      );
    }
  }
}
