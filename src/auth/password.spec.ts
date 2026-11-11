import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { hashExistingPassword, hashPassword, verifyPassword } from './password';

describe('Password security', () => {
  it('hashes new passwords, including long UTF-8 passwords, without bcrypt truncation', async () => {
    const password = 'á'.repeat(44) + 'a';
    const stored = await hashPassword(password);
    expect(stored).not.toContain(password);
    expect(await verifyPassword(password, stored)).toBe(true);
    expect(await verifyPassword('á'.repeat(44) + 'b', stored)).toBe(false);
    await expect(hashPassword('abc')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('keeps legacy short passwords usable and only migrates after successful authentication', async () => {
    const old = 'abc';
    const user = { idPersona: 1, dni: 'T', password: old };
    const persona = { findByDni: jest.fn().mockResolvedValue(user), migratePassword: jest.fn().mockResolvedValue(true) };
    const service = new AuthService(persona as never, {} as never);
    expect(await service.validateUser('T', 'wrong')).toBeNull();
    expect(persona.migratePassword).not.toHaveBeenCalled();
    expect(await service.validateUser('T', old)).toBe(user);
    expect(persona.migratePassword).toHaveBeenCalledWith(1, old);
    expect(await verifyPassword(old, await hashExistingPassword(old))).toBe(true);
  });

  it('refuses a concurrent change instead of authenticating the old password', async () => {
    const persona = {
      findByDni: jest.fn().mockResolvedValue({ idPersona: 1, password: 'legacy' }),
      migratePassword: jest.fn().mockResolvedValue(false),
    };
    const service = new AuthService(persona as never, {} as never);
    expect(await service.validateUser('T', 'legacy')).toBeNull();
  });
});
