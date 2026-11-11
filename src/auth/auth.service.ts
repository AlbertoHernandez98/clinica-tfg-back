import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { verifyPassword, isPasswordHash } from './password';

import { PersonaService } from '../persona/persona.service';
import { PersonaEntity } from '../persona/persona.entity';

@Injectable()
export class AuthService {
    constructor(
        private readonly personaService: PersonaService,
        private readonly jwtService: JwtService,
    ) { }

    async validateUser(dni: string, password: string): Promise<PersonaEntity | null> {
        const user = await this.personaService.findByDni(dni);

        if (user && await verifyPassword(password, user.password)) {
            if (!isPasswordHash(user.password) &&
                !await this.personaService.migratePassword(user.idPersona, user.password)) return null;
            return user;
        }

        return null;
    }

    async login(persona: PersonaEntity) {
        const payload = { sub: persona.idPersona };
        return {
            access_token: this.jwtService.sign(payload),
            user: { idPersona: persona.idPersona, dni: persona.dni, nombre: persona.nombre, idRolNativo: persona.idRolNativo },
        };
    }

    async findById(id: number): Promise<PersonaEntity | null> {
        return this.personaService.getPersonaById(id);
    }
}
