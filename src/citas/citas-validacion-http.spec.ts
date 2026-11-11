import { INestApplication } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { CitasController } from './citas.controller';
import { CitasService } from './citas.service';

describe('Appointment HTTP validation', () => {
  let app: INestApplication;
  const db = { query: jest.fn(), transaction: jest.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [CitasController],
      providers: [CitasService, { provide: DataSource, useValue: db }],
    }).overrideGuard(AuthGuard('jwt')).useValue({
      canActivate(context) {
        context.switchToHttp().getRequest().user = { idPersona: 2, idRolNativo: 2 };
        return true;
      },
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  beforeEach(() => jest.clearAllMocks());
  afterAll(() => app.close());

  it('returns 400 for malformed route identifiers rather than coercing them', async () => {
    await request(app.getHttpServer()).delete('/citas/1e0').expect(400);
    await request(app.getHttpServer()).delete('/medicos/2/vacaciones/0x1').expect(400);
    await request(app.getHttpServer()).get('/medicos/4294967296/vacaciones').expect(400);
    expect(db.transaction).not.toHaveBeenCalled();
    expect(db.query).not.toHaveBeenCalled();
  });

  it('returns 400 for malformed bodies before opening a transaction', async () => {
    await request(app.getHttpServer()).post('/medicos/2/vacaciones').send([]).expect(400);
    await request(app.getHttpServer()).post('/medicos/2/vacaciones').send({}).expect(400);
    await request(app.getHttpServer()).post('/citas/huecos').send([]).expect(400);
    await request(app.getHttpServer()).post('/citas').send([]).expect(400);
    expect(db.transaction).not.toHaveBeenCalled();
    expect(db.query).not.toHaveBeenCalled();
  });
});
