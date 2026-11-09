/*
https://docs.nestjs.com/providers#services
*/

import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PersonaEntity } from './persona.entity';
import { PersonaClinica } from './persona.interface';

type Actor = { idPersona: number; idRolNativo: number };

@Injectable()
export class PersonaService {
  constructor(
    @InjectRepository(PersonaEntity)
    private personaRepository: Repository<PersonaEntity>,
  ) {}

  async findByDni(dni: string): Promise<PersonaEntity | undefined> {
    return this.personaRepository.findOne({ where: { dni } });
  }

  async addPersona(persona: PersonaClinica): Promise<any> {
    this.validateEmail(persona.email);
    if (await this.findByDni(persona.dni)) {
      throw new ConflictException('Ya existe una persona con ese documento');
    }
    let newPersona = new PersonaEntity();
    newPersona.dni = persona.dni;
    newPersona.password = persona.password;
    newPersona.idRolNativo = persona.idRolNativo;
    newPersona.telefono = persona.telefono;
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
    const { oldDni, dni, password, nombre, apellidos, idRolNativo, telefono, email } = requestBody;
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
          persona.password = password;
        }
        persona.nombre = nombre;
        persona.apellidos = apellidos;
        persona.idRolNativo = newRole;
        persona.telefono = telefono;
        if (email !== undefined) {
          persona.email = email ? email.trim() : null;
        }
        await repo.save(persona);
      } else {
        throw new NotFoundException('La persona no ha sido encontrada');
      }
    });
  }

  async cambiarContrasena(requestBody) {
    try {
      const { dni, password, newPassword } = requestBody;

      const persona = await this.personaRepository.findOneBy({
        dni: dni,
      });

      if (!persona) {
        throw new Error('No se encontró la persona');
      }

      const compared = this.comparePasswords(password, persona.password);

      if (compared) {
        persona.password = newPassword;
        await this.personaRepository.save(persona);
      } else {
        throw new Error('La contraseña actual es incorrecta');
      }
      return persona;
    } catch (error) {
      throw new Error('Error al cambiar la contraseña de la persona');
    }
  }

  private comparePasswords(password: string, hashedPassword: string): boolean {
    return password === hashedPassword;
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
