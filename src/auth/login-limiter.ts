import { HttpException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_KEYS = 10000;

@Injectable()
export class LoginLimiter {
  private readonly attempts = new Map<string, { time: number; id: symbol }[]>();

  reserve(ip: string, username: string): { keys: string[]; id: symbol } {
    const now = Date.now();
    for (const [key, timestamps] of this.attempts) {
      const recent = timestamps.filter(attempt => attempt.time > now - WINDOW_MS);
      if (recent.length) this.attempts.set(key, recent);
      else this.attempts.delete(key);
    }
    const account = createHash('sha256').update(username.toLowerCase()).digest('hex');
    const keys = [`ip:${ip}`, `account:${account}`];
    if (keys.some(key => (this.attempts.get(key)?.length || 0) >= MAX_ATTEMPTS) ||
        this.attempts.size + keys.filter(key => !this.attempts.has(key)).length > MAX_KEYS) {
      throw new HttpException('Demasiados intentos de inicio de sesión. Inténtalo más tarde.', 429);
    }
    const id = Symbol();
    for (const key of keys) this.attempts.set(key, [...(this.attempts.get(key) || []), { time: now, id }]);
    return { keys, id };
  }

  success(reservation: { keys: string[]; id: symbol }): void {
    for (const key of reservation.keys) {
      const remaining = (this.attempts.get(key) || []).filter(attempt => attempt.id !== reservation.id);
      if (remaining.length) this.attempts.set(key, remaining);
      else this.attempts.delete(key);
    }
  }
}
