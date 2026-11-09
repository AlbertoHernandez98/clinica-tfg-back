import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PersonaEntity } from './persona.entity';
import { PersonaService } from './persona.service';

describe('PersonaService', () => {
  const repository = { find: jest.fn(), findOne: jest.fn(), findOneBy: jest.fn(), save: jest.fn(), delete: jest.fn(), manager: { transaction: jest.fn() } };
  const admin = { idPersona: 1, idRolNativo: 1 };
  let service: PersonaService;

  beforeEach(() => {
    jest.resetAllMocks();
    repository.manager.transaction.mockImplementation(async work => work({ getRepository: () => repository }));
    service = new PersonaService(repository as unknown as Repository<PersonaEntity>);
  });

  it('creates a new user without trusting a client-supplied identifier', async () => {
    repository.findOne.mockResolvedValue(null);
    repository.save.mockImplementation(async user => ({ ...user, idPersona: 5 }));
    const result = await service.addPersona({
      idPersona: 99, dni: '12345678A', nombre: 'Ana', apellidos: 'Pérez',
      password: 'pass', telefono: 612345678, idRolNativo: 4, email: 'ana@example.com'
    });
    expect(repository.save.mock.calls[0][0].idPersona).toBeUndefined();
    expect(repository.save.mock.calls[0][0].email).toBe('ana@example.com');
    expect(result.idPersona).toBe(5);
  });

  it('rejects a duplicate DNI', async () => {
    repository.findOne.mockResolvedValue({ idPersona: 1 });
    await expect(service.addPersona({
      dni: '12345678A', nombre: 'Ana', apellidos: 'Pérez',
      password: 'pass', telefono: 612345678, idRolNativo: 4
    })).rejects.toBeInstanceOf(ConflictException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('preserves the password on updates when it is omitted', async () => {
    const persona = { idPersona: 4, idRolNativo: 4, dni: '12345678A', password: 'existing' };
    repository.findOne.mockResolvedValue(persona);
    await service.editarPersona({ oldDni: persona.dni, dni: persona.dni, nombre: 'Ana', apellidos: 'Pérez', telefono: 612345678, idRolNativo: 4 }, admin);
    expect(persona.password).toBe('existing');
    expect(repository.save).toHaveBeenCalledWith(persona);
  });

  it('rejects changing the DNI to one used by another user', async () => {
    repository.findOne.mockResolvedValueOnce({ idPersona: 4, idRolNativo: 4, dni: '12345678A' }).mockResolvedValueOnce({ idPersona: 2 });
    await expect(service.editarPersona({ oldDni: '12345678A', dni: '87654321B', idRolNativo: 4 }, admin))
      .rejects.toBeInstanceOf(ConflictException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('preserves an existing email when an update omits it', async () => {
    const persona = { idPersona: 4, idRolNativo: 4, dni: '12345678A', email: 'ana@example.com', password: 'existing' };
    repository.findOne.mockResolvedValue(persona);
    await service.editarPersona({ oldDni: persona.dni, dni: persona.dni, idRolNativo: 4 }, admin);
    expect(persona.email).toBe('ana@example.com');
  });

  it('rejects invalid email addresses', async () => {
    await expect(service.addPersona({
      dni: '12345678A', nombre: 'Ana', apellidos: 'Pérez',
      password: 'pass', telefono: 612345678, idRolNativo: 4, email: 'invalid'
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('limits the patient list to the signed-in patient', async () => {
    repository.find.mockResolvedValue([]);
    await service.getAllPersonas({ idPersona: 7, idRolNativo: 4 });
    expect(repository.find).toHaveBeenCalledWith({ where: { idPersona: 7 } });
  });

  it.each([
    [2, 4, 4, true], [2, 2, 2, false], [2, 4, 1, false],
    [3, 2, 2, true], [3, 4, 4, true], [3, 1, 1, false], [3, 2, 1, false],
    [4, 4, 4, false], [1, 3, 1, true],
  ])('checks role %i editing target %i as role %i', async (role, targetRole, newRole, allowed) => {
    repository.findOne.mockResolvedValue({ idPersona: 8, idRolNativo: targetRole, dni: 'T' });
    const result = service.editarPersona({ oldDni: 'T', dni: 'T', idRolNativo: newRole }, { idPersona: 7, idRolNativo: role });
    if (allowed) await expect(result).resolves.toBeUndefined();
    else await expect(result).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.save).toHaveBeenCalledTimes(allowed ? 1 : 0);
  });

  it.each([[2, 4, false], [3, 2, true], [3, 4, true], [3, 1, false], [4, 4, false], [1, 1, true]])(
    'checks role %i deleting target %i', async (role, targetRole, allowed) => {
      repository.findOne.mockResolvedValue({ idPersona: 8, idRolNativo: targetRole });
      const result = service.deletePersona(8, { idPersona: 7, idRolNativo: role });
      if (allowed) await expect(result).resolves.toBeUndefined();
      else await expect(result).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.delete).toHaveBeenCalledTimes(allowed ? 1 : 0);
    }
  );

  it('allows a doctor to update their own profile but not change their role or password', async () => {
    repository.findOne.mockResolvedValue({ idPersona: 7, idRolNativo: 2, dni: 'T' });
    const doctor = { idPersona: 7, idRolNativo: 2 };
    await expect(service.editarPersona({ oldDni: 'T', dni: 'T', idRolNativo: 2 }, doctor)).resolves.toBeUndefined();
    await expect(service.editarPersona({ oldDni: 'T', dni: 'T', idRolNativo: 1 }, doctor)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.editarPersona({ oldDni: 'T', dni: 'T', idRolNativo: 2, password: 'new' }, doctor)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
