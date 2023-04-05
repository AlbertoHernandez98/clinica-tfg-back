/*
https://docs.nestjs.com/providers#services
*/

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PersonaEntity } from './persona.entity';
import { PersonaClinica } from './persona.interface';

@Injectable()
export class PersonaService {

    constructor(
        @InjectRepository(PersonaEntity)
        private personaRepository: Repository<PersonaEntity>
    ) { }

    async addPersona(persona: PersonaClinica): Promise<any> {
        let newPersona = new PersonaEntity();
        newPersona.apellidos = persona.apellidos;
        newPersona.contraseña = persona.contraseña;
        newPersona.dni = persona.dni;
        // newPersona.fotoPerfil = persona.fotoPerfil;
        newPersona.idPersona = persona.idPersona;
        newPersona.idRolNativo = persona.idRolNativo;
        newPersona.nombre = persona.nombre;
        newPersona.telefono = persona.telefono;
        const item = await this.personaRepository.save(newPersona)

        return item;
    }

    getAllPersonas(): Promise<PersonaEntity[]> {
        return this.personaRepository.find();
    }

    getPersonaById(idPersona: number): Promise<PersonaEntity> {
        return this.personaRepository.findOneBy({ idPersona });
    }

    async editarPersona(idPersona: number, persona: PersonaEntity): Promise<PersonaEntity> {
        let toUpdate = await this.personaRepository.findOneBy({idPersona})
        let update = Object.assign(toUpdate, persona);
        const persona_actualizada = await this.personaRepository.save(toUpdate)
        return persona_actualizada
    }

    async deletePersona(id: number): Promise<void> {
        await this.personaRepository.delete(id);
    }

}
