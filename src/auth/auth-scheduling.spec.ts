import { INestApplication } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { CitasController } from '../citas/citas.controller';
import { CitasService } from '../citas/citas.service';
import { PersonaController } from '../persona/persona.controller';
import { PersonaService } from '../persona/persona.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { jwtConstants } from './constants';
import { JwtStrategy } from './jwt.strategy';
import { LocalStrategy } from './local.strategy';
import { LoginGuard } from './login.guard';
import { LoginLimiter } from './login-limiter';
import { RefreshSessionService } from './refresh-session.service';

describe('Scheduling authentication', () => {
  let app: INestApplication;
  const doctor = { idPersona: 2, dni: 'TEST', password: 'test-password', nombre: 'Test', idRolNativo: 2 };
  const personas = {
    findByDni: jest.fn(async dni => dni === doctor.dni ? doctor : null),
    getPersonaById: jest.fn(async id => id === doctor.idPersona ? doctor : null),
    getAllPersonas: jest.fn(async () => [doctor]),
    editarPersona: jest.fn(),
    migratePassword: jest.fn(async () => true),
  };
  const citas = { list: jest.fn(async () => []) };
  const sessions = {
    create: jest.fn(async () => 'a'.repeat(64)),
    rotate: jest.fn(async () => ({ user: doctor, token: 'b'.repeat(64), maxAge: 100000 })),
    revoke: jest.fn(async () => undefined),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [PassportModule, JwtModule.register({ secret: jwtConstants.secret })],
      controllers: [AuthController, PersonaController, CitasController],
      providers: [
        AuthService, LocalStrategy, JwtStrategy, LoginGuard, LoginLimiter,
        { provide: PersonaService, useValue: personas },
        { provide: CitasService, useValue: citas },
        { provide: RefreshSessionService, useValue: sessions },
      ]
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterEach(() => app.close());

  it('rejects unauthenticated access and incorrect credentials', async () => {
    await request(app.getHttpServer()).get('/citas').expect(401);
    await request(app.getHttpServer()).get('/auth/me').expect(401);
    await request(app.getHttpServer()).post('/auth/login').send({ username: 'TEST', password: 'bad' }).expect(401);
  });

  it('allows authenticated access without disclosing passwords or allowing role escalation', async () => {
    const login = await request(app.getHttpServer()).post('/auth/login')
      .set('Origin', 'http://localhost:4200')
      .send({ username: 'TEST', password: 'test-password' }).expect(201);
    expect(login.body.user.password).toBeUndefined();
    expect(login.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(login.headers['set-cookie'][0]).toContain('SameSite=Strict');
    const token = login.body.access_token;
    const me = await request(app.getHttpServer()).get('/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
    expect(me.body).toEqual({ idPersona: 2, nombre: 'Test', idRolNativo: 2 });
    expect(me.body.password).toBeUndefined();
    await request(app.getHttpServer()).get('/citas').set('Authorization', `Bearer ${token}`).expect(200);
    const users = await request(app.getHttpServer()).get('/persona').set('Authorization', `Bearer ${token}`).expect(200);
    expect(users.body[0].password).toBeUndefined();
    await request(app.getHttpServer()).put('/persona/changeUser').set('Authorization', `Bearer ${token}`)
      .send({ oldDni: 'TEST', idRolNativo: 1 }).expect(403);
    expect(personas.editarPersona).not.toHaveBeenCalled();
  });

  it('requires an allowed origin when refreshing or signing out', async () => {
    await request(app.getHttpServer()).post('/auth/refresh').expect(403);
    await request(app.getHttpServer()).post('/auth/logout').set('Origin', 'http://evil.example').expect(403);
    const refreshed = await request(app.getHttpServer()).post('/auth/refresh').set('Origin', 'http://localhost:4200')
      .set('Cookie', `clinica_refresh=${'a'.repeat(64)}`).expect(201);
    expect(refreshed.headers['set-cookie'][0]).toContain(`clinica_refresh=${'b'.repeat(64)}`);
    expect(refreshed.headers['set-cookie'][0]).toContain('Max-Age=100');
    expect(refreshed.headers['set-cookie'][0]).toContain('HttpOnly');
    await request(app.getHttpServer()).post('/auth/logout').set('Origin', 'http://localhost:4200')
      .set('Cookie', `clinica_refresh=${'a'.repeat(64)}`).expect(201);
  });

  it('rejects invalid login payloads and blocks repeated failed authentication', async () => {
    await request(app.getHttpServer()).post('/auth/login').send({ username: {}, password: 'bad' }).expect(400);
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer()).post('/auth/login').send({ username: 'UNKNOWN', password: 'bad' }).expect(401);
    }
    await request(app.getHttpServer()).post('/auth/login').send({ username: 'UNKNOWN', password: 'bad' }).expect(429);
  });

  it('rejects non-object user management payloads before reading their fields', async () => {
    const login = await request(app.getHttpServer()).post('/auth/login')
      .set('Origin', 'http://localhost:4200')
      .send({ username: 'TEST', password: 'test-password' }).expect(201);
    for (const endpoint of ['/persona/changeUser', '/persona/changePassword']) {
      await request(app.getHttpServer()).put(endpoint)
        .set('Authorization', `Bearer ${login.body.access_token}`).send([]).expect(400);
    }
    expect(personas.editarPersona).not.toHaveBeenCalled();
  });
});
