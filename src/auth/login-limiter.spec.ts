import { LoginLimiter } from './login-limiter';

describe('LoginLimiter', () => {
  afterEach(() => jest.useRealTimers());

  it('blocks an account and IP after five failures and releases them after 15 minutes', () => {
    jest.useFakeTimers().setSystemTime(new Date('2031-02-03T10:00:00Z'));
    const limiter = new LoginLimiter();
    for (let i = 0; i < 5; i++) limiter.reserve('127.0.0.1', 'TEST');
    expect(() => limiter.reserve('127.0.0.1', 'OTHER')).toThrow('Demasiados intentos');
    expect(() => limiter.reserve('127.0.0.2', 'test')).toThrow('Demasiados intentos');
    jest.advanceTimersByTime(15 * 60 * 1000);
    expect(() => limiter.reserve('127.0.0.1', 'TEST')).not.toThrow();
  });

  it('does not count successful logins or erase concurrent failures', () => {
    const limiter = new LoginLimiter();
    for (let i = 0; i < 4; i++) limiter.reserve('127.0.0.1', 'TEST');
    limiter.success(limiter.reserve('127.0.0.1', 'TEST'));
    limiter.reserve('127.0.0.1', 'TEST');
    expect(() => limiter.reserve('127.0.0.1', 'TEST')).toThrow('Demasiados intentos');
  });
});
