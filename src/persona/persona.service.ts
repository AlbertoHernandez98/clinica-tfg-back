/*
https://docs.nestjs.com/providers#services
*/

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PersonaEntity } from './persona.entity';
import { PersonaClinica } from './persona.interface';
// import { JwtPayload } from 'src/jwt/jwt.strategy';

@Injectable()
export class PersonaService {
  constructor(
    @InjectRepository(PersonaEntity)
    private personaRepository: Repository<PersonaEntity>,
  ) {}

  async findByUsername(username: string): Promise<PersonaEntity | undefined> {
    return this.personaRepository.findOne({ where: { username } });
  }

  async addPersona(persona: PersonaClinica): Promise<any> {
    let newPersona = new PersonaEntity();
    newPersona.username = persona.username;
    newPersona.password = persona.password;
    newPersona.dni = persona.dni;
    // newPersona.fotoPerfil = persona.fotoPerfil;
    newPersona.idPersona = persona.idPersona;
    newPersona.idRolNativo = persona.idRolNativo;
    newPersona.telefono = persona.telefono;
    newPersona.domicilio = persona.domicilio;
    newPersona.email = persona.email;

    const item = await this.personaRepository.save(newPersona);

    return item;
  }

  getAllPersonas(): Promise<PersonaEntity[]> {
    return this.personaRepository.find();
  }

  getPersonaById(idPersona: number): Promise<PersonaEntity> {
    return this.personaRepository.findOneBy({ idPersona });
  }

  async editarPersona(requestBody) {
    const { oldUsername, username, password, email, idRolNativo, dni, telefono, domicilio } = requestBody;

      const persona = await this.personaRepository.findOneBy({
        username: oldUsername,
      });
      
      if(persona) {
        persona.username = username;
        persona.password = password;
        persona.email = email;
        persona.idRolNativo = idRolNativo;
        persona.dni = dni;
        persona.telefono = telefono;
        persona.domicilio = domicilio;
        await this.personaRepository.save(persona);
      } else {
        throw new Error('Las persona no ha sido encontrada, intenta de nuevo');
      }

  }

  async cambiarContrasena(requestBody) {
    try {
      const { username, password, newPassword } = requestBody;

      const persona = await this.personaRepository.findOneBy({
        username: username,
      });

      if (!persona) {
        throw new Error('No se encontró la persona');
      }

      const compared = this.comparePasswords(password, newPassword);

      if (!compared) {
        persona.password = newPassword;
        await this.personaRepository.save(persona);
      } else {
        throw new Error('Las contraseñas coinciden, intenta de nuevo');
      }
      return persona;
    } catch (error) {
      throw new Error('Error al cambiar la contraseña de la persona');
    }
  }

  private comparePasswords(password: string, hashedPassword: string): boolean {
    return password === hashedPassword;
  }

  async deletePersona(id: number): Promise<void> {
    await this.personaRepository.delete(id);
  }
}
