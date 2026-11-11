import { INestApplication } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AuditoriaHistorialService } from './auditoria-historial.service';
import { HistorialClinicoController } from './historial-clinico.controller';
import { HistorialClinicoService } from './historial-clinico.service';

describe('Clinical history HTTP validation', () => {
  let app: INestApplication;
  const db = { query: jest.fn(), transaction: jest.fn() };
  let actor = { idPersona: 1, idRolNativo: 1 };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [HistorialClinicoController],
      providers: [HistorialClinicoService, AuditoriaHistorialService, { provide: DataSource, useValue: db }],
    }).overrideGuard(AuthGuard('jwt')).useValue({
      canActivate(context) {
        context.switchToHttp().getRequest().user = actor;
        return true;
      },
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    actor = { idPersona: 1, idRolNativo: 1 };
  });
  afterAll(() => app.close());

  it('rejects invalid IDs, request shapes and oversized audit cursors with HTTP 400', async () => {
    await request(app.getHttpServer()).get('/historialclinico/paciente/4294967296').expect(400);
    await request(app.getHttpServer()).get('/historialclinico/cita/1e0').expect(400);
    await request(app.getHttpServer()).get('/historialclinico/auditoria?antes=18446744073709551616').expect(400);
    await request(app.getHttpServer()).post('/historialclinico').send([]).expect(400);
    await request(app.getHttpServer()).patch('/historialclinico/1').send([]).expect(400);
    await request(app.getHttpServer()).post('/historialclinico/1/anular').send([]).expect(400);
    expect(db.query).not.toHaveBeenCalled();
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('keeps logging authenticated forbidden access, even for an invalid body', async () => {
    actor = { idPersona: 4, idRolNativo: 4 };
    db.query.mockResolvedValue({});
    await request(app.getHttpServer()).post('/historialclinico').send([]).expect(403);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO auditoria_historial'),
      [4, 4, 'ALTA', 'DENEGADO', null, null],
    );
    expect(db.transaction).not.toHaveBeenCalled();
  });
});
