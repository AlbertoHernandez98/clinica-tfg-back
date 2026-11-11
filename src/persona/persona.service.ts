/*
https://docs.nestjs.com/providers#services
*/

import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PersonaEntity } from './persona.entity';
import { PersonaClinica } from './persona.interface';
import { hashExistingPassword, hashPassword, verifyPassword } from '../auth/password';

type Actor = { idPersona: number; idRolNativo: number };

export function assertPersonBody(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Solicitud inválida');
  }
}

@Injectable()
export class PersonaService {
  constructor(
    @InjectRepository(PersonaEntity)
    private personaRepository: Repository<PersonaEntity>,
  ) {}

  async findByDni(dni: string): Promise<PersonaEntity | undefined> {
    return this.personaRepository.findOne({ where: { dni } });
  }

  async migratePassword(id: number, previous: string): Promise<boolean> {
    const hashed = await hashExistingPassword(previous);
    const result = await this.personaRepository.manager.query(
      'UPDATE persona SET password = ? WHERE idPersona = ? AND BINARY password = BINARY ?',
      [hashed, id, previous],
    );
    return result.affectedRows === 1;
  }

  async addPersona(persona: PersonaClinica): Promise<any> {
    assertPersonBody(persona);
    this.validatePerson(persona, true);
    this.validateEmail(persona.email);
    if (await this.findByDni(persona.dni)) {
      throw new ConflictException('Ya existe una persona con ese documento');
    }
    let newPersona = new PersonaEntity();
    newPersona.dni = persona.dni;
    newPersona.password = await hashPassword(persona.password);
    newPersona.idRolNativo = persona.idRolNativo;
    const phone: unknown = persona.telefono;
    newPersona.telefono = phone === undefined || phone === null || phone === '' ? null : Number(phone);
    newPersona.email = persona.email ? persona.email.trim() : null;
    newPersona.nombre = persona.nombre;
    newPersona.apellidos = persona.apellidos;
    newPersona.fotoPerfil = persona.fotoPerfil;

    const item = await this.personaRepository.save(newPersona);

    return item;
  }

  getAllPersonas(actor: Actor): Promise<PersonaEntity[]> {
    if (actor.idRolNativo === 4) return this.personaRepository.find({ where: { idPersona: actor.idPersona } });
    if (![1, 2, 3].includes(actor.idRolNativo)) throw new ForbiddenException();
    return this.personaRepository.find();
  }

  getPersonaById(idPersona: number): Promise<PersonaEntity> {
    return this.personaRepository.findOneBy({ idPersona });
  }

  async editarPersona(requestBody, actor: Actor) {
    assertPersonBody(requestBody);
    this.validatePerson(requestBody, false);
    const { oldDni, dni, password, nombre, apellidos, idRolNativo, telefono, email } = requestBody;
    if (typeof oldDni !== 'string' || typeof dni !== 'string') throw new BadRequestException('Documento inválido');
    this.validateEmail(email);
    const newRole = Number(idRolNativo);
    if (![1, 2, 3, 4].includes(newRole)) throw new BadRequestException('Rol inválido');
    return this.personaRepository.manager.transaction(async manager => {
      const repo = manager.getRepository(PersonaEntity);
      const persona = await repo.findOne({ where: { dni: oldDni }, lock: { mode: 'pessimistic_write' } });
      
      if(persona) {
        const self = persona.idPersona === actor.idPersona;
        const allowed = actor.idRolNativo === 1 ||
          (self && persona.idRolNativo === actor.idRolNativo && newRole === actor.idRolNativo && !password) ||
          (actor.idRolNativo === 2 && persona.idRolNativo === 4 && newRole === 4) ||
          (actor.idRolNativo === 3 && [2, 4].includes(persona.idRolNativo) && [2, 4].includes(newRole));
        if (!allowed) throw new ForbiddenException();
        if (dni !== oldDni && await repo.findOne({ where: { dni } })) {
          throw new ConflictException('Ya existe una persona con ese documento');
        }
        persona.dni = dni;
        if (password !== undefined && password !== '') {
          persona.password = await hashPassword(password);
          await manager.query('DELETE FROM auth_refresh_session WHERE idPersona = ?', [persona.idPersona]);
        }
        if (typeof nombre === 'string') persona.nombre = nombre;
        if (typeof apellidos === 'string') persona.apellidos = apellidos;
        persona.idRolNativo = newRole;
        if (telefono !== undefined) persona.telefono = telefono === null || telefono === '' ? null : Number(telefono);
        if (email !== undefined) {
          persona.email = typeof email === 'string' && email ? email.trim() : null;
        }
        await repo.save(persona);
      } else {
        throw new NotFoundException('La persona no ha sido encontrada');
      }
    });
  }

