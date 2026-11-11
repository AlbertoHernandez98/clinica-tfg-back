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

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [PassportModule, JwtModule.register({ secret: jwtConstants.secret })],
      controllers: [AuthController, PersonaController, CitasController],
      providers: [
        AuthService, LocalStrategy, JwtStrategy,
        { provide: PersonaService, useValue: personas },
        { provide: CitasService, useValue: citas },
      ]
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(() => app.close());

  it('rejects unauthenticated access and incorrect credentials', async () => {
    await request(app.getHttpServer()).get('/citas').expect(401);
    await request(app.getHttpServer()).get('/auth/me').expect(401);
    await request(app.getHttpServer()).post('/auth/login').send({ username: 'TEST', password: 'bad' }).expect(401);
  });

  it('allows authenticated access without disclosing passwords or allowing role escalation', async () => {
    const login = await request(app.getHttpServer()).post('/auth/login')
      .send({ username: 'TEST', password: 'test-password' }).expect(201);
    expect(login.body.user.password).toBeUndefined();
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
});
