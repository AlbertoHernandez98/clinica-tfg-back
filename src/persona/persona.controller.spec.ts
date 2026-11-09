import { ForbiddenException } from '@nestjs/common';
import { PersonaController } from './persona.controller';
import { PersonaClinica } from './persona.interface';
import { PersonaService } from './persona.service';

describe('PersonaController creation permissions', () => {
  const service = { addPersona: jest.fn() };
  const controller = new PersonaController(service as unknown as PersonaService);

  beforeEach(() => {
    jest.resetAllMocks();
    service.addPersona.mockResolvedValue({ idPersona: 5, password: 'secret', idRolNativo: 4 });
  });

  [1, 2, 3].forEach(role => {
    it(`allows role ${role} to create a patient without returning the password`, async () => {
      const input = { idRolNativo: 4 } as PersonaClinica;
      const result = await controller.addPersona(input, { user: { idRolNativo: role } });
      expect(service.addPersona).toHaveBeenCalledWith(input);
      expect(result).toEqual({ idPersona: 5, idRolNativo: 4 });
    });
  });

  [1, 2, 3, 4].forEach(targetRole => {
    it(`allows administrators to create role ${targetRole}`, async () => {
      const input = { idRolNativo: targetRole } as PersonaClinica;
      await controller.addPersona(input, { user: { idRolNativo: 1 } });
      expect(service.addPersona).toHaveBeenCalledWith(input);
    });
  });

  [2, 3].forEach(role => {
    [1, 2, 3, undefined, '4'].filter(targetRole => !(role === 3 && targetRole === 2)).forEach(targetRole => {
      it(`rejects role ${role} creating role ${String(targetRole)}`, async () => {
        const input = { idRolNativo: targetRole } as PersonaClinica;
        await expect(controller.addPersona(input, { user: { idRolNativo: role } })).rejects.toBeInstanceOf(ForbiddenException);
        expect(service.addPersona).not.toHaveBeenCalled();
      });

      it('allows reception to create a doctor', async () => {
        await controller.addPersona({ idRolNativo: 2 } as PersonaClinica, { user: { idRolNativo: 3 } });
        expect(service.addPersona).toHaveBeenCalled();
      });
    });
  });

  it('rejects a patient creating another patient', async () => {
    await expect(controller.addPersona({ idRolNativo: 4 } as PersonaClinica, { user: { idRolNativo: 4 } }))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(service.addPersona).not.toHaveBeenCalled();
  });
});