  async cambiarContrasena(requestBody) {
    assertPersonBody(requestBody);
    const { dni, password, newPassword } = requestBody;
    if (typeof dni !== 'string' || !dni || dni.length > 9) throw new BadRequestException('Documento inválido');
    return this.personaRepository.manager.transaction(async manager => {
      const repo = manager.getRepository(PersonaEntity);
      const persona = await repo.findOne({ where: { dni }, lock: { mode: 'pessimistic_write' } });
      if (!persona || !await verifyPassword(password, persona.password)) {
        throw new ForbiddenException('La contraseña actual es incorrecta');
      }
      persona.password = await hashPassword(newPassword);
      await manager.query('DELETE FROM auth_refresh_session WHERE idPersona = ?', [persona.idPersona]);
      await repo.save(persona);
    });
  }

  private validateEmail(email: unknown): void {
    if (email === undefined || email === null || email === '') {
      return;
    }
    if (typeof email !== 'string' || email.trim().length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      throw new BadRequestException('El correo electrónico no es válido');
    }
  }

  private validatePerson(input: Record<string, unknown>, creating: boolean): void {
    const text = (value: unknown, name: string, max: number, required: boolean) => {
      if (value === undefined && !required) return;
      if (typeof value !== 'string' || value.length > max || !value.trim() || /[\u0000-\u001f\u007f]/.test(value)) {
        throw new BadRequestException(`${name} inválido`);
      }
    };
    text(input.dni, 'Documento', 9, true);
    if (!creating) text(input.oldDni, 'Documento anterior', 9, true);
    text(input.nombre, 'Nombre', 32, creating);
    text(input.apellidos, 'Apellidos', 45, creating);
    const phone = input.telefono;
    if (phone !== undefined && phone !== null && phone !== '') {
      if (!((typeof phone === 'string' && /^\d{1,10}$/.test(phone)) ||
            (typeof phone === 'number' && Number.isSafeInteger(phone))) ||
          Number(phone) < 0 || Number(phone) > 2147483647) {
        throw new BadRequestException('Teléfono inválido');
      }
    }
    if (creating && input.fotoPerfil !== undefined && input.fotoPerfil !== null &&
        (typeof input.fotoPerfil !== 'string' || input.fotoPerfil.length > 250)) {
      throw new BadRequestException('Foto de perfil inválida');
    }
    if (input.idRolNativo !== 1 && input.idRolNativo !== 2 && input.idRolNativo !== 3 && input.idRolNativo !== 4 &&
        input.idRolNativo !== '1' && input.idRolNativo !== '2' && input.idRolNativo !== '3' && input.idRolNativo !== '4') {
      throw new BadRequestException('Rol inválido');
    }
  }

  async deletePersona(id: number, actor: Actor): Promise<void> {
    const personId = Number(id);
    if (!Number.isSafeInteger(personId) || personId < 0) throw new BadRequestException('Identificador inválido');
    await this.personaRepository.manager.transaction(async manager => {
      const repo = manager.getRepository(PersonaEntity);
      const person = await repo.findOne({ where: { idPersona: personId }, lock: { mode: 'pessimistic_write' } });
      if (!person) throw new NotFoundException('La persona no ha sido encontrada');
      if (actor.idRolNativo !== 1 && !(actor.idRolNativo === 3 && [2, 4].includes(person.idRolNativo))) {
        throw new ForbiddenException();
      }
      await repo.delete(personId);
    });
  }
}
