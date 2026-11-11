import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CitasService } from './citas.service';
import { CitasController } from './citas.controller';

describe('Appointment and holiday input validation', () => {
  const query = jest.fn();
  const transaction = jest.fn();
  const service = new CitasService({ query, transaction } as unknown as DataSource);
  const controller = new CitasController(service);
  const admin = { idPersona: 1, idRolNativo: 1 };
  const doctor = { idPersona: 2, idRolNativo: 2 };
  const appointment = { idServicio: 1, idCliente: 4, idMedico: 2, fechaInicio: '2031-02-03T16:00', duracion: 30 };

  beforeEach(() => {
    query.mockReset();
    transaction.mockReset();
  });

  it.each(['1e0', '0x1', '+1', '-1', '1.0', ' ', '4294967296'])(
    'rejects malformed or out-of-range URL identifier %s before touching data', async id => {
      await expect(controller.update({ user: admin }, id, appointment)).rejects.toBeInstanceOf(BadRequestException);
      await expect(controller.delete({ user: admin }, id)).rejects.toBeInstanceOf(BadRequestException);
      await expect(controller.holidays({ user: doctor }, id)).rejects.toBeInstanceOf(BadRequestException);
      await expect(controller.deleteHoliday({ user: doctor }, '2', id)).rejects.toBeInstanceOf(BadRequestException);
      expect(transaction).not.toHaveBeenCalled();
      expect(query).not.toHaveBeenCalled();
    },
  );

  it.each(['idServicio', 'idCliente', 'idMedico'])('rejects out-of-range %s before a transaction', async field => {
    await expect(service.save(admin, { ...appointment, [field]: '4294967296' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.check(admin, { ...appointment, [field]: '4294967296' })).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it.each([null, [], 'invalid', 3])('rejects invalid holiday bodies without a database call', async body => {
    await expect(Reflect.apply(service.addHoliday, service, [doctor, 2, body])).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it('checks holiday permissions before validating the request body', async () => {
    await expect(Reflect.apply(service.addHoliday, service, [admin, 2, null])).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each([null, [], 'invalid', 3])('rejects invalid appointment and slot bodies', async body => {
    await expect(Reflect.apply(service.save, service, [admin, body])).rejects.toBeInstanceOf(BadRequestException);
    await expect(Reflect.apply(service.check, service, [admin, body])).rejects.toBeInstanceOf(BadRequestException);
    await expect(Reflect.apply(service.slots, service, [admin, body])).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('retains the maximum unsigned identifier and zero for existing records', async () => {
    query.mockResolvedValueOnce([]);
    await expect(service.holidays({ idPersona: 0, idRolNativo: 2 }, '0')).resolves.toEqual([]);
    expect(query).toHaveBeenCalledWith(expect.any(String), [0]);
    query.mockResolvedValueOnce([]);
    await expect(service.holidays({ idPersona: 4294967295, idRolNativo: 2 }, '4294967295')).resolves.toEqual([]);
    expect(query).toHaveBeenCalledWith(expect.any(String), [4294967295]);
  });
});
