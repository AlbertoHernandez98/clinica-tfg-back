import { UnauthorizedException } from '@nestjs/common';
import { createHash, createHmac } from 'crypto';
import { DataSource } from 'typeorm';
import { PersonaService } from '../persona/persona.service';
import { RefreshSessionService } from './refresh-session.service';
import { jwtConstants } from './constants';

describe('Refresh sessions', () => {
  const query = jest.fn();
  const transactionQuery = jest.fn();
  const transaction = jest.fn(callback => callback({ query: transactionQuery }));
  const people = { getPersonaById: jest.fn() };
  const sessions = new RefreshSessionService({ query, transaction } as unknown as DataSource, people as unknown as PersonaService);
  const token = 'a'.repeat(64);
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const nextToken = createHmac('sha256', jwtConstants.secret)
    .update('clinica-refresh-rotation:v1:').update(token).digest('hex');
  const nextHash = createHash('sha256').update(nextToken).digest('hex');

  beforeEach(() => {
    query.mockReset();
    transactionQuery.mockReset();
    transaction.mockClear();
    people.getPersonaById.mockReset();
  });

  it('stores only a hash on login and rotates without extending expiry', async () => {
    query.mockResolvedValueOnce({});
    const created = await sessions.create({ idPersona: 4 } as never);
    expect(created).toMatch(/^[a-f0-9]{64}$/);
    expect(query.mock.calls[0][1][1]).not.toBe(created);

    transactionQuery.mockResolvedValueOnce([{ idSesion: '1' }])
      .mockResolvedValueOnce([{ idPersona: 4, tokenHash, revokedAt: null, remainingSeconds: 100 }])
      .mockResolvedValueOnce({}).mockResolvedValueOnce({});
    people.getPersonaById.mockResolvedValue({ idPersona: 4 });
    const result = await sessions.rotate(token);
    expect(result.user).toEqual({ idPersona: 4 });
    expect(result.token).toMatch(/^[a-f0-9]{64}$/);
    expect(result.token).not.toBe(token);
    expect(result.token).toBe(nextToken);
    expect(result.maxAge).toBe(100000);
    expect(transactionQuery.mock.calls[2][1]).toEqual([tokenHash, '1']);
    expect(transactionQuery.mock.calls[3][1][0]).toBe(createHash('sha256').update(result.token).digest('hex'));
    expect(transactionQuery.mock.calls[3][0]).not.toContain('expiresAt');
  });

  it('recovers the same successor within five seconds without rotating again', async () => {
    transactionQuery.mockResolvedValueOnce([{ idSesion: '1' }])
      .mockResolvedValueOnce([{ idPersona: 4, tokenHash: nextHash, revokedAt: null, remainingSeconds: 100 }])
      .mockResolvedValueOnce([{ ageMicros: 4_999_999 }]);
    people.getPersonaById.mockResolvedValue({ idPersona: 4 });
    await expect(sessions.rotate(token)).resolves.toEqual({
      user: { idPersona: 4 }, token: nextToken, maxAge: 100000,
    });
    expect(transactionQuery).toHaveBeenCalledTimes(3);
    expect(transactionQuery.mock.calls[2][0]).toContain('FOR UPDATE');
  });

  it('commits family revocation at the five-second boundary', async () => {
    transactionQuery.mockResolvedValueOnce([{ idSesion: '1' }])
      .mockResolvedValueOnce([{ idPersona: 4, tokenHash: nextHash, revokedAt: null, remainingSeconds: 100 }])
      .mockResolvedValueOnce([{ ageMicros: 5_000_000 }])
      .mockResolvedValueOnce({});
    await expect(sessions.rotate(token)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(transactionQuery.mock.calls[3][0]).toContain('SET revokedAt = UTC_TIMESTAMP()');
    expect(transactionQuery.mock.calls[3][1]).toEqual(['1']);
    expect(people.getPersonaById).not.toHaveBeenCalled();
  });

  it.each([
    ['a predecessor that is no longer the immediate predecessor', 'b'.repeat(64), 100],
    ['a timestamp in the future', nextHash, -1],
  ])('revokes the family for %s', async (_label, currentHash, ageMicros) => {
    transactionQuery.mockResolvedValueOnce([{ idSesion: '1' }])
      .mockResolvedValueOnce([{ idPersona: 4, tokenHash: currentHash, revokedAt: null, remainingSeconds: 100 }])
      .mockResolvedValueOnce([{ ageMicros }]).mockResolvedValueOnce({});
    await expect(sessions.rotate(token)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(transactionQuery.mock.calls[3][0]).toContain('SET revokedAt = UTC_TIMESTAMP()');
  });

  it('rejects invalid, unknown, expired and revoked tokens', async () => {
    await expect(sessions.rotate('invalid')).rejects.toBeInstanceOf(UnauthorizedException);
    transactionQuery.mockResolvedValueOnce([]);
    await expect(sessions.rotate(token)).rejects.toBeInstanceOf(UnauthorizedException);
    transactionQuery.mockResolvedValueOnce([{ idSesion: '1' }])
      .mockResolvedValueOnce([{ tokenHash, revokedAt: null, remainingSeconds: 0 }]);
    await expect(sessions.rotate(token)).rejects.toBeInstanceOf(UnauthorizedException);
    transactionQuery.mockResolvedValueOnce([{ idSesion: '1' }])
      .mockResolvedValueOnce([{ tokenHash, revokedAt: new Date(), remainingSeconds: 100 }]);
    await expect(sessions.rotate(token)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('revokes the family on logout using either its current or a used token hash', async () => {
    query.mockResolvedValueOnce({});
    await sessions.revoke(token);
    expect(query.mock.calls[0][0]).toContain('auth_refresh_used_token');
    expect(query.mock.calls[0][1]).toEqual([tokenHash, tokenHash]);
  });

  it('does not hide database errors', async () => {
    transactionQuery.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(sessions.rotate(token)).rejects.toThrow('database unavailable');
  });
});
