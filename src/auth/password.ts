import { BadRequestException } from '@nestjs/common';
import { compare, hash } from 'bcrypt';
import { createHash, timingSafeEqual } from 'crypto';

const PREFIX = '$bcrypt-sha256$';

function digest(password: string): string {
  return createHash('sha256').update(password, 'utf8').digest('hex');
}

export async function hashPassword(password: unknown): Promise<string> {
  if (typeof password !== 'string' || password.length < 4 || password.length > 45) {
    throw new BadRequestException('La contraseña debe tener entre 4 y 45 caracteres');
  }
  return hashExistingPassword(password);
}

export async function hashExistingPassword(password: string): Promise<string> {
  return PREFIX + await hash(digest(password), 12);
}

export async function verifyPassword(password: unknown, stored: unknown): Promise<boolean> {
  if (typeof password !== 'string' || typeof stored !== 'string') return false;
  if (stored.startsWith(PREFIX)) return compare(digest(password), stored.slice(PREFIX.length));
  const left = Buffer.from(password);
  const right = Buffer.from(stored);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function isPasswordHash(stored: string): boolean {
  return stored.startsWith(PREFIX);
}
